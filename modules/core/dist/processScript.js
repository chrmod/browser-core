/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener, content */
// CLIQZ pages communication channel
var { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/Services.jsm');

Services.scriptloader.loadSubScript("chrome://cliqz/content/core/content-scripts.js");

var config = {{CONFIG}};

var whitelist = [
  "chrome://cliqz/"
].concat(config.settings.frameScriptWhitelist);

/**
 * processScripts are supported for Firefox >= 38
 * so for older version we need to provide other means of communication
 */
if (typeof sendAsyncMessage !== "undefined") {
  function send(msg) {
    sendAsyncMessage("cliqz", msg);
  }

  function startListening(channel, cb) {
    addMessageListener(channel, cb);
  }

  function stopListening(channel, cb) {
    removeMessageListener(channel, cb);
  }
} else if(CliqzEvents) {
  function send(msg) {
    CliqzEvents.pub("process-script-cliqz", { data: msg });
  }

  function startListening(channel, cb) {
    CliqzEvents.sub("process-script-"+channel, cb);
  }

  function stopListening(channel, cb) {
    CliqzEvents.un_sub("process-script-"+channel, cb);
  }
}

function getContextHTML(ev) {
  var target = ev.target,
      count = 0,
      html;

  try {
    while(true) {
      html = target.innerHTML;

      if (html.indexOf('http://') !==-1 || html.indexOf('https://') !==-1 ) {

        return html;

      }

      target = target.parentNode;

      count+=1;
      if (count > 4) break;
    }
  } catch(ee) {
  }
}

function onDOMWindowCreated(ev) {
  injectedRules = {};
  var window = ev.originalTarget.defaultView;
  var currentURL = function(){return window.location.href};

  var windowId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
    return v.toString(16);
  });

  var requestDomainRules = function() {
    if (!currentURL() || currentURL()[0] !== 'h') {
      return;
    }

    let payload = {
      module: 'adblocker',
      action: 'url',
      args:[
        currentURL()
      ]
    }

    send({
      windowId,
      payload
    })
  }

  requestDomainRules();


  // adblocker cosmetic filter
  // go through the nodes of the dom
  var adbComsFilter = function() {
    if (!currentURL() || currentURL()[0] !== 'h') {
      return;
    }
    var addNodeName = function(node, nodeInfo) {
      // ignore hidden nodes
      if (node.offsetWidth === 0 && node.offsetWidth === 0) {
        return;
      }
      if (node.id) {
        nodeInfo.add(`#${node.id}`);
      }
      if (node.tagName) {
        nodeInfo.add(node.tagName);
      }
      if (node.className && node.className.split) {
        node.className.split(' ').forEach(name => nodeInfo.add(`.${name}`));
      }
    }

    var sendNodeNames = function(nodeInfo) {
      if (!currentURL() || !nodeInfo.size) {
        return;
      }
      let nodesArray = [...nodeInfo];
      for (let n of nodeInfo) {
        nodesArray.push(n);
      }
      let payload = {
        module: 'adblocker',
        action: 'nodes',
        args: [
          currentURL(),
          [nodesArray]
        ]
      }
      send({
        windowId,
        payload
      })
    }

    var onMutation = function(mutations) {
      let nodeInfo = new Set();
      for (let m of mutations) {
        let target = m.target;
        if (target) {
          addNodeName(target, nodeInfo);
          nodes = target.querySelectorAll('*');
          for (let node of nodes) {
            addNodeName(node, nodeInfo);
          }
        }
      }
      sendNodeNames(nodeInfo);
    }

    var doc = window.document;
    var nodes = doc.querySelectorAll('*');
    var nodeInfo = new Set();
    for (let node of nodes) {
      addNodeName(node, nodeInfo);
    }

    sendNodeNames(nodeInfo);

    // attach mutation obsever in case new nodes are added
    var mutationObserver = new window.MutationObserver(onMutation);
    mutationObserver.observe(window.document, {childList: true, subtree: true, attributes: true});
  }

  var onMessage = function (ev) {
    var href = ev.target.location.href;

    if (!whitelist.some(function (url) { return href.indexOf(url) === 0; }) ) {
      return;
    }

    let message = {};

    try {
      message = JSON.parse(ev.data);
    } catch (e) {
      // non CLIQZ or invalid message should be ignored
    }

    if (message.target !== "cliqz") {
      return;
    }

    if (message.type === "response") {
      return;
    }

    send({
      windowId: windowId,
      payload: message
    });
  };

  function injectCSSRule(rule, doc) {
    let css = doc.createElement('style');
    css.type = 'text/css';
    css.id = 'cliqz-adblokcer-css-rules'
    doc.getElementsByTagName("head")[0].appendChild(css);
    css.appendChild(doc.createTextNode(rule));
  }

  function injectScript(s, doc) {
    let script = doc.createElement('script');
    script.type = 'text/javascript';
    script.id = 'cliqz-adblocker-script';
    script.textContent = s;
    doc.getElementsByTagName("head")[0].appendChild(script);
  }

  function onCallback(msg) {
    if (isDead()) {
      return;
    }

    if (msg.data && msg.data.response && msg.data.response.type === 'domain-rules') {
      //TODO: test domain specific cosmetic filters
      let scripts = msg.data.response.scripts;
      scripts.forEach(script => injectScript(script, window.document));
    }

    if (msg.data && msg.data.response && msg.data.response.rules) {
      let rulesStr = '';
      let rules = msg.data.response.rules;

      for (let rule of rules)  {
        if (rule in injectedRules) {
          continue;
        } else {
          injectedRules[rule] = true;
          if (rulesStr) {
            rulesStr += ', ';
          }
          rulesStr += ` ${rule}`;
        }
      }
      if (rulesStr) {
        rulesStr += ' {display:none !important;}';
        injectCSSRule(rulesStr, window.document);
      }
    }

    if (!whitelist.some(function (url) { return currentURL().indexOf(url) === 0; }) ) {
      return;
    }
    window.postMessage(JSON.stringify({
      target: "cliqz",
      type: "response",
      response: msg.data.response,
      action: msg.data.action,
      requestId: msg.data.requestId,
    }), "*");
  }

  function throttle(fn, threshhold) {
    var last, timer;
    return function() {
      var context = this;

      var now = +new Date,
          args = arguments;
      if (last && now < last + threshhold) {
        // reset timeout
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          last = now;
          fn.apply(context, args);
        }, threshhold);
      } else {
        last = now;
        fn.apply(context, args);
      }
    };
  }

  var fns = {
    getHTML: function () {
      return window.document.documentElement.outerHTML;
    },
    queryHTML: function (selector, attribute) {
      var attributes = attribute.split(",");

      return Array.prototype.map.call(
        window.document.querySelectorAll(selector),
        function (el) {
          if (attributes.length > 1) {
            return attributes.reduce( function (hash, attr) {
              hash[attr] = el[attr];
              return hash;
            }, {});
          } else {
            return el[attribute];
          }
        }
      );
    },
    getCookie: function () {
      try {
        return window.document.cookie;
      } catch (e) {
        if (e instanceof DOMException && e.name == "SecurityError") {
          return null;
        } else {
          throw e; // let others bubble up
        }
      }
    }
  };

  function onCore(msg) {
    var payload;

    if (isDead()) {
      return;
    }

    if (msg.data === "unload") {
      stop();
      return;
    }

    if ( msg.data.url !== currentURL() &&
      // TEMP: Human web decodes the URI for internal storage
      (msg.data.action == "getHTML" && msg.data.url !== decodeURIComponent(currentURL()))) {
      return;
    }

    if ( !(msg.data.action in fns) ) {
      return;
    }

    try {
      payload = fns[msg.data.action].apply(null, msg.data.args || []);
      if (payload === null){
        return
      }
    } catch (e) {
      window.console.error("cliqz framescript:", e);
    }

    send({
      payload: payload,
      requestId: msg.data.requestId
    });
  }

  function proxyWindowEvent(action) {
    return function (ev) {
      send({
        windowId: windowId,
        payload: {
          module: "human-web",
          action: action,
          args: [
            {
              target: {
                baseURI: ev.target.baseURI
              }
            }
          ]
        }
      });
    };
  }

  var onMouseDown = function (ev) {
    send({
      windowId: windowId,
      payload: {
        module: "human-web",
        action: "recordMouseDown",
        args: [
          {
            target: {
              baseURI: ev.target.baseURI,
              value: ev.target.value,
              href: ev.target.href,
              parentNode: {
                href: ev.target.parentNode.href
              }
            }
          },
          getContextHTML(ev)
        ]
      }
    });
  };

  var onReady = function (event) {
    adbComsFilter();
    // ReportLang
    var lang = window.document.getElementsByTagName('html')
      .item(0).getAttribute('lang');
    // don't analyse language for (i)frames
    var isTopWindow = !event.originalTarget.defaultView.frameElement;

    if (isTopWindow && lang) {
      send({
        windowId: windowId,
        payload: {
          module: "core",
          action: "recordLang",
          args: [
            currentURL(),
            lang
          ]
        }
      });
    }

    // ReportMeta
    var title = window.document.querySelector("title"),
        description = window.document.querySelector("meta[name=description]"),
        ogTitle = window.document.querySelector("meta[property='og:title']"),
        ogDescription = window.document.querySelector("meta[property='og:description']"),
        ogImage = window.document.querySelector("meta[property='og:image']");

    send({
      windowId: windowId,
      payload: {
        module: "core",
        action: "recordMeta",
        args: [
          currentURL(),
          {
            title: title && title.innerHTML,
            description: description && description.content,
            ogTitle: ogTitle && ogTitle.content,
            ogDescription: ogDescription && ogDescription.content,
            ogImage: ogImage && ogImage.content
          }
        ]
      }
    });
  };


  var contentScript = getContentScript(window, currentURL());
  if (contentScript) {
    contentScript(window, function (msg) {
      send({
        windowId: windowId,
        payload: {
          module: "core",
          action: msg.action,
          args: msg.args
        }
      });
    });
  }


  var onKeyPress = throttle(proxyWindowEvent("recordKeyPress"), 250);
  var onMouseMove = throttle(proxyWindowEvent("recordMouseMove"), 250);
  var onScroll = throttle(proxyWindowEvent("recordScroll"), 250);
  var onCopy = throttle(proxyWindowEvent("recordCopy"), 250);

  window.addEventListener("message", onMessage);
  window.addEventListener("keypress", onKeyPress);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("scroll", onScroll);
  window.addEventListener("copy", onCopy);
  window.addEventListener("DOMContentLoaded", onReady);
  startListening("window-"+windowId, onCallback);
  startListening("cliqz:core", onCore);

  function stop() {
    stopListening("window-"+windowId, onCallback);
    stopListening("cliqz:core", onCore);
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("copy", onCopy);
    window.removeEventListener("DOMContentLoaded", onReady);
  }

  function isDead() {
    try {
      currentURL();
      return false;
    } catch(e) {
      stop();
      return true;
    }
  }

  window.addEventListener("unload", stop);
}

var DocumentManager = {

  init() {
    Services.obs.addObserver(this, "document-element-inserted", false);
  },

  uninit() {
    Services.obs.removeObserver(this, "document-element-inserted");
  },

  observe: function(subject, topic, data) {
    let document = subject;
    let window = document && document.defaultView;
    if (!document || !document.location || !window) {
      return;
    }

    onDOMWindowCreated({
      originalTarget: {
        defaultView: window
      }
    }, true)
  }
}

DocumentManager.init();

/**
 * make sure to unload propertly
 */
startListening("cliqz:process-script", function ps(msg) {
  if (msg.data === "unload") {
    DocumentManager.uninit();
    stopListening("cliqz:process-script", ps);
  }
});
