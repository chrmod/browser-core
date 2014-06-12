'use strict';

Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm?v=0.4.14');


var EXPORTED_SYMBOLS = ['CliqzUtils'];

var CliqzUtils = CliqzUtils || {
  HOST:             'https://beta.cliqz.com',
  SUGGESTIONS:      'https://www.google.com/complete/search?client=firefox&q=',
  RESULTS_PROVIDER: 'https://webbeta.cliqz.com/api/v1/results?q=',
  LOG:              'https://logging.cliqz.com',
  CLIQZ_URL:        'https://beta.cliqz.com/',
  VERSION_URL:      'https://beta.cliqz.com/version',
  //UPDATE_URL:     'http://beta.cliqz.com/latest',
  UPDATE_URL:       'chrome://cliqz/content/update.html',
  TUTORIAL_URL:     'https://beta.cliqz.com/erste-schritte',
  INSTAL_URL:       'https://beta.cliqz.com/code-verified',
  CHANGELOG:        'https://beta.cliqz.com/changelog',
  UNINSTALL:        'https://beta.cliqz.com/deinstall.html',
  SEPARATOR:        ' %s ',
  PREF_STRING:      32,
  PREF_INT:         64,
  PREF_BOOL:        128,

  cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),

  _log: Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService),
  init: function(){
    //use a different suggestion API
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('suggestionAPI')){
      //CliqzUtils.SUGGESTIONS = CliqzUtils.getPref('suggestionAPI');
    }
    //use a different results API
    if(CliqzUtils.cliqzPrefs.prefHasUserValue('resultsAPI')){
      //CliqzUtils.RESULTS_PROVIDER = CliqzUtils.getPref('resultsAPI');
    }
    CliqzUtils.loadLocale();
    CliqzUtils.log('Initialized', 'UTILS');

  },
  httpHandler: function(method, url, callback, onerror, data){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open(method, url, true);
    req.overrideMimeType('application/json');
    req.onload = function(){
      if(req.status != 200 && req.status != 0 /* local files */){
        CliqzUtils.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZ.Core.httpHandler");
        onerror && onerror();
      } else {
        callback && callback(req);
      }
    }
    req.onerror = function(){
      CliqzUtils.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZ.Core.httpHandler");
      onerror && onerror();
    }
    req.ontimeout = function(){
      CliqzUtils.log( "timeout for " + url, "CLIQZ.Core.httpHandler");
      onerror && onerror();
    }

    if(callback)req.timeout = (method == 'POST'? 2000 : 1000);
    req.send(data);
    return req;
  },
  httpGet: function(url, callback, onerror){
    return CliqzUtils.httpHandler('GET', url, callback, onerror);
  },
  httpPost: function(url, callback, data, onerror) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, data);
  },
  getPrefs: function(){
    var prefs = {};
    for(var pref of CliqzUtils.cliqzPrefs.getChildList('')){
      prefs[pref] = CliqzUtils.getPref(pref);
    }
    return prefs;
  },
  getPref: function(pref, notFound){
    switch(CliqzUtils.cliqzPrefs.getPrefType(pref)) {
      case CliqzUtils.PREF_BOOL: return CliqzUtils.cliqzPrefs.getBoolPref(pref);
      case CliqzUtils.PREF_STRING: return CliqzUtils.cliqzPrefs.getCharPref(pref);
      case CliqzUtils.PREF_INT: return CliqzUtils.cliqzPrefs.getIntPref(pref);
      default: return notFound;
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
    if(CliqzUtils.cliqzPrefs.getBoolPref('showDebugLogs')){
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
      local_param = "&hl=" + locales[0];

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
    CliqzUtils._resultsReq = CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER + encodeURIComponent(q) + CliqzLanguage.stateToQueryString(),
                                function(res){
                                  //CliqzUtils.log(q, 'RESP');
                                  //CliqzUtils.log(res.response, 'RESP');
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
    CliqzUtils.httpGet(CliqzUtils.VERSION_URL + '?' + Math.random(), function(res) {
      if(res.status == 200) callback(res.response);
      else error();
    });
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
    if(CliqzUtils._track_req) {
        CliqzUtils._track_req.abort();
        CliqzUtils.pushTrackError(CliqzUtils._track_req);
    }

    // put current data aside in case of failure
    CliqzUtils._track_sending = CliqzUtils.trk.slice(0);
    CliqzUtils.trk = [];

    CliqzUtils._track_start = (new Date()).getTime();

    CliqzUtils.log('push tracking data: ' + CliqzUtils._track_sending.length + ' elements', "CliqzUtils.pushTrack");
    CliqzUtils._track_req = CliqzUtils.httpPost(CliqzUtils.LOG, CliqzUtils.pushTrackCallback, JSON.stringify(CliqzUtils._track_sending), CliqzUtils.pushTrackError);
  },
  pushTrackCallback: function(req){
    CliqzTimings.add("send_log", (new Date()).getTime() - CliqzUtils._track_start)
    try {
      var response = JSON.parse(req.response);

      if(response.new_session){
        CliqzUtils.setPref('session', response.new_session);
      }
    } catch(e){}
    CliqzUtils._track_sending = [];
    CliqzUtils._track_req = null;
  },
  pushTrackError: function(req){
    // pushTrack failed, put data back in queue to be sent again later
    CliqzUtils.log('push tracking failed: ' + CliqzUtils._track_sending.length + ' elements', "CliqzUtils.pushTrack");
    CliqzTimings.add("send_log", (new Date()).getTime() - CliqzUtils._track_start)
    CliqzUtils.trk = CliqzUtils._track_sending.concat(CliqzUtils.trk);
    
    // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
    var slice_pos = CliqzUtils.util.length - CliqzUtils.TRACK_MAX_SIZE;
    if(slice_pos > 0){
      CliqzUtils.log('discarding ' + slice_pos + ' old tracking elements', "CliqzUtils.pushTrack");
      CliqzUtils.trk.slice(slice_pos);
    }

    CliqzUtils._track_sending = [];
    CliqzUtils._track_req = null;
  },
  timers: [],
  setTimer: function(func, timeout, type, param) {
    var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    CliqzUtils.timers.push(timer);
    var event = {
      notify: function (timer) {
        func(param);
      }
    };
    timer.initWithCallback(event, timeout, type);
    return timer;
  },
  setTimeout: function(func, timeout, param) {
    return CliqzUtils.setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT, param);
  },
  setInterval: function(func, timeout) {
    return CliqzUtils.setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
  },
  clearTimeout: function(timer) {
    if (!timer) {
      return;
    }
    timer.cancel();
    var i = CliqzUtils.timers.indexOf(timer);
    if (i >= 0) {
      CliqzUtils.timers.splice(CliqzUtils.timers.indexOf(timer), 1);
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
    CliqzUtils.httpGet('chrome://cliqzres/content/locale/de-DE/cliqz.json',
        function(req){
            CliqzUtils.locale = JSON.parse(req.response);
        });
  },
  getLocalizedString: function(key){
    return (CliqzUtils.locale[key] && CliqzUtils.locale[key].message) || key;
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
        if(win.CLIQZ && win.CLIQZ.Core){
          win.CLIQZ.Core.destroy();
          win.CLIQZ.Core.init();
        }
    }
  },
  isWindows: function(){
    return window.navigator.userAgent.indexOf('Win') != -1;
  },
  // returns the suggestion title + target search engine
  createSuggestionTitle: function(q, engine, originalQ) {
    var elements = [];

    elements.push([CliqzUtils.getLocalizedString('searchForBegin'), 'cliqz-ac-title-suggestion-desc']);
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
    elements.push([CliqzUtils.getLocalizedString('searchForEnd'), 'cliqz-ac-title-suggestion-desc']);
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
          action.search = CliqzUtils.isSearch(value);
          if(item.getAttribute('type') === 'cliqz-suggestions'){
              value = Services.search.defaultEngine.getSubmission(value).uri.spec;
          }

          if(actionType == 'result_click'){ // do not navigate on keyboard navigation
            CLIQZ.Core.locationChangeTO = CliqzUtils.setTimeout(function(){
                if(newTab) gBrowser.addTab(CliqzUtils.cleanMozillaActions(value));
                else {
                  if(item.getAttribute('type') != 'cliqz-suggestions' &&
                    value.indexOf('http') !== 0) value = 'http://' + value;
                  gBrowser.selectedBrowser.contentDocument.location = value;
                }

            }, 0);
          }
      }
      CliqzUtils.track(action);
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
  }
};
