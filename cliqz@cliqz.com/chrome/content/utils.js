'use strict';
var EXPORTED_SYMBOLS = ['CLIQZ'];

var CLIQZ = CLIQZ || {};
CLIQZ.Utils = CLIQZ.Utils || {
  HOST: 'http://beta.cliqz.com',
  //SUGGESTIONS: HOST + '/api/suggestions?q=',
  SUGGESTIONS: 'https://www.google.com/complete/search?client=firefox&q=',
  //RESULTS_PROVIDER: 'http://search-cache.fbt.co/api/cache-json?n=5&q=',
  RESULTS_PROVIDER: 'http://webbeta.cliqz.com/api/cliqz-results?q=',
  LOG: 'http://logging.cliqz.com',
  VERSION_URL: 'http://beta.cliqz.com/version',
  httpHandler: function(method, url, callback, data){
    var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
    req.open(method, url, true);
    req.overrideMimeType('application/json');
    req.onreadystatechange = function(/* e */){
      if (req && req.readyState == 4) {
        callback && callback(req);
      }
    };
    if(callback)req.timeout = 1000;
    req.send(data);
  },
  init: function(){
    this._log = Components.classes['@mozilla.org/consoleservice;1']
      .getService(Components.interfaces.nsIConsoleService);


    CLIQZ.Utils.cliqzPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.');

    CLIQZ.Utils.loadLocale();
    CLIQZ.Utils.log('Initialized', 'UTILS');
  },
  log: function(msg, key){
    CLIQZ.Utils._log.logStringMessage(key + ' : ' + msg);
  },
  getDay: function() {
    return Math.round(new Date().getTime() / 86400000);
  },
  getDetailsFromUrl: function(originalUrl){
    // exclude protocol
    var url = originalUrl,
        name = originalUrl,
        tld = '',
        subdomains = [],
        path = '',
        ssl = originalUrl.indexOf('https') == 0;

    if(url.indexOf('://') !== -1){
      url = url.split('://')[1];
    }
    // extract only hostname
    var host = url.split('/')[0];

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
      CLIQZ.Utils.log('getDetailsFromUrl Failed for: ' + originalUrl, 'ERROR');
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
    CLIQZ.Utils.log(input);
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
  // checks if a string is a complete url 
  isCompleteUrl: function(input){
    CLIQZ.Utils.log(input);
    var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  httpGet: function(url, callback){
    CLIQZ.Utils.httpHandler('GET', url, callback);
  },
  httpPost: function(url, callback, data) {
    CLIQZ.Utils.httpHandler('POST', url, callback, data);
  },
  getSuggestions: function(q, callback){
    //log('suggestions ' + q);
    CLIQZ.Utils.httpGet(CLIQZ.Utils.SUGGESTIONS + q, function(res){ callback && callback(res, q); });
  },
  getCachedResults: function(q, callback){
    //CLIQZ.Utils.log('cache ' + q);
    CLIQZ.Utils.httpGet(CLIQZ.Utils.RESULTS_PROVIDER + q, function(res){ callback && callback(res, q); } );
  },
  getLatestVersion: function(callback){
    CLIQZ.Utils.httpGet(CLIQZ.Utils.VERSION_URL + '?' + Math.random(), callback);
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
    CLIQZ.Utils.log(JSON.stringify(msg));

    msg.UDID = CLIQZ.Utils.cliqzPrefs.getCharPref('UDID');
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
  setTimer: function(func, timeout, type) {
    var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
    CLIQZ.Utils.timers.push(timer);
    var event = {
      notify: function (timer) {
        func();
      }
    };
    timer.initWithCallback(event, timeout, type);
    return timer;
  },
  setTimeout: function(func, timeout) {
    return CLIQZ.Utils.setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
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
  }
};
