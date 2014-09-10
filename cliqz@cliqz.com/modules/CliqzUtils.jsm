'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm');

//XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
//  'chrome://cliqzmodules/content/CliqzTimings.jsm');

var EXPORTED_SYMBOLS = ['CliqzUtils'];

var VERTICAL_ENCODINGS = {
    'people':'p',
    'census':'c',
    'news':'n',
    'weather':'w',
    'bundesliga':'b',
    'video':'v',
    'hq':'h',
    'shopping':'s',
    'science':'k',
    'gaming':'g',
    'dictionary':'l',
    'qaa':'q'
};

var CliqzUtils = {
  HOST:             'https://beta.cliqz.com',
  SUGGESTIONS:      'https://www.google.com/complete/search?client=firefox&q=',
  RESULTS_PROVIDER: 'https://webbeta.cliqz.com/api/v1/results?q=',
  LOG:              'https://logging.cliqz.com',
  CLIQZ_URL:        'https://beta.cliqz.com/',
  UPDATE_URL:       'chrome://cliqz/content/update.html',
  TUTORIAL_URL_OLD: 'https://beta.cliqz.com/erste-schritte',
  TUTORIAL_URL:     'chrome://cliqz/content/offboarding.html',
  INSTAL_URL:       'https://beta.cliqz.com/code-verified',
  CHANGELOG:        'https://beta.cliqz.com/changelog',
  UNINSTALL:        'https://beta.cliqz.com/deinstall.html',
  PREF_STRING:      32,
  PREF_INT:         64,
  PREF_BOOL:        128,
  cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),

  _log: Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService),
  init: function(window){
    //use a different suggestion API
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('suggestionAPI')){
      //CliqzUtils.SUGGESTIONS = CliqzUtils.getPref('suggestionAPI');
    }
    //use a different results API
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('resultsAPI')){
      //CliqzUtils.RESULTS_PROVIDER = CliqzUtils.getPref('resultsAPI');
    }
    if (window && window.navigator) {
        // See http://gu.illau.me/posts/the-problem-of-user-language-lists-in-javascript/
        var nav = window.navigator;
        var PREFERRED_LANGUAGE = nav.language || nav.userLanguage
            || nav.browserLanguage || nav.systemLanguage || 'en';
        CliqzUtils.loadLocale(PREFERRED_LANGUAGE);
    }
    CliqzUtils.log('Initialized', 'UTILS');
  },
  httpHandler: function(method, url, callback, onerror, timeout, data){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open(method, url, true);
    req.overrideMimeType('application/json');
    req.onload = function(){
      if(req.status != 200 && req.status != 0 /* local files */){
        CliqzUtils.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
        onerror && onerror();
      } else {
        callback && callback(req);
      }
    }
    req.onerror = function(){
      CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
      onerror && onerror();
    }
    req.ontimeout = function(){
      if(CliqzUtils){ //might happen after disabling the extension
        CliqzUtils.log( "timeout for " + url, "CliqzUtils.httpHandler");
        onerror && onerror();
      }
    }

    if(callback){
      if(timeout){
        req.timeout = parseInt(timeout)
      } else {
        req.timeout = (method == 'POST'? 2000 : 1000);
      }
    }
    req.send(data);
    return req;
  },
  httpGet: function(url, callback, onerror, timeout){
    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout);
  },
  httpPost: function(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
  },
  /**
   * Loads a resource URL from the xpi.
   *
   * Wraps httpGet in a try-catch clause. We need to do this, because when
   * trying to load a non-existing file from an xpi via xmlhttprequest, Firefox
   * throws a NS_ERROR_FILE_NOT_FOUND exception instead of calling the onerror
   * function.
   *
   * @see https://bugzilla.mozilla.org/show_bug.cgi?id=827243 (probably).
   */
  loadResource: function(url, callback, onerror) {
    try {
        return CliqzUtils.httpGet(url, callback, onerror, 3000);
    } catch (e) {
      CliqzUtils.log("Could not load resource " + url + " from the xpi",
                     "CliqzUtils.httpHandler");
      onerror && onerror();
    }
  },
  getPrefs: function(){
    var prefs = {},
        cqz = CliqzUtils.cliqzPrefs.getChildList('');
    for(var i=0; i>cqz.length; i++){
      var pref = cqz[i];
      prefs[pref] = CliqzUtils.getPref(pref);
    }
    return prefs;
  },
  getPref: function(pref, notFound){
    try{
      var prefs = CliqzUtils.cliqzPrefs;
      switch(prefs.getPrefType(pref)) {
        case CliqzUtils.PREF_BOOL: return prefs.getBoolPref(pref);
        case CliqzUtils.PREF_STRING: return prefs.getCharPref(pref);
        case CliqzUtils.PREF_INT: return prefs.getIntPref(pref);
        default: return notFound;
      }
    } catch(e){
      return notFound;
    }
  },
  setPref: function(pref, val){
    switch (typeof val) {
      case 'boolean':
        CliqzUtils.cliqzPrefs.setBoolPref(pref, val);
        break;
      case 'number':
        CliqzUtils.cliqzPrefs.setIntPref(pref, val);
        break;
      case 'string':
        CliqzUtils.cliqzPrefs.setCharPref(pref, val);
        break;
      }
  },
  log: function(msg, key){
    if(CliqzUtils && CliqzUtils.getPref('showDebugLogs', false)){
      CliqzUtils._log.logStringMessage(key + ' : ' + msg);
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
    originalUrl = CliqzUtils.cleanMozillaActions(originalUrl);
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
    // extract only path
    var path = url.replace(host,'');

    try {
      var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                                  .getService(Components.interfaces.nsIEffectiveTLDService);

      var tld = eTLDService.getPublicSuffixFromHost(host);

      // Get the domain name w/o subdomains and w/o TLD
      var tld_with_prefix_dot = "." + tld;
      var name = host.replace(tld_with_prefix_dot, "").split(".").pop();
      // Get subdomains
      var name_tld = name + "." + tld;
      var subdomains = host.replace(name_tld, "").split(".").slice(0, -1);
      //remove www if exists
      host = host.indexOf('www.') == 0 ? host.slice(4) : host;
    } catch(e){
      CliqzUtils.log('getDetailsFromUrl Failed for: ' + originalUrl, 'WARNING');
    }

    var urlDetails = {
              name: name,
              domain: name + tld,
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
    '(\\:\\d+)?(\\/[-a-z\\d%_.\\(\\)~+]*)*'+ // port and path
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
    if(CliqzUtils.isUrl(value)){
       return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true: false;
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
    var locales = CliqzLanguage.state();
    var local_param = "";
    if(locales.length > 0)
      local_param = "&hl=" + encodeURIComponent(locales[0]);

    CliqzUtils._suggestionsReq && CliqzUtils._suggestionsReq.abort();
    CliqzUtils._suggestionsReq = CliqzUtils.httpGet(CliqzUtils.SUGGESTIONS + encodeURIComponent(q) + local_param,
      function(res){
        callback && callback(res, q);
      }
    );
  },
  _resultsReq: null,
  getCliqzResults: function(q, callback){
    CliqzUtils._resultsReq && CliqzUtils._resultsReq.abort();
    CliqzUtils._resultsReq = CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER + encodeURIComponent(q) +
                                                CliqzLanguage.stateToQueryString() + CliqzUtils.encodeCountry(),
                                function(res){
                                  callback && callback(res, q);
                                });
  },
  getWorldCup: function(q, callback){
    var WORLD_CUP_API= 'http://worldcup.sfg.io/matches/today/?by_date=asc&rand=' + Math.random();
    CliqzUtils.httpGet(WORLD_CUP_API, function(res){
      callback && callback(res, q);
    });
  },
  encodeCountry: function() {
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('forceCountry')){
      return "&country=" + CliqzUtils.getPref('forceCountry')
    } else {
      return ""
    }
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return 'T';
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type === 'cliqz-weather') return 'w';
    else if(type === 'cliqz-bundesliga') return 'b';
    else if(type === 'cliqz-cluster') return 'C';
    else if(type === 'cliqz-series') return 'S';
    else if(type.indexOf('bookmark') == 0) return 'B' + CliqzUtils.encodeCliqzResultType(type);
    else if(type.indexOf('tag') == 0) return 'B' + CliqzUtils.encodeCliqzResultType(type); // bookmarks with tags
    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return 'H' + CliqzUtils.encodeCliqzResultType(type);
    else if(type === 'cliqz-suggestions') return 'S';
    // cliqz type = "cliqz-custom sources-XXXXX"
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type; //fallback to style - it should never happen
  },
  // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
  encodeCliqzResultType: function(type){
    var pos = type.indexOf('sources-')
    if(pos != -1)
      return CliqzUtils.encodeSources(type.substr(pos+8));
    else
      return ""
  },
  encodeSources: function(sources){
    return sources.split(', ').map(
      function(s){
        if(s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
          return 'd'
        else
          return VERTICAL_ENCODINGS[s] || s;
      }).join('');
  },
  combineSources: function(internal, cliqz){
    var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))

    return internal + " " + cliqz_sources
  },
  stopSearch: function(){
    CliqzUtils._resultsReq && CliqzUtils._resultsReq.abort();
    CliqzUtils._suggestionsReq && CliqzUtils._suggestionsReq.abort();
  },
  shouldLoad: function(window){
    return true; //CliqzUtils.cliqzPrefs.getBoolPref('inPrivateWindows') || !CliqzUtils.isPrivate(window);
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
    CliqzUtils.log(JSON.stringify(msg), 'Utils.track');
    if(CliqzUtils.cliqzPrefs.getBoolPref('dnt'))return;
    msg.session = CliqzUtils.cliqzPrefs.getCharPref('session');
    msg.ts = (new Date()).getTime();

    CliqzUtils.trk.push(msg);
    CliqzUtils.clearTimeout(CliqzUtils.trkTimer);
    if(instantPush || CliqzUtils.trk.length > 100){
      CliqzUtils.pushTrack();
    } else {
      CliqzUtils.trkTimer = CliqzUtils.setTimeout(CliqzUtils.pushTrack, 60000);
    }
  },
  _track_req: null,
  _track_sending: [],
  _track_start: undefined,
  TRACK_MAX_SIZE: 500,
  pushTrack: function() {
    if(CliqzUtils._track_req) return;

    // put current data aside in case of failure
    CliqzUtils._track_sending = CliqzUtils.trk.slice(0);
    CliqzUtils.trk = [];

    CliqzUtils._track_start = (new Date()).getTime();

    CliqzUtils.log('push tracking data: ' + CliqzUtils._track_sending.length + ' elements', "CliqzUtils.pushTrack");
    CliqzUtils._track_req = CliqzUtils.httpPost(CliqzUtils.LOG, CliqzUtils.pushTrackCallback, JSON.stringify(CliqzUtils._track_sending), CliqzUtils.pushTrackError);
  },
  pushTrackCallback: function(req){
    //CliqzTimings.add("send_log", (new Date()).getTime() - CliqzUtils._track_start)
    try {
      var response = JSON.parse(req.response);

      if(response.new_session){
        CliqzUtils.setPref('session', response.new_session);
      }
      CliqzUtils._track_sending = [];
      CliqzUtils._track_req = null;
    } catch(e){}
  },
  pushTrackError: function(req){
    // pushTrack failed, put data back in queue to be sent again later
    CliqzUtils.log('push tracking failed: ' + CliqzUtils._track_sending.length + ' elements', "CliqzUtils.pushTrack");
    //CliqzTimings.add("send_log", (new Date()).getTime() - CliqzUtils._track_start)
    CliqzUtils.trk = CliqzUtils._track_sending.concat(CliqzUtils.trk);

    // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
    var slice_pos = CliqzUtils.trk.length - CliqzUtils.TRACK_MAX_SIZE;
    if(slice_pos > 0){
      CliqzUtils.log('discarding ' + slice_pos + ' old tracking elements', "CliqzUtils.pushTrack");
      CliqzUtils.trk = CliqzUtils.trk.slice(slice_pos);
    }

    CliqzUtils._track_sending = [];
    CliqzUtils._track_req = null;
  },
  // references to all the timers to avoid garbage collection before firing
  // automatically removed when fired
  _timers: [],
  _setTimer: function(func, timeout, type, param) {
    var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    CliqzUtils._timers.push(timer);
    var event = {
      notify: function (timer) {
        func(param);
        CliqzUtils._removeTimerRef(timer);
      }
    };
    timer.initWithCallback(event, timeout, type);
    return timer;
  },
  _removeTimerRef: function(timer){
    var i = CliqzUtils._timers.indexOf(timer);
    if (i >= 0) {
      CliqzUtils._timers.splice(CliqzUtils._timers.indexOf(timer), 1);
    }
  },
  setTimeout: function(func, timeout, param) {
    return CliqzUtils._setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT, param);
  },
  clearTimeout: function(timer) {
    if (!timer) {
      return;
    }
    timer.cancel();
    CliqzUtils._removeTimerRef(timer);
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
  currLocale: null,
  loadLocale : function(lang_locale){
    //var ww = Components.classes['@mozilla.org/embedcomp/window-watcher;1']
    //                 .getService(Components.interfaces.nsIWindowWatcher);
    // The default language
    if (!CliqzUtils.locale.hasOwnProperty('default')) {
        CliqzUtils.loadResource('chrome://cliqzres/content/locale/de/cliqz.json',
            function(req){
                CliqzUtils.locale['default'] = JSON.parse(req.response);
            });
    }
    if (!CliqzUtils.locale.hasOwnProperty(lang_locale)) {
        CliqzUtils.loadResource('chrome://cliqzres/content/locale/'
                + encodeURIComponent(lang_locale) + '/cliqz.json',
            function(req) {
                CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                CliqzUtils.currLocale = lang_locale;
            },
            function() {
                // We did not find the full locale (e.g. en-GB): let's try just the
                // language!
                var loc = lang_locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/);
                CliqzUtils.loadResource(
                    'chrome://cliqzres/content/locale/' + loc[1] + '/cliqz.json',
                    function(req) {
                        CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                        CliqzUtils.currLocale = lang_locale;
                    }
                );
            }
        );
    }
  },
  getLocalizedString: function(key){
    if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale]
            && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
        return CliqzUtils.locale[CliqzUtils.currLocale][key].message;
    } else if (CliqzUtils.locale['default'] && CliqzUtils.locale['default'][key]) {
        return CliqzUtils.locale['default'][key].message;
    } else {
        return key;
    }
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
        //win.CLIQZ.Core.restart(true);
        if(win.CLIQZ && win.CLIQZ.Core){
          win.CLIQZ.Core.destroy(true);
          win.CLIQZ.Core.init();
        }
    }
  },
  isWindows: function(){
    return window.navigator.userAgent.indexOf('Win') != -1;
  },
  getWindow: function(){
    var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                        .getService(Components.interfaces.nsIWindowMediator);
    return wm.getMostRecentWindow("navigator:browser");
  },
  getWindowID: function(){
    var win = CliqzUtils.getWindow();
    var util = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
    return util.outerWindowID;
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
              CliqzUtils.log(t, 'PERFORMANCE');
              CliqzUtils.setTimeout(function(t){
                reqtimes[t] = new Date();
                CliqzUtils.getCliqzResults(t, receive_test)
              }, start, t);

              start += delay || (600 + (Math.random() * 100));
            }
          }
          CliqzUtils.setTimeout(function(){
            var stats =[0, 0, 0, 0];
            for(var i=0; i < statistics.length; i++){
                for(var j=0; j<4; j++) stats[j] += statistics[i][j];
            }
            for(var j=0; j<4; j++) stats[j] = (stats[j] / statistics.length).toFixed(2);
            CliqzUtils.log(' ', 'PERFORMANCE');
            CliqzUtils.log('RESULT', 'PERFORMANCE');
            CliqzUtils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
            CliqzUtils.log(stats.join(' \t \t '), 'PERFORMANCE');
          }, start);
          CliqzUtils.log(['total', 'mix', 'sug', 'snip', 'q'].join(' \t \t '), 'PERFORMANCE');
        }

        function receive_test(ev){
          var end = new Date(),
            r = JSON.parse(ev.response),
            q = r['q'],
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

          CliqzUtils.log(point.join(' \t\t '), 'PERFORMANCE');
        }

        send_test()
    }
  },
  getClusteringDomain: function(url) {
    var domains = ['ebay.de',
                   'amazon.de',
                   'github.com',
                   'facebook.com',
                   'klout.com',
                   'chefkoch.de',
                   'bild.de',
                   'basecamp.com',
                   'youtube.com',
                   'twitter.com',
                   'wikipedia.com',]
    for (var index = 0; index < domains.length; index++) {
      if (url.indexOf(domains[index]) > -1) return index;
    }
  },
  isUrlBarEmpty: function() {
    var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
    return urlbar.value.length == 0;
  }
};
