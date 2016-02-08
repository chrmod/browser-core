// CLIQZ pages communication channel
addEventListener("DOMWindowCreated", function (ev) {
  let onMessage = function (ev) {
    if (ev.target.location.href.indexOf("chrome://cliqz/") !== 0) {
      return;
    }
    sendAsyncMessage("cliqz", ev.data);
  };

  ev.originalTarget.defaultView.addEventListener("load", function () {
    ev.originalTarget.defaultView.addEventListener("message", onMessage);
  });

  ev.originalTarget.defaultView.addEventListener("unload", function () {
    ev.originalTarget.defaultView.removeEventListener("message", onMessage);
  });
}, false);
