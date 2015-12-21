function init() {
  System.baseURL = "modules/"
  CLIQZ.System = System;
  System.import("freshtab/news").then(function (module) {
    CliqzFreshTabNews = module.default;
    osBridge.isReady();
    CLIQZEnvironment.initHomepage();
  }).catch(function () {
    console.log("error", arguments)
  });
};

/**
  Parameter format
  cfg = {
    "t": 123, // long, millis
    "q": "pippo", // string, last query
    "card": 1, // int, index of displayed card
    "lat": 41.00, // float, optional, latitude
    "lon": 13.00, // float, optional, longitude
    "title": "Pippo Pollina", // string, optional, webpage title
    "url": "http://pippopollina.com", // string, optional, last visited webpage
  }
*/
function resume(cfg) {
  var start = document.getElementById("freshstart");
  if(cfg.url && cfg.url.length > 0) {
    var elem = document.createElement('a');
    elem.setAttribute('onclick', 'osBridge.openLink("' + cfg.url + '")');
    elem.innerHTML = cfg.title;
    start.removeChild(start.firstChild);
    start.appendChild(elem);
  } 
  else if(cfg.q && cfg.q.length > 0) {
    var location_enabled = !!cfg.lat && !!cfg.lon;
    var elem = document.createElement('a');
    elem.setAttribute('onclick', 'search_mobile("' + cfg.q + '", ' + location_enabled + ', ' + cfg.lat + ', ' + cfg.lon + ')');
    elem.innerHTML = cfg.q;
    start.removeChild(start.firstChild);
    start.appendChild(elem);
  }
}

CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}

window.addEventListener('load', init);