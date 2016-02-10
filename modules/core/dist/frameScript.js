// CLIQZ pages communication channel
addEventListener("DOMWindowCreated", function (ev) {
  var window = ev.originalTarget.defaultView;

  var windowId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });

  var onMessage = function (ev) {
    console.log(ev.data, "listen");
    if (ev.target.location.href.indexOf("chrome://cliqz/") !== 0) {
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
      response: msg.data.response
    }), "*");
  };

  window.addEventListener("load", function () {
    window.addEventListener("message", onMessage);
    addMessageListener("window-"+windowId, onCallback);
  });

  window.addEventListener("unload", function () {
    window.removeEventListener("message", onMessage);
    removeMessageListener("window-"+windowId, onCallback);
  });

}, false);
