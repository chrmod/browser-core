let eventIDs = {};
const port = chrome.runtime.connect({name: "encrypted-query"});
port.onMessage.addListener(function(response) {
    let cb = eventIDs[response.eID].cb;
    delete eventIDs[response.eID];
    cb && cb(response.data)
});

const CLIQZEnvironment = {
  LOG: 'https://logging.cliqz.com',
  BRANDS_DATA_URL: 'static/brands_database.json',
  TEMPLATES_PATH: 'modules/static/templates/',
  LOCALE_PATH: 'modules/static/locale/',
  MIN_QUERY_LENGHT_FOR_EZ: 0,
  RERANKERS: [],
  TEMPLATES: {'calculator': 1, 'clustering': 1, 'currency': 1, 'custom': 1, 'emphasis': 1, 'empty': 1,
    'generic': 1, /*'images_beta': 1,*/ 'main': 1, 'results': 1, 'text': 1, 'series': 1,
    'spellcheck': 1,
    'pattern-h1': 3, 'pattern-h2': 2, 'pattern-h3': 1, 'pattern-h3-cluster': 1,
    'pattern-hm': 1,
    'entity-portal': 3, 'topsites': 3,
    'celebrities': 2, 'Cliqz': 2, 'entity-generic': 2, 'noResult': 3, 'stocks': 2, 'weatherAlert': 3, 'entity-news-1': 3,'entity-video-1': 3,
    'entity-search-1': 2, 'flightStatusEZ-2': 2, 'weatherEZ': 2, 'commicEZ': 3,
    'news' : 1, 'people' : 1, 'video' : 1, 'hq' : 1,
    'ligaEZ1Game': 2,
    'ligaEZUpcomingGames': 3,
    'ligaEZTable': 3,
    'local-movie-sc':3,
    'local-cinema-sc':3,
    'local-data-sc': 2,
    'recipe': 3,
    'rd-h3-w-rating': 1,
    'ez-generic-2': 3,
    'cpgame_movie': 3,
    'delivery-tracking': 2,
    'vod': 3,
    'liveTicker': 3
  },
  MESSAGE_TEMPLATES: [
    'footer-message',
    'onboarding-callout',
    'onboarding-callout-extended',
    'slow_connection',
    'partials/location/missing_location_2',
    'partials/location/no-locale-data'
  ],
  PARTIALS: [
      'url',
      'logo',
      'EZ-category',
      'partials/ez-title',
      'partials/ez-url',
      'partials/ez-history',
      'partials/ez-description',
      'partials/ez-generic-buttons',
      'EZ-history',
      'rd-h3-w-rating',
      'pcgame_movie_side_snippet',
      'partials/location/local-data',
      'partials/location/missing_location_1',
      'partials/timetable-cinema',
      'partials/timetable-movie',
      'partials/streaming',
      'partials/lyrics'
  ],
  log: function(msg, key){
    console.log('[[' + key + ']]', msg);
  },
  trk: [],
  telemetry: (function(){
    var trkTimer = null,
        telemetrySending = [],
        TELEMETRY_MAX_SIZE = 500;

    function pushTelemetry() {
      // put current data aside in case of failure
      telemetrySending = CE.trk.slice(0);
      CE.trk = [];

      CE.httpHandler('POST', CE.LOG, pushTelemetryCallback,
          TelemetryError, 10000, JSON.stringify(telemetrySending));

      CE.log('push telemetry data: ' + telemetrySending.length + ' elements', 'Telemetry');
    }

    function pushTelemetryCallback(req){
      var response = JSON.parse(req.response);

      if(response.new_session){
        CE.setPref('session', response.new_session);
      }
      telemetrySending = [];
    }

    function pushTelemetryError(req){
      // pushTelemetry failed, put data back in queue to be sent again later
      CE.log('push telemetry failed: ' + telemetrySending.length + ' elements', 'Telemetry');
      CE.trk = telemetrySending.concat(CE.trk);

      // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
      var slice_pos = CE.trk.length - TELEMETRY_MAX_SIZE + 100;
      if(slice_pos > 0){
        CE.log('discarding ' + slice_pos + ' old telemetry data', 'Telemetry');
        CE.trk = CE.trk.slice(slice_pos);
      }

      telemetrySending = [];
    }

    return function(msg, instantPush) {
      if ((msg.type != 'environment') && CLIQZEnvironment.isPrivate())
        return;
      CE.log(msg, 'Utils.telemetry');
      msg.session = CE.getPref('session');
      msg.ts = Date.now();

      CE.trk.push(msg);
      CE.clearTimeout(trkTimer);

      if(instantPush || CE.trk.length % 100 == 0){
        pushTelemetry();
      } else {
        trkTimer = CE.setTimeout(pushTelemetry, 60000);
      }
    }
  })(),

  isUnknownTemplate: function(template){
     // in case an unknown template is required
     return template &&
            !CE.TEMPLATES[template]
  },
  getBrandsDBUrl: function(version){
    return 'https://cdn.cliqz.com/brands-database/database/' + version + '/data/database.json';
  },
  getPref: function(pref, notFound){
    var mypref;
    if(mypref = CE.getLocalStorage().getItem(pref)) {
      if(mypref == 'false') return false;
      if(mypref == 'true') return true;
      return isNaN(mypref) ? mypref : parseInt(mypref);
    } else {
      return notFound;
    }
  },
  setPref: function(pref, val){
    CE.getLocalStorage().setItem(pref,val);
  },
  hasPref: function(pref){
    return pref in CE.getLocalStorage();
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  Promise: Promise,
  tldExtractor: function(host){
    //temp
    return host.split('.').splice(-1)[0];
  },
  getLocalStorage: function(url) {
    return localStorage;
  },
  OS: 'chromium',
  isPrivate: function() { return chrome.extension.inIncognitoContext; },
  isOnPrivateTab: function(win) { return CE.isPrivate(); },
  getWindow: function(){ return { document: { getElementById() {} } } },
  XMLHttpRequest: XMLHttpRequest,
  httpHandler: function(method, url, callback, onerror, timeout, data, sync) {
    // Check if its a query and needs to sent via the encrypted channel.
    if(url.indexOf('newbeta.cliqz.com') > -1 && CLIQZEnvironment.getPref("hpn-query",false)) {
        let eID = Math.floor(Math.random() * 1000);
        eventIDs[eID] = {"cb": callback};
        let _q = url.replace(('https://newbeta.cliqz.com/api/v1/results?q='),"")
        let encrypted_query = {"action": "extension-query", "type": "cliqz", "ts": "", "ver": "1.5", "payload":_q }
        port.postMessage({msg: encrypted_query, eventID:eID});
    }
    else{
        var req = new CE.XMLHttpRequest();
        req.open(method, url, !sync)
        req.overrideMimeType && req.overrideMimeType('application/json');
        req.onload = function(){
          var statusClass = parseInt(req.status / 100);
          if(statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */){
            callback && callback(req);
          } else {
            onerror && onerror();
          }
        };
        req.onerror = function(){
          onerror && onerror();
        };

        req.ontimeout = function(){
          onerror && onerror();
        };

        if(callback && !sync){
          if(timeout){
            req.timeout = parseInt(timeout);
          } else {
            req.timeout = (method === 'POST'? 10000 : 1000);
          }
        }

        req.send(data);
        return req;
    }
  },

  historySearch: function(q, callback, searchParam, sessionStart) {
    chrome.cliqzSearchPrivate.queryHistory(q, (query, matches, finished) => {
      var res = matches.map(function(match) {
          return {
              value:   match.url,
              comment: match.description,
              style:   'favicon',
              image:   '',
              label:   ''
          };
      });
      callback({
        query: query,
        results: res,
        ready: true
      });
    });
  },

  openLink: function(win, url, newTab) {
    if (newTab)
      window.open(url);
    else
      window.location.href = url;
  },

  copyResult: function(val) {
    var backup = document.oncopy;
    try {
      document.oncopy = function(event) {
        event.clipboardData.setData("text/plain", val);
        event.preventDefault();
      };
      document.execCommand("copy", false, null);
    }
    finally {
      document.oncopy = backup;
    }
  },

  getSearchEngines: function(){
    return CE._ENGINES.map(function(e){
      e.getSubmissionForQuery = function(q){
          //TODO: create the correct search URL
          return e.searchForm.replace("{searchTerms}", q);
      }

      e.getSuggestionUrlForQuery = function(q){
          //TODO: create the correct search URL
          return e.suggestionUrl.replace("{searchTerms}", q);
      }

      return e;
    });
  },
  updateAlias: function(){},
  getEngineByAlias: function(alias) {
    return CE._ENGINES.find(engine => { return engine.alias === alias; });
  },
  getEngineByName: function(name) {
    return CE._ENGINES.find(engine => { return engine.name === name; });
  },
  getNoResults: function() {
    const engines = CE.getSearchEngines().map(e => {
      e.style = CE.getLogoDetails(
          CE.getDetailsFromUrl(e.searchForm)).style;
      e.text =  e.alias.slice(1);
      return e;
    });
    const defaultName = CE.getDefaultSearchEngine().name;

    return CE.Result.cliqzExtra({
      data: {
        template: 'noResult',
        text_line1: CE.getLocalizedString('noResultTitle'),
        // forwarding the query to the default search engine is not handled by CLIQZ but by Firefox
        // we should take care of CE specific case differently on alternative platforms
        text_line2: CE.getLocalizedString('noResultMessage', defaultName),
        search_engines: engines,
        //use local image in case of no internet connection
        cliqz_logo: CE.SKIN_PATH + "img/cliqz.svg"
      },
      subType: JSON.stringify({empty:true})
    });
  },

  setDefaultSearchEngine: function(engine) {
    CE.getLocalStorage().setObject('defaultSearchEngine', engine);
  },
  getDefaultSearchEngine: function() {
    for (let e of CE.getSearchEngines()) {
      if (e.default)
        return e;
    }
  },
  onRenderComplete: function(query, urls){
    chrome.cliqzSearchPrivate.processResults(query, urls);
  },
  disableCliqzResults: function () {
    CE.ExpansionsProvider.enable();
  },
  enableCliqzResults: function () {
    CE.ExpansionsProvider.disable();
  }
};
const CE = CLIQZEnvironment;  // Shorthand alias.

export default CLIQZEnvironment;
