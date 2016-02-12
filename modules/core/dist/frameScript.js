/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener */
// CLIQZ pages communication channel

Components.utils.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = Extension.config.settings.frameScriptWhitelist;

addEventListener("DOMWindowCreated", function (ev) {
  var window = ev.originalTarget.defaultView;

  var windowId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c === "x" ? r : (r&0x3|0x8);
    return v.toString(16);
  });

  var onMessage = function (ev) {
    var href = ev.target.location.href;

    if ( href.indexOf("chrome://cliqz/") !== 0 &&
        whitelist.indexOf(href) === -1 ) {
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

    sendAsyncMessage("cliqz", {
      windowId: windowId,
      payload: message
    });
  };

  var onCallback = function (msg) {
    window.postMessage(JSON.stringify({
      target: "cliqz",
      type: "response",
      response: msg.data.response,
      action: msg.data.action
    }), "*");
  };

  var onKeyPress = function (ev) {
    sendAsyncMessage("cliqz", {
      windowId: windowId,
      payload: {
        module: "human-web",
        action: "recordKeyPress",
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

  window.addEventListener("load", function () {
    window.addEventListener("message", onMessage);
    window.addEventListener("keypress", onKeyPress);
    addMessageListener("window-"+windowId, onCallback);
  });

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    removeMessageListener("window-"+windowId, onCallback);
  });

}, false);
