import console from "../core/console";
import prefs from "../core/prefs";
import Storage from "../core/storage";
import CliqzUtils from "../core/utils";

//TODO: get rid of me!
var lastSucceededUrl;
var latestUrl;
const storage = new Storage();

// END TEMP
const TEMPLATES = Object.freeze(Object.assign(Object.create(null), {
  "Cliqz": true,
  "EZ-history": true,
  "calculator": true,
  "currency": true,
  "emphasis": true,
  "empty": true,
  "flightStatusEZ-2": true,
  "generic": true,
  "history": true,
  "main": true,
  "noResult": true,
  "rd-h3-w-rating": true,
  "results": true,
  "topnews": true,
  "topsites": true,
  "weatherAlert": true,
  "weatherEZ": true,
}));

var CLIQZEnvironment = {
  RESULTS_PROVIDER: 'https://api.cliqz.com/api/v2/results?q=',
  RICH_HEADER: 'https://api.cliqz.com/api/v2/rich-header?path=/v2/map',
  TEMPLATES_PATH: 'mobile-ui/templates/',
  LOCALE_PATH: 'static/locale/',
  RESULTS_LIMIT: 3,
  RERANKERS: [],
  RESULTS_TIMEOUT: 60000, // 1 minute
  TEMPLATES: TEMPLATES,
  KNOWN_TEMPLATES: {
      'entity-generic': true,
      'entity-video-1': true,
      'vod': true,
      'movie-vod': true
  },
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'rd-h3-w-rating',
  ],
  GOOGLE_ENGINE: {name:'Google', url: 'http://www.google.com/search?q='},
  //TODO: check if calling the bridge for each telemetry point is expensive or not
  telemetry: function(msg) {
    msg.ts = Date.now();
    osAPI.pushTelemetry(msg);
  },
  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CLIQZEnvironment.TEMPLATES[template] &&
            !CLIQZEnvironment.KNOWN_TEMPLATES.hasOwnProperty(template);
  },
  getBrandsDBUrl: function(version){
    //TODO - consider the version !!
    return 'static/brands_database.json'
  },
  resultsHandler: function (r) {

    if( CLIQZEnvironment.lastSearch !== r._searchString  ){
      console.log("u='"+CLIQZEnvironment.lastSearch+"'' s='"+r._searchString+"', returning","urlbar!=search");
      return;
    }

    r._results.splice(CLIQZEnvironment.RESULTS_LIMIT);

    window.CLIQZ.UI.renderResults(r);
  },
  search: function(e) {
    if(!e || e === '') {
      CLIQZEnvironment.lastSearch = '';
      CLIQZ.UI.stopProgressBar();
      CLIQZ.UI.lastResults = null;
      return;
    }

    e = decodeURIComponent(e);

    CLIQZEnvironment.setCurrentQuery(e);

    e = e.toLowerCase().trim();

    CLIQZEnvironment.lastSearch = e;

    window.CLIQZ.UI.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //CliqzUtils.log(e,'XHR');
    if (!CLIQZEnvironment.SEARCH) { CLIQZEnvironment.SEARCH = new Search();}

    CLIQZEnvironment.SEARCH.search(e, CLIQZEnvironment.resultsHandler);
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  OS: 'mobile',
  isPrivate: function(){ return false; },
  isOnPrivateTab: function(win) { return false; },
  getWindow: function(){ return window; },
  // TODO - SHOUD BE MOVED TO A LOGIC MODULE
  openLink: function(window, url){
    if(url !== '#')  {
      if( url.indexOf('http') === -1 ) {
        url = 'http://' + url;
      }
      osAPI.openLink(url);
    }

    return false;
  },
  //TODO: remove this dependency
  getSearchEngines: function(){
    return []
  },
  // mocked functions
  getEngineByName: function () {
    return '';
  },
  getEngineByAlias: function () {
    return '';
  },
  copyResult: function(val) {
    osAPI.copyResult(val);
  },
  addEventListenerToElements: function (elementSelector, eventType, listener) {
    Array.prototype.slice.call(document.querySelectorAll(elementSelector)).forEach(function (element) {
      element.addEventListener(eventType, listener);
    });
  },
  setDefaultSearchEngine: function(engine) {
    storage.setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    return storage.getObject('defaultSearchEngine', CLIQZEnvironment.GOOGLE_ENGINE);
  },
  addEngineWithDetails() {
  },
};

CLIQZEnvironment.setCurrentQuery = function(query) {

  if(prefs.get('incognito', false) || query.match(/http[s]{0,1}:/)) {
    return;
  }

  var recentItems = storage.getObject('recentQueries', []);

  if(!recentItems[0]) {
    recentItems = [{id: 1, query:query, timestamp:Date.now()}];
    storage.setObject('recentQueries', recentItems);
  } else if (recentItems[0].query === query && Date.now() - recentItems[0].timestamp < 10 * 1000 * 60) {
    // DO NOTHING
    // temporary work around repetitive queries coming from iOS
  } else if(recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 &&
          Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = {id: recentItems[0].id, query:query, timestamp:Date.now()};
    storage.setObject('recentQueries', recentItems);
  }
  else {
    recentItems.unshift({id: recentItems[0].id + 1, query:query,timestamp:Date.now()});
    recentItems = recentItems.slice(0,60);
    storage.setObject('recentQueries', recentItems);
  }
};

export default CLIQZEnvironment;
