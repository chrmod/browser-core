function init() {
  System.baseURL = "modules/"
  CLIQZ.System = System;
  System.import("freshtab/news").then(function (module) {
    CliqzFreshTabNews = module.default;
  }).catch(function () {
    console.log("error", arguments)
  }).then(function () {
    osBridge.isReady();
  });
};

window.addEventListener('load', init);

CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}