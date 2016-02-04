function init() {
  System.baseURL = "modules/"
  CLIQZ.System = System;

  System.import("freshtab/news").then(function (module) {
    CliqzFreshTabNews = module.default;
    osBridge.isReady();
    tryInit();
  }).catch(function () {
    console.log("error", arguments)
  });
};

osBridge.getTopSites("CLIQZEnvironment.displayTopSites", 5);

var tries=20;

function tryInit(){
  //ugly hack to wait for logos

  if(tries-- == 0 || CliqzUtils.BRANDS_DATABASE.palette.length > 1)
    CLIQZEnvironment.initHomepage(true);

  else setTimeout(tryInit, 100)
}

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
function resetState(cfg) {
  var start = document.getElementById("freshstart");
  var freshstartContent = document.getElementById("freshstartContent");
  start.style.display = "block";
  var resultsBox = document.getElementById("results");
  if(resultsBox) {
    resultsBox.style.display = 'none';
  }
  window.document.getElementById("startingpoint").style.display = 'block';
  if(cfg.url && cfg.url.length > 0) {
    var elem = document.createElement('a');
    elem.setAttribute('onclick', 'osBridge.openLink("' + cfg.url + '")');
    elem.innerHTML = cfg.title;
    freshstartContent.innerHTML = "";
    freshstartContent.appendChild(elem);
  } 
  else if(cfg.q && cfg.q.length > 0) {
    var location_enabled = !!cfg.lat && !!cfg.lon;
    var elem = document.createElement('a');
    elem.setAttribute('onclick', 'osBridge.notifyQuery("' + cfg.q + '", ' + location_enabled + ', ' + cfg.lat + ', ' + cfg.lon + ')');
    elem.innerHTML = cfg.q;
    freshstartContent.innerHTML = "";
    freshstartContent.appendChild(elem);
  }
}

CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}

window.addEventListener('load', init);
