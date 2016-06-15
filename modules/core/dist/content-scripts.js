var getContentScript = function (url) {
  var CONTENT_SCRIPTS = {
    "https://cliqz.com/": function (window, send) {
      window.console.log("Hello World!!!!")
      function onLoad() {
        window.console.log("LOADED 2!!!!");
        send({
          action: "recordCoupon",
          args: ["XYZ"]
        })
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      window.addEventListener("unload", function () {
        window.removeEventListener("DOMContentLoaded", onLoad);
      });
    }
  }

  // TODO: find proper content scrip using glob pattern specification
  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  return CONTENT_SCRIPTS[url];
};
