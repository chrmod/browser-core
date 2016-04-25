/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener, content */
// CLIQZ pages communication channel
var { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/Services.jsm');

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
  var window = ev.originalTarget.defaultView;
  var currentURL = function(){return window.location.href};

  var windowId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
    return v.toString(16);
  });

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

  function onCallback(msg) {
    if (!whitelist.some(function (url) { return currentURL().indexOf(url) === 0; }) ) {
      return;
    }
    window.postMessage(JSON.stringify({
      target: "cliqz",
      type: "response",
      response: msg.data.response,
      action: msg.data.action
    }), "*");
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
      return window.document.cookie;
    }
  };

  function onCore(msg) {
    var payload;

    if ( msg.data.url !== currentURL() ) {
      return;
    }

    if ( !(msg.data.action in fns) ) {
      return;
    }

    try {
      payload = fns[msg.data.action].apply(null, msg.data.args || []);
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

  var onReady = function () {
    var lang = window.document.getElementsByTagName('html')
      .item(0).getAttribute('lang');

    if (!lang) {
      return;
    }

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
  };

  var onKeyPress = proxyWindowEvent("recordKeyPress");
  var onMouseMove = proxyWindowEvent("recordMouseMove");
  var onScroll = proxyWindowEvent("recordScroll");
  var onCopy = proxyWindowEvent("recordCopy");

  window.addEventListener("message", onMessage);
  window.addEventListener("keypress", onKeyPress);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("scroll", onScroll);
  window.addEventListener("copy", onCopy);
  window.addEventListener("DOMContentLoaded", onReady);
  startListening("window-"+windowId, onCallback);
  startListening("cliqz:core", onCore);

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("copy", onCopy);
    window.removeEventListener("DOMContentLoaded", onReady);
    stopListening("window-"+windowId, onCallback);
    stopListening("cliqz:core", onCore);
  });

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
