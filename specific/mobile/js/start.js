CliqzUtils.init(window);

// overriding things
CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}
// end of overriding things

var promises = [];

promises.push(System.import("mobile-ui/UI"));

promises.push(System.import("mobile-freshtab/news"));

Promise.all(promises).then(function (arr) {
  var UI = arr[0];
  var news = arr[1];
  // UI
  window.CLIQZ.UI = UI.default;
  window.CLIQZ.UI.init();


  // news
  window.News = news.default;


  // initialize
  CLIQZEnvironment.initHomepage(true);
  osBridge.isReady();
});

/* APIs for native */
// TODO: move into a different file

// search entry point
function search_mobile(e, location_enabled, latitude, longitude) {
  CLIQZEnvironment.search(e, location_enabled, latitude, longitude);
}

function setDefaultSearchEngine(engine) {
  CLIQZEnvironment.setDefaultSearchEngine(engine);
}

function getCardUrl() {
  var NOT_SHAREABLE_SIGNAL = '-1';
  if(CLIQZEnvironment.lastResults && CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage]) {
    osBridge.shareCard(CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage].url || NOT_SHAREABLE_SIGNAL);
  } else {
    osBridge.shareCard(NOT_SHAREABLE_SIGNAL);
  }
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
function resetState(cfg) {
  CLIQZEnvironment.initHomepage();
  var start = document.getElementById("resetState");
  var resetStateContent = document.getElementById("resetStateContent");
  var resultsBox = document.getElementById("results");
  if(resultsBox) {
    resultsBox.style.display = 'none';
  }
  if(cfg.url && cfg.url.length > 0) {
    start.style.display = "block";
    window.document.getElementById("startingpoint").style.display = 'block';
    var elem = document.createElement('div');
    elem.setAttribute('onclick', 'osBridge.openLink("' + cfg.url + '")');
    elem.innerHTML = cfg.title;
    resetStateContent.innerHTML = "";
    resetStateContent.appendChild(elem);
  }
  else if(cfg.q && cfg.q.length > 0) {
    start.style.display = "block";
    window.document.getElementById("startingpoint").style.display = 'block';
    var location_enabled = !!cfg.lat && !!cfg.lon;
    var elem = document.createElement('div');
    elem.setAttribute('onclick', 'osBridge.notifyQuery("' + cfg.q + '", ' + location_enabled + ', ' + cfg.lat + ', ' + cfg.lon + ')');
    elem.innerHTML = cfg.q;
    resetStateContent.innerHTML = "";
    resetStateContent.appendChild(elem);
  }
}
