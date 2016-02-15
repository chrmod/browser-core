/* globals Components, Extension */
/* globals sendAsyncMessage, removeMessageListener, addMessageListener */
/* globals addEventListener, content */
// CLIQZ pages communication channel

Components.utils.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = Extension.config.settings.frameScriptWhitelist;

function send(msg) {
  sendAsyncMessage("cliqz:framescript", msg);
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

// Load into existing window
onDOMWindowCreated({
  originalTarget: {
    defaultView: content
  }
});

// Load into windows that are created on locationChange / iframes
addEventListener("DOMWindowCreated", onDOMWindowCreated, false);
