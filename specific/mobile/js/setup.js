
function init() {
  System.baseURL = "modules/"
  CLIQZ.System = System;
  CliqzUtils.initPlatform(System);
  /*System.import("freshtab/news").then(function (module) {
    CliqzFreshTabNews = module.default;
    osBridge.isReady();
    tryInit();
  }).catch(function () {
    console.log("error", arguments)
  });*/
  try{
    
    tryInit();
  } catch(e) {
    console.error(e);
  }
};

osBridge.getTopSites("CLIQZEnvironment.displayTopSites", 5);

var tries=20;

function tryInit(){
    CLIQZEnvironment.initHomepage(true);
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
  CLIQZEnvironment.getNews();
  var start = document.getElementById("freshstart");
  var freshstartContent = document.getElementById("freshstartContent");
  var resultsBox = document.getElementById("results");
  if(resultsBox) {
    resultsBox.style.display = 'none';
  }
  if(cfg.url && cfg.url.length > 0) {
    start.style.display = "block";
    window.document.getElementById("startingpoint").style.display = 'block';
    var elem = document.createElement('a');
    elem.setAttribute('onclick', 'osBridge.openLink("' + cfg.url + '")');
    elem.innerHTML = cfg.title;
    freshstartContent.innerHTML = "";
    freshstartContent.appendChild(elem);
  } 
  else if(cfg.q && cfg.q.length > 0) {
    start.style.display = "block";
    window.document.getElementById("startingpoint").style.display = 'block';
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
