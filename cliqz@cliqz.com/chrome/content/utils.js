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
  TLDs: ['ac', 'ad', 'ae', 'aero', 'af', 'ag', 'ai', 'al', 'am', 'an', 'ao', 'aq', 'ar', 'arpa', 'as', 'asia', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'biz', 'bj', 'bm', 'bn', 'bo', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cat', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'com', 'coop', 'cr', 'cu', 'cv', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'edu', 'ee', 'eg', 'er', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gov', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'info', 'int', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jobs', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mil', 'mk', 'ml', 'mm', 'mn', 'mo', 'mobi', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'museum', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'name', 'nc', 'ne', 'net', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'org', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'pro', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'st', 'su', 'sv', 'sy', 'sz', 'tc', 'td', 'tel', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tp', 'tr', 'travel', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'xn--0zwm56d', 'xn--11b5bs3a9aj6g', 'xn--3e0b707e', 'xn--45brj9c', 'xn--80akhbyknj4f', 'xn--90a3ac', 'xn--9t4b11yi5a', 'xn--clchc0ea0b2g2a9gcd', 'xn--deba0ad', 'xn--fiqs8s', 'xn--fiqz9s', 'xn--fpcrj9c3d', 'xn--fzc2c9e2c', 'xn--g6w251d', 'xn--gecrj9c', 'xn--h2brj9c', 'xn--hgbk6aj7f53bba', 'xn--hlcj6aya9esc7a', 'xn--j6w193g', 'xn--jxalpdlp', 'xn--kgbechtv', 'xn--kprw13d', 'xn--kpry57d', 'xn--lgbbat1ad8j', 'xn--mgbaam7a8h', 'xn--mgbayh7gpa', 'xn--mgbbh1a71e', 'xn--mgbc0a9azcg', 'xn--mgberp4a5d4ar', 'xn--o3cw4h', 'xn--ogbpf8fl', 'xn--p1ai', 'xn--pgbs0dh', 'xn--s9brj9c', 'xn--wgbh1c', 'xn--wgbl6a', 'xn--xkc2al3hye2a', 'xn--xkc2dl3a5ee0h', 'xn--yfro4i67o', 'xn--ygbi2ammx', 'xn--zckzah', 'xxx', 'ye', 'yt', 'za', 'zm', 'zw'].join(),
  getDetailsFromUrl: function(url){
    // exclude protocol
    if(url.indexOf('://') !== -1){
      url = url.split('://')[1];
    }
    // extract only hostname
    var host = url.split('/')[0];

    var parts = host.split('.');
    if (parts[0] === 'www' && parts[1] !== 'com'){
        parts.shift();
    }
    var hostClean = parts.join('.');
    var ln = parts.length, i = ln, minLength = parts[parts.length-1].length, part;

    // iterate backwards
    while(part = parts[--i]){
        // stop when we find a non-TLD part
        if (i === 0                    // 'asia.com' (last remaining must be the SLD)
            || i < ln-2                // TLDs only span 2 levels
            || part.length < minLength // 'www.cn.com' (valid TLD as second-level domain)
            || CLIQZ.Utils.TLDs.indexOf(part) < 0  // officialy not a TLD
        ){
            var urlDetails = {
              name: part,
              tld: parts.slice(i+1).join('.'),
              subdomains: [],
              path: url.replace(host,''),
              host: hostClean
            };

            while(i>0){
              urlDetails.subdomains.push(parts[--i]);
            }

            return urlDetails;
        }
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