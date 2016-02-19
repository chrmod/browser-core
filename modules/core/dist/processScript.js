const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import("chrome://cliqzmodules/content/Extension.jsm");

var whitelist = [
  "chrome://cliqz/"
].concat(Extension.config.settings.frameScriptWhitelist);

function onDOWWindowCreated(ev, z) {
  var window = ev.originalTarget.defaultView;

  var windowId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
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

    onDOWWindowCreated({
      originalTarget: {
        defaultView: window
      }
    }, true)
  }
}

DocumentManager.init();
