function init() {
  System.baseURL = "modules/"
  CLIQZ.System = System;
  System.import("freshtab/news").then(function (module) {
    CliqzFreshTabNews = module.default;
  }).catch(function () {
    console.log("error", arguments)
  }).then(function () {
    if(!CliqzHandlebars.tplCache.topnews) return setTimeout(init, 100);
    topSites = CliqzHandlebars.tplCache["topsites"];
    CLIQZEnvironment.getNews();
    osBridge.getTopSites("topSitesDone", 5);
  });
};
var topSitesDone = function (list) {
  list = list.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      }
    });
    document.body.innerHTML = topSites(list) + document.body.innerHTML;
}

window.addEventListener('load', init);



CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}