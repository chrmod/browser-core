/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener */
// CLIQZ pages communication channel

Components.utils.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = Extension.config.settings.frameScriptWhitelist;

function onDOMWindowCreated(ev) {
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

  function proxyWindowEvent(action) {
    return function (ev) {
      sendAsyncMessage("cliqz", {
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
    }
  }

  var onKeyPress = proxyWindowEvent("recordKeyPress");
  var onMouseMove = proxyWindowEvent("recordMouseMove");
  var onMouseDown = proxyWindowEvent("recordMouseDown");
  var onScroll = proxyWindowEvent("recordScroll");
  var onCopy = proxyWindowEvent("recordCopy");

  window.addEventListener("message", onMessage);
  window.addEventListener("keypress", onKeyPress);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("mousedown", onMouseDown);
  window.addEventListener("scroll", onScroll);
  window.addEventListener("copy", onCopy);
  addMessageListener("window-"+windowId, onCallback);

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("keypress", onKeyPress);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("copy", onCopy);
    removeMessageListener("window-"+windowId, onCallback);
  });

}

// Load into existing window
onDOMWindowCreated({
  originalTarget: {
    defaultView: content
  }
});

// Load into windows that are created on locationChange / iframes
addEventListener("DOMWindowCreated", onDOMWindowCreated, false);
