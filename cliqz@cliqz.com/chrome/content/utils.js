'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

var EXPORTED_SYMBOLS = ['CLIQZ'];

var PREF_STRING = 32,
    PREF_INT = 64,
    PREF_BOOL = 128;

var CLIQZ = CLIQZ || {};
CLIQZ.Utils = CLIQZ.Utils || {
  HOST:             'http://beta.cliqz.com',
  SUGGESTIONS:      'https://www.google.com/complete/search?client=firefox&q=',
  RESULTS_PROVIDER: 'http://webbeta.cliqz.com/api/cliqz-results?q=',
  LOG:              'http://logging.cliqz.com',
  CLIQZ_URL:        'http://beta.cliqz.com/',
  VERSION_URL:      'http://beta.cliqz.com/version',
  //UPDATE_URL:     'http://beta.cliqz.com/latest',
  UPDATE_URL:       'chrome://cliqz/content/update.html',
  TUTORIAL_URL:     'http://beta.cliqz.com/anleitung',
  INSTAL_URL:       'http://beta.cliqz.com/code-verified',
  CHANGELOG:        'http://beta.cliqz.com/changelog',
  SEPARATOR:        ' %s ',

  cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),

  _log: Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService),
  init: function(){
    //use a different suggestion API
    if(CLIQZ.Utils.cliqzPrefs.prefHasUserValue('suggestionAPI')){
      CLIQZ.Utils.SUGGESTIONS = CLIQZ.Utils.getPref('suggestionAPI');
    }
    //use a different results API
    if(CLIQZ.Utils.cliqzPrefs.prefHasUserValue('resultsAPI')){
      CLIQZ.Utils.RESULTS_PROVIDER = CLIQZ.Utils.getPref('resultsAPI');
    }
    CLIQZ.Utils.loadLocale();
    CLIQZ.Utils.log('Initialized', 'UTILS');
  },
  httpHandler: function(method, url, callback, onerror, data){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open(method, url, true);
    req.overrideMimeType('application/json');
    req.onload = function(){ callback && callback(req); }
    req.onerror = function(){ onerror && onerror(); }

    if(callback)req.timeout = 1000;
    req.send(data);
    return req;
  },
  httpGet: function(url, callback, onerror){
    return CLIQZ.Utils.httpHandler('GET', url, callback, onerror);
  },
  httpPost: function(url, callback, data, onerror) {
    CLIQZ.Utils.httpHandler('POST', url, callback, onerror, data);
  },
  getPrefs: function(){
    var prefs = {};
    for(var pref of CLIQZ.Utils.cliqzPrefs.getChildList('')){
      prefs[pref] = CLIQZ.Utils.getPref(pref);
    }
    return prefs;
  },
  getPref: function(pref){
    switch(CLIQZ.Utils.cliqzPrefs.getPrefType(pref)) {
      case PREF_BOOL: return CLIQZ.Utils.cliqzPrefs.getBoolPref(pref);
      case PREF_STRING: return CLIQZ.Utils.cliqzPrefs.getCharPref(pref);
      case PREF_INT: return CLIQZ.Utils.cliqzPrefs.getIntPref(pref);
    }
  },
  setPref: function(pref, val){
    switch (typeof val) {
      case 'boolean':
        CLIQZ.Utils.cliqzPrefs.setBoolPref(pref, val);
        break;
      case 'number':
        CLIQZ.Utils.cliqzPrefs.setIntPref(pref, val);
        break;
      case 'string':
        CLIQZ.Utils.cliqzPrefs.setCharPref(pref, val);
        break;
      }
  },
  log: function(msg, key){
    if(CLIQZ.Utils.cliqzPrefs.getBoolPref('showDebugLogs')){
      CLIQZ.Utils._log.logStringMessage(key + ' : ' + msg);
    }
  },
  getDay: function() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  cleanMozillaActions: function(url){
    if(url.indexOf("moz-action:") == 0) {
        var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$/);
        url = param;
    }
    return url;
  },
  getDetailsFromUrl: function(originalUrl){
    originalUrl = CLIQZ.Utils.cleanMozillaActions(originalUrl);
    // exclude protocol
    var url = originalUrl,
        name = originalUrl,
        tld = '',
        subdomains = [],
        path = '',
        ssl = originalUrl.indexOf('https') == 0,
        protocolPos = url.indexOf('://');


    if(protocolPos != -1 && protocolPos <= 6){
      url = url.split('://')[1];
    }
    // extract only hostname
    var host = url.split('/')[0].toLowerCase();

    try {
      var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                                  .getService(Components.interfaces.nsIEffectiveTLDService);

      var tld = eTLDService.getPublicSuffixFromHost(host);
      var path = url.replace(host,'');

      // Get the domain name w/o subdomains and w/o TLD
      var tld_with_prefix_dot = "." + tld;
      var name = host.replace(tld_with_prefix_dot, "").split(".").pop();
      // Get subdomains
      var name_tld = name + "." + tld;
      var subdomains = host.replace(name_tld, "").split(".").slice(0, -1);
      //remove www if exists
      host = host.indexOf('www.') == 0 ? host.slice(4) : host;
    } catch(e){
      CLIQZ.Utils.log('getDetailsFromUrl Failed for: ' + originalUrl, 'WARNING');
    }

    var urlDetails = {
              name: name,
              tld: tld,
              subdomains: subdomains,
              path: path,
              host: host,
              ssl: ssl
        };

    return urlDetails;
  },
  // used for messages in urlbar and the url does not need to be complete (eg: no protocol)
  isUrl: function(input){
    var pattern = new RegExp(//'^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  // checks if a value represents an url which is a seach engine
  isSearch: function(value){
    if(CLIQZ.Utils.isUrl(value)){
       return CLIQZ.Utils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true: false;
    }
    return false;
  },
  // checks if a string is a complete url
  isCompleteUrl: function(input){
    var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  _suggestionsReq: null,
  getSuggestions: function(q, callback){
    CLIQZ.Utils._suggestionsReq && CLIQZ.Utils._suggestionsReq.abort();
    CLIQZ.Utils._suggestionsReq = CLIQZ.Utils.httpGet(CLIQZ.Utils.SUGGESTIONS + encodeURIComponent(q),
                                    function(res){
                                      callback && callback(res, q);
                                    });
  },
  _resultsReq: null,
  getCachedResults: function(q, callback){
    CLIQZ.Utils._resultsReq && CLIQZ.Utils._resultsReq.abort();
    CLIQZ.Utils._resultsReq = CLIQZ.Utils.httpGet(CLIQZ.Utils.RESULTS_PROVIDER + encodeURIComponent(q),
                                function(res){
                                  callback && callback(res, q);
                                });
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return 'T';
    else if(type === 'bookmark') return 'B';
    else if(type === 'tag') return 'B'; // bookmarks with tags
    else if(type === 'favicon') return 'H';
    else if(type === 'cliqz-results') return 'R';
    else if(type === 'cliqz-suggestions') return 'S';
    else if(type === 'cliqz-custom') return 'C';

    return type; //fallback to style - it should never happen
  },
  getLatestVersion: function(callback, error){
    CLIQZ.Utils.httpGet(CLIQZ.Utils.VERSION_URL + '?' + Math.random(), function(res) {
      if(res.status == 200) callback(res.response);
      else error();
    });
  },
  stopSearch: function(){
    CLIQZ.Utils._resultsReq && CLIQZ.Utils._resultsReq.abort();
    CLIQZ.Utils._suggestionsReq && CLIQZ.Utils._suggestionsReq.abort();
  },
  shouldLoad: function(window){
    return CLIQZ.Utils.cliqzPrefs.getBoolPref('inPrivateWindows') || !CLIQZ.Utils.isPrivate(window);
  },
  isPrivate: function(window) {
    try {
          // Firefox 20+
          Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
          return PrivateBrowsingUtils.isWindowPrivate(window);
        } catch(e) {
          // pre Firefox 20 (if you do not have access to a doc.
          // might use doc.hasAttribute('privatebrowsingmode') then instead)
          try {
            var inPrivateBrowsing = Components.classes['@mozilla.org/privatebrowsing;1'].
                                    getService(Components.interfaces.nsIPrivateBrowsingService).
                                    privateBrowsingEnabled;
            return inPrivateBrowsing;
          } catch(ex) {
            Components.utils.reportError(ex);
            return;
          }
        }
  },
  addStylesheetToDoc: function(doc, path) {
    var stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = path;
    stylesheet.type = 'text/css';
    stylesheet.style.display = 'none';
    doc.documentElement.appendChild(stylesheet);

    return stylesheet;
  },
  trk: [],
  trkTimer: null,
  track: function(msg, instantPush) {
    CLIQZ.Utils.log(JSON.stringify(msg), 'Utils.track');
    if(CLIQZ.Utils.cliqzPrefs.getBoolPref('dnt'))return;
    msg.session = CLIQZ.Utils.cliqzPrefs.getCharPref('session');
    msg.ts = (new Date()).getTime();

    CLIQZ.Utils.trk.push(msg);
    CLIQZ.Utils.clearTimeout(CLIQZ.Utils.trkTimer);
    if(instantPush || CLIQZ.Utils.trk.length > 100){
      CLIQZ.Utils.pushTrack();
    } else {
      CLIQZ.Utils.trkTimer = CLIQZ.Utils.setTimeout(CLIQZ.Utils.pushTrack, 60000);
    }
  },
  pushTrack: function() {
    CLIQZ.Utils.log('push tracking data: ' + CLIQZ.Utils.trk.length + ' elements');
    CLIQZ.Utils.httpPost(CLIQZ.Utils.LOG, null, JSON.stringify(CLIQZ.Utils.trk));
    CLIQZ.Utils.trk = [];
  },
  timers: [],
  setTimer: function(func, timeout, type, param) {
    var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    CLIQZ.Utils.timers.push(timer);
    var event = {
      notify: function (timer) {
        func(param);
      }
    };
    timer.initWithCallback(event, timeout, type);
    return timer;
  },
  setTimeout: function(func, timeout, param) {
    return CLIQZ.Utils.setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT, param);
  },
  setInterval: function(func, timeout) {
    return CLIQZ.Utils.setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },
  clearTimeout: function(timer) {
    if (!timer) {
      return;
    }
    timer.cancel();
    var i = CLIQZ.Utils.timers.indexOf(timer);
    if (i >= 0) {
      CLIQZ.Utils.timers.splice(CLIQZ.Utils.timers.indexOf(timer), 1);
    }
  },
  clearInterval: this.clearTimeout,
  loadFile: function (fileName, callback) {
    var self = this;
    $.ajax({
        url: fileName,
        dataType: 'text',
        success: callback,
        error: function(data){ callback(data.responseText); }
    });
  },
  locale: {},
  loadLocale : function(){
    CLIQZ.Utils.httpGet('chrome://cliqzres/content/locale/de-DE/cliqz.json',
        function(req){
            CLIQZ.Utils.locale = JSON.parse(req.response);
        });
  },
  getLocalizedString: function(key){
    return (CLIQZ.Utils.locale[key] && CLIQZ.Utils.locale[key].message) || key;
  },
  openOrReuseAnyTab: function(newUrl, oldUrl, onlyReuse) {
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator),
        browserEnumerator = wm.getEnumerator('navigator:browser'),
        found = false;

    while (!found && browserEnumerator.hasMoreElements()) {
        var browserWin = browserEnumerator.getNext();
        var tabbrowser = browserWin.gBrowser;

        // Check each tab of this browser instance
        var numTabs = tabbrowser.browsers.length;
        for (var index = 0; index < numTabs; index++) {
            var currentBrowser = tabbrowser.getBrowserAtIndex(index);
            if (currentBrowser.currentURI.spec.indexOf(oldUrl) === 0) {
                var tab = tabbrowser.tabContainer.childNodes[index];
                // The URL is already opened. Select this tab.
                tabbrowser.selectedTab = tab;

                // redirect tab to new url
                tab.linkedBrowser.contentWindow.location.href = newUrl;

                // Focus *this* browser-window
                browserWin.focus();

                found = true;
                break;
            }
        }
    }
    // oldUrl is not open
    if (!found && !onlyReuse) {
        var recentWindow = wm.getMostRecentWindow("navigator:browser");
        if (recentWindow) {
          // Use an existing browser window
          recentWindow.delayedOpenTab(newUrl, null, null, null, null);
        }
        else {
          // No browser windows are open, so open a new one.
          try {
            window.open(newUrl);
          } catch(e){
            // just in case this branch gets executed during bootstraping process (window can be null)
          }
        }
    }
  },
  version: function(callback){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                     .getService(Components.interfaces.nsIWindowMediator),
        win = wm.getMostRecentWindow("navigator:browser");
      win.Application.getExtensions(function(extensions) {
            callback(extensions.get('cliqz@cliqz.com').version);
      });
  },
  extensionRestart: function(){
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        //win.CLIQZ.Core.restart();
        win.CLIQZ.Core.destroy();
        win.CLIQZ.Core.init();
    }
  },
  isWindows: function(){
    return window.navigator.userAgent.indexOf('Win') != -1;
  },

  getSearchEngines: function(){
    var CORE_ENGINES = {
      'Google': true,
      'Bing': true,
      'Yahoo': true
    };

    var engines = {};
    for(var engine of Services.search.getEngines()){
      engines[engine.name] = {
        prefix: '#' + engine.name.substring(0,2).toLowerCase() + ' ',
        name: engine.name,
        getSubmission: engine.getSubmission,
        icon: engine.iconURI.spec,
        core: CORE_ENGINES[engine.name],
        default: Services.search.defaultEngine.name == engine.name
      }
    }
    return engines;
  },
  setCurrentSearchEngine: function(engine){
    var searchPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.search.');

    searchPrefs.setCharPref('defaultenginename', engine);
    searchPrefs.setCharPref('selectedEngine', engine);
  },
  hasCustomEngine: function(q){
    var engines = CLIQZ.Utils.getSearchEngines();
    for(var name in engines){
        var engine = engines[name];
        if(q.indexOf(engine.prefix) == 0 && q.length > engine.prefix.length){
            return engine;
        }
    }

    return null;
  },
  // returns the suggestion title + target search engine
  createSuggestionTitle: function(q, engine, originalQ) {
    var elements = [];

    elements.push([CLIQZ.Utils.getLocalizedString('searchForBegin'), 'cliqz-ac-title-suggestion-desc']);
    if(originalQ){
      if(q.indexOf(originalQ) == 0){
        elements.push([originalQ, 'cliqz-ac-title-suggestion']);
        elements.push([q.slice(originalQ.length), 'cliqz-ac-title-suggestion-extra']);
      } else {
        elements.push([q, 'cliqz-ac-title-suggestion-extra']);
      }
    } else {
      elements.push([q, 'cliqz-ac-title-suggestion']);
    }
    elements.push([CLIQZ.Utils.getLocalizedString('searchForEnd'), 'cliqz-ac-title-suggestion-desc']);
    elements.push([engine || Services.search.defaultEngine.name, 'cliqz-ac-title-suggestion-desc']);

    return JSON.stringify(elements);
  },
  navigateToItem: function(gBrowser, index, item, actionType, newTab){
      var action = {
              type: 'activity',
              action: actionType,
              current_position: index
          };

      if(actionType == 'result_click')action.new_tab = true;
      if(index != -1){
          var value = item.getAttribute('url');

          var source = item.getAttribute('source');
          if(source.indexOf('action') > -1){
              source = 'tab_result';
          }
          action.position_type = source.replace('-', '_').replace('tag', 'bookmark');
          action.search = CLIQZ.Utils.isSearch(value);
          if(item.getAttribute('type') === 'cliqz-suggestions'){
              value = Services.search.defaultEngine.getSubmission(value).uri.spec;
          }
          else if(value.indexOf('http') !== 0) value = 'http://' + value;

          // TEMP - EXPERIMENTAL
          //if(CLIQZ.Utils.cliqzPrefs.getBoolPref('pagePreload')){
          // ENDTEMP
          CLIQZ.Core.locationChangeTO = setTimeout(function(){
              if(newTab) gBrowser.addTab(value);
              else gBrowser.selectedBrowser.contentDocument.location = value;

          }, 500);

          //}
      }
      CLIQZ.Utils.track(action);
  },
  performance: {
    backend: function(delay){
        var INPUT='facebook,twitter,maria,randomlong,munich airport,lady gaga iphone case'.split(','),
            reqtimes = {}, statistics = [];

        function send_test(){
          var start = 1000;
          for(var word in INPUT){
            var t = ''
            for(var key in INPUT[word]){
              t+=INPUT[word][key];
              CLIQZ.Utils.log(t, 'PERFORMANCE');
              setTimeout(function(t){
                reqtimes[t] = new Date();
                CLIQZ.Utils.getCachedResults(t, receive_test)
              }, start, t);

              start += delay || (150 + (Math.random() * 100));
            }
          }
          setTimeout(function(){
            var stats =[0, 0, 0, 0];
            for(var i=0; i < statistics.length; i++){
                for(var j=0; j<4; j++) stats[j] += statistics[i][j];
            }
            for(var j=0; j<4; j++) stats[j] = (stats[j] / statistics.length).toFixed(2);
            CLIQZ.Utils.log(' ', 'PERFORMANCE');
            CLIQZ.Utils.log('RESULT', 'PERFORMANCE');
            CLIQZ.Utils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
            CLIQZ.Utils.log(stats.join(' \t \t '), 'PERFORMANCE');
          }, start);
          CLIQZ.Utils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
        }

        function receive_test(ev){
          var end = new Date(),
            r = JSON.parse(ev.response),
            q = r['cache'][0]['q'],
            end1 = new Date();

          var elapsed = Math.round(end - reqtimes[q]);

          var point = [
              elapsed,
              Math.round(r.duration),
              Math.round(r._suggestions),
              Math.round(r._bulk_snippet_duration),
              q
            ]
          statistics.push(point);

          CLIQZ.Utils.log(point.join(' \t\t '), 'PERFORMANCE');
        }

        send_test()
    }
  }
};
