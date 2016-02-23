/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener, content */
// CLIQZ pages communication channel
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = [
  "chrome://cliqz/"
].concat(Extension.config.settings.frameScriptWhitelist);

function send(msg) {
  sendAsyncMessage("cliqz", msg);
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
  var currentURL = window.location.href;

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
    window.postMessage(JSON.stringify({
      target: "cliqz",
      type: "response",
      response: msg.data.response,
      action: msg.data.action
    }), "*");
  }

  function onCore(msg) {
    // we handle only getHTML ATM
    if ( msg.data.action !== "getHTML" ) {
      return;
    }

    if ( msg.data.args[0] !== currentURL ) {
      return;
    }

    var html;
    try {
      html = window.document.documentElement.outerHTML;
    } catch (e) {
      console.error("cliqz framescript:", e);
    }

    send({
      payload: html,
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
  addMessageListener("window-"+windowId, onCallback);
  addMessageListener("cliqz:core", onCore);

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("copy", onCopy);
    removeMessageListener("window-"+windowId, onCallback);
    removeMessageListener("cliqz:core", onCore);
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
