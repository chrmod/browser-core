// CLIQZ pages communication channel

Components.utils.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = Extension.config.settings.frameScriptWhitelist;

function onDOWWindowCreated(ev) {
  var window = ev.originalTarget.defaultView;

  var windowId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
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

  window.addEventListener("message", onMessage);
  addMessageListener("window-"+windowId, onCallback);

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    removeMessageListener("window-"+windowId, onCallback);
  });

}

onDOWWindowCreated({
  originalTarget: {
    defaultView: content
  }
})
addEventListener("DOMWindowCreated", onDOWWindowCreated, false);
