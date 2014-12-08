'use strict';
/*
 * This module has a list of helpers used across the extension
 *  HTTP handlers
 *  URL manipulators
 *  Localization mechanics
 *  Common logging pipe
 *  Preferences(persistent storage) wrappers
 *  Browser helpers
 *  ...
 */

Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');

//XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
//  'chrome://cliqzmodules/content/CliqzTimings.jsm');

var EXPORTED_SYMBOLS = ['CliqzUtils'];

var VERTICAL_ENCODINGS = {
    'people':'p',
    'census':'c',
    'news':'n',
    'bundesliga':'b',
    'video':'v',
    'hq':'h',
    'shopping':'s',
    'science':'k',
    'gaming':'g',
    'dictionary':'l',
    'qaa':'q',
    'bm': 'm'
};

var CliqzUtils = {
  LANGS:                 {'de':'de', 'en':'en', 'fr':'fr'},
  HOST:                  'https://beta.cliqz.com',
  SUGGESTIONS:           'https://www.google.com/complete/search?client=firefox&q=',
  RESULTS_PROVIDER:      'https://webbeta.cliqz.com/api/v1/results?q=',
  RESULTS_PROVIDER_LOG:  'https://webbeta.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING: 'https://webbeta.cliqz.com/ping',
  CONFIG_PROVIDER:       'https://webbeta.cliqz.com/api/v1/config',
  LOG:                   'https://logging.cliqz.com',
  CLIQZ_URL:             'https://beta.cliqz.com/',
  UPDATE_URL:            'chrome://cliqz/content/update.html',
  TUTORIAL_URL:          'chrome://cliqz/content/offboarding.html',
  INSTAL_URL:            'https://beta.cliqz.com/code-verified',
  CHANGELOG:             'https://beta.cliqz.com/changelog',
  PREF_STRING:           32,
  PREF_INT:              64,
  PREF_BOOL:             128,
  PREFERRED_LANGUAGE:    null,

  cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),
  genericPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefBranch),
  _log: Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService),
  init: function(win){
    //use a different suggestion API
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('suggestionAPI')){
      //CliqzUtils.SUGGESTIONS = CliqzUtils.getPref('suggestionAPI');
    }
    if (win && win.navigator) {
        // See http://gu.illau.me/posts/the-problem-of-user-language-lists-in-javascript/
        var nav = win.navigator;
        CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en',
        CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
    }

    if(win)this.UNINSTALL = 'https://beta.cliqz.com/deinstall_' + CliqzUtils.getLanguage(win) + '.html';

    //set the custom restul provider
    CliqzUtils.CUSTOM_RESULTS_PROVIDER = CliqzUtils.getPref("customResultsProvider", null);
    CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING = CliqzUtils.getPref("customResultsProviderPing", null);
    CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG = CliqzUtils.getPref("customResultsProviderLog", null);

    CliqzUtils.log('Initialized', 'CliqzUtils');
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
      if(CliqzUtils){
        CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzUtils.httpHandler");
        onerror && onerror();
      }
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
        req.timeout = (method == 'POST'? 10000 : 1000);
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
    for(var i=0; i<cqz.length; i++){
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
      var ignore = JSON.parse(CliqzUtils.getPref('showDebugLogsIgnore', "[]"))
      if(ignore.indexOf(key) == -1) // only show the log message, if key is not in ignore list
        CliqzUtils._log.logStringMessage("CLIQZ " + (new Date()).toISOString() + " " + key + ' : ' + msg);
    }
  },
  getDay: function() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  //creates a random 'len' long string from the input space
  rand: function(len, _space){
      var ret = '', i,
          space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          sLen = space.length;

      for(i=0; i < len; i++ )
          ret += space.charAt(Math.floor(Math.random() * sLen));

      return ret;
  },
  cleanMozillaActions: function(url){
    if(url.indexOf("moz-action:") == 0) {
        var [, action, param] = url.match(/^moz-action:([^,]+),(.*)$/);
        url = param;
    }
    return url;
  },
  cleanUrlProtocol: function(url, cleanWWW){
    var protocolPos = url.indexOf('://');

    // removes protocol http(s), ftp, ...
    if(protocolPos != -1 && protocolPos <= 6)
      url = url.split('://')[1];

    // removes the www.
    if(cleanWWW && url.indexOf('www.') == 0)
      url = url.slice(4);

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
        ssl = originalUrl.indexOf('https') == 0;

    url = CliqzUtils.cleanUrlProtocol(url, false);
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
      //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
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
  _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
  isUrl: function(input){
    //step 1 remove eventual protocol
    var protocolPos = input.indexOf('://');
    if(protocolPos != -1 && protocolPos <= 6){
      input = input.slice(protocolPos+3)
    }
    //step2 remove path & everything after
    input = input.split('/')[0];
    //step3 run the regex
    return CliqzUtils._isUrlRegExp.test(input);
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

    CliqzUtils._suggestionsReq = CliqzUtils.httpGet(CliqzUtils.SUGGESTIONS + encodeURIComponent(q) + local_param,
      function(res){
        callback && callback(res, q);
      }
    );
  },
  _resultsReq: null,
  // establishes the connection
  pingCliqzResults: function(){
    if(CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING){
      //on timeout - permanently fallback to the default results provider
      CliqzUtils.httpHandler('HEAD', CliqzUtils.CUSTOM_RESULTS_PROVIDER_PING, null, function(){
        CliqzABTests.disable('1015_A');
      });
    }
    else {
      CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
    }
  },
  getCliqzResults: function(q, callback){
    CliqzUtils._querySeq++;
    var url = (CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER) +
              encodeURIComponent(q) +
              CliqzUtils.encodeQuerySession() +
              CliqzUtils.encodeQuerySeq() +
              CliqzLanguage.stateToQueryString() +
              CliqzUtils.encodeResultOrder() +
              CliqzUtils.encodeCountry();

    CliqzUtils._resultsReq = CliqzUtils.httpGet(url,
      function(res){
        callback && callback(res, q);
      }
    );
  },
  // IP driven configuration
  fetchAndStoreConfig: function(callback){
    CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER,
      function(res){
        if(res && res.response){
          try {
            var config = JSON.parse(res.response);
            for(var k in config){
              CliqzUtils.setPref('config_' + k, config[k]);
            }
          } catch(e){}
        }

        callback();
      },
      callback, //on error the callback still needs to be called
      2000
    );
  },
  getWorldCup: function(q, callback){
    var WORLD_CUP_API= 'http://worldcup.sfg.io/matches/today/?by_date=asc&rand=' + Math.random();
    CliqzUtils.httpGet(WORLD_CUP_API, function(res){
      callback && callback(res, q);
    });
  },
  encodeCountry: function() {
    var flag = 'forceCountry';
    return CliqzUtils.getPref(flag, false)?'&country=' + CliqzUtils.getPref(flag):'';
  },
  encodeResultElementType: function(el){
    return CliqzUtils.encodeResultElementType(el);
  },
  encodeResultType: function(type, subtype){
    var ret = type;

    if(type.indexOf('action') !== -1) return ['T'];
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type === 'cliqz-bundesliga') return ['b'];
    else if(type === 'cliqz-cluster') return ['C'];
    else if(type === 'cliqz-extra') return ['X'];
    else if(type === 'cliqz-series') return ['S'];

    else if(type.indexOf('bookmark') == 0 ||
            type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type === 'cliqz-suggestions') return ['S'];
    // cliqz type = "cliqz-custom sources-X"
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type + subtype;
  },
  isPrivateResultType: function(type) {
    return type[0] == 'H' || type[0] == 'B' || type[0] == 'T';
  },
  // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
  encodeCliqzResultType: function(type){
    var pos = type.indexOf('sources-')
    if(pos != -1)
      return CliqzUtils.encodeSources(type.substr(pos+8));
    else
      return [];
  },
  _querySession: '',
  _querySeq: 0,
  setQuerySession: function(querySession){
    CliqzUtils._querySession = querySession;
    CliqzUtils._querySeq = 0;
  },
  encodeQuerySession: function(){
    return CliqzUtils._querySession.length ? '&s=' + encodeURIComponent(CliqzUtils._querySession) : '';
  },
  encodeQuerySeq: function(){
    return CliqzUtils._querySession.length ? '&n=' + CliqzUtils._querySeq : '';
  },
  encodeSources: function(sources){
    return sources.toLowerCase().split(', ').map(
      function(s){
        if(s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
          return 'd'
        else
          return VERTICAL_ENCODINGS[s] || s;
      });
  },
  combineSources: function(internal, cliqz){
    var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))

    return internal + " " + cliqz_sources
  },
  shouldLoad: function(window){
    //always loads, even in private windows
    return true; //CliqzUtils.cliqzPrefs.getBoolPref('inPrivateWindows') || !CliqzUtils.isPrivate(window);
  },
  isPrivate: function(window) {
    try {
          // Firefox 20+
          Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
          return PrivateBrowsingUtils.isWindowPrivate(window);
        } catch(e) {
          // pre Firefox 20
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
    if(!CliqzUtils) return; //might be called after the module gets unloaded

    CliqzUtils.log(JSON.stringify(msg), 'Utils.track');
    if(CliqzUtils.cliqzPrefs.getBoolPref('dnt'))return;
    msg.session = CliqzUtils.cliqzPrefs.getCharPref('session');
    msg.ts = (new Date()).getTime();

    CliqzUtils.trk.push(msg);
    CliqzUtils.clearTimeout(CliqzUtils.trkTimer);
    if(instantPush || CliqzUtils.trk.length % 100 == 0){
      CliqzUtils.pushTrack();
    } else {
      CliqzUtils.trkTimer = CliqzUtils.setTimeout(CliqzUtils.pushTrack, 60000);
    }
  },

  trackResult: function(query, queryAutocompleted, resultIndex, resultUrl) {
    CliqzUtils.httpGet(
      (CliqzUtils.CUSTOM_RESULTS_PROVIDER_LOG || CliqzUtils.RESULTS_PROVIDER_LOG) +
      encodeURIComponent(query) +
      (queryAutocompleted ? '&a=' +
      encodeURIComponent(queryAutocompleted) : '') +
      '&i=' + resultIndex +
      (resultUrl ? '&u=' +
      encodeURIComponent(resultUrl) : '') +
      CliqzUtils.encodeQuerySession() +
      CliqzUtils.encodeQuerySeq() +
      CliqzUtils.encodeResultOrder());

    CliqzUtils.setResultOrder('');
  },

  _resultOrder: '',
  setResultOrder: function(resultOrder) {
    CliqzUtils._resultOrder = resultOrder;
  },
  encodeResultOrder: function() {
    return CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(CliqzUtils._resultOrder) : '';
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
    var slice_pos = CliqzUtils.trk.length - CliqzUtils.TRACK_MAX_SIZE + 100;
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
        if(CliqzUtils) CliqzUtils._removeTimerRef(timer);
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
                if(CliqzUtils) CliqzUtils.locale['default'] = JSON.parse(req.response);
            });
    }
    if (!CliqzUtils.locale.hasOwnProperty(lang_locale)) {
        CliqzUtils.loadResource('chrome://cliqzres/content/locale/'
                + encodeURIComponent(lang_locale) + '/cliqz.json',
            function(req) {
                if(CliqzUtils){
                  CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                  CliqzUtils.currLocale = lang_locale;
                }
            },
            function() {
                // We did not find the full locale (e.g. en-GB): let's try just the
                // language!
                var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
                if(CliqzUtils){
                  CliqzUtils.loadResource(
                      'chrome://cliqzres/content/locale/' + loc + '/cliqz.json',
                      function(req) {
                        if(CliqzUtils){
                          CliqzUtils.locale[lang_locale] = JSON.parse(req.response);
                          CliqzUtils.currLocale = lang_locale;
                        }
                      }
                  );
                }
            }
        );
    }
  },
  getLanguageFromLocale: function(locale){
    return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
  },
  getLanguage: function(win){
    return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
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
  // gets all the elements with the class 'cliqz-locale' and adds
  // the localized string - key attribute - as content
  localizeDoc: function(doc){
    var locale = doc.getElementsByClassName('cliqz-locale');
    for(var i = 0; i < locale.length; i++){
        var el = locale[i];
        el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
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
  },
  /** Modify the user's Firefox preferences -- always do a backup! */
  setOurOwnPrefs: function() {
    var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
    if (!cliqzBackup || CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup") == 0) {
      CliqzUtils.log("maxRichResults backup does not exist yet: changing value...", "CliqzUtils.setOurOwnPrefs");
      CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup",
          CliqzUtils.genericPrefs.getIntPref("browser.urlbar.maxRichResults"));
      CliqzUtils.genericPrefs.setIntPref("browser.urlbar.maxRichResults", 30);
    } else {
      CliqzUtils.log("maxRichResults backup already exists; doing nothing.", "CliqzUtils.setOurOwnPrefs")
    }
  },
  /** Reset the user's preferences that we changed. */
  resetOriginalPrefs: function() {
    var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
    if (cliqzBackup) {
      CliqzUtils.log("Loading maxRichResults backup...", "CliqzUtils.setOurOwnPrefs");
      CliqzUtils.genericPrefs.setIntPref("browser.urlbar.maxRichResults",
          CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup"));
      // deleteBranch does not work for some reason :(
      CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup", 0);
      CliqzUtils.cliqzPrefs.clearUserPref("maxRichResultsBackup");
    } else {
      CliqzUtils.log("maxRichResults backup does not exist; doing nothing.", "CliqzUtils.setOurOwnPrefs")
    }
  },
};
