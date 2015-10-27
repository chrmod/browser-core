'use strict';
/*
 * This module prevents user from 3rd party tracking
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzAttrack'];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/AddonManager.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHumanWeb',
  'chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

var countReload = false;
var nsIHttpChannel = Ci.nsIHttpChannel;
var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);
var domSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Components.interfaces.nsIDOMSerializer);
var domParser = Components.classes["@mozilla.org/xmlextras/domparser;1"]
        .createInstance(Components.interfaces.nsIDOMParser);
//CliqzUtils.setPref('showDebugLogs', true);
//CliqzUtils.setPref('showDebugLogs', CliqzUtils.getPref('showDebugLogs', false));
//CliqzUtils.setPref('showConsoleLogs', true);


// CliqzUtils.setPref('attrackRemoveTracking', CliqzUtils.getPref('attrackRemoveTracking', false));
// CliqzUtils.setPref('attrackRemoveQueryStringTracking', CliqzUtils.getPref('attrackRemoveQueryStringTracking', false));


if (CliqzUtils.getPref('attrackRefererTracking', false)) {
    // check that the user has not already set values here
    if (!genericPrefs.prefHasUserValue('network.http.referer.XOriginPolicy') &&
        !genericPrefs.prefHasUserValue('network.http.referer.trimmingPolicy') &&
        !genericPrefs.prefHasUserValue('network.http.sendRefererHeader')) {
        //Setting prefs for mitigating data leaks via referrers:
        // Send only send if hosts match.
        genericPrefs.setIntPref('network.http.referer.XOriginPolicy',2);
        // // Send scheme+host+port+path
        genericPrefs.setIntPref('network.http.referer.trimmingPolicy',1);
        // // Send only when links are clicked
        genericPrefs.setIntPref('network.http.sendRefererHeader',1);

        // remember that we changed these
        CliqzUtils.setPref('attrackRefererPreferences', true);
    }
} else {
    if (CliqzUtils.getPref('attrackRefererPreferences', false)) {
        // reset the settings we changed
        genericPrefs.clearUserPref('network.http.referer.XOriginPolicy');
        genericPrefs.clearUserPref('network.http.referer.trimmingPolicy');
        genericPrefs.clearUserPref('network.http.sendRefererHeader');
        CliqzUtils.cliqzPrefs.clearUserPref('attrackRefererPreferences');
    }
}


function dURIC(s) {
    // avoide error from decodeURIComponent('%2')
    try {
        return decodeURIComponent(s);
    } catch(e) {
        return s;
    }
}

function shuffle(s) {
    var a = s.split(""),
        n = a.length;

    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }
    return a.join("");
};

var CachedSet = function() {
    this._items = new Set();
    this._timeouts = new Set();
};

CachedSet.prototype = {
    contains: function(item) {
        return this._items.has(item);
    },
    add: function(item, ttl) {
        var _this = this;
        this._items.add(item);
        var timeout = CliqzUtils.setTimeout(function() {
            _this.delete(item);
            _this._timeouts.delete(timeout);
        }, ttl);
        _this._timeouts.add(timeout);
    },
    delete: function(item) {
        this._items.delete(item);
    },
    clear: function() {
        for (let t of this._timeouts) {
            CliqzUtils.clearTimeout(t);
        }
        this._timeouts.clear();
        this._items.clear();
    }
};

var LRUMapCache = function(item_ctor, size) {
    this._cache_limit = size;
    this._cache = {};
    this._lru = [];
    this._item_ctor = item_ctor;
    this._hit_ctr = 0;
    this._miss_ctr = 0;
    this._keysize_limit = 1000;
}

LRUMapCache.prototype = {
    get: function(key) {
        if (key in this._cache) {
            // cache hit, remove key from lru list
            let ind = this._lru.indexOf(key);
            if (ind != -1) {
                this._lru.splice(ind, 1);
            }
            this._hit_ctr++;
        } else {
            // cache miss, generate value for key
            if (key.length > this._keysize_limit) {
                // if key is large, don't cache
                return this._item_ctor(key);
            }
            this._cache[key] = this._item_ctor(key);
            // prune cache - take from tail of list until short enough
            while (this._lru.length > this._cache_limit) {
                let lru = this._lru.pop();
                delete this._cache[lru];
            }
            this._miss_ctr++;
        }
        // add key to head of list
        this._lru.unshift(key);
        return this._cache[key];
    }
}

var md5Cache = new LRUMapCache(CliqzHumanWeb._md5, 1000);

var md5 = function(s) {
    return md5Cache.get(s);
}

function getHeaderMD5(headers) {
    var qsMD5 = {};
    for (var key in headers) {
        var tok = dURIC(headers[key]);
        while (tok != dURIC(tok)) {
            tok = dURIC(tok);
        }
        qsMD5[md5(key)] = md5(tok);
    }
    return qsMD5;
}

function getQSMD5(qs, ps) {
    if(typeof qs == 'string') qs = CliqzAttrack.getParametersQS(qs);
    if(ps === undefined) ps = {};
    var qsMD5 = {};
    for (var key in qs) {
        var tok = dURIC(qs[key]);
        while (tok != dURIC(tok)) {
            tok = dURIC(tok);
        }
        qsMD5[md5(key)] = md5(tok);
    }
    for (var key in ps) {
        var tok = dURIC(qs[key]);
        while (tok != dURIC(tok)) {
            tok = dURIC(tok);
        }
        qsMD5[md5(key)] = md5(tok);
    }
    return qsMD5;
}

function parseCalleeStack(callee){
    var returnData = {};
    callee = callee.stack.trim().split("\n");
    callee.shift(); // This removes CliqzHumanWeb call from the stack.
    var externalCallee = callee[0].replace(/(:[0-9]+){1,2}$/, "");
    externalCallee = externalCallee.split("@")[1];
    var externalCallHost = CliqzHumanWeb.parseURL(externalCallee)['hostname'];
    returnData['externalCallHost'] = externalCallHost;
    returnData['url'] = externalCallee;
    return returnData;
}

function HeaderInfoVisitor(oHttp) {
    this.oHttp = oHttp;
    this.headers = new Array();
}

function onUrlbarFocus(){
    countReload = true;
}

HeaderInfoVisitor.prototype = {
    extractPostData : function(visitor, oHttp) {
        function postData(stream) {
            // Scriptable Stream Constants
            this.seekablestream = stream;
            this.stream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
            this.stream.init(this.seekablestream);

            // Check if the stream has headers
            this.hasheaders = false;
            this.body = 0;
            this.isBinary = true;
            if (this.seekablestream instanceof Ci.nsIMIMEInputStream) {
                this.seekablestream.QueryInterface(Ci.nsIMIMEInputStream);
                this.hasheaders = true;
                this.body = -1; // Must read header to find body
                this.isBinary = false;
            } else if (this.seekablestream instanceof Ci.nsIStringInputStream) {
                this.seekablestream.QueryInterface(Ci.nsIStringInputStream);
                this.hasheaders = true;
                this.body = -1; // Must read header to find body
            }
        }

        postData.prototype = {
            rewind: function() {
                this.seekablestream.seek(0,0);
            },
            tell: function() {
                return this.seekablestream.tell();
            },
            readLine: function() {
                var line = "";
                var size = this.stream.available();
                for (var i = 0; i < size; i++) {
                    var c = this.stream.read(1);
                    if (c == '\r') {
                    } else if (c == '\n') {
                        break;
                    } else {
                        line += c;
                    }
                }
                return line;
            },

            // visitor can be null, function has side-effect of setting body
            visitPostHeaders: function(visitor) {
                if (this.hasheaders) {
                    this.rewind();
                    var line = this.readLine();
                    while(line) {
                        if (visitor) {
                            var tmp = line.match(/^([^:]+):\s?(.*)/);
                            // match can return null...
                            if (tmp) {
                                visitor.visitPostHeader(tmp[1], tmp[2]);
                                // if we get a tricky content type, then we are binary
                                // e.g. Content-Type=multipart/form-data; boundary=---------------------------41184676334
                                if (!this.isBinary && tmp[1].toLowerCase() == "content-type" && tmp[2].indexOf("multipart") != "-1") {
                                    this.isBinary = true;
                                }
                            } else {
                                visitor.visitPostHeader(line, "");
                            }
                        }
                        line = this.readLine();
                    }
                    this.body = this.tell();
                }
            },

            getPostBody: function(visitor) {
                // Position the stream to the start of the body
                if (this.body < 0 || this.seekablestream.tell() != this.body) {
                    this.visitPostHeaders(visitor);
                }

                var size = this.stream.available();
                if (size == 0 && this.body != 0) {
                    // whoops, there weren't really headers..
                    this.rewind();
                    visitor.clearPostHeaders();
                    this.hasheaders = false;
                    this.isBinary   = false;
                    size = this.stream.available();
                }
                var postString = "";
                try {
                    // This is to avoid 'NS_BASE_STREAM_CLOSED' exception that may occurs
                    // See bug #188328.
                    for (var i = 0; i < size; i++) {
                        var c = this.stream.read(1);
                        c ? postString += c : postString+='\0';
                    }
                } catch (ex) {
                    return "" + ex;
                } finally {
                    this.rewind();
                }
                // strip off trailing \r\n's
                while (postString.indexOf("\r\n") == (postString.length - 2)) {
                    postString = postString.substring(0, postString.length - 2);
                }
                return postString;
            }
        };

        // Get the postData stream from the Http Object
        try {
            // Must change HttpChannel to UploadChannel to be able to access post data
            oHttp.QueryInterface(Components.interfaces.nsIUploadChannel);
            // Get the post data stream
            if (oHttp.uploadStream) {
                // Must change to SeekableStream to be able to rewind
                oHttp.uploadStream.QueryInterface(Components.interfaces.nsISeekableStream);
                // And return a postData object
                return new postData(oHttp.uploadStream);
            }
        } catch (e) {
            if (CliqzAttrack.debug) CliqzUtils.log("Got an exception retrieving the post data: [" + e + "]", 'at-post');
            return "crap";
        }
        return null;
    },
    visitPostHeader : function(name, value) {
        if (!this.postBodyHeaders) {
            this.postBodyHeaders = {};
        }
        this.postBodyHeaders[name] = value;
    },

    clearPostHeaders : function() {
        if (this.postBodyHeaders) {
            delete this.postBodyHeaders;
        }
    },
    visitRequest : function () {
        this.headers = {};
        this.oHttp.visitRequestHeaders(this);

        // There may be post data in the request
        var postData = this.extractPostData(this, this.oHttp);
        if (postData) {
            var postBody = postData.getPostBody(this);
            if (postBody !== null) {
                this.postBody = {body : postBody, binary : postData.isBinary};
            }
        }
        return this.headers;
    },
    getPostData : function() {
        return this.postBody ? this.postBody : null;
    },
    getPostBodyHeaders : function() {
        return this.postBodyHeaders ? this.postBodyHeaders : null;
    },
    visitHeader: function(name, value) {
        if (value.length >= 8 && name != 'Cookie' &&
            name != 'Host' && name != 'User-Agent' && name.indexOf('Accept') !== 0 &&
            name != 'Origin' && name != 'Connection') {
            // cookie is handled seperately, host is in the request,
            // we can change the user-agent if needed
            this.headers[name] = value;
        }
    }
};

function checkFingerPrinting(source_url, tpObj){
    // Based on the source, check if the protection for that source is on.
    // If the protection is not on then return.
    // if(source == 'cookie' && !CliqzAttrack.isCookieEnabled()) return;
    // if(source == 'qs' && !CliqzAttrack.isQSEnabled()) return;
    var tps = tpObj.tps;
    var tp_domains = [];
    Object.keys(tps).forEach(function(e){
        if(CliqzAttrack.blacklist.indexOf(e) > -1 || CliqzAttrack.blacklist.indexOf(CliqzAttrack.getGeneralDomain(e)) > -1){
            if(tps[e]['cv_to_dataURL_blocked']){
                tp_domains.push(e + ":cvf");
            }
        }
    })
    if(tp_domains.length > 0) {
        var payload_data = {"u":source_url,'tp_domains': tp_domains};
        var enabled = {'qs': CliqzAttrack.isQSEnabled(), 'cookie': CliqzAttrack.isCookieEnabled(), 'post': CliqzAttrack.isPostEnabled(), 'fingerprint': CliqzAttrack.isFingerprintingEnabled()};
        var payl = {'data': payload_data, 'ver': CliqzAttrack.VERSION, 'conf': enabled, 'addons': CliqzAttrack.similarAddon, 'observers': CliqzAttrack.obsCounter};
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.blackListCanvas', 'payload': payl});
        CliqzAttrack.blockingFailed[source_url] = 1;
    }
    /*
    CliqzUtils.log("Checking QS protection: " + source_url, "XOXOX");
    var tpRequestGeneralDomain = CliqzAttrack.getGeneralDomain(tp_request_hostname);
    if(CliqzAttrack.blacklist.indexOf(tpRequestGeneralDomain) > -1){
        CliqzUtils.log("Protection failed for the url: " + source_url, "XOXOX");
        if(CliqzAttrack.blockingFailed[source_url]){
            var tp_domains = CliqzAttrack.blockingFailed[source_url].tp_domains;
        }
        else{
            var tp_domains = [];
            tp_domains.push(tpRequestGeneralDomain);
            CliqzAttrack.blockingFailed[source_url]= tp_domains;
        }
    }
    */

}

function checkBlackList(source_url, tpObj){
    var tps = tpObj.tps;
    var tp_domains = [];
    Object.keys(tps).forEach(function(e){
        if(CliqzAttrack.blacklist.indexOf(e) > -1 || CliqzAttrack.blacklist.indexOf(CliqzAttrack.getGeneralDomain(e)) > -1){


            // Verify if we should add the condition for bad_tokens.
            if(CliqzAttrack.isQSEnabled() && tps[e]['has_qs'] && tps[e]['bad_tokens'] && !(tps[e]['tokens_blocked'] || tps[e]['req_aborted'] || tps[e]['post_altered'])){
                tp_domains.push(e + ":qsG");
            }

            var s = md5(CliqzAttrack.getGeneralDomain(e)).substring(0, 16);
            if(CliqzAttrack.isQSEnabled() && tps[e]['has_qs'] && (!(s in CliqzAttrack.tokenExtWhitelist))){
                tp_domains.push(e + ":notInExtWhiteList");
            }

            if(CliqzAttrack.isCookieEnabled() && tps[e]['cookie_set'] && !(tps[e]['cookie_blocked']) && !(tps[e]['cookie_allow_userinit']) && !(tps[e]['cookie_allow_visitcache']) && !(tps[e]['cookie_allow_oauth'])){
                tp_domains.push(e + ":cookie");
            }


        }
    })
    if(tp_domains.length > 0 && !(CliqzAttrack.blockingFailed[source_url])) {
        var payload_data = {"u":source_url,'tp_domains': tp_domains};
        var enabled = {'qs': CliqzAttrack.isQSEnabled(), 'cookie': CliqzAttrack.isCookieEnabled(), 'post': CliqzAttrack.isPostEnabled(), 'fingerprint': CliqzAttrack.isFingerprintingEnabled()};
        var payl = {'data': payload_data, 'ver': CliqzAttrack.VERSION, 'conf': enabled, 'addons': CliqzAttrack.similarAddon, 'observers': CliqzAttrack.obsCounter};
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.blackListFail', 'payload': payl});
        CliqzAttrack.blockingFailed[source_url] = 1;
    }
}

var randomImage = (function(){
    var length = Math.floor(20 + Math.random() * 100);
    var bytes = "";
    for (var i = 0; i < length; i += 1){
        bytes += String.fromCharCode(Math.floor(Math.random() * 256));
    }
    return bytes;
}());

var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
        .getService(Components.interfaces.mozIAsyncFavicons);

function HttpRequestContext(subject) {
    this.subject = subject;
    this.channel = subject.QueryInterface(nsIHttpChannel);
    this.loadInfo = this.channel.loadInfo;
    this.url = ''+ this.channel.URI.spec;
    this.method = this.channel.requestMethod;
    this._parsedURL = undefined;
    this._legacy_source = undefined;

    // tab tracking
    if(this.getContentPolicyType() == 6) {
        // fullpage - add tracked tab
        let tab_id = this.getOuterWindowID();
        HttpRequestContext._tabs[tab_id] = this.url;
    }
}

HttpRequestContext._tabs = {};
// clean up tab cache every minute
HttpRequestContext._cleaner = CliqzUtils.setInterval(function() {
    for (let t in HttpRequestContext._tabs) {
        if(!CliqzAttrack.tab_listener.isWindowActive(t)) {
            delete HttpRequestContext._tabs[t];
        }
    }
}, 60000);

HttpRequestContext.prototype = {

    getInnerWindowID: function() {
        return this.loadInfo ? this.loadInfo.innerWindowID : 0;
    },
    getOuterWindowID: function() {
        if (this.loadInfo == null || this.loadInfo.outerWindowID === undefined) {
            return this._legacyGetWindowId();
        } else {
            return this.loadInfo.outerWindowID;
        }
    },
    getParentWindowID: function() {
        if (this.loadInfo == null) {
            return this._legacyGetWindowId();
        } else {
            return this.loadInfo.parentOuterWindowID;
        }
    },
    getLoadingDocument: function() {
        let parentWindow = this.getParentWindowID();
        if (parentWindow in HttpRequestContext._tabs) {
            return HttpRequestContext._tabs[parentWindow];
        } else if (this.loadInfo != null) {
            return this.loadInfo.loadingDocument != null && 'location' in this.loadInfo.loadingDocument ? this.loadInfo.loadingDocument.location.href : ""
        } else {
            return this._legacyGetSource().url;
        }
    },
    getContentPolicyType: function() {
        return this.loadInfo ? this.loadInfo.contentPolicyType : undefined;
    },
    getCookieData: function() {
        let cookie_data = null;
        try {
            cookie_data = this.channel.getRequestHeader("Cookie");
        } catch(ee) {}
        return cookie_data;
    },
    getReferrer: function() {
        var refstr = null,
            referrer = '';
        try {
            refstr = this.channel.getRequestHeader("Referer");
            referrer = dURIC(refstr);
        } catch(ee) {}
        return referrer;
    },
    getOriginWindowID: function() {
        // in most cases this is the same as the outerWindowID.
        // however for frames, it is the parentWindowId
        let parentWindow = this.getParentWindowID();
        if (this.getContentPolicyType() != 6 && (parentWindow in HttpRequestContext._tabs || this.getContentPolicyType() == 7)) {
            return parentWindow;
        } else {
            return this.getOuterWindowID();
        }
    },
    _legacyGetSource: function() {
        if (this._legacy_source === undefined) {
            this._legacy_source = CliqzAttrack.getRefToSource(this.subject, this.getReferrer());
        }
        return this._legacy_source;
    },
    _legacyGetWindowId: function() {
        // Firefox <=38 fallback for tab ID.
        let source = this._legacyGetSource();
        return source.tab;
    }

}

/**
    URLInfo class: holds a parsed URL.
*/
var URLInfo = function(url) {
    this.url_str = url;
    // map parsed url parts onto URL object
    let url_parts = CliqzAttrack.parseURL(url);
    for(let k in url_parts) {
        this[k] = url_parts[k];
    }
    return this;
}

URLInfo._cache = new LRUMapCache(function(url) { return new URLInfo(url) }, 100);

/** Factory getter for URLInfo. URLInfo are cached in a LRU cache. */
URLInfo.get = function(url) {
    return URLInfo._cache.get(url);
}

URLInfo.prototype = {
    toString: function() {
        return this.url_str;
    }
}

var CliqzAttrack = {
    VERSION: '0.92',
    LOG_KEY: 'attrack',
    URL_TOKEN_WHITELIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    // URL_ALERT_TEMPLATE: 'chrome://cliqz/content/anti-tracking-index.html',
    // URL_ALERT_TEMPLATE_2: 'chrome://cliqz/content/anti-tracking-index-2.html',
    URL_SAFE_KEY: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json',
    URL_SAFE_KEY_VERSIONCHECK: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    URL_BLOCK_REPROT_LIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json',
    debug: false,
    msgType:'attrack',
    trackExamplesThreshold: 0,
    timeCleaningCache: 180*1000,
    timeAfterLink: 5*1000,
    timeActive: 20*1000,
    timeBootup: 10*1000,
    bootupTime: (new Date()).getTime(),
    bootingUp: true,
    cacheHist: null,
    cacheHistDom: null,
    cacheHistAction: null,
    cacheHistStats: null,
    histLastSent: null,
    localBlocked: null,
    checkedToken: null,
    loadedPage: null,
    wrongTokenLastSent: null,
    blockedToken: null,
    cookieTraffic: {'sent': [], 'blocked': [], 'csent': 0, 'cblocked': 0},
    QSTraffic: {'blocked': [], 'cblocked': 0, 'aborted': []},
    canvasTraffic : {'observed' : []},
    canvasURL : {},
    whitelist: null,
    obsCounter: {},
    similarAddon: false,
    similarAddonNames: {
        "Adblock Plus": true,
        "Ghostery": true,
        "Lightbeam": true,
        "Disconnect": true,
        "BetterPrivacy": true,
        "NoScript": true
    },
    blacklist:{},
    blockingFailed:{},
    statMD5:{},
    trackReload:{},
    reloadWhiteList:{},
    tokenDomain: null,
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    qsBlockRule: null,  // list of domains should be blocked instead of shuffling
    blocked: null,  // log what's been blocked
    obfuscateMethod: 'same',
    replacement: '',
    blockReportList: null,
    activityDistributor : Components.classes["@mozilla.org/network/http-activity-distributor;1"]
                                .getService(Components.interfaces.nsIHttpActivityDistributor),
    observerService: Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Components.interfaces.nsIObserverService),
    urlInfo: URLInfo,
    getTime:function() {
        var ts = CliqzUtils.getPref('config_ts', null);
        if(!ts){
            var d = null;
            var m = null;
            var y = null;
            var h = null;
            var hr = null;
            var _ts = null;
            d = (new Date().getDate()  < 10 ? "0" : "" ) + new Date().getDate();
            m = (new Date().getMonth() < 10 ? "0" : "" ) + parseInt((new Date().getMonth()) + 1);
            h = (new Date().getUTCHours() < 10 ? "0" : "" ) + new Date().getUTCHours();
            y = new Date().getFullYear();
            _ts = y + "" + m + "" + d + "" + h;
        }
        else{
            h = (new Date().getUTCHours() < 10 ? "0" : "" ) + new Date().getUTCHours();
            _ts = ts + "" + h;
        }
        return _ts;
    },
    TLDs: {"gw": "cc", "gu": "cc", "gt": "cc", "gs": "cc", "gr": "cc", "gq": "cc", "gp": "cc", "dance": "na", "tienda": "na", "gy": "cc", "gg": "cc", "gf": "cc", "ge": "cc", "gd": "cc", "gb": "cc", "ga": "cc", "edu": "na", "gn": "cc", "gm": "cc", "gl": "cc", "\u516c\u53f8": "na", "gi": "cc", "gh": "cc", "tz": "cc", "zone": "na", "tv": "cc", "tw": "cc", "tt": "cc", "immobilien": "na", "tr": "cc", "tp": "cc", "tn": "cc", "to": "cc", "tl": "cc", "bike": "na", "tj": "cc", "tk": "cc", "th": "cc", "tf": "cc", "tg": "cc", "td": "cc", "tc": "cc", "coop": "na", "\u043e\u043d\u043b\u0430\u0439\u043d": "na", "cool": "na", "ro": "cc", "vu": "cc", "democrat": "na", "guitars": "na", "qpon": "na", "\u0441\u0440\u0431": "cc", "zm": "cc", "tel": "na", "futbol": "na", "za": "cc", "\u0628\u0627\u0632\u0627\u0631": "na", "\u0440\u0444": "cc", "zw": "cc", "blue": "na", "mu": "cc", "\u0e44\u0e17\u0e22": "cc", "asia": "na", "marketing": "na", "\u6d4b\u8bd5": "na", "international": "na", "net": "na", "\u65b0\u52a0\u5761": "cc", "okinawa": "na", "\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8": "na", "\u05d8\u05e2\u05e1\u05d8": "na", "\uc0bc\uc131": "na", "sexy": "na", "institute": "na", "\u53f0\u7063": "cc", "pics": "na", "\u516c\u76ca": "na", "\u673a\u6784": "na", "social": "na", "domains": "na", "\u9999\u6e2f": "cc", "\u96c6\u56e2": "na", "limo": "na", "\u043c\u043e\u043d": "cc", "tools": "na", "nagoya": "na", "properties": "na", "camera": "na", "today": "na", "club": "na", "company": "na", "glass": "na", "berlin": "na", "me": "cc", "md": "cc", "mg": "cc", "mf": "cc", "ma": "cc", "mc": "cc", "tokyo": "na", "mm": "cc", "ml": "cc", "mo": "cc", "mn": "cc", "mh": "cc", "mk": "cc", "cat": "na", "reviews": "na", "mt": "cc", "mw": "cc", "mv": "cc", "mq": "cc", "mp": "cc", "ms": "cc", "mr": "cc", "cab": "na", "my": "cc", "mx": "cc", "mz": "cc", "\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8": "cc", "wang": "na", "estate": "na", "clothing": "na", "monash": "na", "guru": "na", "technology": "na", "travel": "na", "\u30c6\u30b9\u30c8": "na", "pink": "na", "fr": "cc", "\ud14c\uc2a4\ud2b8": "na", "farm": "na", "lighting": "na", "fi": "cc", "fj": "cc", "fk": "cc", "fm": "cc", "fo": "cc", "sz": "cc", "kaufen": "na", "sx": "cc", "ss": "cc", "sr": "cc", "sv": "cc", "su": "cc", "st": "cc", "sk": "cc", "sj": "cc", "si": "cc", "sh": "cc", "so": "cc", "sn": "cc", "sm": "cc", "sl": "cc", "sc": "cc", "sb": "cc", "rentals": "na", "sg": "cc", "se": "cc", "sd": "cc", "\u7ec4\u7ec7\u673a\u6784": "na", "shoes": "na", "\u4e2d\u570b": "cc", "industries": "na", "lb": "cc", "lc": "cc", "la": "cc", "lk": "cc", "li": "cc", "lv": "cc", "lt": "cc", "lu": "cc", "lr": "cc", "ls": "cc", "holiday": "na", "ly": "cc", "coffee": "na", "ceo": "na", "\u5728\u7ebf": "na", "ye": "cc", "\u0625\u062e\u062a\u0628\u0627\u0631": "na", "ninja": "na", "yt": "cc", "name": "na", "moda": "na", "eh": "cc", "\u0628\u06be\u0627\u0631\u062a": "cc", "ee": "cc", "house": "na", "eg": "cc", "ec": "cc", "vote": "na", "eu": "cc", "et": "cc", "es": "cc", "er": "cc", "ru": "cc", "rw": "cc", "\u0aad\u0abe\u0ab0\u0aa4": "cc", "rs": "cc", "boutique": "na", "re": "cc", "\u0633\u0648\u0631\u064a\u0629": "cc", "gov": "na", "\u043e\u0440\u0433": "na", "red": "na", "foundation": "na", "pub": "na", "vacations": "na", "org": "na", "training": "na", "recipes": "na", "\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435": "na", "\u4e2d\u6587\u7f51": "na", "support": "na", "onl": "na", "\u4e2d\u4fe1": "na", "voto": "na", "florist": "na", "\u0dbd\u0d82\u0d9a\u0dcf": "cc", "\u049b\u0430\u0437": "cc", "management": "na", "\u0645\u0635\u0631": "cc", "\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc": "na", "kiwi": "na", "academy": "na", "sy": "cc", "cards": "na", "\u0938\u0902\u0917\u0920\u0928": "na", "pro": "na", "kred": "na", "sa": "cc", "mil": "na", "\u6211\u7231\u4f60": "na", "agency": "na", "\u307f\u3093\u306a": "na", "equipment": "na", "mango": "na", "luxury": "na", "villas": "na", "\u653f\u52a1": "na", "singles": "na", "systems": "na", "plumbing": "na", "\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae": "na", "\u062a\u0648\u0646\u0633": "cc", "\u067e\u0627\u06a9\u0633\u062a\u0627\u0646": "cc", "gallery": "na", "kg": "cc", "ke": "cc", "\u09ac\u09be\u0982\u09b2\u09be": "cc", "ki": "cc", "kh": "cc", "kn": "cc", "km": "cc", "kr": "cc", "kp": "cc", "kw": "cc", "link": "na", "ky": "cc", "voting": "na", "cruises": "na", "\u0639\u0645\u0627\u0646": "cc", "cheap": "na", "solutions": "na", "\u6e2c\u8a66": "na", "neustar": "na", "partners": "na", "\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe": "cc", "menu": "na", "arpa": "na", "flights": "na", "rich": "na", "do": "cc", "dm": "cc", "dj": "cc", "dk": "cc", "photography": "na", "de": "cc", "watch": "na", "dz": "cc", "supplies": "na", "report": "na", "tips": "na", "\u10d2\u10d4": "cc", "bar": "na", "qa": "cc", "shiksha": "na", "\u0443\u043a\u0440": "cc", "vision": "na", "wiki": "na", "\u0642\u0637\u0631": "cc", "\ud55c\uad6d": "cc", "computer": "na", "best": "na", "voyage": "na", "expert": "na", "diamonds": "na", "email": "na", "wf": "cc", "jobs": "na", "bargains": "na", "\u79fb\u52a8": "na", "jp": "cc", "jm": "cc", "jo": "cc", "ws": "cc", "je": "cc", "kitchen": "na", "\u0a2d\u0a3e\u0a30\u0a24": "cc", "\u0627\u06cc\u0631\u0627\u0646": "cc", "ua": "cc", "buzz": "na", "com": "na", "uno": "na", "ck": "cc", "ci": "cc", "ch": "cc", "co": "cc", "cn": "cc", "cm": "cc", "cl": "cc", "cc": "cc", "ca": "cc", "cg": "cc", "cf": "cc", "community": "na", "cd": "cc", "cz": "cc", "cy": "cc", "cx": "cc", "cr": "cc", "cw": "cc", "cv": "cc", "cu": "cc", "pr": "cc", "ps": "cc", "pw": "cc", "pt": "cc", "holdings": "na", "wien": "na", "py": "cc", "ai": "cc", "pa": "cc", "pf": "cc", "pg": "cc", "pe": "cc", "pk": "cc", "ph": "cc", "pn": "cc", "pl": "cc", "pm": "cc", "\u53f0\u6e7e": "cc", "aero": "na", "catering": "na", "photos": "na", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e": "na", "graphics": "na", "\u0641\u0644\u0633\u0637\u064a\u0646": "cc", "\u09ad\u09be\u09b0\u09a4": "cc", "ventures": "na", "va": "cc", "vc": "cc", "ve": "cc", "vg": "cc", "iq": "cc", "vi": "cc", "is": "cc", "ir": "cc", "it": "cc", "vn": "cc", "im": "cc", "il": "cc", "io": "cc", "in": "cc", "ie": "cc", "id": "cc", "tattoo": "na", "education": "na", "parts": "na", "events": "na", "\u0c2d\u0c3e\u0c30\u0c24\u0c4d": "cc", "cleaning": "na", "kim": "na", "contractors": "na", "mobi": "na", "center": "na", "photo": "na", "nf": "cc", "\u0645\u0644\u064a\u0633\u064a\u0627": "cc", "wed": "na", "supply": "na", "\u7f51\u7edc": "na", "\u0441\u0430\u0439\u0442": "na", "careers": "na", "build": "na", "\u0627\u0644\u0627\u0631\u062f\u0646": "cc", "bid": "na", "biz": "na", "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629": "cc", "gift": "na", "\u0434\u0435\u0442\u0438": "na", "works": "na", "\u6e38\u620f": "na", "tm": "cc", "exposed": "na", "productions": "na", "koeln": "na", "dating": "na", "christmas": "na", "bd": "cc", "be": "cc", "bf": "cc", "bg": "cc", "ba": "cc", "bb": "cc", "bl": "cc", "bm": "cc", "bn": "cc", "bo": "cc", "bh": "cc", "bi": "cc", "bj": "cc", "bt": "cc", "bv": "cc", "bw": "cc", "bq": "cc", "br": "cc", "bs": "cc", "post": "na", "by": "cc", "bz": "cc", "om": "cc", "ruhr": "na", "\u0627\u0645\u0627\u0631\u0627\u062a": "cc", "repair": "na", "xyz": "na", "\u0634\u0628\u0643\u0629": "na", "viajes": "na", "museum": "na", "fish": "na", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631": "cc", "hr": "cc", "ht": "cc", "hu": "cc", "hk": "cc", "construction": "na", "hn": "cc", "solar": "na", "hm": "cc", "info": "na", "\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd": "cc", "uy": "cc", "uz": "cc", "us": "cc", "um": "cc", "uk": "cc", "ug": "cc", "builders": "na", "ac": "cc", "camp": "na", "ae": "cc", "ad": "cc", "ag": "cc", "af": "cc", "int": "na", "am": "cc", "al": "cc", "ao": "cc", "an": "cc", "aq": "cc", "as": "cc", "ar": "cc", "au": "cc", "at": "cc", "aw": "cc", "ax": "cc", "az": "cc", "ni": "cc", "codes": "na", "nl": "cc", "no": "cc", "na": "cc", "nc": "cc", "ne": "cc", "actor": "na", "ng": "cc", "\u092d\u093e\u0930\u0924": "cc", "nz": "cc", "\u0633\u0648\u062f\u0627\u0646": "cc", "np": "cc", "nr": "cc", "nu": "cc", "xxx": "na", "\u4e16\u754c": "na", "kz": "cc", "enterprises": "na", "land": "na", "\u0627\u0644\u0645\u063a\u0631\u0628": "cc", "\u4e2d\u56fd": "cc", "directory": "na"},
    state: null,
    stateLastSent: null,
    tokens: null,
    tokensLastSent: null,
    tokenExtWhitelist: null,
    tokenExtStats: {'pass': 0, 'block': 0, 'url_pass': 0, 'url_block': 0},
    tokenWhitelistVersion: null,
    safeKey: null,
    safeKeyExtVersion: null,
    requestKeyValue: null,
    // removeTracking: CliqzUtils.getPref('attrackRemoveTracking', false),
    // removeQS: CliqzUtils.getPref('attrackRemoveQueryStringTracking', true),
    recentlyModified: new CachedSet(),
    favicons: {
        // A simple capacity limited set, with least recently used items removed when
        // capcity is full.
        CAPACITY: 10,
        dict: {},
        lru_queue: [],
        contains: function(value) {
            return value in this.dict;
        },
        add: function(value) {
            var ts = Date.now();
            if (value in this.dict) {
                this.dict[value] = ts;
                var ind = this.lru_queue.indexOf(value);
                if (ind >= 0 && this.lru_queue.length > 1) {
                    // move value to end of queue
                    this.lru_queue.splice(ind, 1);
                    this.lru_queue.push(value);
                }
            } else {
                this.dict[value] = ts;
                this.lru_queue.push(value);
                // if set is over capacity, remove least recently added element.
                if (this.lru_queue.length > this.CAPACITY) {
                    var discard = this.lru_queue.shift();
                    delete this.dict[discard];
                }
            }
        }
    },
    getHeaders: function(strData) {  // not used?
      var o = {};
      o['status'] = strData.split(" ")[1];

      var l = strData.split("\n");
      for(var i=0;i<l.length;i++) {
        if (l[i].indexOf('Location: ') == 0) {
            o['loc'] = dURIC(l[i].split(" ")[1].trim());
        }
        if (l[i].indexOf('WWW-Authenticate: ') == 0) {
            var tmp = l[i].split(" ");
            tmp = tmp.slice(1, tmp.length).join(" ");
            o['auth'] = tmp;
        }
        if (l[i].indexOf('Cookie: ') == 0) {
            var tmp = l[i].split(" ");
            tmp = tmp.slice(1, tmp.length).join(" ");
            o['cookie'] = tmp;
        }
      }

      return o;
    },
    getTabForChannel: function ( aHttpChannel ) {
        var loadContext = this.getLoadContext( aHttpChannel );
        if( !loadContext ) {
            // fallback
            return this.getTabForChannel2( aHttpChannel );
        }

        var win = loadContext.topWindow;
        var tab = this.getTabForWindow( win );

        return tab;
    },
    getTabForChannel2: function ( aChannel ) {
        var win = this.getWindowForChannel( aChannel );
        if (!win) return null;
        var tab = this.getTabForWindow( win );
        return tab;
    },
    getLoadContext: function( aRequest ) {
        try {
            // first try the notification callbacks
            var loadContext = aRequest.QueryInterface( Components.interfaces.nsIChannel )
                            .notificationCallbacks
                            .getInterface( Components.interfaces.nsILoadContext );
            return loadContext;
        } catch (ex) {
            // fail over to trying the load group
            try {
                if( !aRequest.loadGroup ) return null;

                var loadContext = aRequest.loadGroup.notificationCallbacks
                                .getInterface(Components.interfaces.nsILoadContext);
                return loadContext;
            } catch (ex) {
                return null;
            }
        }
    },
    getWindowForChannel: function( aRequest ) {
        var oHttp = aRequest.QueryInterface( Components.interfaces.nsIHttpChannel );
        if( !oHttp.notificationCallbacks ) return null;
        var interfaceRequestor = oHttp.notificationCallbacks.QueryInterface( Components.interfaces.nsIInterfaceRequestor );
        try {
            var DOMWindow = interfaceRequestor.getInterface( Components.interfaces.nsIDOMWindow );
            return DOMWindow;
        } catch( ex ) {
            return null;
        }
    },
    getTabForWindow: function( aWindow ) {
        var currwin = CliqzUtils.getWindow();

        var tabs = currwin.gBrowser.tabContainer.childNodes;
        for( var i = 0; i < tabs.length; i++ ) {
            var tabWindow = tabs[i].linkedBrowser.contentWindow;
            if( tabWindow === aWindow ) return tabs[i];
        }

        return null;
    },
    getWindowForRequest: function(request){
        if (request instanceof Components.interfaces.nsIRequest){
        try {
            if (request.notificationCallbacks){
                return request.notificationCallbacks
                            .getInterface(Components.interfaces.nsILoadContext)
                            .associatedWindow;
            }
        } catch(e) {}
        try {
            if (request.loadGroup && request.loadGroup.notificationCallbacks){
                return request.loadGroup.notificationCallbacks
                            .getInterface(Components.interfaces.nsILoadContext)
                            .associatedWindow;
            }
        } catch(e) {}
      }
      return null;
    },
    isXHRRequest: function(channel) {
        // detect if the request on a given channel was an XHR request.
        // Source: http://stackoverflow.com/questions/22659863/identify-xhr-ajax-response-while-listening-to-http-response-in-firefox-addon
        // Returns: True iff this request was an XHR request, false otherwise
        var isXHR;
        try {
            var callbacks = channel.notificationCallbacks;
            var xhr = callbacks ? callbacks.getInterface(Ci.nsIXMLHttpRequest) : null;
            isXHR = !!xhr;
        } catch (e) {
            isXHR = false;
        }
        return isXHR;
    },
    getPageLoadType: function(channel) {
        /* return type of page load from channel load flags.
            returns "fullpage" for initial document loads,
                "frame" for framed elements,
                or null otherwise.
         */
        if (channel.loadFlags & Ci.nsIHttpChannel.LOAD_INITIAL_DOCUMENT_URI) {
            return "fullpage";
        } else if (channel.loadFlags & Ci.nsIHttpChannel.LOAD_DOCUMENT_URI) {
            return "frame";
        } else {
            return null;
        }
    },
    getRefToSource: function(subject, refstr){
        // Source url is the origin of request, which helps to differentiate between first-party and third-party calls.

        var source = {};
        source.url = '';
        source.tab = -1;
        source.lc = null;
        var source_url = '';
        var source_tab = -1;

        try {
            var lc = CliqzAttrack.getLoadContext(subject);
            if(lc != null) {
               source_url =''+lc.topWindow.document.documentURI;
               var util = lc.topWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
               source_tab = util.outerWindowID;
            }
        } catch(ex) {
        }

        if(!source_url && refstr != '') source_url = refstr;

        if(source_tab == -1) {
            var source_tabs = CliqzAttrack.tab_listener.getTabsForURL(source_url);
            if(source_tabs.length > 0) {
                source_tab = source_tabs[0];
            }
        }
        source.url = source_url;
        source.tab = source_tab;
        source.lc = lc;
        // CliqzUtils.log(source_url, "no_ref");
        return source;
    },
    getGeneralDomain: function(dom) {
        var v1 = dom.split('.').reverse();
        var pos = 0;
        for(var i=0; i < v1.length; i++) {
            if (CliqzAttrack.TLDs[v1[i]]) pos = i+1;
            else {
                if (i>0) break;
                else if(v1.length == 4) {
                    // check for ip
                    let is_ip = v1.map(function(s) {
                        return parseInt(s);
                    }).every(function(d) {
                        return d >= 0 && d < 256;
                    });
                    if (is_ip) {
                        return dom;
                    }
                    continue;
                }
            }
        }
        return v1.slice(0, pos+1).reverse().join('.');
    },
    sameGeneralDomain: function(dom1, dom2) {

        if (dom1 === undefined || dom2 === undefined) return false;
        if (dom1==dom2) return true;

        var v1 = dom1.split('.').reverse();
        var v2 = dom2.split('.').reverse();

        var same = true;

        var pos = 0;
        for(var i=0; i < Math.min(v1.length, v2.length); i++) {
            if (CliqzAttrack.TLDs[v1[i]] && CliqzAttrack.TLDs[v2[i]]) {
                pos = i+1;
            }
            else {
                if (i>0) break;
            }
        }
        if ((pos == 0) || (pos > Math.min(v1.length, v2.length))) return false;
        for(var i=0; i < (pos + 1); i++) {
            if (v1[i]!=v2[i]) {
                same=false;
                break;
            }
        }

        return same;

    },
    obfuscate: function(s, method, replacement) {
        switch(method) {
        case 'replace':
            return replacement;
        case 'shuffle':
            return shuffle(s);
        case 'same':
            return s;
        default:
            return shuffle(s);
        }
    },
    parseQuery: function(qstr) {
      var query = {};
      var a = qstr.split('&');
      for (var i in a)
      {
        var b = a[i].split('=');
        query[dURIC(b[0])] = dURIC(b[1]);
      }

      return query;
    },
    bootupWhitelistCache: {},
    blockedCache: {},
    reloadCache: {},
    visitCache: {},
    contextOauth: {},
    trackExamples: {},
    linksFromDom: {},
    cookiesFromDom: {},
    loadedTabs: {},
    badCookieSent: function(url, url_parts, source_url, source_url_parts) {
        if (CliqzAttrack.debug) CliqzUtils.log("badCookieSent: " + url_parts.hostname + " " + source_url, CliqzAttrack.LOG_KEY);

        if (source_url==null || source_url=='') return;

        // FIXME: this will be loaded as a resource
        CliqzAttrack.alertRules = [{'label': 'Facebook', 'trackers': ['facebook.com']},
         {'label': 'Google', 'trackers': ['accounts.google.com', 'doubleclick.net', 'googleadservices.com']},
         {'label': 'Twitter', 'trackers': ['platform.twitter.com']},
         {'label': 'Quantserve', 'trackers': ['quantserve.com']}];


        var found = false;
        for(var i=0;i<CliqzAttrack.alertRules.length;i++) {
            var obj = CliqzAttrack.alertRules[i];
            for(var j=0;j<obj['trackers'].length;j++) {
                if (source_url_parts.hostname.indexOf(obj['trackers'][j])!=-1) {
                    found = true;
                }
            }
        }

        // if found means that we were on one of the domains of the trackers, disregard
        if (found) return;


        for(var i=0;i<CliqzAttrack.alertRules.length;i++) {
            var obj = CliqzAttrack.alertRules[i];
            for(var j=0;j<obj['trackers'].length;j++) {
                if (url_parts.hostname.indexOf(obj['trackers'][j])!=-1) {
                    // it is a tracker
                    if (CliqzAttrack.trackExamples[source_url]==null) CliqzAttrack.trackExamples[source_url] = {};
                    CliqzAttrack.trackExamples[source_url][obj['label']] = true;
                    break;
                }
            }
        }

    },
    getPrivateValues: function(window) {
        // creates a list of return values of functions may leak private info
        var p = {};
        // var navigator = CliqzUtils.getWindow().navigator;
        var navigator = window.navigator;
        // var badList = ['userAgent', 'buildID', 'oscpu'];
        // for (var i = 0; i < badList.length; i++) {
        //     var val = navigator[badList[i]];
        //     if (val.length >= 8)
        //         p[val] = true;
        // }
        // plugins
        for (var i = 0; i < navigator.plugins.length; i++) {
            var name = navigator.plugins[i].name;
            if (name.length >= 8) {
                p[name] = true;
            }
        }
        // maybe resolutions?get
        CliqzAttrack.privateValues = p;
    },
    getCookieValues: function(c, url) {
        if (c == null) {
            return {};
        }
        var v = 0, cookies = {};
        if (c.match(/^\s*\$Version=(?:"1"|1);\s*(.*)/)) {
            c = RegExp.$1;
            v = 1;
        }
        if (v === 0) {
            c.split(/[,;]/).map(function(cookie) {
                var parts = cookie.split(/=/);
                if (parts.length > 1) parts[1] = parts.slice(1).join('=');
                var name = dURIC(parts[0].trimLeft()),
                    value = parts.length > 1 ? dURIC(parts[1].trimRight()) : null;
                cookies[name] = value;
            });
        } else {
            c.match(/(?:^|\s+)([!#$%&'*+\-.0-9A-Z^`a-z|~]+)=([!#$%&'*+\-.0-9A-Z^`a-z|~]*|"(?:[\x20-\x7E\x80\xFF]|\\[\x00-\x7F])*")(?=\s*[,;]|$)/g).map(function($0, $1) {
            var name = $0,
                value = $1.charAt(0) === '"'
                          ? $1.substr(1, -1).replace(/\\(.)/g, "$1")
                          : $1;
                cookies[name] = value;
            });
        }
        // return cookies;
        var cookieVal = {};
        for (var key in cookies) {
            if (url.indexOf(cookies[key]) == -1) { // cookies save as part of the url is allowed
                cookieVal[cookies[key]] = true;
            }
        }
        return cookieVal;
    },
    probHashLogM: [[-1.839225984234144, -1.8009413231413045, -2.5864601561900273, -2.779077348461893, -2.41154163187108, -2.8701669802592216, -3.010853183897427, -2.9831997811803244, -3.0258844950086354, -3.028549665472028, -4.922879838696041, -4.503195676571833, -4.598154161855354, -5.027344698225922, -5.217723368153992, -5.366375752342653, -5.195909278900248, -3.2940850310881387, -5.181468249477294, -6.110371416838184, -5.766202229535159, -5.393352786265537, -4.920024681004049, -6.049294408676102, -6.399015490326156, -4.690163484884073, -7.459851804835359, -5.825337077308845, -4.675000760327133, -5.3635239851672845, -6.331713706782754, -6.169284763337202, -5.951151191317628, -5.768078242705815, -7.332129653597336, -6.766704624275413, -6.01222435569866, -5.268617743244878, -6.279416117827666, -5.861972559492891, -5.838071468059843, -6.267250173459698, -6.283981033030117, -6.454759516784266, -6.5195694451700765, -6.83526729571271, -6.458157413359671, -6.359696067797872, -6.250241538141395, -6.647172527007435, -6.973987597161365, -6.4598607011160425, -7.685547265665763, -6.5912026847359835, -5.794718807999361, -6.474629988987015, -7.135098972554303, -6.880960523371609, -6.747429130747086, -7.733118660641065, -8.398636456057481, -7.6323973914922005], [-2.11332750230783, -2.3060786022344897, -2.3740965556720726, -2.5398307619465608, -2.463417892707307, -2.130953109899374, -2.8009573227909073, -2.9401508827086436, -2.748847204575824, -2.8414237914951976, -5.010884149435608, -4.7716590964777925, -4.868359687249472, -5.322380370933768, -5.037006822424893, -5.279762905036231, -5.635270908532894, -2.9219817650555973, -5.50179037155463, -6.5406369920023, -6.311742070591071, -5.516975693542294, -5.7251712834206305, -6.083331008626942, -6.409455776722731, -4.856277028595425, -7.356357334609669, -6.255977591877104, -5.042089425488359, -5.723688703460408, -6.9306288690141455, -5.879866127104103, -6.269949621534028, -6.969512838475713, -7.475373123729266, -6.802062729887527, -6.566109586768108, -6.661695002244713, -6.634070998648396, -6.128265317507457, -6.0654489711795785, -6.79728322915323, -6.99559673771516, -6.996654379273295, -7.671972036661277, -7.840255377779173, -7.132455920432357, -7.233113706563278, -6.737551430374816, -7.2706736012479585, -7.430290364348156, -6.991903776514698, -8.559572276072503, -7.231105001502197, -6.117005677632925, -6.669675284003577, -7.87022016648111, -7.635233211015519, -7.18343028641663, -8.53463332772525, -8.567176875457722, -7.573077285525099], [-1.6313545940843748, -2.457209014039589, -2.565380346827546, -2.767788786784649, -2.6386222432933284, -2.595661570703591, -2.6893427324813977, -2.7198733792574403, -2.720533202987637, -2.8467380805237736, -5.029918409868431, -4.178710463028381, -5.07588590483658, -5.057436988529895, -4.899938336310833, -5.271744381251988, -5.715419865537325, -3.1739071041721116, -5.367102243680773, -6.224018730172038, -5.866973141306898, -5.730015933050199, -5.360958031920617, -6.20201967617667, -6.328452890969734, -4.837569916970598, -7.520833339090353, -5.8325529174204185, -4.950768880962046, -5.339171801246006, -6.500538943869661, -6.141626179853517, -5.826929659866057, -6.371549418153106, -7.095602530626063, -6.863928261303842, -6.26532998038965, -6.486382994639529, -6.568804701240378, -5.928030195562504, -6.138501621140467, -6.375855129864318, -6.672567424416514, -6.87690014131182, -7.500698430681298, -7.486404619424152, -7.110483757622713, -6.948864783187929, -6.7689909475117735, -7.44680608044408, -7.305175362028806, -6.490004000406482, -8.278142463867583, -7.100043692626031, -6.262757631704339, -6.785644569035485, -7.917859578552653, -6.966883288690608, -6.7663306639529575, -7.827911341889713, -7.709275282211631, -7.650980633730635], [-2.2483023852308777, -2.2601431921520803, -2.543211818297523, -2.6290975996017654, -2.597012293697696, -2.425038774903284, -2.6464962853598264, -2.7268820909874645, -2.7170988469992086, -2.6384412943652213, -4.8059842634060495, -4.801920790322523, -4.881995682865955, -4.399130557719554, -4.977525552072196, -5.254333597613871, -5.4861286120783905, -3.172333855510997, -5.311009967578493, -6.3787775808955045, -6.060833750357407, -5.179488625881995, -5.284849141539821, -6.185226477248653, -6.342526765978808, -5.0477193482508715, -7.229508117457252, -5.92913163950562, -4.781563610047119, -5.175693021409531, -6.686598785853124, -5.953265540842049, -5.765108625614716, -6.249636653394711, -7.053405713688212, -6.871084156894258, -4.746700678954438, -4.435206614193364, -6.2492260600816145, -5.437566316202071, -5.90294982336378, -6.5708663077474965, -6.4774110336687505, -6.642451113295277, -7.490560332753359, -7.638809897851904, -7.037026821604173, -6.792453878834064, -6.557926605402683, -7.183535297458448, -7.556615154408894, -6.675849393697125, -7.929241490870054, -6.920447880012594, -5.937211886970303, -6.536908132533395, -7.266281062975223, -7.138583909596181, -6.9407325511841, -7.611188320541975, -8.063402408224212, -7.7539194100649205], [-2.0350349956205984, -2.348602646771946, -2.41594411405956, -2.651370395735765, -2.563410442434685, -2.706962611141542, -2.7917112923152776, -2.7483543933766477, -2.6785026736567357, -2.8111298756441037, -4.759837736546805, -4.20618015484438, -4.787453629928326, -4.659538126267765, -5.015532806050122, -5.056335259588051, -5.339468177159593, -3.040667184111712, -5.203144447478613, -6.2264472230490675, -5.7097357671058155, -5.585194192596145, -5.035187712987706, -5.542988699592872, -6.206189420830567, -4.864552817623237, -7.387161020524848, -5.130725109803191, -4.710070938057912, -5.015532806050122, -5.563665939332496, -5.8412571088023135, -5.744609136156329, -6.206575148897066, -6.842735398083401, -6.794361813799185, -5.850672107736916, -6.088449236501511, -6.348519254409916, -5.725588459198469, -6.064735388153122, -6.479956671206651, -6.2209527037314265, -6.70094736915976, -7.3405268040104845, -7.140183173146506, -6.467358872953416, -6.7233339772218645, -6.184068000080206, -6.381516598393398, -7.406185056529545, -6.368731036096427, -7.402351186018824, -6.6091509166536255, -5.9623588984476195, -6.352529061520146, -7.133337180638517, -7.24783614109371, -6.901266731308386, -7.234806640803376, -7.432126848507545, -7.494477663675224], [-2.0215812860615885, -2.455637406643175, -2.4330253990141046, -2.6113902739466517, -2.6033787533338284, -2.6337646574813993, -2.7111759743895725, -2.7471499108067454, -2.721672070749707, -2.7644985821403028, -4.771735346669196, -4.967298931497775, -4.806933772233218, -4.796223062219612, -4.702049659123834, -4.615986584200591, -5.422222957790021, -3.024083897225106, -5.341473161524181, -5.691932137893965, -5.870247680316981, -5.6516120254419615, -4.85258639108815, -5.9684706438872475, -6.205102036008844, -4.762283950640148, -7.106211026775939, -5.754565801069223, -4.28552037163959, -5.083154204506742, -6.514533306380853, -5.91282033178054, -5.801594696670316, -6.211408552601299, -6.884100000075919, -6.5060032575028, -6.051550266183317, -6.1528452495165125, -6.237040028392324, -5.845664774991169, -5.83750622157883, -6.376088248894053, -6.3936457603588925, -6.58430154569624, -7.071724850704769, -7.213982427018076, -6.56730052905341, -6.608473779316545, -6.403307671270629, -6.973970456584425, -7.485700648480843, -6.5060032575028, -7.126013654072119, -6.592294210440276, -5.525669597265563, -6.0726189713973024, -6.168884085714272, -7.057863242618145, -6.702467385782517, -7.84259108644045, -7.932742183434748, -6.889071012797939], [-2.3515175517946965, -2.4895377785815813, -2.455794452354539, -2.6177065611128625, -2.3916765698655924, -2.55893036105207, -2.621684157393488, -2.6988517931658524, -2.630805311213068, -2.6634082117951667, -4.639123440452939, -4.108116635400416, -4.850674635561831, -4.879642999369406, -5.020506071184806, -5.079702479761731, -5.3856932140647995, -2.922465393995544, -5.272571266829349, -6.095451326503016, -5.703507123198923, -5.5861660464475555, -5.144197286007818, -5.722031888813277, -6.28586346876822, -4.872555039237073, -6.886991750607913, -5.521389523166842, -4.712785087276782, -4.712557943607434, -6.258849400356963, -5.781080159458192, -5.683518571573409, -6.497978247391754, -6.801813554699944, -6.640350228026399, -6.23670827447975, -6.480528140170159, -6.503409353749256, -6.035279500709713, -6.187868456644626, -6.634900623258835, -6.227883924459252, -6.665648019797556, -7.5457712876636505, -7.422426740346121, -6.235666064901307, -6.769319721223498, -6.343344078699495, -6.975730165249003, -7.353206363454935, -6.635677322327007, -7.937813375439674, -6.762240045635436, -6.147006740966892, -6.741296871790193, -7.715813334827543, -7.183705495090042, -6.938232467377743, -7.593211012735211, -8.021194984378726, -7.326496213127361], [-2.404503840183417, -2.43761707422273, -2.4108252303609095, -2.2999425986283435, -2.542843475674806, -2.6029429346724786, -2.584141922741018, -2.5855127818195496, -2.5510561981552526, -2.647681869737238, -4.782820501953572, -4.808208666935694, -4.979563332219715, -5.008211525808261, -5.046432738628459, -5.142457459370653, -5.485491564024772, -3.1144173778919617, -5.417825855041213, -6.245547233803318, -5.938268453446564, -5.963941744764968, -5.450843208258146, -6.059373833665894, -6.223182084343739, -4.942745700375246, -7.208409268623897, -6.038143491827719, -4.6277437642171355, -4.892513996642899, -6.694766741586792, -6.117821568685912, -5.949820065666706, -6.502648045547855, -6.835922059321975, -6.694766741586792, -6.361312919572388, -6.403294392961231, -6.118769885494771, -5.676056523505988, -6.406451957946552, -6.5244722133881785, -6.6333977952105005, -6.6574953467895615, -7.573786078663716, -7.446115322000925, -6.883692335590661, -6.903250344490318, -6.3498910941692, -6.905331510694142, -7.588115904218541, -6.879623153983935, -8.035692497676832, -6.939233062369824, -5.959077527634608, -6.324513515108117, -7.549688527084656, -7.120692921566297, -6.988939594552065, -7.891731808755324, -7.727259481120012, -7.430143376434873], [-2.2924692182301323, -2.450539739657926, -2.3769703926915984, -2.532604294663703, -2.55393918066343, -2.609718771364289, -2.6246425013179655, -2.661744915258029, -2.6011009513028984, -2.6236780353341946, -4.669477044233787, -4.1521285006409165, -4.955491059584871, -4.818890308190988, -5.030853379357302, -5.002039294312803, -5.278250342600015, -3.076829272811893, -5.307731406455737, -5.826171280206974, -6.022604681193609, -5.8364861502494865, -5.222160875948972, -5.86734719439116, -6.263453577434854, -5.1217643044016885, -7.32073988901422, -5.758783848671988, -4.666476541899311, -5.259001445170042, -6.374002568031498, -6.083417735921755, -5.695962812152638, -6.490715185357981, -6.417147740477192, -6.55681384079998, -5.431378631989581, -5.843302320137157, -6.369727752361356, -5.638321273173884, -6.50456582229188, -6.275027142828877, -6.210627212225794, -6.774279201200845, -7.54625217416398, -7.377527245335997, -6.968174323388823, -6.961544464850153, -6.5738576027632725, -6.808653231033201, -7.247759185607984, -6.667823395181603, -8.06567857870257, -6.862038055489511, -5.923075085846576, -6.772454383176216, -7.732534132174032, -6.980444415980637, -6.935456028765855, -7.926350068393722, -7.409760739910981, -7.357691884279851], [-2.395140177772492, -2.3972905877762423, -2.4380054501613637, -2.59514809923619, -2.5304957080424493, -2.553494441315067, -2.592658670737186, -2.6234135177213647, -2.5068257242437872, -2.493912396989218, -4.415128005729072, -4.8162395242315545, -4.805681457561184, -4.959588437581088, -5.013259465745109, -5.070148436368585, -5.778302005668334, -3.0289910877331776, -5.527143864017425, -6.11105402601701, -6.123887370951674, -5.975929983744964, -5.442482986164537, -6.151079378646925, -6.120416006196215, -5.065655600056955, -7.071974876907828, -5.957253719340739, -4.781773843113505, -5.354948164056644, -6.520450343119245, -6.293473674919533, -5.817016517849025, -6.85914069525248, -6.81356318675616, -6.777584585720929, -5.97764525003172, -6.226877237430227, -6.02961643394924, -5.9729353291005545, -6.418715298488868, -5.532354351604477, -6.803710890313149, -6.889653320113874, -7.354541848692839, -7.502757793000282, -6.938924369120657, -6.214291571987144, -6.749334119435077, -7.237514956739779, -7.394443065445024, -6.457482478746571, -7.947443614261728, -6.86121538479334, -5.698583920623846, -6.845759126556648, -7.683896617545187, -7.180188461548061, -6.757725777071325, -7.8704825731256, -7.881944016644606, -7.107203568791572], [-6.7847523397462, -4.956382101946025, -5.55168468117927, -6.54694976738503, -6.679027997805541, -6.920449307304025, -6.651631877885628, -7.028532297007316, -6.819873006155468, -6.9668156836069475, -5.07824502580267, -3.6978375281608122, -3.2158001218369128, -3.221520357616586, -3.5888259593254497, -4.18118917224718, -3.0226572253435795, -3.971027081545084, -3.562365839815367, -6.241860395850777, -3.738063429007306, -2.286143322088719, -2.8154088123469325, -1.9366972011829824, -6.402763696295053, -4.09673956284193, -6.7632686126933175, -2.217315348390325, -2.7898081670861736, -2.2970370063901697, -2.7943042308650328, -4.45525252224197, -5.6170558845712195, -5.634999368405547, -4.204524838877218, -5.247540598697068, -7.679731693977602, -7.496500850432476, -7.694782629326121, -7.660949127015419, -8.444625153562612, -8.02242837580043, -7.9107342568656245, -7.844229700045118, -8.496568431723452, -8.90528981102539, -7.744710798608082, -7.796294560812227, -7.4084137546993, -8.54315037261458, -8.96995880381818, -7.702981796781846, -9.818649422090688, -7.982756374523151, -7.087136791691802, -7.726484291615801, -9.302472289566692, -8.264363329731667, -8.520253749464962, -9.573314897467998, -10.041792973404897, -9.03352354731742], [-5.530908158078372, -5.12660572425173, -5.285205739999349, -5.724471900365845, -5.873312125055024, -6.16534879225732, -6.148934708170209, -6.3610443530793574, -6.311033932504697, -6.085846837289822, -1.9318371570117603, -3.9897678769234868, -4.264721024425275, -4.508665668126993, -1.397989588361542, -5.165043688633805, -5.1354703161064155, -4.710076673495516, -2.2812710196631696, -5.744808587095395, -6.153180999051661, -2.7741841902487896, -4.878049696777151, -5.0409257316634655, -2.3898944653854226, -5.13595610674021, -7.841822106027579, -2.8471437524600627, -3.4340095911141377, -4.619316513108799, -2.3549200090866647, -5.921518406898233, -5.302848234969303, -6.786138406296854, -4.207750888408638, -6.039012800612939, -7.841822106027579, -7.704962923310382, -7.065002449743519, -7.589296290560376, -8.260096172428325, -8.035112694192108, -7.871344545293901, -7.140827013169332, -8.545938317958099, -8.836893715754849, -7.993349965830133, -7.27788665694764, -7.741565502287929, -7.888977243944857, -8.111485672976682, -7.875096894912451, -10.091297373707675, -7.392485113590403, -6.863268166852988, -7.610229500226842, -8.901213681542407, -8.92241588919301, -8.313038591698524, -9.803615301255896, -9.310181420201774, -9.00812940746704], [-5.262771475279199, -4.784242541566078, -5.27970172852834, -5.684918512820975, -5.945292208575153, -6.218979090786592, -6.228233983716081, -6.354509212158639, -6.204315840281487, -6.442281485719593, -2.526983467749325, -5.114296740462473, -4.530006859098648, -5.422625873895182, -2.9651924820539826, -5.615416770210166, -5.759915004501759, -0.738654569892248, -3.9951800832331146, -7.496424744983864, -2.271649654828947, -3.6688863968618732, -4.479075949205008, -6.406971077861438, -2.7704548687771466, -5.064362048924221, -7.65209604855975, -4.10990241837356, -4.3379100438872245, -3.144791234860585, -4.257400003418622, -6.678114421469913, -6.866487433947222, -7.697728752690109, -5.8045538215356425, -6.443871311173693, -8.079096309219214, -8.153204281372934, -8.17767713789166, -8.353264662504271, -8.864090286270262, -8.820319623214933, -8.693771874337664, -8.686253041923635, -8.948055666387596, -9.842684901480572, -8.909864867655205, -8.569719225667685, -8.285794202093616, -9.08611589448313, -9.094531091408415, -7.571541334321345, -10.622843459030147, -8.818180584966184, -7.823031278179709, -8.265917771336019, -8.826764328657575, -9.481851947393176, -9.0917181500318, -8.558120089824332, -9.233307603986084, -10.138335143581529], [-6.352576341887475, -4.375482811098582, -5.097247890129581, -5.253867383491415, -5.300921501088017, -5.719261065235271, -5.695077377144448, -4.664604980788103, -6.0509261540753565, -6.1211148128546835, -2.6955840583648807, -4.0885439717448415, -4.601612684872268, -4.3272866151564005, -0.8335121453767717, -4.368698782518719, -4.841722524158204, -3.6648788033138118, -2.5172646408008483, -5.8838060715240985, -5.03345350892465, -4.275021730152804, -4.6405776530763765, -5.25643229403688, -3.133213396702524, -3.881602832644344, -7.333792367288475, -3.6375800962202542, -3.280343679384232, -4.168603006615407, -3.0158762344692915, -4.957870530657444, -4.673357005846336, -7.071279326505898, -4.732292586433726, -6.102987428262127, -6.308187629826426, -6.692855118141101, -6.912844895031934, -6.811275201992611, -7.387021770702892, -6.866694309094154, -6.971677700053924, -7.120054614261141, -7.672123196561181, -8.47105299909571, -7.06564216575394, -7.303313817631059, -6.877175818825198, -7.588372692026248, -7.710844848156796, -7.012073355807918, -9.487490679574803, -7.203069557208429, -6.086293297912648, -6.450936411500557, -8.098699438256325, -7.677018501414594, -7.313496820953744, -9.611543328244782, -8.931691690166081, -8.112931574673333], [-6.278777370845214, -4.701340011999448, -5.078865738235898, -5.8830885176004895, -6.165050673343658, -6.274964098411205, -6.212416394644692, -6.400778791567437, -6.741692863598321, -6.816576094912807, -3.3928904712107735, -3.566247086795751, -3.646180662937257, -3.523693462975528, -4.243767227003855, -4.080529251966207, -3.795135190780714, -3.596123418433819, -2.7581828008765474, -6.336206897605354, -4.412794119233608, -2.7790238541384125, -3.7937492847610685, -1.8714655708089012, -4.039189587014222, -3.917817104421266, -7.57147815542886, -1.7211826197805813, -2.454732555101985, -3.258178620019967, -3.831607640543702, -4.745787338078659, -3.8173867609921763, -3.6132042458306612, -5.788388393117924, -5.078865738235898, -6.509442541403006, -6.358094961721853, -6.982655840165303, -5.955633264954192, -7.203135532877834, -6.519814112808369, -6.508748303549079, -6.5805671825510945, -7.521390752829464, -8.307422019239775, -6.987204748691672, -6.90870144071007, -6.578332663638785, -7.263487211998134, -7.281252691733005, -6.635300404511988, -9.747550691415777, -6.939413018359865, -5.8716986926591, -6.717215468733563, -8.061948046761787, -7.4055504084105825, -7.052394044113555, -9.471951436870118, -9.440772718621666, -8.392393495069179], [-6.019277337678054, -4.809610930457335, -5.353723551448762, -5.676382755872694, -5.70371603264992, -5.986064759126338, -5.8139317591377235, -5.978144349530662, -6.042881895447475, -6.198360420377549, -2.2921047448703056, -4.34095023979577, -4.345648109454055, -4.367598309292761, -2.0155741702111323, -3.0132780221373907, -4.923111941566577, -4.563679111444075, -2.223531060167143, -6.691102686207805, -5.506010794027101, -3.0594865563826104, -4.849221407410736, -4.504665385487454, -1.9294270482862954, -4.87704758753489, -7.8125932274537675, -2.476262613634102, -3.9821539473427885, -2.8193399945915623, -2.274864811699418, -5.85738068573614, -5.424700477670406, -7.189965927648669, -6.389275800912233, -5.638934468614081, -7.03745392086323, -7.341255375194895, -6.260863632640313, -7.279063354938447, -7.679061834829245, -7.811259004440631, -7.236144890792278, -7.5275849533863886, -7.494018129747305, -9.1181262319292, -7.907769904821474, -7.576977708715964, -7.061731490444577, -8.083943001314976, -8.105182737815888, -7.709906510180343, -8.65367988774833, -7.560240916360441, -6.676421938949557, -6.335428678009885, -9.006382193489584, -8.143473650809202, -7.5376758563683515, -10.154666091954931, -9.349927845986523, -8.656780665426579], [-6.45948206141902, -4.541389017548509, -5.0469147172405115, -5.714893702071352, -5.93765911006474, -6.159588168280474, -6.484829040506417, -6.54643138634695, -6.777423978144398, -6.472536180151478, -2.0992585177991696, -4.351360197286945, -4.810779680772453, -4.478347221038041, -1.057979923268165, -4.503803429976553, -4.369600328148692, -3.1761274441594316, -2.5925706700973334, -6.132316774171815, -5.0527495258256305, -3.548319221739584, -4.665298532220545, -4.239092161682817, -2.8823289365699227, -3.9799558061803935, -7.613527691788449, -2.9149052754992715, -3.0856952412535055, -3.988705873974733, -3.519423658731669, -5.380012776918168, -5.236242140888087, -7.294418265937878, -5.378236234528395, -5.653900468202214, -6.843339306558724, -6.1506932535462235, -7.23734725322546, -6.366553451469326, -7.364460455464448, -6.868708500684183, -6.652923233094938, -6.285920796794185, -7.434940854111734, -8.332992180665768, -7.045904469629325, -7.3935637933916185, -6.8666551118723405, -7.771896007559911, -7.6868589648739984, -6.982133113853507, -9.79784886428876, -7.098382406877942, -6.05045863483477, -6.643853499354418, -7.8988076492249855, -7.62952803313489, -7.2191872449632415, -9.030593711575094, -9.78510983851133, -8.512650620040239], [-7.312010848930209, -5.9704021836204655, -6.3878250976208735, -6.964626238636961, -6.946983784483292, -7.4124339237241115, -7.3181741966378775, -7.680384414313297, -7.712878247789743, -7.554150900935073, -2.446039713635401, -5.2426041270797, -5.947299500896444, -4.663409565765878, -1.9484553212571183, -5.736061416021277, -5.712018325729332, -4.9933347157551395, -3.124667578606162, -6.881965531986077, -5.837272445819192, -3.4071965596735665, -4.466780007835062, -3.7439634287862087, -2.4245394005655605, -2.7481043832730636, -7.96925132102691, -3.001717011027925, -4.3613498567188325, -1.0557054893757776, -3.70597885137566, -6.306264213716016, -4.571775536818785, -8.174476930790583, -5.896948417633875, -6.225037976827956, -7.408704473732679, -7.482057817244962, -7.278478028822127, -7.6772808871048746, -8.27951403118039, -7.874318428531343, -7.723948471543991, -7.700568997316141, -8.91379761462879, -8.048158534515101, -7.944081716081054, -7.980577820654186, -7.290733450482923, -8.159308709317411, -8.547715834521, -7.821812931153412, -10.179602578494553, -7.600205085285631, -6.935111692528849, -7.541317747952087, -8.80008790436004, -8.364689804291782, -8.08874001915325, -10.681459532277783, -10.11675467483489, -9.167510387022356], [-7.888212115175222, -6.644858293408979, -6.899926832152373, -7.644887076927795, -7.6845832447435445, -7.532598742461448, -8.35541557609491, -8.047237610771814, -8.039272966898704, -8.151069111852731, -3.668932909455333, -4.782855975285661, -2.6659061839419613, -2.8967154778709228, -2.0223904901109755, -4.446771913881909, -3.000219123980515, -4.8870757508472185, -5.930891109758962, -6.823383785692898, -3.2455278628878323, -2.6715253337166462, -3.4540042231373063, -1.613293110190054, -3.32378892967727, -4.249589417392827, -7.22956773062339, -3.479217249500404, -2.6394006861426296, -2.505331420610824, -5.608431497999796, -3.9128781321838506, -6.817651617834854, -5.899129031817539, -6.838124773860243, -4.798082958969038, -6.707198867504101, -6.862144714309829, -6.946702102337892, -6.119321735858142, -7.3106242225785305, -7.047703884629593, -7.1735103563413185, -7.1142937780684905, -7.8727953781736435, -7.684274173500164, -7.105593531784784, -7.043298950514618, -6.705339482889372, -7.153500510194026, -7.545964351744817, -6.429130146514012, -9.208169648866278, -7.146978747947639, -6.381569697965211, -6.863775814304458, -8.274721978073412, -7.87653370028425, -7.678419897035876, -9.611509357662127, -9.195484489338961, -8.64028017837942], [-5.479179331884548, -5.058052917950845, -5.462604366790335, -6.042749073104725, -5.955329948912708, -5.958323963125313, -6.182592584875092, -6.134964535885837, -5.987223312688662, -6.092926822690444, -1.4103668710151773, -5.3350267357418115, -4.970584606980225, -5.289457186272422, -1.770010358993832, -4.901554513033236, -5.37688758694302, -5.089624713826659, -3.3520314691389803, -5.392942008652894, -4.734460344193294, -5.4364649785873, -5.373540303482963, -5.098468738623112, -1.787587681664556, -3.2734283276295595, -6.018573842572738, -5.287155689284143, -2.4508369623232906, -5.268931950327691, -2.1042922431924556, -5.627005270227098, -5.60465202444635, -5.974953220096848, -5.917202163476144, -5.89303609762896, -7.4048682036926285, -7.92851451588768, -7.027392005486696, -7.609083745121319, -7.38594019380711, -7.373517673808553, -7.797674914928869, -7.69894007424318, -6.9721762828842495, -7.92851451588768, -7.9072371174403955, -7.498269378781029, -7.24617825143195, -7.836141195756666, -7.972477639308797, -8.030297210197622, -7.424161406627308, -8.130380668754604, -5.985681292336846, -7.548459123304884, -7.876146530370365, -7.886403030537553, -8.383576565135217, -8.509870290459508, -8.104405182351345, -7.3612475812167375], [-4.615704248273826, -5.059874046144977, -5.605352624766998, -6.125932548297868, -6.262849675716521, -6.79239877505316, -6.990929985784472, -6.841047905444769, -7.1584533214794765, -6.9886390340379165, -2.1061188583709898, -4.694960766195293, -5.294767434713961, -4.877455498156362, -1.7372915500183557, -4.54913156517679, -5.204152324138941, -4.129384627657894, -2.037945671503165, -6.073264053143508, -4.589028985169175, -2.990753289694604, -4.778969963958759, -4.689721987339014, -2.425686266522293, -4.746481928875957, -7.836127606736178, -3.351158263461062, -3.2418172438356554, -2.1018059989954563, -2.7036646563447677, -4.616611132654885, -4.89196974360223, -7.672674534246606, -4.594182160042578, -5.702759391924034, -6.928687676907251, -6.888038111045066, -6.879281938695605, -7.0247524516915965, -7.464610089759517, -7.314413547152238, -7.29014621148154, -7.293244587314209, -7.623992355607218, -8.372647679876952, -7.108856380340105, -7.38925322665568, -6.931385277679899, -7.915280634635728, -8.074744053353632, -6.836124212582984, -10.164407149105006, -7.372318020898097, -6.283267109907934, -7.0071153102054895, -7.702596214111655, -7.848216404055182, -7.332806708624255, -9.549591811814969, -9.295811291038868, -8.128717117098297], [-6.86596902684244, -5.052082122851932, -5.150933488599681, -5.292208274141252, -6.214682697483703, -6.745331904339627, -6.68552490120206, -6.760045968476806, -7.227305715576431, -6.950863382929711, -2.1215717821722215, -3.9228106947364623, -4.840908762978201, -3.0664686008437925, -1.6983460154315366, -4.061987675375524, -4.329017422576037, -4.468146834761754, -2.0559567932823986, -6.284656471404593, -4.495653917304999, -2.239702601986903, -4.059167724800704, -4.675038779649125, -2.554078005507218, -4.208324039380938, -7.846798279854166, -4.952711862629422, -3.1510988852700317, -2.942373372199169, -3.3895078376634635, -4.604176621456193, -5.1138376420493366, -7.9144140567925305, -4.640693910453494, -5.102920313867999, -6.555881088992486, -6.826369644359554, -6.799686147757116, -6.863359893400418, -7.558312671802701, -7.067443904093005, -7.193279183729173, -7.1899393531824245, -7.705592764618944, -8.457679157012771, -7.256276285899237, -7.186610639983997, -7.0503828029559665, -7.591798854832744, -8.06246715675167, -7.178062400973902, -9.768878866076495, -6.917516203514602, -5.665418470446385, -7.260143611855673, -6.937390775844807, -7.687607497719584, -7.3485921408206325, -9.2384661090352, -9.464847655623185, -7.897922355187247], [-6.774920173861653, -5.204290861824316, -5.43566671911157, -6.296930641076284, -6.565626027570306, -6.7373590105822805, -6.991252066666452, -7.063233360250443, -7.2676834795551315, -7.1966044322333405, -2.083909994196951, -4.067585265323549, -5.182321460673428, -4.835732283228186, -1.980079058156674, -5.0283663440075825, -5.072641431371989, -4.6392056435133515, -2.7086094993416667, -6.770304135451181, -5.008181972697398, -1.1019554288598505, -3.2594369265598493, -5.6765883311043766, -2.736784393019736, -3.364824539297133, -7.918041582638827, -5.789527217909832, -3.4282422713486094, -4.498435097687583, -3.6322465613937016, -5.355734234640129, -5.0804532195051415, -7.17597860187687, -4.9759313787901425, -6.718299350460867, -6.452973839496266, -6.266241964550636, -6.756169624516277, -6.43275589071587, -7.149632742116933, -6.722481373881418, -6.632646871978412, -6.5830057991087605, -7.441299494170494, -7.5325638154552745, -7.295254585596671, -7.196283868037615, -6.683920964952739, -7.4835386813502325, -7.587428922371031, -6.992558402580507, -9.54477866233574, -7.0691430439756715, -6.0008086042221205, -6.0079129112663265, -8.273962947039259, -7.457398913104675, -7.183861348039058, -9.235518989239411, -9.247910721534573, -8.527701618931673], [-6.725963719695806, -4.710012269685353, -4.981543035572536, -5.7693914443296395, -5.741238652017211, -6.34104225410854, -6.461701921452123, -6.616580803658851, -7.050213688876461, -6.932988782385651, -2.7442254377569215, -3.902092293780571, -4.081087684032349, -1.8459531867558991, -2.260196124051401, -3.8113055093318327, -2.1904142607255017, -3.5077174805325915, -3.070625904070985, -5.688404814159279, -3.676818033328958, -3.705969932950152, -4.175966474127823, -3.555777846153588, -3.6599169276373167, -4.233380646142029, -7.565625193952616, -4.758247211588438, -2.668505149650637, -2.593317887541856, -3.982238613532973, -4.922572014698711, -4.457568202222798, -6.922768742308341, -4.874097132395777, -3.7366670217502587, -6.099051002533345, -5.950541812233132, -6.754321355464054, -6.000835251677606, -6.818602573551164, -6.538250446625281, -6.5136752899401404, -5.7389354920585625, -6.837502673710269, -7.922940958163197, -6.4879709082904045, -6.559235554477551, -6.415308634074, -6.963830229106114, -7.464928001069955, -6.466545899251641, -9.489635645899149, -6.3635319575989815, -5.527598474760337, -6.407003965795449, -7.463914829757348, -7.418626873140783, -6.4607730713017455, -8.850715648219035, -9.544876513609825, -7.984492491801492], [-7.251231594323855, -5.21374696908488, -5.698223064924641, -6.1375976604763816, -6.322511629217009, -6.768362468268195, -6.494106816635844, -6.457670861321346, -6.860741199932812, -6.755693520691695, -4.0580333694338515, -3.9411669781297105, -3.7467312772977017, -3.0227837077197126, -3.61529958808048, -3.574469853485688, -3.2007714947116837, -4.080705573827712, -4.670471138732819, -5.7966968651863855, -4.155602316322404, -2.9527040483599185, -2.862751521261682, -2.037725742388079, -3.7818488691194445, -3.113228390392548, -8.164264994327704, -1.8458475827404217, -2.5467378386179824, -2.7020967605017185, -3.188124830525815, -3.6799312814828857, -3.4909044267832696, -5.197365837878935, -5.202188998354364, -5.870321468395694, -7.4721345906728445, -7.508740887837122, -7.308294052687071, -7.524695844262695, -8.528908107915612, -7.92499206108361, -7.684820971302881, -8.246116020758024, -8.52404191826444, -9.16793672064164, -7.835273241415741, -7.178620119286367, -7.559608480967977, -8.499112535221915, -8.875184344633446, -7.775193695995215, -10.198665810583236, -8.01769231637253, -6.730988787795164, -7.673144441641045, -9.323628945401888, -8.330457169191774, -8.013022138590646, -9.77099654516406, -9.908396414566504, -9.416350685452109], [-6.383306695601549, -4.903894061372386, -5.294037540593016, -5.450500954330478, -5.333223053427145, -6.308171725769449, -6.710407117707228, -6.887542628987831, -6.847572675445971, -7.035457528925254, -2.2105034037003235, -5.0202198363584465, -4.228806005807516, -4.2610399361561155, -2.630714925229401, -3.899363165669206, -4.911168632565807, -1.9598915311908123, -2.357698156549484, -6.874278408705108, -5.4856719078268386, -2.9453898821076563, -4.76865138002776, -5.849682782165729, -2.1582691520417923, -3.13711767038794, -7.932068702852963, -2.1341546758789423, -3.3759594869296796, -3.525124340216131, -3.4812218611704324, -5.083766155674364, -5.7936328268294535, -4.353576622920111, -5.907706290260866, -6.135534326871947, -6.846532994187875, -4.609063889576182, -7.503287789431182, -7.483445868632177, -7.2287173521187755, -7.853210127940644, -7.155334806184752, -7.407188463381393, -8.090673733029602, -9.081164896953064, -7.857960730699241, -7.896800564015505, -7.262268886290009, -8.128645226782451, -8.177248142566354, -7.485412437604219, -9.720755973044048, -7.9739596445621235, -6.796539470357211, -6.907958941482774, -8.646989682962468, -8.283628546124925, -7.797896489956591, -6.6686665609139695, -9.771081056931564, -8.750720965163202], [-4.685181991517679, -3.1394221383869034, -4.505733999919456, -4.7128201143378075, -4.721709061755053, -4.800636320344724, -4.867216645426291, -4.85864761270119, -4.820149134568306, -4.881081685563463, -3.6610088191091923, -4.523883318425133, -4.405422178721609, -4.511747247142908, -4.4973757423052545, -4.410859930021738, -4.692381446660533, -3.970040309575452, -4.061847858828575, -4.724689689893191, -4.678033998252392, -4.350556098635668, -4.167208374486401, -4.450909776342023, -4.644417387453407, -3.724277324458299, -4.630737283549326, -4.509337607422754, -3.787718752781497, -4.309323510802315, -0.6823718671879156, -4.449775346271411, -4.306372205167735, -4.410859930021738, -4.920232593125288, -4.3914208729895154, -6.478377211171838, -6.487035273914953, -6.801150603434889, -6.531487036485786, -6.875258575588611, -6.039010551387992, -6.9553012832621475, -5.362670489144429, -7.042312660251777, -7.027274782887236, -6.983472160228843, -6.58757650313683, -6.732157731947938, -5.820321350423163, -6.504579583565862, -6.710178825229162, -6.395685495326725, -6.710178825229162, -6.559138567816296, -5.802621773323762, -6.789316145787886, -6.8131267944816045, -6.29749346914751, -7.1889161344436525, -7.012459697102096, -6.888161980424519], [-6.973841065843466, -5.090695336189662, -5.341561221116127, -6.0115634498929555, -6.202945132409144, -6.628849553394376, -6.911669409716161, -7.0009992844957765, -6.886081347969349, -6.711294966663227, -2.260331825727248, -3.839334077735597, -3.9667628422059718, -3.420241689905642, -1.8735787833427253, -4.188499103605226, -3.691171678101274, -3.8593630820739957, -2.3524981891706576, -6.231341006564324, -3.7662373591100775, -3.6465568924129386, -3.4963200738799767, -3.4321214183238204, -2.593050419274572, -4.346868167488547, -7.8364379197408365, -3.990422275679548, -2.904818352752614, -2.3714612152432646, -3.1378637759089556, -4.357037863124861, -4.651314292504279, -6.760867254793699, -4.107313187039242, -4.3976920060255535, -6.440759053046417, -6.465477098310146, -6.582182413654962, -6.610599862587676, -6.978263755093254, -6.719449335464573, -6.730879435939417, -6.514035039942995, -7.843934206718764, -7.66305587798569, -6.780807453646412, -6.810345466083276, -6.347157031161333, -7.321885120582923, -7.779113558339937, -6.602957069625781, -9.658525717989464, -6.893034874465941, -5.640541915214837, -6.61808064554899, -7.825297811959789, -7.623352248005446, -6.729273803531229, -8.625119353004427, -9.394209194493895, -8.033505455437194], [-5.604855175474509, -4.462285490693087, -4.571350651692403, -5.056493889833258, -5.072440143885144, -5.681064638387167, -6.280536665394942, -5.74786868753166, -6.300402104581103, -6.443541857970619, -3.08781816164275, -3.6971443171127936, -2.396573090959646, -4.216785762291264, -2.055069601332964, -4.2400357108180975, -4.510301966657801, -2.8725223515174108, -2.985980079879496, -6.151031964062443, -4.17853136290412, -3.739735408911567, -4.177743865892257, -4.758224336321508, -3.406169247786832, -2.7407038589797272, -6.9336687884910315, -4.884332887441078, -2.4403221799860293, -1.8263508274951405, -3.4054696763623764, -4.562592776233452, -4.420217843796468, -6.782722037918705, -4.9372619598181355, -5.457485531187882, -6.256287610141627, -6.611108985431037, -6.565907361549403, -6.49534726380481, -7.061567128112425, -6.599672447239019, -6.7013251912547664, -6.80746927442344, -7.516987128232732, -8.06324629910308, -6.809992050813993, -6.860502751231873, -6.646463246903641, -7.480934599971211, -7.54322475844959, -6.575185095427639, -8.985698479921282, -6.994899040702809, -5.767168821265772, -6.530694737719788, -7.839611467995152, -7.435063610819411, -7.091053743823944, -8.707954377459634, -9.10781723001913, -8.370947238445352], [-6.890344120648169, -5.02940421086846, -5.408867487897182, -5.967857793669728, -6.047653312106489, -6.46237897058548, -6.749954722267399, -6.888388607925276, -6.98955227182629, -7.21719797180092, -2.4868466816371, -4.771074471877903, -3.6481121610473157, -4.664656454469179, -1.6817234068168874, -4.586866350603287, -4.845552155508254, -3.154508356873059, -2.57905575846229, -6.254276196451527, -4.921506816489567, -4.4705470709445265, -1.6402347840968394, -5.1280286653720175, -2.882844123251368, -4.595878517780293, -8.231899529453244, -3.131328577959143, -2.841674626039629, -3.3059284308174086, -3.1776616460738145, -4.478455963747706, -4.881954395151054, -7.651052083171771, -4.569886902888001, -4.27044926534142, -6.859624364774909, -6.620591583748609, -7.035724951332805, -7.0226528697654516, -7.663432064808081, -6.880725735179707, -7.096836038369936, -7.001238775261635, -7.94609099384926, -8.742881147291776, -7.2506609077408095, -7.3153280695559095, -7.053568548019118, -7.728589206441718, -8.033869830584925, -6.95515998225557, -10.250083546611185, -7.317576103473792, -6.34314386192865, -6.83930777142871, -8.443181097280567, -7.8493114938202, -7.476614929901965, -9.60010853791645, -8.54213954241637, -8.677952686589895], [-7.97530600380511, -6.415691397743754, -6.861539964259856, -7.354178676035024, -7.5544322703441, -7.956843940965374, -8.00285595557334, -7.941715059369074, -7.997284910523884, -7.042078762400056, -4.593656623473984, -3.4358427231129607, -2.813804032113097, -3.8443096208464707, -2.253236786554918, -3.523372060796657, -3.771274119941123, -4.213005093082092, -4.26676474950711, -6.604661414352346, -4.071781743539046, -3.0636392294004997, -2.748766550188664, -1.5979085155684218, -6.096125476162904, -3.8319741165296572, -8.437883856353995, -2.362166563210972, -2.079080404566457, -2.423752746988421, -6.1373971409737065, -6.112261605870961, -6.033619491127531, -6.187046440930159, -5.880551407088361, -5.508879098944167, -8.771401153617497, -8.582218506443597, -8.081702252336468, -7.820268405959624, -9.01805471242806, -8.991966276343762, -8.037776271878622, -8.339328192194554, -9.20125771484982, -9.932145223392613, -8.711282886564021, -8.633361864553784, -8.75433589306331, -8.724333642759511, -9.49070501282617, -8.37573721938598, -10.194509487860104, -8.552742688310644, -7.968342726152964, -7.956843940965374, -9.863152351905661, -9.598817643450872, -9.08877973142313, -9.278218755985948, -10.729432663205156, -9.20125771484982], [-5.1527222081970026, -5.012025127950751, -5.39388426501389, -6.217687012129963, -6.355002880531065, -5.6351154829069525, -6.363993950090922, -6.903492332891861, -6.853964796193012, -7.129436704737862, -2.71361594954537, -4.917813116205636, -4.909342477322127, -4.834757647401019, -1.3606202815267094, -5.049186428683174, -4.831934627067998, -4.02878090419557, -0.9857025802248848, -6.9583248115172545, -5.928056254423655, -5.1548164498001166, -5.532591229650075, -5.575217341325883, -2.1159432194090155, -4.2897086796604516, -7.362881241689201, -5.200780422733714, -4.007732553855012, -4.899317914996637, -5.732412626945404, -5.409409253401815, -4.570479874572386, -6.004563148213606, -4.806034206660294, -6.602559371961363, -8.008146936015933, -8.264296783798311, -8.114951495245993, -7.067733915701082, -8.653122572902513, -8.40456220860418, -8.35558820400772, -8.362968311305343, -9.101577865942044, -9.242891399008622, -8.693532111240389, -8.468328826963168, -8.348262163915647, -8.71436619814323, -8.123659823137777, -7.872345394856871, -9.1093600063841, -8.693532111240389, -7.279281672853908, -7.536521246398329, -8.924437667890087, -8.99854564004381, -8.061492916721225, -8.91796515338447, -7.579574252897618, -8.90514446495541], [-6.625065979493934, -4.788580474517243, -5.256407824340383, -5.37832984858721, -5.2038978790684185, -6.079823689638168, -6.317086566978479, -6.646320764762257, -6.72855886299923, -6.886116701148103, -1.505097000684665, -4.82588581184553, -5.253602398681012, -4.989577089424305, -1.5758741362397704, -5.185784176269271, -4.916501452893276, -3.8159863951228723, -1.6041923545980379, -5.633841418592661, -5.7199839934992545, -5.2161585690547705, -5.369003667873634, -3.3721189713516244, -2.661522576130661, -4.670108701549678, -7.227790153984301, -5.183916064386551, -2.494756625753895, -3.869077211017653, -4.27104038948766, -6.0954898063825675, -4.71167529774246, -7.136943681210728, -5.987593808088792, -6.590446143960144, -7.403791666759668, -6.814987319540992, -7.030531087602099, -7.451894781778061, -8.262224216961, -7.8389014914528286, -7.199379152151521, -7.871278420177289, -7.002535480112671, -8.630549778119708, -8.06204504276704, -7.169938203345767, -7.199379152151521, -8.169374062997537, -8.264930578558742, -7.090662928646722, -9.550754409315, -8.033689817011913, -7.078178371984477, -7.674437552058881, -7.921898411023797, -8.116604027017473, -8.273093889197904, -9.39660372948774, -7.831846788472939, -9.063739434242727], [-5.33959692367457, -3.901875433911095, -3.3263523840890916, -4.682859878096868, -5.0569946532038434, -4.833678156338227, -5.439237690659609, -5.4278954140556746, -5.662170026427569, -5.462315637942154, -3.751806551579704, -4.660118258928943, -3.8333548860836233, -3.8811153084238335, -3.4958051088141735, -4.553750303632283, -4.534932311997922, -1.8458046740483725, -3.0281790617647277, -4.436160927561686, -4.943995470762378, -4.549402848736927, -3.9218705969950047, -5.328568099202016, -4.452091297246621, -1.4302390343932077, -6.080922600826194, -5.1148485422425125, -3.3219189169449392, -2.621905648275213, -4.3789508674983555, -4.262632175345694, -5.088920047216344, -3.3849839728869298, -3.307281062205608, -5.974439120423745, -4.379829216259262, -6.791884017661267, -6.8166991867809905, -6.068955964208674, -7.1565271312491765, -6.683586642330131, -6.801736314104279, -6.532793078538745, -7.518256845849533, -8.152370494825284, -7.391505140210389, -6.7194113688482755, -6.416271872702784, -7.279027156783699, -6.4871905993829495, -6.66039719741122, -8.204669994228134, -6.878895394650897, -6.094660190607558, -6.427558674237414, -8.084652320770335, -7.339319387039819, -7.347830076707727, -6.950948712290955, -8.303341521735163, -7.468823387994359], [-5.431835629645527, -3.900968951139421, -4.151004765492447, -4.646528675532386, -4.521804796114552, -5.283128043243618, -5.29007437093391, -5.66335521876192, -5.740643416211578, -5.366660147370001, -2.670098748915231, -3.286242237340954, -3.3585141055181613, -3.755602707715123, -2.5586532961090027, -3.6926656242369105, -3.8330192649391925, -3.254475467118251, -3.8290307266838655, -5.019290301102854, -4.363753678748955, -2.9684754808494547, -3.151618081678543, -3.50657051212598, -2.895083629045828, -2.91665360144011, -6.285849431998168, -3.6228229122699127, -2.152751777383897, -3.3162167836347605, -4.2488413058475105, -4.652746019284857, -3.9288228848114928, -5.349158624766704, -5.572231075081914, -5.261791793324819, -5.624778734167247, -5.278347157643276, -5.3043854022704995, -5.210237912616575, -6.346428699255328, -5.93048158286466, -5.615084400228674, -5.89255288484716, -5.916841563358977, -6.777270925569916, -6.237681480853062, -5.483828321441287, -5.599254877723378, -5.735607736245962, -6.332645938959907, -5.443956990177872, -7.787390135984574, -5.974679054270741, -4.487700164671342, -5.484479363130949, -7.787390135984574, -6.624646575217306, -5.915838554247808, -7.256570295689133, -7.872330812633658, -7.3300889926342885], [-5.8962959205599565, -5.022482812723318, -5.262967235210922, -5.638331471894197, -5.778457744433211, -6.3109845765456285, -6.29163873510587, -6.56832765910669, -6.49255510063436, -6.3650100589758205, -2.863492599093995, -4.089024629780227, -5.154949557468251, -4.484159695248834, -0.9343644420039627, -4.498161263246394, -4.6279862283262885, -3.982370058053253, -2.2035282537140866, -6.199482179547703, -4.571665803362194, -4.084960905072187, -4.755413554835734, -4.800997636581884, -3.6971982708382995, -4.566795129611478, -6.871351961660363, -5.099526707333125, -4.135788994836005, -3.1706024468180507, -2.212641008744242, -5.078715683958774, -3.5811841558979225, -6.741940888008861, -4.856098125468122, -3.980907107020626, -6.712325967469931, -6.644006723492454, -7.153784678226001, -6.945055157447498, -6.898020208742524, -7.021563043483541, -7.173168545047049, -6.854391346353318, -7.669859657878135, -8.284314569862415, -6.895321151773359, -7.513205847832758, -6.795366054682441, -7.556635405760094, -7.827916592672458, -7.241272132349116, -8.35137880044296, -7.187505708193456, -6.1188193168155305, -7.139919638088829, -8.075324765986299, -7.379987004046535, -7.364785842714484, -8.480789874094464, -8.527936652520165, -7.717773013574032], [-5.1596391409467905, -4.446625879300866, -4.792661465824471, -5.092676376197713, -3.486026851337387, -5.293817992318437, -5.4207097441730605, -5.031624556083574, -5.433394903700377, -5.123410202650332, -4.715036303793935, -3.7021536789683007, -3.7870302329121537, -4.088809455118969, -4.812132309601868, -4.898021981482298, -4.704305701448848, -5.045386241156256, -4.694501701352228, -7.439823297251669, -3.3979941838940024, -2.7387677229303073, -3.4751598040428164, -2.0375451283648167, -7.179408351140228, -3.811103778633784, -5.971540702552751, -2.9729698958508197, -3.825149191015764, -4.478865937874288, -2.6641628726801234, -5.3193066285353545, -5.996634270150407, -6.375549146164451, -6.785390628872414, -6.572829186888741, -4.124487206195906, -4.535138151336436, -3.7135200209337587, -3.96463850525401, -4.554386339641352, -4.765674647825141, -4.429638997109137, -5.277664924510665, -5.02086262836912, -5.937153360243275, -4.7565501004863675, -3.693750268171921, -3.749678820831146, -3.176252392796863, -5.722496422806384, -4.546642548744449, -5.417354036326088, -3.1803577086920454, -3.749362815140414, -4.066652137558128, -4.660532401294013, -5.1570534898617675, -5.430844966067104, -5.284241491875228, -5.5748604240003194, -5.63236491848051], [-2.1543734650260515, -4.349659150265929, -4.518901599180162, -4.334150339570116, -5.146931928181808, -4.726677895862385, -3.8738862022041083, -5.547738126032732, -4.965611539500847, -5.329386916158828, -2.0510193107742145, -7.017067715762613, -6.5514024881154755, -6.782731624016124, -2.1387030138865364, -6.887331394106641, -7.26098839501858, -5.915573580719614, -2.792353319034718, -6.475549145597215, -8.196805549243091, -2.7290425937620233, -6.57338139483425, -7.482751683863832, -2.7069370493135643, -6.6217549791184664, -7.959675755954141, -2.6929063910157374, -6.402701413055781, -7.378081061299943, -3.038722067403394, -7.146279447242619, -7.442205589469482, -7.777354199160186, -5.436617340201765, -7.9268859331311505, -4.21410095816366, -3.7159537926574395, -3.274052690014408, -3.8709022387814955, -3.903841048493916, -4.907248138723605, -5.564815386850924, -5.634025390029099, -4.794669640998671, -6.37044055083756, -5.773624479216047, -4.984713243886536, -4.705003878814023, -5.884409585684786, -4.869643914101749, -5.8105008762596295, -6.426399204485604, -4.552569937605819, -4.688840192155229, -5.1496039404596194, -5.387063525747035, -5.940338138344011, -5.40158748887255, -6.8282736444630405, -6.302506440698851, -6.49077786629904], [-5.042027972011844, -4.299718672656642, -4.243324982365076, -1.9825142998026875, -4.725280240738409, -4.751810055033314, -5.528415080508104, -5.372269658882421, -5.58057814379269, -5.634199235231788, -2.092585085927561, -5.359310514239916, -4.924244936355461, -6.182928172882705, -4.358300013368391, -5.644135441890917, -5.3193472574280785, -2.4216711986248063, -3.5454438576615357, -6.6553797837670805, -6.406683158028254, -3.42063060974259, -6.230496589801815, -5.313180742512414, -2.1141313157147192, -6.38251279710044, -7.199431055161392, -3.210947634389801, -4.823896962521179, -5.599497627038855, -3.7500872171087103, -6.903338504201014, -6.960201366095558, -7.542682978767983, -5.613234106766742, -6.36476085164199, -3.6714819678600925, -4.875454772186028, -4.20471280907303, -3.884017303250544, -3.4828969984685907, -4.20471280907303, -5.449056802096191, -3.411103801364231, -4.476181634325785, -6.299489461288767, -4.386290645201218, -5.042027972011844, -4.789932598747867, -5.333885415874105, -4.1803254304220925, -4.950988261330972, -6.251222720318932, -4.73156059252596, -4.355150404465494, -4.750641830601388, -5.174666905853347, -5.78646844695934, -5.852762894799176, -6.180486169227153, -6.353098911894147, -6.096324376905443], [-3.621153540136533, -3.927545190670303, -4.761298021301781, -5.2327070159671, -5.390836480884121, -5.489330016767771, -5.419938023343771, -5.638503085521277, -4.333907884333748, -4.5925613698517225, -2.3774699118392917, -7.240027999198052, -5.856199730573355, -5.309006462636489, -2.1188535037876086, -6.988713570917146, -7.259929153515347, -5.733217613565709, -2.1988937611323722, -6.914879308906094, -7.285375819176511, -7.471829613255376, -6.297483936486472, -6.369085087302357, -3.0144535413397078, -6.131611710433321, -8.510182710405289, -3.290870578196505, -5.79050447130796, -7.191941812530414, -3.661034886200146, -5.933160771709483, -6.992552347224311, -6.430741168725453, -6.006448567479316, -7.6405790925037875, -3.820123280601132, -4.60874181430768, -4.552214016916188, -4.152125265844404, -1.8440074384079603, -4.33229280995845, -4.748982594711727, -5.590043992369601, -4.083551769494654, -5.885005729822436, -5.570371226770897, -4.35431953325285, -5.037889407059404, -5.600505333614971, -5.2234842891983275, -5.239347146606377, -6.012203979049936, -3.2506791222758458, -3.493367719618491, -4.386449689183688, -4.5929103490909995, -3.6635121789617022, -5.259536257638402, -6.071656848963408, -5.913358144413303, -6.637031915632404], [-2.697794466436189, -3.604662393389068, -4.011263957500705, -4.728080882146555, -4.781372179196779, -5.33155887684335, -5.439355447299057, -5.586922158039964, -5.370633615250003, -5.513150772897161, -4.398260316869362, -5.11207163673225, -4.190082883743458, -3.4501177344839546, -6.597640067453566, -5.490434815062624, -5.150911470048515, -4.837107457567751, -2.85030853825846, -7.320346050255055, -5.997701716211621, -3.4753179136511876, -4.2866759373606715, -3.397053452568678, -6.703360230660674, -4.113003141200578, -6.444877312901155, -3.074043686998346, -3.452623303723489, -5.193702907090925, -3.9327969395172757, -4.131242383720524, -5.418238523858134, -3.7478131640115406, -6.184652086682414, -7.063123185287982, -3.7394230709797665, -3.4179694218787144, -4.267288710081795, -3.0709940324857143, -4.263518677341253, -4.701005637323521, -4.417094629495229, -4.569236359692398, -4.473887479448818, -5.8432973258667005, -4.728080882146555, -3.754953367214181, -4.1263095154005, -3.415012032977706, -4.81618158386264, -4.691820172692138, -5.666572324000903, -2.795735372125381, -3.2437129699651224, -3.9019638438387987, -3.582993942690341, -5.112804505947904, -4.894364079117085, -4.722110715160052, -6.056219323109372, -5.5022692727096265], [-4.619141531251806, -4.242478414047348, -4.655112011634125, -5.260049492712331, -5.018630839221239, -5.434973330528597, -5.291682300504695, -5.652426966065128, -4.133100006910822, -4.834429582625707, -1.998550183209591, -5.7433143168994505, -6.845817661060527, -6.562531200081784, -2.4549848852751466, -6.626189051853761, -6.290387731057782, -5.567486289416045, -2.141146196531367, -7.242549089199937, -7.104679294976816, -2.8517566389677937, -5.192894636686687, -7.082206439124757, -2.3092018462234853, -6.71448165899944, -8.017189304011065, -2.1705324264442973, -5.663122255181876, -6.392769837961348, -2.584044215625091, -7.28700085177077, -6.816997222525035, -7.454881724409931, -7.498844847831047, -6.3210545294507545, -3.9234738704665255, -5.210974225191004, -4.156261002958894, -4.841496749848799, -4.597299789336757, -4.421170202790724, -4.975365923256807, -5.672123216040852, -4.474317672329112, -6.090327349926446, -5.367408011032831, -4.491383872387231, -5.280618880960439, -5.815780620152271, -4.640826054386648, -5.541761398177608, -6.307308608546119, -4.360911011272527, -3.968855752517438, -5.060904184340462, -5.092811178129705, -5.9935197902566175, -5.119506808592894, -5.086750553518014, -6.052587021943599, -5.38489332537385], [-5.261046281621696, -4.9148297535258045, -5.093521542269181, -5.160962823064713, -5.492794680129424, -5.583178741597693, -5.608843109973599, -5.828958322395465, -5.818217080564052, -5.6351835265880075, -1.9431063436877503, -5.762127613913009, -6.364566555601998, -6.310693565661846, -1.465488331318766, -6.653479397439911, -6.983078754773362, -4.701955198551832, -2.920630198813372, -7.381717897811127, -7.114655112562081, -3.628618850962897, -4.741931970713727, -6.050483313874263, -2.961525855445553, -6.683481647743711, -7.823550650090166, -2.1208799042866553, -6.236585593508124, -6.735576759627112, -3.3232120191551315, -6.891511561247872, -6.08336298799342, -7.9413336857465495, -5.554867108771802, -7.122498290023107, -4.193090909121505, -3.901105949199606, -4.152689701478908, -4.935827900365578, -3.224590180736388, -5.347946392964479, -5.205112607677643, -4.550306897288771, -4.485129674572183, -6.303724896345753, -5.654950567328784, -4.928779413034516, -5.0770940681272325, -5.30867433061095, -4.570963767879653, -4.7737511552658995, -6.146602446129337, -3.6472116840395126, -4.583317229489316, -4.247999881283233, -5.050961927850385, -5.554867108771802, -5.239253651630843, -5.752077278059507, -6.0889495947020595, -6.114482896707225], [-4.8357984388643835, -4.657872493543467, -5.438431611883497, -5.481947249319659, -5.480513557317811, -5.739017089171186, -5.670890393572083, -5.859121927588727, -6.047318448825703, -5.930658377913943, -1.7234534048021994, -6.808376835001858, -7.018097365983928, -6.515303913915201, -2.0800327647225068, -6.985307543160936, -6.434021280478344, -5.690138581877, -3.0546210789668655, -7.433612809945593, -7.609892052283585, -6.846949109788098, -7.145930737493813, -6.771237288052402, -1.3242305561151027, -6.88123818326673, -7.934388097858083, -6.599387031125742, -6.8029859863669815, -6.569147145936024, -2.3927324727103167, -7.200418922777882, -7.33738477785104, -7.62201341281593, -4.893045313052039, -5.366877919534872, -4.1899951004809015, -5.453656819480563, -4.694403309779647, -3.431804500645092, -4.0124147615767685, -5.525942614164559, -5.309719505694924, -5.568828205702649, -4.124028746206436, -6.415604553692113, -5.4275025413513065, -4.984699762805498, -5.237511197353998, -5.157641365469638, -4.101047614464405, -5.085610237260755, -5.550223017871613, -4.869440755282619, -4.489173830779152, -4.234321454353582, -5.041242413079193, -5.780689785571754, -5.231908941805328, -5.964947451392574, -5.752089170738539, -6.139854701747302], [-5.508465007700513, -4.839258034686576, -5.109472414097966, -5.519275923804729, -5.707703038161169, -5.439902336263216, -5.7235763873174585, -5.821556795677663, -5.734300350680434, -5.610247702010455, -5.910709501108635, -5.7235763873174585, -4.435262434557772, -3.8610478472011964, -5.758858201462099, -6.0632537548876195, -6.044700346991872, -4.117878794499082, -6.575328598054043, -7.243783166023616, -6.403478341127383, -5.083829983484629, -3.317712944869911, -1.7163886672099804, -5.622223893057171, -5.543479525545615, -7.373836294271814, -4.235327303674574, -3.4757995308184078, -3.8216678856997803, -6.863010670505823, -5.619817153026606, -5.966922645949188, -7.096625521687328, -7.1845942946332855, -6.5629060780554855, -3.9611313057581787, -4.164449795424729, -3.6745940531223313, -2.809054169189011, -3.303860323066671, -4.356804692686432, -4.075943929085389, -4.993775889109478, -3.5055329961999946, -5.4956443192714515, -3.896020865817486, -3.604273312212492, -3.5622476861654384, -2.789152302491872, -3.9102728885246876, -3.0660244750660355, -5.631909198791635, -4.404134333185408, -2.9033092297609358, -3.155554830818952, -5.387104150696246, -4.341290047595106, -5.258585299895267, -5.109472414097966, -5.821556795677663, -5.14024407276472], [-4.364789554126129, -4.918384854279969, -4.918384854279969, -5.1613310328903585, -4.587530609962979, -4.784853461655446, -5.006160465162354, -5.0403784224726955, -4.994002260682545, -5.402493089707247, -1.4796200682550344, -6.181000119218348, -6.701776073837507, -6.252825853789604, -2.1508860947624866, -6.086590434747274, -5.772240115213331, -5.482914657017821, -3.9652464014134288, -6.426672783592586, -6.401671481387169, -6.285261129542758, -5.890845857621178, -6.3772800282630095, -1.9660163181458141, -6.770768945324459, -7.107241181945672, -5.362398632505369, -5.920923312858457, -6.7530693682250575, -2.0597919147266994, -6.701776073837507, -6.505661194911217, -6.5476253940102485, -6.637237552699936, -6.7530693682250575, -3.9354569646113213, -4.092932522818745, -4.814706424805127, -4.961309898997003, -4.355174095426687, -4.949681861001884, -4.869194610089197, -5.046727650151355, -4.8507000274530325, -5.115948027042541, -4.814706424805127, -4.689097748317353, -4.863875448611597, -5.043547997233975, -3.6732539774605253, -3.9481153614832447, -5.340799520701906, -4.835115296436334, -4.068688911208753, -5.024679512929592, -4.753487802377227, -4.994002260682545, -5.247044551164388, -4.698046353893368, -5.307182909902921, -5.227776132298511], [-5.115394338583977, -4.7561420736309445, -5.007842676853897, -5.66123448019507, -5.033665707964376, -5.645764558422938, -5.535809351386801, -5.907471144471458, -5.828086115216893, -6.105296887801378, -1.6832402388074508, -7.437524027650993, -5.590313253886724, -6.862982589498895, -3.0491034044747836, -5.586172461220692, -6.632458930887062, -5.218606625703514, -2.4710973040085813, -7.398809515470303, -7.268447697607059, -2.7116510959031834, -6.686853002952861, -3.7188303108266303, -1.9217106058640063, -6.098376444956805, -7.548749662761217, -2.711068175455316, -6.088084758920257, -7.1630871819492326, -2.4953178542046213, -6.5371487510827375, -6.531815405107375, -6.592107635363495, -5.218606625703514, -7.464192274733154, -4.025855346121542, -5.098759278079445, -4.812664759541027, -5.369662433402117, -3.845996309584077, -5.031290409935469, -4.627804324836165, -5.549657248245595, -3.554062953084761, -6.151486270270753, -4.8426621708268565, -4.640563668589926, -5.069989313821911, -5.128381534110789, -4.6191257693799175, -5.164313543336852, -5.9721996171719525, -5.146851716173189, -4.482065653234942, -4.222339216728002, -5.190396010216277, -5.978297197040071, -4.681519433426748, -6.057830350562455, -5.619789072019677, -5.749664153441089], [-4.867406343870729, -4.4533740975545415, -4.953434176237852, -5.384635998990067, -5.328952912513263, -5.6593669190947695, -5.597013688377717, -5.757806991908022, -5.710273291442284, -6.117674508577314, -2.0752354231922467, -5.330274789771179, -7.239817294655618, -4.653127950557675, -1.9861891376978962, -6.498730651806554, -6.748830013109291, -5.799220777458779, -1.8880861157511444, -7.060476365999801, -6.592340150928861, -6.615981913985901, -5.98705432616025, -6.055682832549346, -2.2283490142554703, -6.244583360441343, -7.060476365999801, -6.9543698600052535, -6.005072831662928, -6.675112437212724, -3.324941220245065, -6.737960340872387, -6.846328377594169, -7.276184938826493, -5.466076330930241, -7.601607339261121, -3.2284338811241238, -4.7571452826690335, -4.2772171644143535, -3.794375211195705, -2.9321390456478555, -4.655146114713912, -4.556474587206883, -4.658518799192551, -3.9133691163329902, -6.159223511490186, -4.874928318325417, -3.9851607325065794, -4.593769151695071, -4.865742449976033, -4.192747084853396, -4.158562847663465, -5.583291346122616, -4.6687056444995445, -4.403457644910037, -4.135470875670939, -4.338591952168042, -5.484425469598437, -5.10713123845697, -4.666659956776251, -5.507845743806536, -5.56639905255811], [-5.367738120634485, -4.778432275797196, -5.153988612512787, -4.9880684755260525, -5.022992659762126, -5.315533041364984, -5.937669186281741, -6.10637419308453, -5.985149724514735, -6.0666028696576335, -1.4917500304139726, -5.449683054485573, -5.538947192058466, -5.596026010244295, -2.1356770840200325, -7.153812526227932, -7.094389105757131, -6.013018623523528, -2.2775252846627545, -6.010847070010019, -7.246405313055757, -6.755173383190167, -6.697507741340358, -5.530860894627108, -1.9981251565724831, -5.698525293621089, -8.083802102460249, -4.860110306811463, -5.882753428685626, -6.945748081740843, -2.8863534391722627, -7.100819996087421, -6.962461562714583, -7.231590227270615, -4.4224533361891325, -6.0688990819179836, -3.292438554454217, -4.782234561746934, -4.459461169483883, -4.359771877270199, -3.9163352754091854, -5.15214868559078, -5.0863471755948115, -5.622152314836516, -4.041658687615878, -6.321199217523649, -5.22160122153078, -5.082053480720112, -4.742403534262838, -4.896452531238822, -4.577416633798337, -4.325814840936012, -5.22258692885554, -5.570564946046022, -3.7753199382595333, -4.751597592285044, -5.351900685535859, -5.538947192058466, -3.6838339356894148, -5.717756655548977, -5.9396873504379775, -6.193602560418941], [-4.999514188504179, -4.700587505853424, -4.67022803135639, -4.81576740495976, -4.92872993147181, -5.418517964945142, -5.4525477135314535, -5.471965799388554, -5.601583292691941, -5.294558257397029, -2.0675057720915833, -6.606510097282728, -6.66295140818768, -6.268297216183731, -1.8472066532219233, -6.801101746668497, -6.464629510047284, -5.518112402024337, -2.6153829107633095, -5.40926720517299, -7.042937430994859, -6.122880216325227, -4.984950824316282, -6.978988706394586, -2.5341534752438712, -6.335738496979263, -7.22903971062872, -5.047082605423289, -6.606510097282728, -7.195517018590076, -3.3881221963080814, -6.764734102497622, -6.935691900641261, -6.06802185577318, -5.518112402024337, -6.21743879895024, -3.306166689176508, -4.5835098665078435, -4.096018906794089, -2.7778687007936327, -3.149770331333854, -4.522505810044474, -3.6065186143693406, -4.579485716208118, -3.9009018998360694, -5.695109350702764, -4.592420415540891, -4.39850374434322, -4.858371250530563, -4.687974726037726, -4.284600731462279, -4.828050056815601, -5.7714823294873385, -4.760362534007699, -3.6910492160852075, -3.1337486268025883, -5.114702793098268, -5.044521784561615, -4.990993138772245, -5.21262268525524, -5.1495981689488834, -4.939033399841534], [-5.573013579156251, -4.7557456323553735, -4.835888625843566, -5.4310032481645445, -5.375816832597254, -5.748275644237248, -5.617589203744957, -5.426286258286405, -5.527732874623095, -6.027336973645122, -5.771265162461947, -3.4363190171520683, -4.863649827007062, -5.342810536129083, -3.9603112459777443, -3.1741279621323484, -6.522548369609561, -4.089429329592385, -5.667234434234122, -6.573100648772392, -5.74180312973163, -3.6814950844272993, -4.555731535734934, -2.60141208694855, -6.057840427938536, -2.6538446056843625, -7.3352407008192895, -2.4633202784204524, -3.0508881488790776, -5.069846636151324, -3.6495408996227328, -4.548858656447172, -5.7613477258046, -6.031638055544512, -6.61856302284915, -5.764642621701453, -4.906092884516815, -3.945751808422034, -4.075923906392578, -4.145352412824341, -4.3284585910787134, -4.1375398730875474, -4.386633312115669, -4.864991208831262, -5.2459274106602996, -5.389330551763976, -4.366047982499911, -3.5236520927129136, -3.6216686341149815, -3.0467401241562313, -4.4457511661828155, -3.28056139498962, -5.728982441302569, -3.2282776746379773, -3.3483163872180257, -3.6120365041642786, -4.280940073114231, -4.240597235287379, -4.439591885822281, -4.571620648562269, -5.13801612348307, -5.583972592945972], [-5.648871675811755, -4.741030782968909, -5.070478143556586, -5.038332518583169, -4.984450311189462, -5.652113169735926, -5.878916005474925, -6.018576120040821, -5.698633185370818, -5.924757364823166, -1.8468585970227798, -6.844251516414859, -7.126600242891277, -6.081398705962876, -2.934905888757429, -3.6595354362414967, -6.817864761241664, -3.5921374614243615, -2.9623018840998165, -7.15537920744132, -5.837035508229937, -2.956367800752568, -5.44072677540776, -6.135188880549014, -2.35874447462609, -6.817864761241664, -7.744626792983114, -1.829808862763535, -4.656579250518651, -7.012765100242478, -3.346772137573546, -6.156466278996299, -6.772055225210369, -5.459294948136628, -6.2464145156592386, -6.772055225210369, -3.9054574859103, -5.259720143195114, -3.484916480113615, -4.59888775210554, -4.26703708287839, -5.280773552392946, -4.568219053541838, -5.236954932422101, -4.227597595795837, -6.429913235626207, -5.14878310004672, -4.299244656170703, -5.066854951187166, -5.722730736949879, -4.343868104023761, -4.895290258966649, -5.924757364823166, -4.2366225736701635, -3.439140235431567, -5.290903070631802, -4.913738130330258, -5.32777360644013, -5.700335313441349, -4.118883335232663, -6.285399962372192, -5.825384891009962], [-4.134798672989471, -4.089847285127205, -4.1376763728170864, -4.175860159787245, -3.5867437074551245, -4.073498147125676, -4.247208240584712, -4.485742942219219, -4.161001045383496, -4.76664532768562, -4.782994465687151, -5.224827217966189, -5.79734641073752, -5.371880635922686, -5.362028339479674, -4.805217602471861, -5.696541711615555, -5.1428140663053545, -4.243997964954463, -5.696541711615555, -6.074978147335799, -4.388579193765571, -4.887134724939747, -5.433124261163405, -5.127188748402274, -5.465212575714905, -5.5681605449673475, -3.871109027280912, -4.3522115495946965, -4.887134724939747, -1.4812734394569864, -4.9697213159490214, -5.42265296129611, -5.5681605449673475, -5.696541711615555, -5.592551998091507, -3.9025017396887742, -4.303421385425264, -4.377529357578986, -3.2036759521599856, -4.414847120586181, -4.370230055097374, -4.283218678107745, -4.293269013961246, -4.570900750559526, -4.639893622046477, -4.473572406598963, -3.944368319081564, -3.9659778034144195, -4.663991173625537, -3.393956618621509, -4.489832927470744, -3.9232159440763374, -4.221810049979101, -3.677082874537429, -4.095356940938174, -3.0285527594662907, -4.570900750559526, -4.348646483430199, -4.449666885745409, -4.481669616831582, -4.21556002963393], [-5.468543074118657, -4.3409301123745765, -4.939132602788878, -5.030955774234888, -5.486636817561356, -5.444018684255573, -5.476853371252285, -5.808607963491769, -5.908385471304435, -5.666153323427702, -2.5849374499856705, -5.739356727450997, -6.452595908093631, -6.391754248837386, -1.3630653142736813, -7.218432822021854, -6.741508749931544, -4.321907198551311, -2.3295168721177877, -7.554905058643067, -7.600367432719824, -7.660265574300893, -6.068262723688894, -7.064282142194595, -2.4089621725210324, -6.261701120589188, -7.218432822021854, -7.400754378815808, -6.405740490812126, -6.66108718262097, -3.202908170420881, -7.345184527660997, -7.318516280578836, -7.17951740577218, -6.2346317986209705, -7.685266876506311, -3.523815890500982, -5.001129001779655, -4.254551658580372, -3.1791480369827805, -3.272238460048792, -4.979751531007288, -4.696520976240299, -4.996816791561475, -3.7821441205484283, -6.068262723688894, -4.767838317222632, -4.961310103104565, -3.3169412686460493, -4.254142074302682, -3.686717843919221, -4.781622132973809, -6.395232513213711, -4.882290151848487, -4.035101934573064, -4.142657840794326, -4.886134831709296, -5.154991621688459, -5.261248596393322, -5.763145589415012, -5.307128202144016, -5.4187681732866855], [-3.7153348719791315, -4.23835637018879, -5.401341822408315, -5.655381048015406, -5.3230099791384085, -5.723838105173554, -5.787159933132683, -6.191069830974041, -6.118044695959151, -6.512733837722823, -2.85919837658876, -7.902248813542757, -2.4061387894065027, -6.693770047296114, -2.250325724429897, -7.350962550860164, -6.005451461342365, -3.2057646919026945, -3.1269276063809657, -8.282234836349936, -4.929356031958588, -4.893377430923357, -4.350779231381914, -5.039126698093967, -3.0950598675329433, -2.702149075140166, -7.065140944061303, -6.4656293685353505, -6.6671525062961585, -1.5532677412410396, -3.407685858090993, -6.917395410231305, -4.818860209735889, -8.330553413620743, -4.697144805661785, -7.44034239452964, -4.201345166462018, -5.036551747250591, -4.447052124631202, -4.271306064673767, -4.3875307527168115, -5.68024420720805, -5.463555006909888, -4.6680077696105, -4.729585831829687, -6.877248342217893, -5.7894972929813875, -4.744562286019245, -4.863271676535759, -5.996776708148691, -5.115645847928164, -4.782587554878788, -6.69569868820252, -5.6198664278662305, -4.372289459396023, -3.8304137647360905, -5.143464614214886, -5.692911512408815, -5.442384299786921, -6.144390895990383, -6.553756817069401, -6.771887826560066], [-5.439192275092616, -4.781176186054329, -4.766861598657258, -5.578787193555129, -5.543563426336324, -5.577507602849504, -5.742587353208953, -6.240425781448133, -6.11031213333427, -6.461710020172159, -2.6665339561656087, -5.7471225083743445, -6.597455272456702, -6.655866034613116, -2.1677366785812078, -7.063212610820987, -6.615344837207477, -1.8542823223629723, -2.8203019407701473, -7.921874229858505, -5.964600322152877, -7.4190807777897785, -7.115398363991557, -7.50316389500032, -2.434370037607787, -6.75042461723813, -8.501692725111447, -2.436966652419961, -5.508344242912733, -7.262628600974241, -3.3318853658660776, -6.320468489121669, -4.662752576421778, -7.96269622437876, -4.3951216252530045, -7.773454224740232, -3.4248833433841024, -4.6171877485771935, -4.856615893655904, -5.148452521314832, -3.262215858586344, -5.067705520626301, -4.995134827791466, -4.808655260848847, -4.056803079326151, -6.372894286461519, -5.283769734998518, -4.869131701587735, -4.356292992089062, -5.580068423711178, -4.205055407055328, -5.300108397353307, -6.413362236014366, -4.081705328198343, -3.5651654031689133, -4.4607321960690065, -4.914213385439241, -3.3562768189902368, -5.301077859377855, -5.2191716350828905, -5.66568217643417, -5.148452521314832], [-4.692472771166889, -4.3008934499719516, -4.549181741142988, -4.955265087292482, -5.083773336506403, -5.36724487642184, -5.286555965171697, -5.606625988867734, -5.3561026998685985, -5.6766361544403825, -6.310506725070788, -5.345083304618988, -6.354631529979725, -5.436838168221035, -2.778870257014558, -5.888394383529467, -5.518132910614282, -3.971194340356585, -5.541198183545278, -7.353160360090853, -5.418980550821029, -3.590537431731367, -3.3241709789128793, -1.8944436557320132, -5.91226186493611, -3.390599447549114, -7.2559966116372046, -3.6807421830309885, -3.742794171598555, -5.40143624117012, -6.914247317915148, -6.268246915780905, -5.966865998970962, -6.802329401711162, -7.18453764765506, -6.063197107909394, -4.040088147996806, -3.4233375319614976, -2.7095546985241823, -4.374927246403353, -3.562959147374605, -4.404434128912793, -4.579296940419071, -4.391681565015401, -4.438151297809303, -5.606625988867734, -4.3282656378478706, -4.1449534915722195, -4.0950638220693705, -3.3913758451036427, -5.0164696546102965, -4.409796072054178, -6.030044900592494, -3.187603169643488, -2.500811269450856, -3.4121731416766146, -5.192891489277063, -4.804034117568558, -4.273312053475689, -5.056716535118889, -5.514880875227905, -5.219114684376165], [-5.262101982971463, -4.751704716461968, -4.4750082149096455, -5.006514043913175, -5.07515161250067, -5.251452255054804, -5.285938431125974, -5.392274080942006, -5.414469813333791, -5.840086736879263, -2.606359904105076, -6.823463761969788, -6.89757173412351, -5.234645136738424, -1.8016665052081617, -5.931967688708849, -5.7146991018376605, -5.437169400849897, -1.672652532530341, -6.72630001351614, -6.773702252410724, -5.308112288620296, -6.00575385876808, -6.6810434219280195, -2.3521748840468923, -5.96169386897405, -7.419447194076086, -6.095225261598572, -5.008173795331539, -6.397795946544104, -5.514028406375509, -5.907173030095633, -6.070893160939042, -4.572171963363293, -6.91979487090822, -6.823463761969788, -3.666029218824578, -4.169934399745995, -4.315857524665681, -2.6071122929751187, -3.822642418908326, -5.326212330263914, -4.3600448319184775, -4.917707706137853, -3.8075287810982776, -5.953110125282659, -5.187841070540621, -4.792366055507543, -4.8403533292283845, -5.164264339976624, -4.320022461964966, -3.8952676954062846, -5.745470760504414, -4.036941945426083, -4.228361366337563, -4.708930900478682, -5.247223918945283, -5.006514043913175, -3.8952676954062846, -4.574322501826521, -5.886970322778113, -5.748949024880739], [-5.49714261021104, -4.668772759709356, -4.7793028170607235, -5.269011517385791, -5.403728165571614, -5.600190986110487, -5.607143505425369, -5.736034518493389, -5.749350294469161, -5.980569259788917, -1.8463761496649909, -6.7957313909118255, -6.842614976810675, -6.277301167760615, -1.6016725181239624, -6.834646807161499, -6.483542908272222, -3.3781298559126016, -1.9147238137262874, -7.264209466848723, -6.97044834832056, -6.2503937148406905, -6.323821183395508, -6.466922027036182, -2.304012035094697, -6.232849405189781, -7.182292344380837, -4.500040235600472, -6.194465162181466, -7.045955900828706, -3.7335540179496816, -6.633976111699347, -6.224191342446667, -7.560054849939665, -6.541029999189903, -7.7391030813886506, -3.9953827115751284, -5.225208894727398, -4.2623981472183505, -4.983820106246462, -3.5900722944719905, -4.880831478599072, -4.625152137233465, -5.350160419862394, -4.464551422640724, -6.03257404477923, -5.25911044640308, -4.290672925686517, -4.802954305142684, -5.287422079228971, -4.798800612773991, -4.757191363453292, -5.977196575310277, -4.844383490556383, -2.946883968159507, -4.887603513509017, -5.795997983260946, -5.6188395451885595, -4.719156549714065, -5.921535728204724, -6.1778672707724285, -5.694577804815043], [-4.469097220436953, -3.6430767584970343, -3.7844067498952314, -3.931680914923784, -4.272838155799217, -4.129621978555971, -4.297357772973536, -4.384369149963165, -4.338992745625113, -4.178787025578902, -4.976420213651742, -4.292052720743842, -5.461928029433443, -5.887479896108345, -4.57562801124297, -5.526466550571014, -6.262964172004573, -4.4462034005711, -5.238784478119233, -6.017291507630335, -6.355745905455539, -5.968972930359527, -5.520424236115051, -6.328346931267425, -5.70515833931439, -4.218953067304238, -6.6434279779073195, -5.648805402763258, -5.5635078222513625, -4.870360641691417, -6.412904319295488, -1.949196049230905, -5.968972930359527, -4.4990139814749455, -6.027241838483503, -6.442757282445169, -4.057336183871974, -4.448263133534111, -4.000410247075965, -3.7940068236242506, -4.150834895195163, -4.166267300233975, -4.566303934367847, -4.3901887590164295, -4.028468199871122, -4.376661982718227, -4.915384323065373, -3.014652447863089, -3.369082406994758, -4.61381880997536, -4.55706599338291, -3.5814225774035497, -4.577972678202224, -4.001728638829222, -3.270401473211861, -3.264703452097223, -3.9718368746319084, -3.132988733879366, -4.361423592613295, -2.595191993338583, -4.516519898988561, -4.912100247864183], [-3.9699474093476774, -4.189042372135887, -4.058989243887689, -4.102030995146257, -4.171520021443684, -4.318254103615893, -4.424253392850214, -4.758810531535327, -4.504029895277935, -4.414714369803455, -3.0879080140350674, -5.469976217597951, -3.790334046490602, -5.366435538657111, -3.235086137375257, -5.727805326900051, -5.408282648592611, -4.971959552124542, -5.070590155566169, -5.076706382583605, -6.181472536826093, -5.921961341341008, -4.9999725883522155, -5.5070174892783, -1.5568628976878147, -5.5070174892783, -6.110013572843948, -4.0678979887767985, -5.089052218405905, -5.200643283814367, -3.6661684098537215, -4.557328477002297, -5.479108701161223, -5.159821289294111, -5.479108701161223, -5.616579691789827, -3.7152580200502454, -4.23556238777078, -4.212031890360586, -3.866007780968386, -4.0678979887767985, -4.4633463186414915, -4.142178063159669, -4.318254103615893, -4.276053749125516, -4.772293881872614, -4.332726136224427, -4.11133338780857, -3.9089648990693253, -4.309670359924501, -3.9127889955077286, -4.338574106106851, -4.528549512452254, -4.149433234040841, -3.5292744136497762, -3.6009751629760713, -4.350373653038005, -4.828122331425556, -4.047963773875981, -4.665125047458004, -4.673288358097166, -4.633122316371831], [-4.806719860900339, -3.6507473420444714, -4.429814962058902, -4.347330952102998, -4.3949170222076255, -4.698366552912107, -4.809448375553543, -4.35423944244681, -4.534137594904308, -4.3611959922401695, -2.871768725634745, -4.598399529122678, -5.564587232141456, -5.519124858064699, -2.4250566837898457, -5.688201188108633, -5.967149580591659, -5.01834957015221, -2.505498094634157, -5.3939617151106924, -6.3813483686685775, -5.360223575478843, -5.821732580733155, -5.742268409378909, -2.5427453130265225, -6.0299504818306895, -5.949907774157153, -6.048642614842842, -6.106911522966818, -6.522426966928483, -1.9368412502165815, -5.384205540165328, -3.2469989725553616, -5.166904264475346, -4.662348253722951, -5.93295821584338, -4.052787789271272, -3.8964417188805776, -4.725629703670472, -3.994277013931218, -3.570836586604418, -4.883136091344702, -4.20182336843176, -4.894970548991704, -4.1342203512338624, -5.159122124033291, -4.442985425248647, -4.740819869164446, -4.583031498894364, -4.589588899440523, -4.4058064220068935, -4.87144005158151, -4.8541485544714496, -4.806719860900339, -4.241282205172307, -4.937530163410501, -4.382360803432213, -5.0116381355642226, -4.368201274828579, -4.782492565565015, -4.544565218066568, -4.4563316672015425]],
    probHashThreshold: 0.015,
    probHashChars: {'1': 1, '0': 0, '3': 3, '2': 2, '5': 5, '4': 4, '7': 7, '6': 6, '9': 9, '8': 8, 'A': 36, 'C': 38, 'B': 37, 'E': 40, 'D': 39, 'G': 42, 'F': 41, 'I': 44, 'H': 43, 'K': 46, 'J': 45, 'M': 48, 'L': 47, 'O': 50, 'N': 49, 'Q': 52, 'P': 51, 'S': 54, 'R': 53, 'U': 56, 'T': 55, 'W': 58, 'V': 57, 'Y': 60, 'X': 59, 'Z': 61, 'a': 10, 'c': 12, 'b': 11, 'e': 14, 'd': 13, 'g': 16, 'f': 15, 'i': 18, 'h': 17, 'k': 20, 'j': 19, 'm': 22, 'l': 21, 'o': 24, 'n': 23, 'q': 26, 'p': 25, 's': 28, 'r': 27, 'u': 30, 't': 29, 'w': 32, 'v': 31, 'y': 34, 'x': 33, 'z': 35},
    isHashProb: function(str) {

        var log_prob = 0.0;
        var trans_c = 0;
        str = str.replace(/[^A-Za-z0-9]/g,'');

        for(var i=0;i<str.length-1;i++) {

            var pos1 = CliqzAttrack.probHashChars[str[i]];
            var pos2 = CliqzAttrack.probHashChars[str[i+1]];

            if (pos1 && pos2) {
                log_prob += CliqzAttrack.probHashLogM[pos1][pos2];
                trans_c += 1;
            }

        }

        if (trans_c > 0) return Math.exp(log_prob/trans_c);
        else return Math.exp(log_prob);

    },
    isHash: function(str) {
        var p = CliqzAttrack.isHashProb(str);
        return (p < CliqzAttrack.probHashThreshold);
    },
    httpopenObserver: {
        observe : function(subject, topic, data) {
            if (CliqzAttrack.safeKey == null || CliqzAttrack.requestKeyValue == null || CliqzAttrack.tokenExtWhitelist == null) {
                return;
            }

            var aChannel = subject.QueryInterface(nsIHttpChannel);
            var requestContext = new HttpRequestContext(subject);
            var url = requestContext.url;
            if (!url || url == '') return;
            var url_parts = URLInfo.get(url);

            if (requestContext.getContentPolicyType() == 6) {
                CliqzAttrack.tp_events.onFullPage(url_parts, requestContext)
                return;
            }

            // find the ok tokens fields
            CliqzAttrack.examineTokens(url_parts);

            // youtube
            if (url.indexOf("mime=video") > -1 || url.indexOf("mime=audio") > -1) return;

            // This needs to be a common function aswell. Also consider getting ORIGIN header.
            var referrer = requestContext.getReferrer();
            var same_gd = false;

            // We need to get the source from where the request originated.
            // There are two ways in which we can get it.
            // 1. header -> REFERRER
            // 2. Get source url.
            // 3. header -> ORIGIN (This needs to be investigated.)

            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            // @konarkm : Does not look like this being used anywhere in
            // http-open-request, hence commenting.
            // var is_xhr = CliqzAttrack.isXHRRequest(aChannel);


            var page_load_type = null;
            var request_type = null;
            switch(requestContext.getContentPolicyType()) {
                case 6:
                    page_load_type = "fullpage";
                    request_type = "fullpage";
                    break;
                case 7: page_load_type = "frame"; break;
                default: page_load_type = null;
            }
            if (source_url == '' || source_url.indexOf('about:')==0) return;
            if(page_load_type == 'fullpage') return;

            // Renaming refstr to source_url since this is what is being used in cookie protections.
            // Prefer keeping same name.


            // Google plus widget needs PREF to show the number
            // This cookie is set from google safe browsering
            // An alternative is that we can also block the
            // if (url.indexOf("apis.google.com/u/0/_/widget") != -1) {
            //     aChannel.setRequestHeader("Cookie", "PREF=ID=1111111111111111:LD=en:NR=10:CR=2:TM=:LM=1438242034:GM=1:SG=3:V=1:S=oMNaSBV9BcQNB30S;", false);
            //     return;
            // }

            // modify or cancel the http request if the url contains personal identifier
            // Now refstr should not be null, but still keeping the clause to check from edge cases.

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);

                // same general domain && ref is clearly in the tab
                // var valid_ref = CliqzAttrack.isTabURL(source_url);
                same_gd = CliqzAttrack.sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) return;


                // extract and save tokens
                CliqzAttrack.extractKeyTokens(url_parts, source_url_parts['hostname']);
                try{
                    let source = CliqzAttrack.getRefToSource(subject, referrer);
                    if (!CliqzAttrack.loadedTabs[source_url] && source.lc) {
                        var doc = source.lc.topWindow.document;
                        if (doc.URL == source_url) {
                            CliqzAttrack.storeDomData(doc);
                        }
                    }
                }
                catch(ee){};
                var reflinks = CliqzAttrack.linksFromDom[source_url] || {};

                // @konarkm : Just iterating, hence commenting.
                /*
                if (url in reflinks) {
                    CliqzUtils.log('known url from reflinks: ' + url, 'tokk-kown-url');
                }
                */
                if (url in reflinks) {
                    // work around for https://github.com/cliqz/navigation-extension/issues/1230
                    if (CliqzAttrack.recentlyModified.contains(source_tab + url)) {
                        subject.cancel(Components.results.NS_BINDING_ABORTED);
                        return;
                    }
                    // CliqzAttrack.tp_events.incrementStat(req_log, "url_in_reflinks");
                    // return;
                }

                // log third party request
                var req_log = null;
                if(url_parts.hostname != source_url_parts.hostname) {
                    req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                    if(req_log){
                        req_log.c++;
                        if(url_parts['query'].length > 0) req_log.has_qs++;
                        if(url_parts['parameters'].length > 0) req_log.has_ps++;
                        if(url_parts['fragment'].length > 0) req_log.has_fragment++;
                        let content_type = requestContext.getContentPolicyType();
                        if (!content_type) {
                            CliqzAttrack.tp_events.incrementStat(req_log, "type_unknown");
                        } else {
                            CliqzAttrack.tp_events.incrementStat(req_log, "type_" + content_type);
                        }
                    }
                }

                if(url_parts.path.indexOf('/favicon.') == 0 || url.split('#')[0] in CliqzAttrack.favicons) return;

                // get cookie data
                var cookievalue = {},
                    docCookie = '';
                if (source_url in CliqzAttrack.cookiesFromDom && CliqzAttrack.cookiesFromDom[source_url]) {
                    docCookie = CliqzAttrack.cookiesFromDom[source_url];
                    cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                } else {
                    // try to get the document from source
                    try {
                        if (source.lc) {
                            docCookie = source.lc.topWindow.document.cookie;
                            if (docCookie) {
                                cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                            }
                        }
                    } catch (e) {}
                }
                try {
                    var cookiedata = aChannel.getRequestHeader('Cookie');
                    var cookie2 = CliqzAttrack.getCookieValues(cookiedata, url);
                } catch(e) {
                    var cookie2 = {};
                }

                for (var c in cookie2) {
                    cookievalue[c] = true;
                }

                var stats = {};
                var badTokens = CliqzAttrack.checkTokens(url_parts, source_url, cookievalue, stats, source_url_parts);
                if(req_log) {
                    // save token stats to the log.
                    Object.keys(stats).forEach(function(key) {
                        if(stats[key] > 0) {
                            req_log['token.has_'+ key]++;
                            req_log['token.'+ key] += stats[key];
                        }
                    });
                }

                if (badTokens.length == 0) return;

                // Block request based on rules specified
                var _key = source_tab + ":" + source_url;
                if (CliqzAttrack.isQSEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {
                    for (var i = 0; i < CliqzAttrack.qsBlockRule.length; i++) {
                        var sRule = CliqzAttrack.qsBlockRule[i][0],
                            uRule = CliqzAttrack.qsBlockRule[i][1];
                        if (source_url_parts.hostname.endsWith(sRule) &&
                            url_parts.hostname.endsWith(uRule)) {
                            subject.cancel(Components.results.NS_BINDING_ABORTED);
                            if (req_log) req_log.req_rule_aborted++;
                            return;
                        }
                    }
                }

                if(req_log && badTokens.length > 0) {
                    req_log.bad_qs++;
                    req_log.bad_tokens += badTokens.length;
                }

                // altering request
                // Additional check to verify if the user reloaded the page.
                if (CliqzAttrack.isQSEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {
                    if (CliqzAttrack.debug) {
                        CliqzUtils.log("altering request " + url + " " + source_url + ' ' + same_gd, 'tokk');
                        CliqzUtils.log('bad tokens: ' + JSON.stringify(badTokens), 'tokk');
                    }

                    // stats
                    // if (CliqzAttrack.QSStats[source_url_parts.hostname] == null) CliqzAttrack.QSStats[source_url_parts.hostname] = {};
                    // if (CliqzAttrack.QSStats[source_url_parts.hostname][source_url_parts.hostname] == null)
                    //     CliqzAttrack.QSStats[source_url_parts.hostname][source_url_parts.hostname + url_parts.path] = 0;
                    // CliqzAttrack.QSStats[source_url_parts.hostname][url_parts.hostname + url_parts.path] += badTokens.length;
                    // var blockedItem = {
                    //     'ts': ts,
                    //     'dst': url_parts.hostname,
                    //     'src': source_url_parts.hostname
                    // };

                    if (badTokens.length > 0 && CliqzAttrack.updatedInTime()) {
                        var tmp_url = aChannel.URI.spec;

                        for (var i = 0; i < badTokens.length; i++)
                            tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], CliqzAttrack.obfuscateMethod, CliqzAttrack.replacement));
                        try {
                            aChannel.URI.spec = tmp_url;
                            // CliqzAttrack.QSTraffic['blocked'].unshift(blockedItem);
                            if (req_log) {
                                req_log.tokens_blocked++;
                            }
                        } catch(error) {
                            // var ts = Date.now();
                            // var blockedItem = {
                            // 'ts': ts,
                            // 'dst': url_parts.hostname,
                            // 'src': source_url_parts.hostname
                        // };
                        // CliqzAttrack.QSTraffic['blocked'].unshift(blockedItem);
                            // CliqzUtils.log("Cancelling request: " + tmp_url,"XXXXX");
                            // subject.cancel(Components.results.NS_BINDING_ABORTED);
                            aChannel.redirectTo(Services.io.newURI(tmp_url, null, null));
                            if (req_log) req_log.req_aborted++;
                        }
                        CliqzAttrack.recentlyModified.add(source_tab + url, 30000);

                    }
                }
                else{
                    // var allowed = {
                    //     'ts': ts,
                    //     'dst': url_parts.hostname,
                    //     'src': source_url_parts.hostname
                    // };
                    // CliqzAttrack.QSTraffic['aborted'].unshift(allowed);
                }
                if (aChannel.requestMethod == 'POST') { // plus some settings
                    if (req_log) {
                        req_log.has_post++;
                    }
                    // Now we encounter a 3rd party post request
                    // TODO: make sure it's not user intend
                    if (CliqzAttrack.debug) CliqzUtils.log('3rd party post request: ' + url, 'at-post');
                    var visitor = new HeaderInfoVisitor(aChannel);
                    var requestHeaders = visitor.visitRequest();
                    var postData = visitor.getPostData();
                    if (postData) {
                        if (!postData.binary) { // Don't alter if it's binary
                            var body = postData.body;
                            if (CliqzAttrack.debug) CliqzUtils.log(body, 'at-post-old');
                            var newBody = CliqzAttrack.checkPostReq(body, badTokens, cookievalue);

                            if (newBody != body) {
                                if (CliqzAttrack.debug) CliqzUtils.log(newBody, 'at-post-new');
                                if (CliqzAttrack.isPostEnabled()) {
                                    aChannel.QueryInterface(Ci.nsIUploadChannel);
                                    aChannel.uploadStream.QueryInterface(Ci.nsISeekableStream)
                                        .seek(Ci.nsISeekableStream.NS_SEEK_SET, 0);
                                    aChannel.uploadStream.setData(newBody, newBody.length);
                                    aChannel.requestMethod = 'POST';
                                    if (req_log) { req_log.post_altered++; }
                                }
                                if (req_log) {
                                    req_log.bad_post++;
                                }
                                // visitor = new HeaderInfoVisitor(aChannel);
                                // requestHeaders = visitor.visitRequest();
                                // postData = visitor.getPostData();
                                // CliqzUtils.log(postData, 'at-post-new');
                            }
                            // @konarkm : Minimize log calls while intercepting calls.
                            // Ideally should not be here, even with debug check.
                            /*
                             else {
                                CliqzUtils.log('no need to alter', 'at-post');
                            }
                            */
                        }
                    }
                }
            } else {
                // no refstr: might be able to get a referrer from load context to verify if favicon or extension request
                // Now this should not happen. Keeping the code block for now. Will remove it after more testing.
                if (CliqzAttrack.debug) CliqzUtils.log("THIS CALL DID NOT HAVE A REF","no_refstr");
            }
        }
    },
    httpResponseObserver: {
        observe: function(subject, topic, data) {
            // For headers only, AFAIK the etags (if-none-match) becomes available only in the response
            // So let's at least do the counting
            if (CliqzAttrack.safeKey == null || CliqzAttrack.requestKeyValue == null || CliqzAttrack.tokenExtWhitelist == null) {
                return;
            }
            var aChannel = subject.QueryInterface(nsIHttpChannel);
            var requestContext = new HttpRequestContext(subject);
            var url = requestContext.url;
            if (!url || url == '') return;
            var visitor = new HeaderInfoVisitor(aChannel);
            var headers = visitor.visitRequest();
            var url_parts = URLInfo.get(url);
            // CliqzAttrack.examineHeaders(url_parts, headers);
            var referrer = requestContext.getReferrer();
            var same_gd = false;


            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            var page_load_type = CliqzAttrack.getPageLoadType(aChannel);
            if (source_url == '' || source_url.indexOf('about:')==0) return;
            if(page_load_type == 'fullpage') return;

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);
                // extract and save tokens
                //var valid_ref = CliqzAttrack.isTabURL(source_url);
                same_gd = CliqzAttrack.sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) return;
                CliqzAttrack.extractHeaderTokens(url_parts, source_url_parts['hostname'], headers);
                try{
                    if (!CliqzAttrack.loadedTabs[source_url] && source.lc) {
                        var doc = source.lc.topWindow.document;
                        if (doc.URL == source_url) {
                            CliqzAttrack.storeDomData(doc);
                        }
                    }
                } catch (e) {}
                var cookievalue = {},
                    docCookie = '';
                if (source_url in CliqzAttrack.cookiesFromDom && CliqzAttrack.cookiesFromDom[source_url]) {
                    docCookie = CliqzAttrack.cookiesFromDom[source_url];
                    cookievalue = CliqzAttrack.getCookieValues(docCookie, url);
                }
                try {
                    var cookiedata = aChannel.getRequestHeader('Cookie');
                    var cookie2 = CliqzAttrack.getCookieValues(cookiedata, url);
                } catch(e) {
                    var cookie2 = {};
                }
                try {
                    var cookiedata = aChannel.getResponseHeader('Set-Cookie');
                    var cookie3 = CliqzAttrack.getCookieValues(cookiedata, url);
                } catch(e) {
                    var cookie3 = {};
                }

                for (var c in cookie2) cookievalue[c] = true;
                for (var c in cookie3) cookievalue[c] = true;

                if(url_parts.hostname != source_url_parts.hostname)
                    var req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                var stats = {};
                var badHeaders = CliqzAttrack.checkHeaders(url_parts, headers, cookievalue, stats);
                if (req_log) {
                    req_log.resp_ob++;
                    Object.keys(stats).forEach(function(key) {
                        if(stats[key] > 0)
                            req_log['header.' + key] = stats[key];
                    });
                }
                if (Object.keys(badHeaders) > 0) {
                    if (req_log) {
                        req_log.bad_headers++;
                    }
                }
            }
        }
    },
    httpmodObserver: {
        observe : function(subject, topic, data) {
            // http-on-modify-request
            // if (topic != "http-on-modify-request") return;
            // extract url and referrer from event subject
            var aChannel = subject.QueryInterface(nsIHttpChannel);
            var requestContext = new HttpRequestContext(subject);
            var url = requestContext.url;

            if (!url || url == '') return;
            var url_parts = URLInfo.get(url);

            var cookie_data = requestContext.getCookieData();

            if(aChannel.status == Components.results.NS_BINDING_ABORTED) {
                // request already cancelled
                return;
            }

            // Quick escapes:
            // localhost
            if (url_parts['hostname'] == 'localhost') {
                return;
            }
            // no cookies, let's return
            if (cookie_data == null) return;

            // check if domain is whitelisted,
            if (CliqzAttrack.isInWhitelist(url_parts.hostname)) {
                if (CliqzAttrack.debug) CliqzUtils.log("Is whitelisted (type: direct): " + url, CliqzAttrack.LOG_KEY);
                return;
            }

            // Gather more info for further checks
            var curr_time = (new Date()).getTime();
            if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

            // check if fill context oauth, this needs to be done before accepting or requesting the cookies.
            var ourl = CliqzAttrack.findOauth(url, url_parts);
            if (ourl) {
                CliqzAttrack.contextOauth = {'ts': curr_time, 'html': dURIC(ourl) + ':' + url};
                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH: " + JSON.stringify(CliqzAttrack.contextOauth), CliqzAttrack.LOG_KEY);
            }
            // content policy type 6 == TYPE_DOCUMENT: top level dom element. Do not block.
            if (requestContext.getContentPolicyType() == 6) {
                return;
            }

            var referrer = requestContext.getReferrer();

            // if the request is originating from a tab, we can get a source url
            // The implementation below is causing a bug, if we load different urls in same tab.
            // This is better handeled in capturing request type. When request type == fullpage
            // Then uri.spec == source_url
            // Only get source tabs for now.

            // var source = CliqzAttrack.getRefToSource(subject, referrer);
            var source_url = requestContext.getLoadingDocument(),
                source_url_parts = null,
                source_tab = requestContext.getOriginWindowID();

            //var is_xhr = CliqzAttrack.isXHRRequest(aChannel);
            var page_load_type = null;
            var request_type = null;
            switch(requestContext.getContentPolicyType()) {
                case 6:
                    page_load_type = "fullpage";
                    request_type = "fullpage";
                    break;
                case 7: page_load_type = "frame"; break;
                default: page_load_type = null;
            }

            // Fallback to referrer if we don't find source from tab
            if (source_url === undefined || source_url == ''){
                source_url = referrer;
            }

            source_url_parts = URLInfo.get(source_url);

            var req_log = null;
            if(request_type != 'fullpage' && source_url_parts && source_tab != -1) {
                // req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                // if(req_log != null) req_log.cookie_set++;
            }

            if (request_type == 'extension_resource' ||
                    (source_url_parts && source_url_parts['hostname'] == 'browser' && source_url_parts['path'] == "/content/browser.xul")) {
                // extension_resource type may indicate favicon, check if it looks like a favicon url
                var baseurl = url.split('#')[0];
                if(url_parts.path.indexOf('/favicon.') == 0 || baseurl in CliqzAttrack.favicons) {
                    // block favicon cookies
                    req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                    if(req_log != null) req_log.cookie_block_favicon++;
                    CliqzAttrack.blockCookie(aChannel, url, {'dst': 'favicon', 'src': url_parts.hostname, 'data': cookie_data, 'ts': curr_time, 'type': 'favicon'}, "favicon");
                    return;
                }
            } else if(request_type == 'fullpage') {
                faviconService.getFaviconURLForPage(aChannel.URI, function(favicon_uri) {
                    if(favicon_uri != null) {
                        var favicon_link = favicon_uri.spec;
                        if (favicon_link && !(CliqzAttrack.favicons.contains(favicon_link))) {
                            CliqzAttrack.favicons.add(favicon_link);
                        }
                    }
                });
            }

            var same_gd = false;
            if (url_parts.hostname!='' && source_url_parts && source_url_parts.hostname!='') {
                same_gd = CliqzAttrack.sameGeneralDomain(url_parts.hostname, source_url_parts.hostname);
                // if (CliqzAttrack.debug) CliqzUtils.log(">>>Checking same gd: "  + url_parts.hostname + " : " + source_url_parts.hostname + " : " + same_gd, CliqzAttrack.LOG_KEY);
            }

            if (same_gd) {
                // not a 3rd party cookie, do nothing
                // if(req_log != null) req_log.cookie_allow_ntp++;
                return;
            } else {
                req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                if(req_log != null) req_log.cookie_set++;
                if (source_url.indexOf('about:')==0) {
                    // it's a brand new tab, and the url is loaded externally,
                    // about:home, about:blank
                    req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                    if(req_log != null) req_log.cookie_allow_newtab++;
                    CliqzAttrack.allowCookie(aChannel, url, {'dst': url_parts.hostname, 'src': source_url, 'data': cookie_data, 'ts': curr_time}, "about:blank");
                    return;
                }
            }

            var host = CliqzAttrack.getGeneralDomain(url_parts.hostname);
            var diff = curr_time - (CliqzAttrack.visitCache[host] || 0);

            // This is order to only allow visited sources from browser. Else some redirect calls
            // Getting leaked.
            var s_host = '';
            if(source_url && source_url_parts.hostname){
                s_host = CliqzAttrack.getGeneralDomain(source_url_parts.hostname);
            }

            // check visitcache to see if this domain is temporarily allowed.
            // Additional check required when gd=false and request_type== full_page, else block
            //
            if (diff < CliqzAttrack.timeActive && CliqzAttrack.visitCache[s_host]) {
                var src = null;
                if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                if(req_log != null) {
                    req_log.cookie_allow_visitcache++;
                }
                CliqzAttrack.allowCookie(aChannel, url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "visitcache");
                return;
            }

            // check if user initiated this request by an element click.
            if (CliqzHumanWeb.contextFromEvent) {
                var diff = curr_time - (CliqzHumanWeb.contextFromEvent.ts || 0);
                if (diff < CliqzAttrack.timeAfterLink) {

                    var pu = url.split(/[?&;]/)[0];

                    if (CliqzHumanWeb.contextFromEvent.html.indexOf(pu)!=-1) {
                        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED (type2): " + pu + " " + CliqzHumanWeb.contextFromEvent.html, CliqzAttrack.LOG_KEY);

                        // the url is in pu
                        if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                            var host = CliqzAttrack.getGeneralDomain(url_parts.hostname);
                            //var host = url_parts.hostname;
                            if (host=='google.com') {
                                if (CliqzAttrack.debug) CliqzUtils.log("ADDING google to visitCache: " + url_parts.hostname + ' (CONTEXT EVENT)', CliqzAttrack.LOG_KEY);
                            }
                            CliqzAttrack.visitCache[host] = curr_time;
                            var src = null;
                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                            if(req_log != null) req_log.cookie_allow_userinit++;
                            CliqzAttrack.allowCookie(aChannel, url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextFromEvent");
                            return;
                        }
                    }
                }
            }

            // check for OAuth requests
            if (CliqzAttrack.contextOauth) {
                var diff = curr_time - (CliqzAttrack.contextOauth.ts || 0);
                if (diff < CliqzAttrack.timeActive) {


                    var pu = url.split(/[?&;]/)[0];

                    if (CliqzAttrack.contextOauth.html.indexOf(pu)!=-1) {
                        // the url is in pu
                        if (url_parts && url_parts.hostname && url_parts.hostname!='') {

                            if (CliqzHumanWeb.contextFromEvent && CliqzHumanWeb.contextFromEvent && CliqzHumanWeb.contextFromEvent.html.indexOf(pu)!=-1) {

                                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and click " + url, CliqzAttrack.LOG_KEY);
                                var host = CliqzAttrack.getGeneralDomain(url_parts.hostname);
                                //var host = url_parts.hostname;
                                //if (host=='google.com') {
                                //    if (CliqzAttrack.debug) CliqzUtils.log("ADDING google to visitCache: " + url + ' (CONTEXT OAUTH)', CliqzAttrack.LOG_KEY);
                                //}
                                //CliqzAttrack.visitCache[host] = curr_time;

                                var src = null;
                                if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                                if(req_log != null) req_log.cookie_allow_oauth++;
                                if(req_log != null) req_log.req_oauth++;
                                CliqzAttrack.allowCookie(aChannel, url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextOauth");
                                return;
                            }
                            else {
                                if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and NOT click " + url, CliqzAttrack.LOG_KEY);
                            }

                        }
                    }
                }
            }

            if (url_parts.hostname!='' && source_url_parts && source_url_parts.hostname!='') {

                // the hostnames are different, but they might still be the same site: e.g.
                // loc5.lacaixa.es => metrics.lacaixa.es
                //

                if (CliqzAttrack.debug) {
                    CliqzUtils.log("cookie detected >>> " + source_url_parts.hostname + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                }

                if ((!same_gd) && cookie_data &&  cookie_data.length>10) {
                    // var md5_source_hostname = CliqzHumanWeb._md5(source_url_parts.hostname);

                    // as test, we do not send the hostname as md5
                    var md5_source_hostname = source_url_parts.hostname;

                    // if (CliqzAttrack.state[md5_source_hostname]==null) CliqzAttrack.state[md5_source_hostname] = {};

                    // if (CliqzAttrack.state[md5_source_hostname][url_parts.hostname]==null) CliqzAttrack.state[md5_source_hostname][url_parts.hostname] = {'c': 0, 'v': {}};

                    // CliqzAttrack.state[md5_source_hostname][url_parts.hostname]['c'] = (CliqzAttrack.state[md5_source_hostname][url_parts.hostname]['c'] || 0) + 1;
                    // CliqzAttrack.state[md5_source_hostname][url_parts.hostname]['v'][url] = cookie_data;

                    // now, let's kill that cookie and see what happens :-)
                    var _key = source_tab + ":" + source_url;
                    if (CliqzAttrack.isCookieEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {
                        // blocking cookie
                        var src = null;
                        if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                        if (req_log) req_log.cookie_blocked++;
                        if(req_log != null) req_log.cookie_block_tp1++;
                        CliqzAttrack.blockCookie(aChannel, source_url_parts.hostname, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type1')
                        return;
                    }
                    else {
                        // was not enabled, therefore the cookie gets sent
                        // cookie_sent
                        // CliqzUtils.log(CliqzAttrack.getGeneralDomain(), "XOXOX");
                        if (req_log) req_log.bad_cookie_sent++;
                        // @konarkm: This is for UI notification.
                        // Disabling for the release.
                        //CliqzAttrack.badCookieSent(url, url_parts, source_url, source_url_parts);
                    }

                }

            }
            else {
                if (CliqzAttrack.bootingUp) {

                    if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Booting up: "  + url + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                    var key = url_parts.hostname + url_parts.path;
                    if (key && key!='') CliqzAttrack.bootupWhitelistCache[key] = true;
                    if(req_log != null) req_log.cookie_allow_bootingup++;
                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);

                }
                else {

                    var key = url_parts.hostname + url_parts.path;
                    if (CliqzAttrack.bootupWhitelistCache[key]==null) {

                        if (CliqzAttrack.isCookieEnabled() && !(CliqzAttrack.reloadWhiteList[_key])) {
                            // blocking cookie
                            var src = null;
                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                            if (req_log) req_log.cookie_blocked++;
                            if(req_log != null) req_log.cookie_block_tp2++;
                            CliqzAttrack.blockCookie(aChannel, diff, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type2')
                            return;
                        }
                        else {
                            // was not enabled, therefore the cookie gets sent
                            // cookie_sent
                            if (req_log) req_log.bad_cookie_sent++;
                            // @konarkm: This is for UI notification.
                            // Disabling for the release.
                            // CliqzAttrack.badCookieSent(url, url_parts, source_url, source_url_parts);

                        }
                    }
                    else {
                        // should allow, same domain and path as bootup request,
                        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);

                    }
                }

            }

            CliqzAttrack.cookieTraffic['csent'] += 1;
            CliqzAttrack.cookieTraffic['sent'].unshift({'src': (source_url_parts ? source_url_parts.hostname : ''), 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time});
        }
    },
    allowCookie: function(channel, url, req_metadata, reason) {
        CliqzAttrack.cookieTraffic['csent'] += 1;
        CliqzAttrack.cookieTraffic['sent'].unshift(req_metadata);
        if (CliqzAttrack.getGeneralDomain(req_metadata['dst']) in CliqzAttrack.blacklist) CliqzUtils.log("This was blocked by other extensions: ","XOXOX");
        if (CliqzAttrack.debug) CliqzUtils.log("ALLOWING because of " + reason + " " + req_metadata['dst'] + ' %% ' + url, CliqzAttrack.LOG_KEY);
    },
    blockCookie: function(channel, url, req_metadata, reason) {
        // Ref sent:
        // CliqzUtils.log("REF SENT: " + channel.getRequestHeader("Referer") + " to: " + req_metadata['dst']);
        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie REMOVED (" + reason + "): "  + req_metadata['dst'] + " >>> " + url, CliqzAttrack.LOG_KEY);
        // blocking cookie
        channel.setRequestHeader("Cookie", "", false);
        CliqzAttrack.blockedCache[req_metadata['dst']] = req_metadata['ts'];
        CliqzAttrack.cookieTraffic['cblocked'] += 1;
        CliqzAttrack.cookieTraffic['blocked'].unshift(req_metadata);
    },
    SQL: function(sql, onRow, callback, parameters) {
        var st = CliqzAttrack.dbConn.createAsyncStatement(sql);

        for(var key in parameters) {
            st.params[key] = parameters[key];
        }

        CliqzAttrack._SQL(CliqzAttrack.dbConn, st, onRow, callback);
    },
    _SQL: function(dbConn, statement, onRow, callback) {
        statement.executeAsync({
        onRow: onRow,
          callback: callback,
          handleResult: function(aResultSet) {
            var resultCount = 0;
            for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
              resultCount++;
              if (this.onRow) {
                this.onRow(statement.row);
              }
            }
            if (this.callback) {
              this.callback(resultCount);
            }
          },

          handleError: function(aError) {
            CliqzUtils.log("Error (" + aError.result + "):" + aError.message, CliqzAttrack.LOG_KEY);
            if (this.callback) {
              this.callback(0);
            }
          },
          handleCompletion: function(aReason) {
            // Always called when done
          }
        });
        statement.finalize();
    },
    findOauth: function(url, url_parts) {
        try {
            var value = null;

            if ((url_parts.path.length < 50) && url_parts.query_string && (url_parts.path.indexOf('oauth')!=-1)) {

                var qso = CliqzAttrack.parseQuery(url_parts.query_string);
                var k = Object.keys(qso);
                for(var i=0;i<k.length;i++) {
                    if (k[i].indexOf('callback')!=-1 || k[i].indexOf('redirect')!=-1) {
                        value = dURIC(qso[k[i]]);
                    }
                    else {
                        if ((qso[k[i]].indexOf('http')==0) && (qso[k[i]].indexOf('/oauth')!=-1)) {

                            var url_parts2 = CliqzHumanWeb.parseURL(qso[k[i]]);
                            if (url_parts2 && url_parts2.path && url_parts2.path.indexOf('oauth')) {
                                if (url_parts.query_string) {
                                    var qso2 = CliqzAttrack.parseQuery(url_parts2.query_string);
                                    var k2 = Object.keys(qso2);
                                    for(var i2=0;i2<k2.length;i2++) {
                                        if (k2[i2].indexOf('callback')!=-1 || k2[i2].indexOf('redirect')!=-1) {
                                            value = dURIC(qso2[k2[i2]]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            return value;

        } catch(ee) {
            return null;
        }
    },
    auxIsAlive: function() {
        return true;
    },
    auxIntersection: function(a, b) {
        var ai=0, bi=0;
        var result = new Array();
        while( ai < a.length && bi < b.length ) {
            if      (a[ai] < b[bi] ){ ai++; }
            else if (a[ai] > b[bi] ){ bi++; }
            else {
                result.push(a[ai]);
                ai++;
                bi++;
            }
        }
        return result;
    },
    auxUnion: function(a, b) {
        var h = {};
        for (var i = a.length-1; i >= 0; -- i) h[a[i]] = a[i];
        for (var i = b.length-1; i >= 0; -- i) h[b[i]] = b[i];
        var res = [];
        for (var k in h) {
            if (h.hasOwnProperty(k)) res.push(h[k]);
        }
        return res;
    },
    checkHiddenInput: function(dom) {
        var forms = dom.forms;
        if (forms) {
            for (var i = 0; i < forms.length; i++) {
                // find 3rd party form
                var faction = forms[i].action;
                if (faction.indexOf('http') != 0) return;
                if (CliqzAttrack.sameGeneralDomain(CliqzAttrack.parseURL(dom.URL).hostname,
                                                   CliqzAttrack.parseURL(faction).hostname))
                    return;
                CliqzUtils.log(forms[i].action, 'at-post');
                var inputs = forms[i].querySelectorAll('input');
                for (var j = 0; j < inputs.length; j++) {
                    if (inputs[j].type == 'hidden') {
                        CliqzUtils.log('hidden-value: ' + inputs[j].value, 'at-post');
                    }
                }
            }
        }
    },
    listener: {
        tmpURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {


            /*
            var aWin = aProgress.DOMWindow;
            // CliqzUtils.log("VERSIOn Check: " + aWin.window.CliqzAttrack.VERSION, "XOXOXO");
            var subScriptLoader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
                    .getService(Ci.mozIJSSubScriptLoader);
            subScriptLoader.loadSubScript("chrome://cliqzmodules/content/foat.js", aWin.document);
            */
            // Blacklist : Need to move it to webservice.
            var canvasBlackList = ['amiunique.org','www.browserleaks.com'];


            // Block toDataURL
            Components.utils.exportFunction(
                function (){
                    var err = new Error();
                    var externalCallHost = parseCalleeStack(err)['externalCallHost'];
                    var pageHostname = CliqzHumanWeb.parseURL(aURI.spec)['hostname'];
                    var source_url = aURI.spec;
                    var source_url_parts = CliqzAttrack.parseURL(source_url)
                    var ref_url =  parseCalleeStack(err)['url'];
                    var ref_url_parts = CliqzAttrack.parseURL(ref_url);
                    var source_tab = CliqzAttrack.tab_listener.getTabsForURL(source_url);

                    var req_log = null;
                    req_log = CliqzAttrack.tp_events.get(ref_url, ref_url_parts, source_url, source_url_parts, source_tab);
                    if(CliqzHumanWeb.state['v'] && CliqzHumanWeb.state['v'][source_url])CliqzHumanWeb.state['v'][source_url]['cvf'] = 1;

                    var blockExternalCallee = canvasBlackList.indexOf(externalCallHost);
                    if((pageHostname != externalCallHost) || (blockExternalCallee > -1)){
                        if(req_log != null) req_log.cv_to_dataURL_blocked++;
                        if(CliqzAttrack.isFingerprintingEnabled()) {
                            return "blocked";
                        }
                    }
                    else{
                        if(req_log != null) req_log.cv_to_dataURL_allowed++;
                    }
                    return this.toDataURL();

                }
                ,aProgress.DOMWindow.HTMLCanvasElement.prototype,
                {defineAs:"toDataURL"}
            );

            // Introspect getImageData

            /*
            Components.utils.exportFunction(
                function (sx, sy, sw, sh){
                    var err = new Error();
                    var externalCallHost = parseCalleeStack(err);
                    var pageHostname = CliqzHumanWeb.parseURL(aURI.spec)['hostname'];
                    CliqzUtils.log("This website attemps Canvas fingerprinting: " + aURI.spec, "CliqzAttrack") ;

                    // var ob = {"src": aURI.spec, "dst" : err.stack.trim().split("\n"), "obj":  originalImageData, "method":"getImageData"};
                    var ob = {"src": aURI.spec, "dst" : err.stack.trim().split("\n"), "obj":  this.canvas, "method":"getImageData"};


                    var blockExternalCallee = canvasBlackList.indexOf(externalCallHost);
                    if((pageHostname != externalCallHost) || (blockExternalCallee > -1) && CliqzUtils.isFingerprintingEnabled()){
                        ob['status'] = "blocked";
                        ob['ver'] = CliqzAttrack.VERSION;
                        CliqzAttrack.canvasTraffic['observed'].push(ob);
                        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.canvas', 'payload': ob});
                        var l = sw * sh * 4;
                        var data = new Uint8ClampedArray(l);
                        for (var i = 0; i < l; i += 1){
                            data[i] = Math.floor(
                                Math.random() * 256
                            );
                        }
                        var imageData = new CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.ImageData(sw, sh);
                        imageData.data.set(Components.utils.cloneInto(data, CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.CanvasRenderingContext2D.prototype,{defineAs:"getImageData"}));
                        return imageData;
                    }
                    else{
                        ob['status'] = "allowed";
                        ob['ver'] = CliqzAttrack.VERSION;
                        CliqzAttrack.canvasTraffic['observed'].push(ob);
                        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.canvas', 'payload': ob});
                        CliqzHumanWeb.pushTelemetry();
                        var ctx = this.canvas.getContext("2d");
                        var originalImageData = new CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.ImageData(sw, sh);
                        originalImageData.data.set(Components.utils.cloneInto(ctx.getImageData(sx, sy, sw, sh).data, CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.CanvasRenderingContext2D.prototype,{defineAs:"getImageData"}));
                        return originalImageData ;
                    }

                }
                ,aProgress.DOMWindow.CanvasRenderingContext2D.prototype,
                {defineAs:"getImageData"}
            );
            */


            // Components.utils.exportFunction(function (){CliqzUtils.log("This website attemps Canvas fingerprinting: " + aURI.spec, "XOXOXOXOX getImageData") ;return "Dddddd"},CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.CanvasRenderingContext2D.prototype,{defineAs:"getImageData"});
            // Components.utils.exportFunction(function (){CliqzUtils.log("This website attemps Canvas fingerprinting: " + aURI.spec, "CliqzAttrack blob") ;return "Dddddd"},CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.HTMLCanvasElement.prototype,{defineAs:"toBlob"});
            // Components.utils.exportFunction(function (){CliqzUtils.log("This website attemps Canvas fingerprinting: " + aURI.spec, "CliqzAttrack readpixels") ;return "Dddddd"},CliqzUtils.getWindow().gBrowser.selectedBrowser.contentWindow.WebGLRenderingContext.prototype,{defineAs:"readPixels"});

            CliqzAttrack.linksFromDom[aURI.spec] = {};
            if (aProgress.isLoadingDocument) {
                // when a new page is loaded, try to extract internal links and cookies
                var doc = aProgress.document;
                // Throws an error doc -- in undefined.
                CliqzAttrack.loadedTabs[aURI.spec] = false;
                if(doc) {
                    if (doc.body) {
                        CliqzAttrack.storeDomData(doc);
                    }
                    doc.addEventListener(
                        'DOMContentLoaded',
                        function(ev) {
                            CliqzAttrack.loadedTabs[aURI.spec] = true;
                            CliqzAttrack.storeDomData(doc);
                        });
                    CliqzAttrack.clearDomLinks();
                }
            }
            // if(CliqzUtils.getWindow().gBrowser.contentWindow.frames[0])  CliqzUtils.log(CliqzUtils.getWindow().gBrowser.contentWindow.frames[0], "XXXX");


            // New location, means a page loaded on the top window, visible tab

            // var currwin = CliqzUtils.getWindow();
            // var _currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;


            var activeURL = CliqzHumanWeb.currentURL();
            var curr_time = (new Date()).getTime();

            if ((activeURL.indexOf('about:')!=0) && (activeURL.indexOf('chrome:')!=0)) {

                var curr_time = (new Date()).getTime();
                var url_parts = CliqzHumanWeb.parseURL(activeURL);

                if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                    var host = CliqzAttrack.getGeneralDomain(url_parts.hostname);
                    //var host = url_parts.hostname;
                    if (host=='google.com') {
                        if (CliqzAttrack.debug) CliqzUtils.log("ADDING google to visitCache: " + url_parts.hostname + ' (LOCATION CHANGE)', CliqzAttrack.LOG_KEY);
                    }
                    CliqzAttrack.visitCache[host] = curr_time;

                    /*
                    if (url_parts.hostname!='') {
                        if (CliqzAttrack.debug) CliqzUtils.log(">>> doc: " + aProgress.document, CliqzAttrack.LOG_KEY);
                        CliqzAttrack.assessAlertRules(aURI.spec, aProgress.document);
                    }
                    */
                }
            }

        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {

        }
    },
    isAlertEnabled: function() {
        return CliqzUtils.getPref('attrackAlertEnabled', false);
    },
    isEnabled: function() {
        return CliqzUtils.getPref('antiTrackTest', false);
    },
    isCookieEnabled: function() {
        return CliqzUtils.getPref('attrackBlockCookieTracking', false);
    },
    isQSEnabled: function() {
        return CliqzUtils.getPref('attrackRemoveQueryStringTracking', false);
    },
    isPostEnabled: function() {
        return CliqzUtils.getPref('attrackAlterPostdataTracking', false);
    },
    isFingerprintingEnabled: function() {
        return CliqzUtils.getPref('attrackCanvasFingerprintTracking', false);
    },
    isReferrerEnabled: function() {
        return CliqzUtils.getPref('attrackRefererTracking', false);
    },
    pacemaker: function() {
        // every CliqzAttrack.tpace (10 sec now)
        //
        // var activeURL = CliqzHumanWeb.currentURL();

        if (!CliqzAttrack) return;

        CliqzAttrack.counter += 1;

        if (CliqzAttrack.counter > 1) {
        // avoid doing anything in the first 2 min,
        // @konarkm : These are called every 10 secs, do we need such a low threshold ? Or can it be min or 2 ?
            CliqzAttrack.sendStateIfNeeded();
            CliqzAttrack.sendTokensIfNeeded();
            // CliqzAttrack.sendHistStatsIfNeeded();
        }

        var curr_time = (new Date()).getTime();

        // clean all the caches,

        if (true) {
            var keys = Object.keys(CliqzAttrack.visitCache);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.visitCache[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) delete CliqzAttrack.visitCache[keys[i]];
            }


            var keys = Object.keys(CliqzAttrack.reloadWhiteList);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.reloadWhiteList[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) {
                    delete CliqzAttrack.reloadWhiteList[keys[i]];
                }
            }

            var keys = Object.keys(CliqzAttrack.trackReload);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.trackReload[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) {
                    delete CliqzAttrack.trackReload[keys[i]];
                }
            }
            // @konarkm : Does not look like reloadCache is being populated anywhere.
            // Commenting it out.
            /*
            var keys = Object.keys(CliqzAttrack.reloadCache);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.reloadCache[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) delete CliqzAttrack.reloadCache[keys[i]];
            }
            */

            var keys = Object.keys(CliqzAttrack.blockedCache);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.blockedCache[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) delete CliqzAttrack.blockedCache[keys[i]];
            }
        }

        if (true) {
            CliqzAttrack.cookieTraffic['blocked'].splice(200);
            CliqzAttrack.cookieTraffic['sent'].splice(200);

            CliqzAttrack.QSTraffic['blocked'].splice(200);
            CliqzAttrack.QSTraffic['aborted'].splice(200);
        }

        if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) {
            CliqzAttrack.bootingUp = false;
        }


        // @konarkm : Not sure if this is used anywhere other then UI, in this version.
        // Commenting it out looks safe. Else this is called every 10 seconds and loops over all the windows.
        // This anyways is not an efficient manner. We should be able to do the same from to_event or other stat caches.
        /*
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext()
            try{
                var btn = win.document.getElementById('cliqz-anti-tracking-label');
                if (btn) {
                    var b = (CliqzAttrack.cookieTraffic['cblocked'] || 0);
                    var a = b + (CliqzAttrack.cookieTraffic['csent'] || 0);
                    btn.setAttribute('label', 'Anti-tracking [Blocked ' + b + ' of ' + a + ']');
                }
            } catch(e){}
        }
        */

        // @konarkm : Since no UI, in this version.
        // Commenting looks safe.
        /*
        CliqzAttrack.renderCookieTraffic();
        CliqzAttrack.renderQSTraffic();
        */

        if((CliqzAttrack.counter/CliqzAttrack.tmult) % (2 * 60) == 0) {
            CliqzAttrack.tp_events.commit();
            CliqzAttrack.tp_events.push();
        }

    },
    counter: 0,
    unload: function(window) {
        //Check is active usage, was sent

        // force send tab telemetry data
        CliqzAttrack.tp_events.commit(true, true);
        CliqzAttrack.tp_events.push(true);

        CliqzAttrack.saveState();
        CliqzAttrack.saveTokens();
        CliqzAttrack.saveLocalTokenStats();
        // @konarkm : We are not keeping any whitelist for now, so commenting it looks safe.
        // CliqzAttrack.saveWhitelist();

        // CliqzAttrack.saveHistStats();

        CliqzAttrack.pushTelemetry();
        CliqzUtils.clearTimeout(CliqzAttrack.pacemakerId);
        CliqzUtils.clearTimeout(CliqzAttrack.trkTimer);

        CliqzAttrack.saveTokenWhitelist();
        CliqzAttrack.saveSafeKey();

        if (window != null) {
            window.gBrowser.removeProgressListener(CliqzAttrack.tab_listener);
            window.gBrowser.removeProgressListener(CliqzAttrack.listener);
            window.gBrowser.removeProgressListener(onUrlbarFocus);
        }
    },
    unloadAtBrowser: function(){
        try {
            // Unload from any existing windows
            var enumerator = Services.wm.getEnumerator('navigator:browser');
            while (enumerator.hasMoreElements()) {
                try{
                    var win = enumerator.getNext();
                    CliqzAttrack.unload(win);
                }
                catch(e){}
            }
            CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpmodObserver, 'http-on-modify-request');
            CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpopenObserver, 'http-on-opening-request');
            CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpResponseObserver, 'http-on-examine-cached-response');
            CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpResponseObserver, 'http-on-examine-response');
        } catch(e){
        }
    },
    pacemakerId: null,
    tpace: 10*1000,
    tmult: 1/10.0,
    windowsRef: [],
    windowsMem: {},
    alertRules: null,
    alertTemplate: null,
    alertAlreadyShown: {},
    // load from the about:config settings
    init: function(window) {
        // Load listerners:
        if(CliqzUtils.getPref("antiTrackTest", false)){
            window.gBrowser.addProgressListener(CliqzAttrack.listener);
        }
        else{
            return;
        }

        // Replace getWindow functions with window object used in init.

        if (CliqzAttrack.debug) CliqzUtils.log("Init function called:", CliqzAttrack.LOG_KEY);
        CliqzAttrack.initDB();
        CliqzUtils.httpGet('chrome://cliqz/content/blacklist.json',
            function success(req){
                CliqzAttrack.blacklist = JSON.parse(req.response).tpdomains;
            },
            function error(){
                CliqzUtils.log("Could not load blacklist.")
            }
         );

        // if (CliqzAttrack.state==null) CliqzAttrack.loadState();
        if (CliqzAttrack.tokens==null) CliqzAttrack.loadTokens();
        if (CliqzAttrack.blocked==null) CliqzAttrack.loadBlocked();
        if (CliqzAttrack.stateLastSent==null) CliqzAttrack.loadStateLastSent();
        if (CliqzAttrack.tokensLastSent==null) CliqzAttrack.loadTokensLastSent();

		if (CliqzAttrack.tokenExtWhitelist == null) CliqzAttrack.loadTokenWhitelist();
        if (CliqzAttrack.safeKey == null) CliqzAttrack.loadSafeKey();
        if (CliqzAttrack.tokenDomain == null) CliqzAttrack.loadTokenDomain();
        if (CliqzAttrack.qsBlockRule == null) CliqzAttrack.loadBlockRules();
        if (CliqzAttrack.blockReportList == null) CliqzAttrack.loadReportLists();
        if (CliqzAttrack.requestKeyValue == null) CliqzAttrack.loadRequestKeyValue();
        if (CliqzAttrack.wrongTokenLastSent==null || CliqzAttrack.loadedPage==null ||
            CliqzAttrack.localBlocked==null || CliqzAttrack.checkedToken==null || CliqzAttrack.blockedToken)
            CliqzAttrack.loadLocalTokenStats();

        // if (CliqzAttrack.QSStats == null) CliqzAttrack.loadQSStats();

        // @konarkm : Since we already have window, passing it.
        // Saves from calling CliqzUtils.getWindow() in getPrivateValues();
        CliqzAttrack.getPrivateValues(window);
        CliqzAttrack.checkInstalledAddons();


        // var win_id = CliqzUtils.getWindowID();
        window.gBrowser.addProgressListener(CliqzAttrack.tab_listener);
        window.CLIQZ.Core.urlbar.addEventListener('focus',onUrlbarFocus);

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }
        /*
        else {
            var util = CliqzUtils.getWindow().QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
            var win_id = util.outerWindowID;

            if (CliqzAttrack.windowsMem[win_id] == null) {
                CliqzAttrack.windowsMem[win_id] = window;
                CliqzAttrack.windowsRef.push(window);
            }
        }
        */

        if (CliqzAttrack.pacemakerId==null) {
            CliqzAttrack.pacemakerId = CliqzUtils.setInterval(CliqzAttrack.pacemaker, CliqzAttrack.tpace, null);
        }

        /*
        CliqzUtils.httpGet(CliqzAttrack.URL_ALERT_RULES,
            function success(req){
                CliqzAttrack.alertRules = JSON.parse(req.response);
            },
            function error() {
                CliqzAttrack.alertRules = [];
            });

        CliqzUtils.httpGet(CliqzAttrack.URL_ALERT_TEMPLATE,
            function success(req){
                CliqzAttrack.alertTemplate = req.response;
            },
            function error() {
                CliqzAttrack.alertTemplate = null;
            });
        */

        // FIXME:
        // CliqzAttrack.URL_TOKEN_WHITELIST might become pretty large, now it's 10MB and it fails like a bitch
        // with loadResource it seems to work, but this is going to be a problem in the future (at some point)

        /*
        CliqzUtils.httpGet(CliqzAttrack.URL_TOKEN_WHITELIST,
            function success(req){
                CliqzUtils.flot('SUCESS '+ req);
                CliqzAttrack.tokenExtWhitelist = JSON.parse(req.response);
            },
            function error(ee) {
                CliqzUtils.log('FAILURE ' + ee);
                CliqzAttrack.tokenExtWhitelist = {};
            });
        */

        //
        // load history
        //

        /*
        if (CliqzAttrack.cacheHist==null) {

            CliqzAttrack.cacheHist = {};
            CliqzAttrack.cacheHistDom = {};

            if ( FileUtils.getFile("ProfD", ["cliqz.db"]).exists() ) {
                var db = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.db"]));
                var sql = "SELECT url from visits";
                var st = db.createAsyncStatement(sql);
                st.executeAsync({
                    handleResult: function(aResultSet) {
                        var resultCount = 0;
                        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                            //this.onRow(st.row);
                            var u = row.getResultByName("url");

                            var curl = u.replace(/^https?:\/\//,'').replace(/^www\./,'');
                            if (CliqzAttrack.cacheHist[curl]==null) CliqzAttrack.cacheHist[curl] = {};
                            CliqzAttrack.cacheHist[curl]['h1'] = true;

                            var curl = curl.split('/')[0];
                            if (CliqzAttrack.cacheHistDom[curl]==null) CliqzAttrack.cacheHistDom[curl] = {};
                            CliqzAttrack.cacheHistDom[curl]['h1'] = true;

                        }
                    },
                    handleError: function(aError) {
                        CliqzUtils.log("Error (" + aError.result + "):" + aError.message, CliqzAttrack.LOG_KEY);
                    },
                    handleCompletion: function(aReason) {
                        // Always called when done
                    }
                });
                st.finalize();
            }

            if ( FileUtils.getFile("ProfD", ["places.sqlite"]).exists() ) {

                var db = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["places.sqlite"]));
                var sql = "SELECT url from moz_places";
                var st = db.createAsyncStatement(sql);
                st.executeAsync({
                    handleResult: function(aResultSet) {
                        var resultCount = 0;
                        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                            //this.onRow(st.row);
                            var u = row.getResultByName("url");

                            var curl = u.replace(/^https?:\/\//,'').replace(/^www\./,'');
                            if (CliqzAttrack.cacheHist[curl]==null) CliqzAttrack.cacheHist[curl] = {};
                            CliqzAttrack.cacheHist[curl]['h2'] = true;

                            var curl = curl.split('/')[0];
                            if (CliqzAttrack.cacheHistDom[curl]==null) CliqzAttrack.cacheHistDom[curl] = {};
                            CliqzAttrack.cacheHistDom[curl]['h2'] = true;

                        }
                    },
                    handleError: function(aError) {
                        CliqzUtils.log("Error (" + aError.result + "):" + aError.message, CliqzAttrack.LOG_KEY);
                    },
                    handleCompletion: function(aReason) {
                        // Always called when done
                    }
                });
                st.finalize();
            }
        }
        */

    },
    checkInstalledAddons: function() {
        CliqzAttrack.similarAddon = false;
        if (genericPrefs.prefHasUserValue('network.cookie.cookieBehavior')) {
            CliqzAttrack.similarAddon = 'Firefox';
        }
        AddonManager.getAllAddons(function(aAddons) {
            aAddons.forEach(function(a) {
                if (a.isActive === true && a.name in CliqzAttrack.similarAddonNames){
                    if (CliqzAttrack.similarAddon == false) {
                        CliqzAttrack.similarAddon = a.name;
                    } else {
                        CliqzAttrack.similarAddon = true;
                    }
                }
            });
        });
        // count the number of observers
        ['http-on-modify-request', 'http-on-opening-request', 'http-on-examine-response', 'http-on-examine-cached-response', 'http-on-examine-merged-response'].forEach(
            function(x) {
                var obs = CliqzAttrack.observerService.enumerateObservers(x),
                    counter = 0;
                while (obs.hasMoreElements()) {
                    counter += 1;
                    obs.getNext();
                }
                CliqzAttrack.obsCounter[x] = counter;
            });
    },
    sendState: function() {

        if (CliqzAttrack.state) {
            var tmp = CliqzAttrack.state;

            var keys = Object.keys(CliqzAttrack.state);

            // send the records one by one to avoid building sessions server side,
            //
            for(var i=0;i<keys.length;i++) {
                var payl = {'data': {}, 'ver': CliqzAttrack.VERSION};

                var tmp = {};
                var k2 = Object.keys(CliqzAttrack.state[keys[i]]);
                for(var j=0;j<k2.length;j++) tmp[k2[j]] = CliqzAttrack.state[keys[i]][k2[j]]['c'];

                payl['data'][keys[i]] = CliqzAttrack.state[keys[i]];
                CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.cookie.network', 'payload': payl});
            }

            // reset the state
            CliqzAttrack.state = {};
            CliqzAttrack.saveState();

        }

    },
    sendTokens: function() {
        var payl;
        if (CliqzAttrack.tokens) {
            payl = {'data': CliqzAttrack.tokens, 'ver': CliqzAttrack.VERSION, 'ts': CliqzAttrack.tokensLastSent, 'anti-duplicates': Math.floor(Math.random() * 10000000), 'whitelist': CliqzAttrack.tokenWhitelistVersion, 'safeKey': CliqzAttrack.safeKeyExtVersion};

            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.tokens', 'payload': payl});

            // reset the state
            CliqzAttrack.tokens = {};
            CliqzAttrack.saveTokens();
        }

        // send also safe keys
        if (CliqzAttrack.safeKey) {
            CliqzAttrack.saveSafeKey();
            // get only keys from local key
            var day = CliqzAttrack.getTime().substring(0, 8);
            var dts = {}, local = {}, localE = 0, s, k;
            for (s in CliqzAttrack.safeKey) {
                for (k in CliqzAttrack.safeKey[s]) {
                    if (CliqzAttrack.safeKey[s][k][1] == 'l') {
                        if (!local[s]) {
                            local[s] = {};
                            localE ++;
                        }
                        local[s] = CliqzAttrack.safeKey[s][k];
                        if (CliqzAttrack.safeKey[s][k][0] == day) {
                            if (!dts[s]) dts[s] = {};
                            dts[s][k] = CliqzAttrack.safeKey[s][k][0];
                        }
                    }
                }
            }
            payl = {'data': dts, 'ver': CliqzAttrack.VERSION, 'ts': CliqzAttrack.tokensLastSent, 'anti-duplicates': Math.floor(Math.random() * 10000000), 'safeKey': CliqzAttrack.safeKeyExtVersion, 'localElement': localE, 'localSize':JSON.stringify(local).length, 'whitelist': CliqzAttrack.tokenWhitelistVersion};
            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.safekey', 'payload': payl});
        }
        // send block list
        if (CliqzAttrack.blocked) {
            payl = {'data': CliqzAttrack.blocked, 'ver': CliqzAttrack.VERSION, 'ts': CliqzAttrack.tokensLastSent, 'anti-duplicates': Math.floor(Math.random() * 10000000), 'whitelist': CliqzAttrack.tokenWhitelistVersion, 'safeKey': CliqzAttrack.safeKeyExtVersion};

            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.blocked', 'payload': payl});

            // reset the state
            CliqzAttrack.blocked = {};
            CliqzAttrack.saveBlocked();
        }
    },
    /*
    sendHistStats: function() {
        if (CliqzAttrack.cacheHistStats) {

            var v = {'nh': CliqzAttrack.cacheHistStats, 'h': {}};

            v['h']['url'] = {'h': 0, 'h1': 0, 'h2': 0, 'h3': 0};
            v['h']['dom'] = {'h': 0, 'h1': 0, 'h2': 0, 'h3': 0};

            var w = Object.keys(CliqzAttrack.cacheHist);
            v['h']['url']['h'] = w.length;
            for(var i=0;i<w.length;i++) {
                var w2 = Object.keys(CliqzAttrack.cacheHist[w[i]]);
                for (var j=0;j<w2.length;j++) v['h']['url'][w2[j]] += 1;
            }

            var w = Object.keys(CliqzAttrack.cacheHistDom);
            v['h']['dom']['h'] = w.length;

            for(var i=0;i<w.length;i++) {
                var w2 = Object.keys(CliqzAttrack.cacheHistDom[w[i]]);
                for (var j=0;j<w2.length;j++) v['h']['dom'][w2[j]] += 1;
            }

            var payl = {'data': v, 'ver': CliqzAttrack.VERSION, 'ts': CliqzAttrack.histLastSent, 'anti-duplicates': Math.floor(Math.random() * 10000000)};

            CliqzUtils.log(">>>>>>> " + JSON.stringify(payl));
            //CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.hist_stats', 'payload': payl});

            //CliqzAttrack.saveHistStats();
        }

    },*/
    sendStateIfNeeded: function() {
        var timestamp = CliqzHumanWeb.getTime().slice(0,8);
        // day resolution,

        if (timestamp != CliqzAttrack.stateLastSent) {

            // it's not the same timestamp (day) of the last time that was sent
            // or the first install (defaults to current timestamp)

            CliqzAttrack.stateLastSent = timestamp;
            CliqzAttrack.saveStateLastSent();

            // CliqzAttrack.sendState();

            // load remote safe key & token whitelist
            CliqzAttrack.loadRemoteWhitelists();
        }
    },
    sendTokensIfNeeded: function() {
        var timestamp = CliqzHumanWeb.getTime().slice(0,10);
        // hour resolution,

        if (timestamp != CliqzAttrack.tokensLastSent) {

            // it's not the same timestamp (hour) of the last time that was sent
            // or the first install (defaults to current timestamp)

            CliqzAttrack.tokensLastSent = timestamp;
            CliqzAttrack.saveTokensLastSent();

            CliqzAttrack.sendTokens();
        }
    },
    applyWhitelistFixtures: function() {
        //CliqzAttrack.whitelist['mail.google.com'] = true;
        // CliqzAttrack.whitelist['googleapis.com'] = true;
    },
    saveWhitelist: function() {
        if (!CliqzAttrack.whitelist) return;
        CliqzAttrack.saveRecord('whitelist', JSON.stringify(CliqzAttrack.whitelist));
    },
    loadWhitelist: function() {
        CliqzAttrack.loadRecord('whitelist', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.whitelist", CliqzAttrack.LOG_KEY);
                CliqzAttrack.whitelist = {};
            }
            else CliqzAttrack.whitelist= JSON.parse(data);

            CliqzAttrack.applyWhitelistFixtures();

        });
    },
    saveState: function() {
        if (!CliqzAttrack.state) return;
        CliqzAttrack.saveRecord('state', JSON.stringify(CliqzAttrack.state));
    },
    loadState: function() {
        CliqzAttrack.loadRecord('state', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.state", CliqzAttrack.LOG_KEY);
                CliqzAttrack.state = {};
            }
            else {
                try {
                    CliqzAttrack.state = JSON.parse(data);
                } catch(ee) {
                    CliqzAttrack.state = {};
                }
            }
        });
    },
    saveTokens: function() {
        if (CliqzAttrack.tokens)
            CliqzAttrack.saveRecord('tokens', JSON.stringify(CliqzAttrack.tokens));
    },
    saveBlocked: function() {
        if (CliqzAttrack.blocked)
            CliqzAttrack.saveRecord('blocked', JSON.stringify(CliqzAttrack.blocked));
    },
    loadQSStats: function() {
        CliqzAttrack.loadRecord('QSStats', function(data) {
            if (data == null) {
                CliqzAttrack.QSStats = {};
            } else {
                try {
                    CliqzAttrack.QSStats = JSON.parse(data);
                } catch(e) {
                    CliqzAttrack.QSStats = {};
                }
            }
        });
    },
    saveQSStats: function() {
        if (!CliqzAttrack.QSStats) return;
        CliqzAttrack.saveRecord('QSStats', JSON.stringify(CliqzAttrack.QSStats));
    },
    newUTCDate: function() {
        var dayHour = CliqzAttrack.getTime();
        return new Date(Date.UTC(dayHour.substring(0, 4),
                                 parseInt(dayHour.substring(4, 6)) - 1,
                                 dayHour.substring(6, 8),
                                 dayHour.substring(8, 10)));
    },
    saveSafeKey: function() {
        var day = CliqzAttrack.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff = CliqzAttrack.dateString(day);
        for (var s in CliqzAttrack.safeKey) {
            for (var key in CliqzAttrack.safeKey[s]) {
                if (CliqzAttrack.safeKey[s][key][0] < dayCutoff) {
                    delete CliqzAttrack.safeKey[s][key];
                }
            }
            if (Object.keys(CliqzAttrack.safeKey[s]).length == 0) {
                delete CliqzAttrack.safeKey[s];
            }
        }
        if (CliqzAttrack.safeKey)
            CliqzAttrack.saveRecord('safeKey', JSON.stringify(CliqzAttrack.safeKey));
        if (CliqzAttrack.safeKeyExtVersion)
            CliqzAttrack.saveRecord('safeKeyExtVersion', CliqzAttrack.safeKeyExtVersion);
        if (CliqzAttrack.lastUpdate)
            CliqzAttrack.saveRecord('lastUpdate', JSON.stringify(CliqzAttrack.lastUpdate));
        CliqzAttrack.saveRequestKeyValue();
        CliqzAttrack.saveTokenDomain();
    },
    saveLocalTokenStats: function() {
        CliqzAttrack.cleanLocalBlocked();
        ['localBlocked', 'checkedToken', 'loadedPage', 'blockedToken'].forEach(
            function(x) {
                if (CliqzAttrack[x])
                    CliqzAttrack.saveRecord(x, JSON.stringify(CliqzAttrack[x]));
            }
        );
        CliqzAttrack.saveRecord('wrongTokenLastSent', CliqzAttrack.wrongTokenLastSent);
    },
    saveTokenDomain: function() {
        var day = CliqzAttrack.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff = CliqzAttrack.dateString(day);
        CliqzUtils.log(dayCutoff);
        for (var tok in CliqzAttrack.tokenDomain) {
            for (var s in CliqzAttrack.tokenDomain[tok]) {
                if (CliqzAttrack.tokenDomain[tok][s] < dayCutoff) {
                    delete CliqzAttrack.tokenDomain[tok][s];
                }
            }
            if (Object.keys(CliqzAttrack.tokenDomain[tok]).length == 0) {
                delete CliqzAttrack.tokenDomain[tok];
            }
        }
        if (CliqzAttrack.tokenDomain)
            CliqzAttrack.saveRecord('tokenDomain', JSON.stringify(CliqzAttrack.tokenDomain));
    },
    saveRequestKeyValue: function() {
        var day = CliqzAttrack.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff  = CliqzAttrack.dateString(day);
        for (var s in CliqzAttrack.requestKeyValue) {
            for (var key in CliqzAttrack.requestKeyValue[s]) {
                for (var tok in CliqzAttrack.requestKeyValue[s][key]) {
                    if (CliqzAttrack.requestKeyValue[s][key][tok] < dayCutoff) {
                        delete CliqzAttrack.requestKeyValue[s][key][tok];
                    }
                }
                if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length == 0) {
                    delete CliqzAttrack.requestKeyValue[s][key];
                }
            }
            if (Object.keys(CliqzAttrack.requestKeyValue[s]).length == 0) {
                delete CliqzAttrack.requestKeyValue[s];
            }
        }
        if (!CliqzAttrack.requestKeyValue) return;
        CliqzAttrack.saveRecord('requestKeyValue', JSON.stringify(CliqzAttrack.requestKeyValue));
    },
    saveTokenWhitelist: function() {
        CliqzAttrack.saveRecord('tokenExtWhitelist', JSON.stringify(CliqzAttrack.tokenExtWhitelist));
    },
    cleanLocalBlocked: function() {
        var delay = CliqzAttrack.localBlockExpire,
            hour = CliqzAttrack.newUTCDate();
        hour.setHours(hour.getHours() - delay);
        var hourCutoff = CliqzAttrack.hourString(hour);
        // localBlocked
        for (var source in CliqzAttrack.localBlocked) {
            for (var s in CliqzAttrack.localBlocked[source]) {
                for (var k in CliqzAttrack.localBlocked[source][s]) {
                    for (var v in CliqzAttrack.localBlocked[source][s][k]) {
                        for (var h in CliqzAttrack.localBlocked[source][s][k][v]) {
                            if (h < hourCutoff)
                                delete CliqzAttrack.localBlocked[source][s][k][v][h];
                        }
                        if (Object.keys(CliqzAttrack.localBlocked[source][s][k][v]).length == 0)
                            delete CliqzAttrack.localBlocked[source][s][k][v];
                    }
                    if (Object.keys(CliqzAttrack.localBlocked[source][s][k]).length == 0)
                        delete CliqzAttrack.localBlocked[source][s][k];
                }
                if (Object.keys(CliqzAttrack.localBlocked[source][s]).length == 0)
                    delete CliqzAttrack.localBlocked[source][s];
            }
            if (Object.keys(CliqzAttrack.localBlocked[source]).length == 0)
                delete CliqzAttrack.localBlocked[source];
        }
        // checkedToken
        for (var h in CliqzAttrack.checkedToken)
            if (h < hourCutoff) delete CliqzAttrack.checkedToken[h];
        for (var h in CliqzAttrack.loadedPage)
            if (h < hourCutoff) delete CliqzAttrack.loadedPage[h];
    },
    _updated: {},
    updateExpire: 48,
    lastUpdate: null,
    updatedInTime: function() {
        var delay = CliqzAttrack.updateExpire,
            hour = CliqzAttrack.newUTCDate();
        hour.setHours(hour.getHours() - delay);
        var hourCutoff = CliqzAttrack.hourString(hour);
        if (CliqzAttrack.lastUpdate[0] > hourCutoff &&
            CliqzAttrack.lastUpdate[1] > hourCutoff)
            return true;
        return false;
    },
    checkWrongToken: function(key) {
        CliqzAttrack.cleanLocalBlocked();
        // send max one time a day
        var day = CliqzAttrack.getTime().slice(0, 8);
        if (CliqzAttrack.wrongTokenLastSent == day) return;  // max one signal per day
        CliqzAttrack._updated[key] = true;
        if (!('safeKey' in CliqzAttrack._updated) || (!('token' in CliqzAttrack._updated))) return;  // wait until both lists are updated
        var countLoadedPage = 0,
            countCheckedToken = 0,
            countBlockedToken = 0,
            countWrongToken = 0,
            countWrongPage = 0;

        for (var source in CliqzAttrack.localBlocked) {
            var _wrongSource = true;
            for (var s in CliqzAttrack.localBlocked[source]) {
                for (var k in CliqzAttrack.localBlocked[source][s]) {
                    for (var v in CliqzAttrack.localBlocked[source][s][k]) {
                        if (!(s in CliqzAttrack.tokenExtWhitelist) ||
                            (s in CliqzAttrack.safeKey && k in CliqzAttrack.safeKey[s]) ||
                            (s in CliqzAttrack.tokenExtWhitelist && v in CliqzAttrack.tokenExtWhitelist[s])) {
                            for (var h in CliqzAttrack.localBlocked[source][s][k][v]) {
                                countWrongToken += CliqzAttrack.localBlocked[source][s][k][v][h];
                                CliqzAttrack.localBlocked[source][s][k][v][h] = 0;
                            }
                        }
                        else
                            _wrongSource = false;
                    }
                }
            }
            if (_wrongSource) countWrongPage++;
        }
        // send signal
        // sum checkedToken & blockedToken
        for (var h in CliqzAttrack.checkedToken) countCheckedToken += CliqzAttrack.checkedToken[h];
        for (var h in CliqzAttrack.blockedToken) countBlockedToken += CliqzAttrack.blockedToken[h];
        for (var h in CliqzAttrack.loadedPage) countLoadedPage += CliqzAttrack.loadedPage[h];

        var payl = {'data': {'wrongToken': countWrongPage,
                             'checkedToken': countCheckedToken,
                             'blockedToken': countBlockedToken,
                             'wrongPage': countWrongPage,
                             'loadedPage': countLoadedPage
                            },
                    'ver': CliqzAttrack.VERSION,
                    'ts': CliqzAttrack.tokensLastSent,
                    'anti-duplicates': Math.floor(Math.random() * 10000000),
                    'whitelist': CliqzAttrack.tokenWhitelistVersion,
                    'safeKey': CliqzAttrack.safeKeyExtVersion
                   };
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.FP', 'payload': payl});
        CliqzAttrack.wrongTokenLastSent = day;
        CliqzAttrack._updated = {};
    },
    loadRemoteWhitelists: function() {
        CliqzUtils.httpGet(CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK, function(req) {
            // on load
            var versioncheck = JSON.parse(req.response);
            // new version available
            if(versioncheck['safekey_version'] != CliqzAttrack.safeKeyExtVersion) {
                if (CliqzAttrack.debug) CliqzUtils.log("New version of CliqzAttrack.safeKey available ("+ CliqzAttrack.safeKeyExtVersion +" -> "+ versioncheck['safekey_version'] +")", "attrack");
                if(versioncheck['force_clean'] == true) {
                    if (CliqzAttrack.debug) CliqzUtils.log("Force clean CliqzAttrack.safeKey", "attrack");
                    CliqzAttrack.safeKey = {};
                    CliqzAttrack.requestKeyValue = {};
                    CliqzAttrack.saveSafeKey();
                    CliqzAttrack.saveRequestKeyValue();
                }
                CliqzAttrack.loadRemoteSafeKey();
            } else {
                if (CliqzAttrack.debug) CliqzUtils.log("CliqzAttrack.safeKey version up-to-date", "attrack");
            }
            if(versioncheck['token_whitelist_version'] != CliqzAttrack.tokenWhitelistVersion) {
                if (CliqzAttrack.debug) CliqzUtils.log("New version of CliqzAttrack.tokenExtWhitelist available ("+ CliqzAttrack.tokenWhitelistVersion +" -> "+ versioncheck['token_whitelist_version'] +")", "attrack");
                CliqzAttrack.loadRemoteTokenWhitelist();
            } else {
                if (CliqzAttrack.debug) CliqzUtils.log("CliqzAttrack.tokenExtWhitelist version up-to-date", "attrack");
            }
            if ('obfuscateMethod' in versioncheck) CliqzAttrack.obfuscateMethod = versioncheck['obfuscateMethod'];
            if ('replacement' in versioncheck) CliqzAttrack.replacement = versioncheck['replacement'];
        }, function() {
            // on error: just try and load anyway
            if (CliqzAttrack.debug) CliqzUtils.log("error checking token list versions", "attrack");
            CliqzAttrack.loadRemoteTokenWhitelist();
            CliqzAttrack.loadRemoteSafeKey();
        }, 10000);
    },
    loadBlockRules: function() {
        CliqzAttrack.qsBlockRule = [];
        CliqzUtils.loadResource(CliqzAttrack.URL_BLOCK_RULES, function(req) {
            try {
                CliqzAttrack.qsBlockRule = JSON.parse(req.response);
            } catch(e) {
                CliqzAttrack.qsBlockRule = [];
            }
        });
    },
    loadReportLists: function() {
        CliqzAttrack.blcokReportList = {};
        CliqzUtils.loadResource(CliqzAttrack.URL_BLOCK_REPROT_LIST, function(req) {
            try {
                CliqzAttrack.blockReportList = JSON.parse(req.response);
            } catch(e) {
                CliqzAttrack.blcokReportList = {};
            }
        });
    },
    loadRemoteTokenWhitelist: function() {
        CliqzUtils.httpGet(
            CliqzAttrack.URL_TOKEN_WHITELIST,
            function(req){
                CliqzAttrack.tokenExtWhitelist = JSON.parse(req.response);
                CliqzAttrack.tokenWhitelistVersion = md5(req.response);
                CliqzAttrack.saveTokenWhitelist();
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded new whitelist version "+ CliqzAttrack.tokenWhitelistVersion, "attrack");
                CliqzAttrack.checkWrongToken('token');
                CliqzAttrack.lastUpdate[1] = CliqzAttrack.getTime();
            },
            function() {},
            10000);
    },
    loadRemoteSafeKey: function() {
        CliqzUtils.httpGet(
            CliqzAttrack.URL_SAFE_KEY,
            function(req) {
                var safeKey = JSON.parse(req.response),
                    s, k;
                for (s in safeKey) {
                    for (k in safeKey[s]) {
                        // r for remote keys
                        safeKey[s][k] = [safeKey[s][k], 'r'];
                    }
                }
                CliqzAttrack.safeKeyExtVersion = md5(req.response);
                for (s in safeKey) {
                    if (!(s in CliqzAttrack.safeKey)) {
                        CliqzAttrack.safeKey[s] = safeKey[s];
                    } else {
                        for (var key in safeKey[s]) {
                            if (CliqzAttrack.safeKey[s][key] == null ||
                                CliqzAttrack.safeKey[s][key][0] < safeKey[s][key][0])
                                CliqzAttrack.safeKey[s][key] = safeKey[s][key];
                        }
                    }
                }
                CliqzAttrack.saveSafeKey();
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded new safekey version "+ CliqzAttrack.safeKeyExtVersion, "attrack");
                CliqzAttrack.checkWrongToken('safeKey');
                CliqzAttrack.lastUpdate[0] = CliqzAttrack.getTime();
            },
            function() {
                // on error
            }, 10000
        );
    },
    loadTokenWhitelist: function() {
        CliqzAttrack.tokenExtWhitelist = {};
        CliqzAttrack.loadRecord('tokenExtWhitelist', function(data) {
            if (data == null) return;
            try {
                CliqzAttrack.tokenExtWhitelist = JSON.parse(data);
                CliqzAttrack.tokenWhitelistVersion = md5(data);
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded existing token whitelist version "+ CliqzAttrack.tokenWhitelistVersion, "attrack");
            } catch(e) {
                CliqzAttrack.tokenExtWhitelist = {};
                CliqzAttrack.tokenWhitelistVersion = null;
                if (CliqzAttrack.debug) CliqzUtils.log("Error parsing new whitelist "+ e, "attrack");
            }
        });
    },
    loadRecordSameName: function(name) {
        CliqzAttrack[name] = {};
        CliqzAttrack.loadRecord(name, function(data) {
            if (data == null)
                CliqzAttrack[name] = {};
            try {
                CliqzAttrack[name] = JSON.parse(data);
            } catch(e) {
                CliqzAttrack[name] = {};
            }
            if (!CliqzAttrack[name]) CliqzAttrack[name] = {};
        });
    },
    loadLocalTokenStats: function() {
        var _localDataList = ['localBlocked', 'checkedToken', 'loadedPage', 'blockedToken'];
        _localDataList.forEach(CliqzAttrack.loadRecordSameName);
        CliqzAttrack.loadRecord('wrongTokenLastSent', function(data) {
            if (data == null) {
                CliqzAttrack.wrongTokenLastSent = CliqzAttrack.getTime().slice(0, 8);
            } else
                CliqzAttrack.wrongTokenLastSent = data;
        });
    },
    loadTokenDomain: function() {
        CliqzAttrack.tokenDomain = {};
        CliqzAttrack.loadRecord('tokenDomain', function(data) {
            if (data == null) {
                CliqzAttrack.tokenDomain = {};
            } else {
                try {
                    CliqzAttrack.tokenDomain = JSON.parse(data);
                } catch(e) {
                    CliqzAttrack.tokenDomain = {};
                }
            }
        });
    },
    loadSafeKey: function() {
        CliqzAttrack.safeKey = {}; // set empty value first, loading takes a while
        CliqzAttrack.safeKeyExtVersion = null;
        CliqzAttrack.lastUpdate = ['0', '0'];
        CliqzAttrack.loadRecord('lastUpdate', function(data) {
            if (data == null) {
                CliqzAttrack.lastUpdate = ['0', '0'];
            } else {
                try {
                    CliqzAttrack.lastUpdate = JSON.parse(data);
                } catch (e) {
                    CliqzAttrack.lastUpdate = ['0', '0'];
                }
            }
        });
        CliqzAttrack.loadRecord('safeKey', function(data) {
            if (data == null) {
                CliqzAttrack.safeKey = {};
            } else {
                try {
                    CliqzAttrack.safeKey = JSON.parse(data);
                } catch(e) {
                    CliqzAttrack.safeKey = {};
                }
                // safeKey should be stored as md5, if not, clean the cache
                for (var k in CliqzAttrack.safeKey) {
                    if (k.length != 16) {
                        if (CliqzAttrack.debug) CliqzUtils.log('Cleaning unhashed data', 'attrack');
                        CliqzAttrack.safeKey = {};
                        CliqzAttrack.saveSafeKey();
                        break;
                    }
                    for (var kk in CliqzAttrack.safeKey[k]) {
                        if (CliqzAttrack.safeKey[k][kk].length != 2) {
                            if (CliqzAttrack.debug) CliqzUtils.log('Cleaning data without source', 'attrack');
                            CliqzAttrack.safeKey = {};
                            CliqzAttrack.saveSafeKey();
                            break;
                        }
                    }
                }
            }
        });
        // load remote safeKey
        CliqzAttrack.loadRecord('safeKeyExtVersion', function(data) {
            if (data != null)
                CliqzAttrack.safeKeyExtVersion = data;
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded existing safekey version "+ CliqzAttrack.safeKeyExtVersion, "attrack");
            CliqzAttrack.loadRemoteWhitelists();
        });
    },
    loadRequestKeyValue: function() {
        CliqzAttrack.requestKeyValue = {};
        CliqzAttrack.loadRecord('requestKeyValue', function(data) {
            if (data == null) {
                CliqzAttrack.requestKeyValue = {};
            } else {
                try {
                    CliqzAttrack.requestKeyValue = JSON.parse(data);
                } catch(e) {
                    CliqzAttrack.requestKeyValue = {};
                }
                for (var k in CliqzAttrack.requestKeyValue) {
                    if (k.length != 16) {
                        CliqzAttrack.requestKeyValue = {};
                        CliqzAttrack.saveRequestKeyValue();
                        return;
                    }
                }
            }
        });
    },
    loadTokens: function() {
        CliqzAttrack.loadRecord('tokens', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.tokens", CliqzAttrack.LOG_KEY);
                CliqzAttrack.tokens = {};
            }
            else {
                try {
                    CliqzAttrack.tokens = JSON.parse(data);
                } catch(ee) {
                    CliqzAttrack.tokens = {};
                }
            }
        });
    },
    loadBlocked: function() {
        CliqzAttrack.loadRecord('blocked', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.blocked", CliqzAttrack.LOG_KEY);
                CliqzAttrack.blocked = {};
            }
            else {
                try {
                    CliqzAttrack.blocked = JSON.parse(data);
                } catch(ee) {
                    CliqzAttrack.blocked = {};
                }
            }
        });
    },
    saveStateLastSent: function() {
        CliqzAttrack.saveRecord('state_last_send', CliqzAttrack.stateLastSent);
    },
    loadStateLastSent: function() {
        CliqzAttrack.loadRecord('state_last_send', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.stateLastSent", CliqzAttrack.LOG_KEY);
                CliqzAttrack.stateLastSent = CliqzHumanWeb.getTime().slice(0,8);
                CliqzAttrack.saveStateLastSent();
            }
            else CliqzAttrack.stateLastSent = data;
        });
    },
    saveTokensLastSent: function() {
        CliqzAttrack.saveRecord('tokens_last_send', CliqzAttrack.tokensLastSent);
    },
    loadTokensLastSent: function() {
        CliqzAttrack.loadRecord('tokens_last_send', function(data) {
            if (data==null) {
                if (CliqzAttrack.debug) CliqzUtils.log("There was no data on CliqzAttrack.tokensLastSent", CliqzAttrack.LOG_KEY);
                CliqzAttrack.tokensLastSent = CliqzHumanWeb.getTime().slice(0,10);
                CliqzAttrack.saveTokensLastSent();
            }
            else CliqzAttrack.tokensLastSent = data;
        });
    },
    saveRecord: function(id, data) {
        if(!(CliqzAttrack.dbConn)) return;
        var st = CliqzAttrack.dbConn.createStatement("INSERT OR REPLACE INTO attrack (id,data) VALUES (:id, :data)");
        st.params.id = id;
        st.params.data = data;

        st.executeAsync({
            handleError: function(aError) {
                if(CliqzAttrack && CliqzAttrack.debug){
                    if (CliqzAttrack.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzAttrack.LOG_KEY);
                }
            },
            handleCompletion: function(aReason) {
                if(CliqzAttrack && CliqzAttrack.debug){
                    if (CliqzAttrack.debug) CliqzUtils.log("Insertion success", CliqzAttrack.LOG_KEY);
                }
            }
        });

    },
    loadRecord: function(id, callback) {
        var stmt = CliqzAttrack.dbConn.createAsyncStatement("SELECT id, data FROM attrack WHERE id = :id;");
        stmt.params.id = id;

        var fres = null;
        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                if(!(CliqzAttrack)) return;
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    if (row.getResultByName("id")==id) {
                        res.push(row.getResultByName("data"));
                    }
                    else {
                        if (CliqzAttrack.debug) CliqzUtils.log("There are more than one record", CliqzAttrack.LOG_KEY);
                        callback(null);
                    }
                    break;
                }
            },
            handleError: function(aError) {
                if(!(CliqzAttrack)) return;
                if (CliqzAttrack.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzAttrack.LOG_KEY);
                callback(null);
            },
            handleCompletion: function(aReason) {
                if(!(CliqzAttrack)) return;
                if (res.length == 1) callback(res[0]);
                else callback(null);
            }
        });
    },
    initAtBrowser: function(){
        if (CliqzAttrack.debug) CliqzUtils.log("InitAtBrowser attrack");
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpmodObserver, "http-on-modify-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpopenObserver, "http-on-opening-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-response", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-cached-response", false);
    },
    // ****************************
    // telemetry, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    telemetry: function(msg, instantPush) {
        if (!CliqzAttrack || //might be called after the module gets unloaded
            CliqzUtils.getPref('dnt', false) ||
            CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

        msg.ver = CliqzAttrack.VERSION;
        if (msg) CliqzAttrack.trk.push(msg);

        CliqzUtils.clearTimeout(CliqzAttrack.trkTimer);
        if(instantPush || CliqzAttrack.trk.length % 100 == 0){
            CliqzAttrack.pushTelemetry();
        } else {
            CliqzAttrack.trkTimer = CliqzUtils.setTimeout(CliqzAttrack.pushTelemetry, 60000);
        }

    },
    _telemetry_req: null,
    _telemetry_sending: [],
    _telemetry_start: undefined,
    telemetry_MAX_SIZE: 500,
    previousDataPost: null,
    pushTelemetry: function() {
        if(CliqzAttrack._telemetry_req) return;


        CliqzAttrack._telemetry_sending = CliqzAttrack.trk.splice(0);
        CliqzAttrack._telemetry_start = (new Date()).getTime();
        var data = JSON.stringify(CliqzAttrack._telemetry_sending);
        if (data.length > 10) {
            if (CliqzAttrack.previousDataPost && data ==CliqzAttrack.previousDataPost) {
                // duplicated , send telemetry notification.
                var notificationMsg = {};
                notificationMsg['reason'] = "duplicate payload";
                notificationMsg['payload'] = data;
                CliqzAttrack.notification(notificationMsg);
            }
            CliqzAttrack.previousDataPost = data;
        }
        // CliqzAttrack._telemetry_req = CliqzUtils.httpPost(CliqzUtils.SAFE_BROWSING, CliqzAttrack.pushTelemetryCallback, data, CliqzAttrack.pushTelemetryError);
        // CliqzAttrack.securePushTelemetry(0, CliqzAttrack._telemetry_sending);
    },
    pushTelemetryCallback: function(req){
        try {
            var response = JSON.parse(req.response);
            CliqzAttrack._telemetry_sending = [];
            CliqzAttrack._telemetry_req = null;
        } catch(e){}
    },
    pushTelemetryError: function(req){
        // pushTelemetry failed, put data back in queue to be sent again later
        CliqzAttrack.trk = CliqzAttrack._telemetry_sending.concat(CliqzAttrack.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CliqzAttrack.trk.length - CliqzAttrack.telemetry_MAX_SIZE + 100;
        if(slice_pos > 0){
            CliqzAttrack.trk = CliqzAttrack.trk.slice(slice_pos);
        }

        CliqzAttrack._telemetry_sending = [];
        CliqzAttrack._telemetry_req = null;
    },
    // ************************ Database ***********************
    // Stolen from modules/CliqzHistory
    // *********************************************************
    initDB: function() {
        /*
        // to do a migration
        if ( FileUtils.getFile("ProfD", ["cliqz.dbattack"]).exists() ) {
            if (CliqzAttrack.olddbConn==null) {
                 CliqzAttrack.olddbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattack"]));
            }
            CliqzAttrack.removeTable();
        }
        */

        if ( FileUtils.getFile("ProfD", ["cliqz.dbattrack"]).exists() ) {
            if (CliqzAttrack.dbConn==null) {
                CliqzAttrack.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattrack"]))
            }
            CliqzAttrack.createTable();
        }
        else {
            CliqzAttrack.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbattrack"]));
            CliqzAttrack.createTable();
        }

    },
    dbConn: null,
    outOfABTest: function() {
        (CliqzAttrack.dbConn.executeSimpleSQLAsync || CliqzAttrack.dbConn.executeSimpleSQL)('DROP TABLE attrack;');
    },
    removeTable: function(reason) {
        try{
            (CliqzAttrack.olddbConn.executeSimpleSQLAsync || CliqzAttrack.olddbConn.executeSimpleSQL)('DROP TABLE attrack;');
        }catch(ee){};
    },
    createTable: function(){

            var attrack_table = "create table if not exists attrack(\
                id VARCHAR(24) PRIMARY KEY NOT NULL,\
                data VARCHAR(1000000) \
            )";

            (CliqzAttrack.dbConn.executeSimpleSQLAsync || CliqzAttrack.dbConn.executeSimpleSQL)(attrack_table);
    },
    escapeSQL: function(str) {
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
        switch (char) {
            case "'":
            return "''";
            default:
            return char;
              /*case "\0":
                  return "\\0";
              case "\x08":
                  return "\\b";
              case "\x09":
                  return "\\t";
              case "\x1a":
                  return "\\z";
              case "\n":
                  return "\\n";
              case "\r":
                  return "\\r";
              case "\"":
              case "'":
              case "\\":
              case "%":
                  return "\\"+char; */
          }
        });
    },
    isInWhitelist: function(domain) {
        if(!CliqzAttrack.whitelist) return false;
        var keys = Object.keys(CliqzAttrack.whitelist);
        for(var i=0;i<keys.length;i++) {
            var ind = domain.indexOf(keys[i]);
            if (ind>=0) {
                if ((ind+keys[i].length) == domain.length) return true;
            }
        }
        return false;
    },
    renderQSTraffic: function() {
        var doc = CliqzHumanWeb.getCDByURL('chrome://cliqz/content/query_string_traffic_view.xul');
        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
        if (doc) {
            var curr_time = Date.now();
            var parent = doc.getElementById('blocked');
            var el = doc.createElementNS(XUL_NS, 'vbox');
            for (var i=0; i<el.children.length;i++ ) el.removeChild(el.children[i]);
            for (var i = 0; i < CliqzAttrack.QSTraffic['blocked'].length; i++) {
                var item = CliqzAttrack.QSTraffic['blocked'][i];
                var cont = doc.createElementNS(XUL_NS, 'vbox');
                var l2 = doc.createElementNS(XUL_NS, 'label');
                l2.setAttribute('value', (item['src'] || 'orphan') + ' ==> ' + item['dst'] + '(' + Math.round((curr_time - item.ts)/1000) + ' sec ago' +')');
                cont.appendChild(l2);
                el.appendChild(cont);
            }
            parent.replaceChild(el, parent.children[0]);
            var parent = doc.getElementById('aborted');
            var el = doc.createElementNS(XUL_NS, 'vbox');
            for (var i=0; i<el.children.length;i++ ) el.removeChild(el.children[i]);
            for (var i = 0; i < CliqzAttrack.QSTraffic['aborted'].length; i++) {
                var item = CliqzAttrack.QSTraffic['aborted'][i];
                var cont = doc.createElementNS(XUL_NS, 'vbox');
                var l2 = doc.createElementNS(XUL_NS, 'label');
                l2.setAttribute('value', (item['src'] || 'orphan') + ' ==> ' + item['dst'] + '(' + Math.round((curr_time - item.ts)/1000) + ' sec ago' +')');
                cont.appendChild(l2);
                el.appendChild(cont);
            }
            parent.replaceChild(el, parent.children[0]);
        }
    },
    renderCookieTraffic: function() {

        var doc = CliqzHumanWeb.getCDByURL('chrome://cliqz/content/cookie_traffic_view.xul');

        if (!doc) return;

        var curr_time = (new Date()).getTime();

        var el = doc.getElementById('enabled');

        if (CliqzAttrack.isEnabled()) {
            el.value = "Cliqz AntiTracking enabled, you are protected!";
            el.style.color = "green";
        }
        else {
            el.value = "Cliqz AntiTracking NOT enabled, your browsing activity is being tracked by third-parties, see the cookies!";
            el.style.color = "red";
        }

        var el = doc.getElementById('csent');
        el.value = " (# " + CliqzAttrack.cookieTraffic['csent'] + " allowed) ";

        var el = doc.getElementById('cblocked');
        el.value = " (# " + CliqzAttrack.cookieTraffic['cblocked'] + " blocked) ";


        var XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

        var labels = ['blocked', 'sent'];

        for(var j=0;j<labels.length;j++) {
            var key = labels[j];

            var parent = doc.getElementById(key);

            var el = doc.createElementNS(XUL_NS, 'vbox');

            for(var i=0; i<el.children.length;i++ ) el.removeChild(el.children[i]);
            for(var i=0; i<CliqzAttrack.cookieTraffic[key].length; i++) {
                var item = CliqzAttrack.cookieTraffic[key][i];

                var cont = doc.createElementNS(XUL_NS, 'vbox');

                //var l1 = doc.createElementNS(XUL_NS, 'label');
                //l1.setAttribute('value', Math.round((curr_time - item.ts)/1000) + ' seconds ago');
                //cont.appendChild(l1);

                var l2 = doc.createElementNS(XUL_NS, 'label');
                l2.setAttribute('value', (item['src'] || 'orphan') + ' ==> ' + item['dst'] + ' (' + Math.round((curr_time - item.ts)/1000) + ' sec ago' +')');
                cont.appendChild(l2);

                //var l3 = doc.createElementNS(XUL_NS, 'label');
                //l3.setAttribute('value', item['data']);
                //cont.appendChild(l3);

                el.appendChild(cont);
            }

            parent.replaceChild(el, parent.children[0]);

        }
    },
    assessAlertRules: function(url, doc) {

        // here we have to eval if we should show the alert or not,
        if (CliqzAttrack.debug) CliqzUtils.log("Assess Alert rules for" + url, CliqzAttrack.LOG_KEY);

        if (!CliqzAttrack.isAlertEnabled()) return;

        // do not show alert is anti-tracking is enabled
        // FIXME: this should not be here, it would be a good signal to see if we block all the cookies
        // perhaps send it as a 'hidden' signal
        //
        if (CliqzAttrack.isEnabled()) return;

        var host = CliqzHumanWeb.parseURL(url).hostname;

        if (CliqzAttrack.alertTemplate && !CliqzAttrack.alertAlreadyShown[host]) {
            CliqzUtils.setTimeout(function() {
                if (CliqzAttrack.isAlertEnabled() && CliqzAttrack.trackExamples[url]!=null) {
                    var keys = Object.keys(CliqzAttrack.trackExamples);
                    if (keys.length >= CliqzAttrack.trackExamplesThreshold) {

                        var alert_type = CliqzUtils.getPref('attrackAlertType', 'notification');
                        if (alert_type=='html') {
                            CliqzAttrack.insertAlertHTML(url, doc);
                        }
                        else {
                            CliqzAttrack.insertAlertNotification(url, doc);
                        }
                    }
                    CliqzAttrack.alertAlreadyShown[host] = true;
                }
            }, 2000);
        }

    },
    openListOfVisitsFromNotification: function(url) {
        CliqzUtils.openTabInWindow(CliqzUtils.getWindow(), CliqzAttrack.URL_ALERT_TEMPLATE_2);
        // FIXME: this is super hacky
        CliqzUtils.setTimeout(function() {

            var doc = CliqzHumanWeb.getCDByURL(CliqzAttrack.URL_ALERT_TEMPLATE_2);

            if (url!=null) {

                var ss = Object.keys(CliqzAttrack.trackExamples[url]).join(', ');

                var els = doc.querySelectorAll('.cliqz-anti-tracking-trackers');
                for(var i=0;i<els.length;i++) {
                    els[i].innerHTML = ss;
                }

                var els = doc.querySelectorAll('.cliqz-anti-tracking-url');
                for(var i=0;i<els.length;i++) {
                    els[i].innerHTML = url;
                }

            }
            var el = doc.querySelector('#cliqz-anti-tracking-list-visits-text');
            var str = "";

            var keys = Object.keys(CliqzAttrack.trackExamples);
            for(var i=0;i<Math.min(keys.length, 20);i++) {
                var ss = Object.keys(CliqzAttrack.trackExamples[keys[i]]).join(', ');
                str = str + '<li>Tracked by: <b>' + ss +'</b> ==> ' + keys[i] + '</li>';
            }
            el.innerHTML = str;

            var el = doc.querySelector('#overlay');
            el.style.display = 'block';

        }, 500);

    },
    insertAlertNotification: function(url, doc) {
        try {
            if (CliqzAttrack.debug) CliqzUtils.log("insertAlertNotification for " + url, CliqzAttrack.LOG_KEY);

            var v = Object.keys(CliqzAttrack.trackExamples[url]);

            if (v.length==0) return;

            var verb = '';
            var ss = '';

            if (v.length==1) {
                verb = 'knows';
                ss = v[0];
            }
            else {
                verb = 'know';

                if (v.length==2) {
                    ss = v[0] + ' and ' + v[1];
                }
                else {
                    ss = v.slice(0, v.length-1).join(', ') + ' and ' + v[v.length-1];
                }

            }

            //var ss = Object.keys(CliqzAttrack.trackExamples[url]).join(', ');

            var message = 'You are being tracked! ' + ss + ' ' + verb + ' you visited this site.';
            var box = CliqzUtils.getWindow().gBrowser.getNotificationBox();
            var notification = box.getNotificationWithValue('anti-tracking');

            var continuation = null;

            if (notification) {
                notification.label = message;
            }
            else {
                var buttons = [
                {
                    label: 'More info',
                    //popup: 'blockedPopupOptions',
                    callback: function() {
                        CliqzAttrack.openListOfVisitsFromNotification(url);
                        // continuation = 'To be continued';
                    }
                },
                {
                    label: 'Enable Anti-tracking',
                    //popup: 'blockedPopupOptions',
                    callback: function() {
                        // CliqzUtils.setPref('attrackRemoveTracking', true);
                        CliqzUtils.setPref('attrackBlockCookieTracking', true);
                        continuation = 'Congratulations! You have enabled anti-tracking, you are now protected!';
                    }
                },
                {
                    label: 'Disable Alerts',
                    //popup: 'blockedPopupOptions',
                    callback: function() {
                        CliqzUtils.setPref("attrackAlertEnabled", false);
                        notification = box.getNotificationWithValue('anti-tracking');
                        continuation = 'You will not receive further notifications about anti-tracking';
                    }
                }
                ];


                let priority = box.PRIORITY_WARNING_MEDIUM;
                box.appendNotification(message, 'anti-tracking',
                                       'chrome://cliqzres/content/skin/cliqz_btn.png',
                                        priority, buttons, function(ev) {
                                            if (continuation) {
                                                box.appendNotification(continuation, 'anti-tracking', 'chrome://cliqzres/content/skin/cliqz_btn.png', priority, null, null);
                                                CliqzUtils.setTimeout(function() {
                                                    try {
                                                        if (box) box.removeAllNotifications();
                                                    } catch(ee) {}
                                                }, 3000);
                                            }
                                        });



                if (CliqzAttrack.debug) CliqzUtils.log("added: insertAlertNotification for " + url, CliqzAttrack.LOG_KEY);


            }
        } catch(ee) {
            if (CliqzAttrack.debug) CliqzUtils.log("Error in insertAlertNotification: " + ee, CliqzAttrack.LOG_KEY);

        }


    },
    insertAlertHTML: function(url, doc) {

        var popUp = domParser.parseFromString(CliqzAttrack.alertTemplate, "text/html");
        popUp = popUp.querySelector("body>*");

        var el = popUp.querySelector('#cliqz-anti-tracking-close-alert');
        el.onclick = function() {
            doc.body.removeChild(popUp);
            return false;
        };

        var el = popUp.querySelector('#cliqz-anti-tracking-list-visible');
        el.onclick = function() {
            var el = popUp.querySelector('#cliqz-anti-tracking-list-visible');
            var textel = popUp.querySelector('#cliqz-anti-tracking-list-visits');

            if (textel.style.display != 'block') {
                // it was hidden
                textel.style.display = 'block';
                el.innerHTML = 'Hide list';
            }
            else {
                textel.style.display = 'none';
                el.innerHTML = 'Show list';
            }

            return false;
        }

        var el = popUp.querySelector('#cliqz-anti-tracking-list-visits-text');
        var str = "";

        var keys = Object.keys(CliqzAttrack.trackExamples);
        for(var i=0;i<Math.min(keys.length, 20);i++) {
            var ss = Object.keys(CliqzAttrack.trackExamples[keys[i]]).join(', ');
            str = str + '<li>' + keys[i] + ' Tracked by: <b>' + ss +'</b></li>';
        }
        el.innerHTML = str;


        var ss = Object.keys(CliqzAttrack.trackExamples[url]).join(', ');
        var els = popUp.querySelectorAll('.cliqz-anti-tracking-trackers');
        for(var i=0;i<els.length;i++) {
            els[i].innerHTML = ss;
        }

        var els = popUp.querySelectorAll('.cliqz-anti-tracking-url');
        for(var i=0;i<els.length;i++) {
            els[i].innerHTML = url;
        }


        var el = popUp.querySelector('#cliqz-anti-tracking-stop-alert');
        el.onclick = function() {
            try {
                if (CliqzAttrack.debug) CliqzUtils.log("Disable alerts", CliqzAttrack.LOG_KEY);
                CliqzUtils.setPref("attrackAlertEnabled", false);
                doc.body.removeChild(popUp);

                //FIXME: for some unknown reason the pref is changed but the menu does not reflect the change
                //CliqzUtils.createAttrackMenu(CliqzUtils.getWindow());

                return false;
            } catch(ee) {
                return false;
            }
        },

        CliqzUtils.setTimeout(function() {
            var el = popUp.querySelector('#cliqz-anti-tracking-list-visits');
            if (el.style.display != 'block') {
                doc.body.removeChild(popUp);
                return false;
            }
        }, 7000);

        var fe = doc.querySelector("body>*");
        doc.body.insertBefore(popUp, fe);

        // prevent the exit popup
        var els = doc.createElement("SCRIPT");
        els.innerHTML = "window.onbeforeunload = function () {}";
        doc.body.appendChild(els);
    },
    checkTokens: function(url_parts, source_url, cookievalue, stats, source_url_parts) {
        // bad tokens will still be returned in the same format

        var s = CliqzAttrack.getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        // If it's a rare 3rd party, we don't do the rest
        if (!(s in CliqzAttrack.tokenExtWhitelist)) return [];

        var sourceD = md5(source_url_parts.hostname).substr(0, 16);
        var today = CliqzAttrack.getTime().substr(0, 8);

        if (url_parts['query'].length == 0 && url_parts['parameters'].length == 0) return [];
        var w = url_parts['query_keys'],
            p = url_parts['parameter_keys'],
            tok;

        var badTokens = [];
        var w2 = {};

        // stats keys
        ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted',
         'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold',
         'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken',
         'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold', ].forEach(function(k) {stats[k] = 0;});

        var _countCheck = function(tok) {
            // for token length < 12 and may be not a hash, we let it pass
            if (tok.length < 12 && !CliqzAttrack.isHash(tok))
                return 0;
            // update tokenDomain
            tok = md5(tok);
            if (CliqzAttrack.tokenDomain[tok] === undefined)
                CliqzAttrack.tokenDomain[tok] = {};
            CliqzAttrack.tokenDomain[tok][sourceD] = today;
            return Object.keys(CliqzAttrack.tokenDomain[tok]).length;
        };

        var _incrStats = function(cc, prefix, tok, key, val) {
            if (cc == 0)
                stats['short_no_hash']++;
            else if (cc < CliqzAttrack.tokenDomainCountThreshold)
                stats[prefix+'_newToken']++;
            else {
                _addBlockLog(s, tok, val, prefix);
                badTokens.push(val);
                if (cc == CliqzAttrack.tokenDomainCountThreshold)
                    stats[prefix + '_countThreshold']++;
                stats[prefix]++;
                return true;
            }
            return false;
        };

        var _addBlockLog = function(s, k, v, prefix) {
            k = md5(k);
            v = md5(v);
            if (s in CliqzAttrack.blockReportList &&
                k in CliqzAttrack.blockReportList[s] &&
                v in CliqzAttrack.blockReportList[s][k] ||
                '*' in CliqzAttrack.blockReportList ||
                s in CliqzAttrack.blockReportList && '*' in CliqzAttrack.blockReportList[s] ||
                s in CliqzAttrack.blockReportList && k in CliqzAttrack.blockReportList[s] && '*' in CliqzAttrack.blockReportList[s][k]) {
                if (!(s in CliqzAttrack.blocked)) CliqzAttrack.blocked[s] = {};
                if (!(k in CliqzAttrack.blocked[s])) CliqzAttrack.blocked[s][k] = {};
                if (!(v in CliqzAttrack.blocked[s][k])) CliqzAttrack.blocked[s][k][v] = {};
                if (!(prefix in CliqzAttrack.blocked[s][k][v])) CliqzAttrack.blocked[s][k][v][prefix] = 0;
                CliqzAttrack.blocked[s][k][v][prefix]++;
            }
            // local logging of blocked tokens
            var hour = CliqzAttrack.getTime(),
                source = md5(source_url);

            if (!(source in CliqzAttrack.localBlocked)) CliqzAttrack.localBlocked[source] = {};
            if (!(s in CliqzAttrack.localBlocked[source])) CliqzAttrack.localBlocked[source][s] = {};
            if (!(k in CliqzAttrack.localBlocked[source][s])) CliqzAttrack.localBlocked[source][s][k] = {};
            if (!(v in CliqzAttrack.localBlocked[source][s][k])) CliqzAttrack.localBlocked[source][s][k][v] = {};
            if (!(hour in CliqzAttrack.localBlocked[source][s][k][v])) CliqzAttrack.localBlocked[source][s][k][v][hour] = 0;
            CliqzAttrack.localBlocked[source][s][k][v][hour]++;
        };

        var _checkTokens = function(key, val) {
            var hour = CliqzAttrack.getTime();
            if (!(hour in CliqzAttrack.checkedToken)) CliqzAttrack.checkedToken[hour] = 0;
            CliqzAttrack.checkedToken[hour]++;
            var tok = dURIC(val);
            while (tok != dURIC(tok)) {
                tok = dURIC(tok);
            }

            if (tok.length < 8 || source_url.indexOf(tok) > -1) return;

            // Bad values (cookies)
            for (var c in cookievalue) {
                if ((tok.indexOf(c) > -1 && c.length > 8) || c.indexOf(tok) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same value as cookie ' + val, 'tokk');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'cookie', tok, key, val))
                        return;
                }
            }

            // private value (from js function returns)
            for (var c in CliqzAttrack.privateValues) {
                if ((tok.indexOf(c) > -1 && c.length > 8) || c.indexOf(tok) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same private values ' + val, 'tokk');
                    var cc = _countCheck(tok);
                    if (c != tok) {
                        cc = Math.max(cc, _countCheck(c));
                    }
                    if (_incrStats(cc, 'private', tok, key, val))
                        return;
                }
            }
            var b64 = null;
            try {
                b64 = atob(tok);
            } catch(e) {
            }
            if (b64 != null) {
                for (var c in cookievalue) {
                    if ((b64.indexOf(c) > -1 && c.length > 8) || c.indexOf(b64) > -1) {
                        if (CliqzAttrack.debug) CliqzUtils.log('same value as cookie ' + b64, 'tokk-b64');
                        var cc = _countCheck(tok);
                        if (c != tok) {
                            cc = Math.max(cc, _countCheck(c));
                        }
                        if (_incrStats(cc, 'cookie_b64', tok, key, val))
                            return;
                    }
                }
                for (var c in CliqzAttrack.privateValues) {
                    if (b64.indexOf(c) > -1 && c.length > 8) {
                        if (CliqzAttrack.debug) CliqzUtils.log('same private values ' + b64, 'tokk-b64');
                        var cc = _countCheck(tok);
                        if (c != tok) {
                            cc = Math.max(cc, _countCheck(c));
                        }
                        if (_incrStats(cc, 'private_b64', tok, key, val))
                            return;
                    }
                }
            }


            // Good keys.
            if (CliqzAttrack.safeKey[s] &&
                CliqzAttrack.safeKey[s][md5(key)]) {
                stats['safekey']++;
                return;
            }

            if (source_url.indexOf(tok) == -1) {
                if(!(md5(tok) in CliqzAttrack.tokenExtWhitelist[s])) {
                    var cc = _countCheck(tok);
                    _incrStats(cc, 'qs', tok, key, val);
                } else
                    stats['whitelisted']++;
            }
        };
        // both QS and parameter string
        for (var key in w) {
            _checkTokens(key, w[key]);
        }
        for (var key in p) {
            _checkTokens(key, p[key]);
        }
        // update blockedToken
        var hour = CliqzAttrack.getTime();
        if (!(hour in CliqzAttrack.blockedToken)) CliqzAttrack.blockedToken[hour] = 0;
        CliqzAttrack.blockedToken[hour] += badTokens.length;
        return badTokens;
    },
    checkHeaders: function(url_parts, headers, cookievalue, stats) {
        if (Object.keys(headers).length === 0) return {};
        var s = url_parts.hostname + url_parts.path;
        s = md5(s);
        var badHeaders = {};
        stats['cookie'] = 0;
        for (var key in headers) {
            var tok = headers[key];
            if (headers[key] in cookievalue) {
                badHeaders[key] = tok;
                stats['cookie']++;
                continue;
            }
            if (!(s in CliqzAttrack.tokenExtWhitelist)) continue;

            if (!md5(tok) in CliqzAttrack.tokenExtWhitelist[s])
                badHeaders[key] = tok;
        }
        return badHeaders;
    },
    // examineHeaders: function(url_parts, headers) {
    //     var day = CliqzAttrack.newUTCDate();
    //     var today = CliqzAttrack.dateString(day);
    //     // save appeared tokens with field name
    //     // for headers we should user hostname + path, as etags works on the same resource
    //     var s = url_parts.hostname + url_parts.path;
    //     s = md5(s);
    //     var w = getHeaderMD5(headers);
    //     for (var key in w) {
    //         if (CliqzAttrack.safeKey[s] &&
    //             CliqzAttrack.safeKey[s][key])
    //             continue;
    //         if (CliqzAttrack.requestKeyValue[s] == null)
    //             CliqzAttrack.requestKeyValue[s] = {};
    //         if (CliqzAttrack.requestKeyValue[s][key] == null)
    //             CliqzAttrack.requestKeyValue[s][key] = {};
    //         var tok = w[key];
    //         CliqzAttrack.requestKeyValue[s][key][tok] = today;
    //         // see at least 3 different value until it's safe
    //         if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length > 2) {
    //             if (CliqzAttrack.safeKey[s] == null)
    //                 CliqzAttrack.safeKey[s] = {};
    //             CliqzAttrack.safeKey[s][key] = today;
    //             // keep the last seen token
    //             CliqzAttrack.requestKeyValue[s][key] = {tok: today};
    //         }
    //     }
    // },
    examineTokens: function(url_parts) {
        var day = CliqzAttrack.newUTCDate();
        var today = CliqzAttrack.dateString(day);
        // save appeared tokens with field name
        // mark field name as "safe" if different values appears
        var s = CliqzAttrack.getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        var w = getQSMD5(url_parts['query_keys'], url_parts['parameter_keys']);
        for (var key in w) {
            if (CliqzAttrack.safeKey[s] &&
                CliqzAttrack.safeKey[s][key])
                continue;
            if (CliqzAttrack.requestKeyValue[s] == null)
                CliqzAttrack.requestKeyValue[s] = {};
            if (CliqzAttrack.requestKeyValue[s][key] == null)
                CliqzAttrack.requestKeyValue[s][key] = {};
            var tok = w[key];
            CliqzAttrack.requestKeyValue[s][key][tok] = today;
            // see at least 3 different value until it's safe
            if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length > 2) {
                if (CliqzAttrack.safeKey[s] == null)
                    CliqzAttrack.safeKey[s] = {};
                CliqzAttrack.safeKey[s][key] = [today, 'l'];
                // keep the last seen token
                CliqzAttrack.requestKeyValue[s][key] = {tok: today};
            }
        }
    },
    extractKeyTokens: function(url_parts, refstr) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        var keyTokens = {};
        var w = getQSMD5(url_parts['query_keys'], url_parts['parameter_keys']);
        for (var k in w) {
            var tok = w[k];
            tok = dURIC(dURIC(tok));
            if (tok.length >=8) keyTokens[k] = tok;
        }
        if (Object.keys(keyTokens).length > 0) {
            var s = md5(url_parts.hostname).substr(0, 16);
            refstr = md5(refstr).substr(0, 16);
            CliqzAttrack.saveKeyTokens(s, keyTokens, refstr);
        }
    },
    extractHeaderTokens: function(url_parts, refstr, header) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        var keyTokens = {};
        var w = getHeaderMD5(header);
        for (var k in w) {
            var tok = w[k];
            tok = dURIC(dURIC(tok));
            if (tok.length >=8) keyTokens[k] = tok;
        }
        if (Object.keys(keyTokens).length > 0) {
            var s = md5(url_parts.hostname + url_parts.path);
            refstr = md5(refstr).substr(0, 16);
            CliqzAttrack.saveKeyTokens(s, keyTokens, refstr);
        }
    },
    checkPostReq: function(body, badTokens, cookies) {
        for (var p in CliqzAttrack.privateValues) {
            cookies[p] = true;
        }
        for (var c in cookies) {
            if (c.length < 8) continue;
            var cc = [c, encodeURIComponent(c)];
            for (var i = 0; i < cc.length; i ++) {
                var r = cc[i];
                if (body.indexOf(r) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same-cookie (or private str): ' + r, 'at-post');
                    body = body.replace(r, shuffle(r));
                }
            }
        }
        for (var j = 0; j < badTokens.length; j++) {
            var c = badTokens[j];
            var cc = [c, encodeURIComponent(c)];
            for (var i = 0; i < cc.length; i ++) {
                var r = cc[i];
                if (body.indexOf(r) > -1) {
                    if (CliqzAttrack.debug) CliqzUtils.log('same-bad-token: ' + r, 'at-post');
                    body = body.replace(r, shuffle(r));
                }
            }
        }
        return body;
    },
    saveKeyTokens: function(s, keyTokens, r) {
        // anything here should already be hash
        if (CliqzAttrack.tokens[s] == null) CliqzAttrack.tokens[s] = {};
        if (CliqzAttrack.tokens[s][r] == null) CliqzAttrack.tokens[s][r] = {'c': 0, 'kv': {}};
        CliqzAttrack.tokens[s][r]['c'] =  (CliqzAttrack.tokens[s][r]['c'] || 0) + 1;
        for (var k in keyTokens) {
            var tok = keyTokens[k];
            if (CliqzAttrack.tokens[s][r]['kv'][k] == null) CliqzAttrack.tokens[s][r]['kv'][k] = {};
            if (CliqzAttrack.tokens[s][r]['kv'][k][tok] == null) CliqzAttrack.tokens[s][r]['kv'][k][tok] = 0;
            CliqzAttrack.tokens[s][r]['kv'][k][tok] += 1;
        }
    },
    storeDomData: function(dom) {
        // cookies
        var url = dom.URL;
        CliqzAttrack.cookiesFromDom[url] = dom.cookie;

        // links
        // TODO: keep only 3rd party links
        var reflinks = {};
        if (dom.links) {
            for (var i = 0; i < dom.links.length; i++) {
                reflinks[dom.links[i].href] = true;
            }
        }
        if (dom.scripts) {
            for (var i = 0; i < dom.scripts.length; i++) {
                var s = dom.scripts[i].src;
                if (s.indexOf('http') == 0) {
                    reflinks[s] = true;
                }
            }
        }
        var links = dom.getElementsByTagName('link');
        for (var i = 0; i < links.length; i++) {
            reflinks[links[i].href] = true;
        }
        CliqzAttrack.linksFromDom[url] = reflinks;
    },
    clearDomLinks: function() {
        for (var url in CliqzAttrack.linksFromDom) {
            if (!CliqzAttrack.isTabURL(url)) {
                delete CliqzAttrack.linksFromDom[url];
                delete CliqzAttrack.cookiesFromDom[url];
                delete CliqzAttrack.loadedTabs[url];
            }
        }
    },
    isTabURL: function(url) {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator("navigator:browser");

        while (browserEnumerator.hasMoreElements()) {
            var browserWin = browserEnumerator.getNext();
            var tabbrowser = browserWin.gBrowser;

            var numTabs = tabbrowser.browsers.length;
            for (var index = 0; index < numTabs; index++) {
                var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                if (currentBrowser) {
                    var tabURL = currentBrowser.currentURI.spec;
                    if (url == tabURL || url == tabURL.split('#')[0]) {
                        return true;
                    }
                }
            }
        }
        return false;
    },
    hourString: function(date) {
        var hour = date.getUTCHours().toString();
        return CliqzAttrack.dateString(date) + (hour[1]?hour:'0'+hour[0]);
    },
    dateString: function(date) {
        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
        var dd  = date.getDate().toString();
        return yyyy + (mm[1]?mm:"0"+mm[0]) + (dd[1]?dd:"0"+dd[0]); // padding
    },
    showCanvasTraffic: function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        try{var win = ww.openWindow(null, "chrome://cliqz/content/canvas-traffic",
                                    "canvas-traffic", null, null);}catch(ee){CliqzUtils.log(ee,'canvas-traffic');}
    },
    parseURL: function(url) {
        /*  Parse a URL string into a set of sub-components, namely:
            - protocol
            - username
            - password
            - hostname
            - port
            - path
            - parameters (semicolon separated key-values before the query string)
            - query (? followed by & separated key-values)
            - fragment (after the #)
            Given a valid string url, this function returns an object with the above
            keys, each with the value of that component, or empty string if it does not
            appear in the url.

            Additionally, any key-value pairs found in the parameters, query and fragment
            components are extracted into objects in 'parameter_keys', query_keys' and
            'fragment_keys' respectively.
         */
        var o = {};

        var v = url.split('://');
        if (v.length >= 2) {

            o['protocol'] = v[0];
            var s = v.slice(1, v.length).join('://');
            v = s.split('/');
            // empty hostname is invalid
            if(v[0] == '') return null;

            var oh = CliqzHumanWeb.parseHostname(v[0]);
            o['hostname'] = oh['hostname'];
            o['port'] = oh['port'];
            o['username'] = oh['username'];
            o['password'] = oh['password'];
            o['path'] = '/';
            o['query'] = '';
            o['parameters'] = '';
            o['fragment'] = '';

            if (v.length>1) {
                let path = v.splice(1, v.length).join('/');

                // forward parse the path, a single character at a time
                let state = 'path';
                for(let i=0; i<path.length; i++) {
                    let c = path.charAt(i);
                    // check for special characters which can change parser state
                    if(c == '#' && ['path', 'query', 'parameters'].indexOf(state) >= 0) {
                        // begin fragment
                        state = 'fragment';
                        continue;
                    } else if(c == '?' && ['path', 'parameters'].indexOf(state) >= 0) {
                        // begin query string
                        state = 'query';
                        continue;
                    } else if(c == ';' && state == 'path') {
                        // begin parameter string
                        state = 'parameters';
                        continue;
                    }

                    // add character to key based on state
                    o[state] += c;
                }
                o['query_keys'] = CliqzAttrack.getParametersQS(o['query']);
                o['parameter_keys'] = CliqzAttrack.getParametersQS(o['parameters']);
                o['fragment_keys'] = CliqzAttrack.getParametersQS(o['fragment']);
            } else {
                o['query_keys'] = {};
                o['parameter_keys'] = {};
                o['fragment_keys'] = {};
            }
        } else {
            return null;
        }
        return o;
    },
    getParametersQS: function(qs) {
        var res = {},
            _blacklist = {};
        let state = 'key';
        let k = '';
        let v = '';
        var _reviewQS = function(k, v) {
            if (v.indexOf('=') > -1) {
                var items = v.split('=');
                k = k + '_' + items[0];
                v = items.splice(1).join('=');
            }
            return [k, v];
        };
        var _updateQS = function(k, v) {
            if (k in res || k in _blacklist) {
                _blacklist[k] = true;
                var kv = _reviewQS(k, v);
                res[kv[0]] = kv[1];
                // also the old one
                if (k in res) {
                    v = res[k];
                    kv = _reviewQS(k, v);
                    res[kv[0]] = kv[1];
                    delete res[k];
                }
            } else {
                res[k] = v;
            }
        };
        for(let i=0; i<qs.length; i++) {
            let c = qs.charAt(i);
            if(c == '=' && state == 'key' && k.length > 0) {
                state = 'value';
                continue;
            } else if(c == '&' || c == ';') {
                if(state == 'value') {
                    state = 'key';
                    // in case the same key already exists
                    _updateQS(k, v);
                } else if(state == 'key' && k.length > 0) {
                    // key with no value, set value=true
                    res[k] = true;
                }
                k = '';
                v = '';
                continue;
            }
            switch(state) {
                case 'key':
                    k += c;
                    break;
                case 'value':
                    v += c;
                    break;
            }
        }
        if(state == 'value') {
            state = 'key';
            _updateQS(k, v);
        } else if(state == 'key' && k.length > 0) {
            res[k] = true;
        }
        return res;
    },
    // Listens for requests initiated in tabs.
    // Allows us to track tab windowIDs to urls.
    tab_listener: {
        // nsIWebProgressListener
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener",
                                               "nsISupportsWeakReference"]),
        wplFlag: { //nsIWebProgressListener state transition flags
            STATE_START: Ci.nsIWebProgressListener.STATE_START,
            STATE_IS_DOCUMENT: Ci.nsIWebProgressListener.STATE_IS_DOCUMENT,
        },

        _tabsStatus: {},

        /*  nsiWebProgressListener interface method. Called when the state of a tab changes.
            The START and IS_DOCUMENT flags indicate a new page request. We extract the page URL
            being loaded, and the windowID of the originating tab. We cache these values, as well
            as sending an event to tp_events.
         */
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
            // check flags for started request
            if(this.wplFlag['STATE_START'] & aFlag && this.wplFlag['STATE_IS_DOCUMENT'] & aFlag) {
                var win = aWebProgress.DOMWindow;
                if(aRequest) {
                    var hour = CliqzAttrack.getTime();
                    if (!(hour in CliqzAttrack.loadedPage)) CliqzAttrack.loadedPage[hour] = 0;
                    CliqzAttrack.loadedPage[hour]++;
                    try {
                        var aChannel = aRequest.QueryInterface(nsIHttpChannel);
                        var url = '' + aChannel.URI.spec;
                        var util = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
                        var windowID = util.outerWindowID;
                        // add window -> url pair to tab cache.
                        this._tabsStatus[windowID] = url;
                        var _key = windowID + ":" + url;
                        if(!(CliqzAttrack.trackReload[_key])) {
                            CliqzAttrack.trackReload[_key] = new Date();
                        }
                        else{
                            var t2 = new Date();
                            var dur = (t2 -  CliqzAttrack.trackReload[_key]) / 1000;
                            if(dur < 30000 && countReload){
                                // CliqzUtils.log("PageReLoaded:2 " +  ((t2 - CliqzAttrack.trackReload[windowID +  ":" + url]) / 1000) + "XOXOXO");
                                CliqzAttrack.tp_events['_active'][windowID]['ra'] = 1;
                                CliqzAttrack.reloadWhiteList[_key] = t2;
                            }
                        }
                        countReload = false;

                        //CliqzAttrack.tp_events.onFullPage(url, windowID);
                    } catch(e) {}
                }
            }
        },

        // Get an array of windowIDs for tabs which a currently on the given URL.
        getTabsForURL: function(url) {
            var tabs = [];
            for(var windowID in this._tabsStatus) {
                var tabURL = this._tabsStatus[windowID];
                if (url == tabURL || url == tabURL.split('#')[0]) {
                    tabs.push(windowID);
                }
            }
            return tabs;
        },

        // Returns true if the give windowID represents an open browser tab's windowID.
        isWindowActive: function(windowID) {
            var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                .getService(Components.interfaces.nsIWindowMediator);
            var browserEnumerator = wm.getEnumerator("navigator:browser");
            // ensure an integer as getBrowserForOuterWindowID() is type sensitive
            var int_id = parseInt(windowID);
            if(int_id <= 0) return false;

            while (browserEnumerator.hasMoreElements()) {
                var browserWin = browserEnumerator.getNext();
                var tabbrowser = browserWin.gBrowser;

                // check if tab is open in this window
                // on FF>=39 wm.getOuterWindowWithId() behaves differently to on FF<=38 for closed tabs so we first try
                // gBrowser.getBrowserForOuterWindowID which works on FF>=39, and fall back to wm.getOuterWindowWithId()
                // for older versions.
                try {
                    if(tabbrowser.getBrowserForOuterWindowID(int_id) != undefined) {
                        return true;
                    }
                } catch(e) {
                    let tabwindow;
                    try {
                      tabwindow = wm.getOuterWindowWithId(int_id);
                    } catch(e) {
                      // if getOuterWindowWithId randomly fails, keep the tab
                      return true;
                    }
                    if(tabwindow == null) {
                        return false;
                    } else {
                        try {
                            let contents = tabwindow._content;
                            return true;
                        } catch(ee) {
                            return false;
                        }
                    }
                }
            }
            return false;
        },

        // Return the set of open tabs by their windowIDs.
        getActiveWindowIDs: function() {
            var ids = Object.keys(this._tabsStatus);
            // clean tab cache
            for(let i=0; i<ids.length; i++) {
                if(!this.isWindowActive(ids[i])) {
                    delete this._tabsStatus[ids[i]];
                }
            }
            return Object.keys(this._tabsStatus);
        }
    },
    tp_events: {
        _active: {},
        _old_tab_idx: {},
        _staged: [],
        _last_clean: 0,
        _clean_interval: 1000*10, // 10s
        _push_interval: 1000*60*20, // 20 minutes @konarkm: Decreasing the frequency from 5 minutes to 20 minutes.
        _last_push: 0,
        _stats: ['c', // hit counter
                 'has_qs', // qs counter
                 'has_ps',
                 'has_fragment',
                 'bad_qs', // bad tokens > 0
                 'bad_tokens',
                 'tokens_blocked',
                 'req_aborted',
                 'cookie_set',
                 'cookie_blocked',
                 'bad_cookie_sent',
                 'has_post',
                 'bad_post',
                 'post_altered',
                 'token.has_cookie',
                 'token.cookie',
                 'token.has_private',
                 'token.private',
                 'token.has_cookie_b64',
                 'token.cookie_b64',
                 'token.has_private_b64',
                 'token.private_b64',
                 'token.has_safekey',
                 'token.safekey',
                 'token.has_whitelisted',
                 'token.whitelisted',
                 'cv_to_dataURL_allowed',
                 'cv_to_dataURL_blocked',
                 'cookie_allow_newtab',
                 'cookie_allow_visitcache',
                 'cookie_allow_userinit',
                 'cookie_allow_bootingup',
                 'cookie_allow_oauth',
                 'cookie_block_favicon',
                 'cookie_block_tp1',
                 'cookie_block_tp2',
                 'cookie_block_ntp',
                 'cookie_allow_ntp',
                 'reloadAttempted',
                 'bad_headers',
                 'header.cookie',
                 'req_oauth',
                 'resp_ob',
                 'token.has_short_no_hash',
                 'token.short_no_hash',
                 'token.has_cookie_newToken',
                 'token.cookie_newToken',
                 'token.has_cookie_countThreshold',
                 'token.cookie_countThreshold',
                 'token.has_private_newToken',
                 'token.private_newToken',
                 'token.has_private_countThreshold',
                 'token.private_countThreshold',
                 'token.has_cookie_b64_newToken',
                 'token.cookie_b64_newToken',
                 'token.has_cookie_b64_countThreshold',
                 'token.cookie_b64_countThreshold',
                 'token.has_private_b64_newToken',
                 'token.private_b64_newToken',
                 'token.has_private_b64_countThreshold',
                 'token.private_b64_countThreshold',
                 'token.has_qs_newToken',
                 'token.qs_newToken',
                 'token.has_qs_countThreshold',
                 'token.qs_countThreshold',
                 'req_rule_aborted'
                 ],
        ignore: new Set(['self-repair.mozilla.org']),
        // Called when a url is loaded on windowID source.
        // Returns the PageLoadData object for this url.
        //  or returns null if the url is malformed or null.
        onFullPage: function(url, requestContext) {
            let source = requestContext.getOuterWindowID();
            // previous request finished. Move to staged
            this.stage(source);
            // create new page load entry for tab
            if(url && url.hostname && source > 0 && !this.ignore.has(url.hostname)) {
                this._active[source] = new CliqzAttrack.tp_events.PageLoadData(url);
                return this._active[source];
            } else {
                return null;
            }
        },
        // Get a stats object for the request to url, referred from ref, on tab source.
        // url_parts and ref_parts contain the decomposed parts (from parseURL) of url and ref respectively.
        // returns an object containing keys specified in tp_events._stats representing the running stats
        // for the requesting third party on the source page.
        // Returns null if the referrer is not valid.
        get: function(url, url_parts, ref, ref_parts, source) {
            if(source <= 0|| source === null || source === undefined) {
                if (CliqzAttrack.debug) CliqzUtils.log("No source for request, not logging!", "tp_events");
                return null;
            }

            if(!(source in this._active)) {
                if(!ref || !ref_parts || !ref_parts.hostname) {
                    return null;
                }
                if (CliqzAttrack.debug) CliqzUtils.log("No fullpage request for referrer: "+ ref +" -> "+ url , "tp_events");
                return null;
            }

            var page_graph = this._active[source];
            if(!page_graph.isReferredFrom(ref_parts)) {
                if(!ref || !ref_parts || !ref_parts.hostname) return null;
                if(source in this._old_tab_idx) {
                    var prev_graph = this._staged[this._old_tab_idx[source]];
                    if(prev_graph.isReferredFrom(ref_parts)) {
                        if (CliqzAttrack.debug) CliqzUtils.log("Request for expired tab "+ ref_parts.hostname +" -> "+ url_parts.hostname +" ("+ prev_graph['hostname'] +")", 'tp_events');
                        return prev_graph.getTpUrl(url_parts.hostname, url_parts.path);
                    }
                }
                if (CliqzAttrack.debug) CliqzUtils.log("tab/referrer mismatch "+ ref_parts.hostname +" -> "+ url_parts.hostname +" ("+ page_graph['hostname'] +")", 'tp_events');
                return null;
            }

            return page_graph.getTpUrl(url_parts.hostname, url_parts.path);
        },
        // Move the PageLoadData object for windowID to the staging area.
        stage: function(windowID) {
            if(windowID in this._active) {
                this._active[windowID]['e'] = (new Date()).getTime();
                // push object to staging and save its id
                this._old_tab_idx[windowID] = this._staged.push(this._active[windowID]) - 1;
                delete this._active[windowID];
            }
        },
        // Periodically stage any tabs which are no longer active.
        // Will run at a period specifed by tp_events._clean_interval, unless force_clean is true
        // If force_stage is true, will stage all tabs, otherwise will only stage inactive.
        commit: function(force_clean, force_stage) {
            var now = (new Date()).getTime();
            if(now - this._last_clean > this._clean_interval || force_clean == true) {
                for(let k in this._active) {
                    var active = CliqzAttrack.tab_listener.isWindowActive(k);
                    if(!CliqzAttrack.tab_listener.isWindowActive(k) || force_stage == true) {
                        if (CliqzAttrack.debug) CliqzUtils.log('Stage tab '+k, 'tp_events');
                        this.stage(k);
                    }
                }
                this._last_clean = now;
            }
        },
        // Push staged PageLoadData to human web.
        // Will run at a period specified by tp_events._push_interval, unless force_push is true.
        push: function(force_push) {
            var now = (new Date()).getTime();
            if(this._staged.length > 0 && (now - this._last_push > this._push_interval || force_push == true)) {
                // convert staged objects into simple objects, and aggregate.
                // then filter out ones with bad data (undefined hostname or no third parties)
                var payload_data = this._staged.map(function(item) {
                    return item.asPlainObject();
                }).filter(function(item) {
                    return item['hostname'].length > 0 && Object.keys(item['tps']).length > 0;
                });

                // if we still have some data, send the telemetry
                if(payload_data.length > 0) {
                    if (CliqzAttrack.debug) CliqzUtils.log('Pushing data for '+ payload_data.length +' requests', 'tp_events');
                    var enabled = {'qs': CliqzAttrack.isQSEnabled(), 'cookie': CliqzAttrack.isCookieEnabled(), 'post': CliqzAttrack.isPostEnabled(), 'fingerprint': CliqzAttrack.isFingerprintingEnabled()};
                    var payl = {'data': payload_data, 'ver': CliqzAttrack.VERSION, 'conf': enabled, 'addons': CliqzAttrack.similarAddon, 'observers': CliqzAttrack.obsCounter, 'updateInTime': CliqzAttrack.updatedInTime()};
                    CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.tp_events', 'payload': payl});
                }
                this._staged = [];
                this._old_tab_idx = {};
                this._last_push = now;
            }
        },
        _newStatCounter: function() {
            var ctr = {},
                stats_keys = CliqzAttrack.tp_events._stats;
            for(var s in stats_keys) {
                ctr[stats_keys[s]] = 0;
            }
            return ctr;
        },
        // Class to hold a page load and third party urls loaded by this page.
        PageLoadData: function(url) {

            // Create a short md5 hash of the input string s
            this._shortHash = function(s) {
                if(!s) return '';
                return md5(s).substring(0, 16);
            };

            this.url = url.toString();
            this.hostname = url.hostname;
            this.path = this._shortHash(url.path);
            this.c = 1;
            this.s = (new Date()).getTime();
            this.e = null;
            this.tps = {};

            // Get a stat counter object for the given third party host and path in
            // this page load.
            this.getTpUrl = function(tp_host, tp_path) {
                var path_key = tp_path; // TODO hash it?
                if(!(tp_host in this.tps)) {
                    this.tps[tp_host] = {};
                }
                if(!(path_key in this.tps[tp_host])) {
                    this.tps[tp_host][path_key] = this._tpStatCounter();
                }
                return this.tps[tp_host][path_key];
            };

            // Returns true if the given referrer matches this page load.
            // This can be either a direct referral (referrer matches page load url),
            // or nth degree (referrer is somewhere in the graph of referrals originating
            // from the original page load url).
            this.isReferredFrom = function(ref_parts) {
                if(!ref_parts) return false;
                if(CliqzAttrack.sameGeneralDomain(ref_parts.hostname, this.hostname)) {
                    return true;
                }
                // not a direct referral, but could be via a third party
                if(ref_parts.hostname in this.tps) {
                    return true;
                }
                return false;
            };

            this._tpStatCounter = CliqzAttrack.tp_events._newStatCounter;

            // Creates a plain, aggregated version of this object, suitable for converting
            // to JSON, and sending as telemetry.
            this.asPlainObject = function() {
                var self = this,
                    obj = {
                        hostname: this._shortHash(this.hostname),
                        path: this.path,
                        c: this.c,
                        t: this.e - this.s,
                        ra: this.ra || 0,
                        tps: {}
                    };
                if(!obj.hostname) return obj;

                for(let tp_domain in this.tps) {
                    var tp_domain_data = this.tps[tp_domain],
                        tp_paths = Object.keys(tp_domain_data);
                    // skip same general domain
                    if(CliqzAttrack.sameGeneralDomain(self.hostname, tp_domain)) {
                        continue;
                    }
                    if(tp_paths.length > 0) {
                        // aggregate stats per tp domain.
                        var path_data = tp_paths.map(function(k) {
                            tp_domain_data[k]['paths'] = [self._shortHash(k)];
                            return tp_domain_data[k];
                        });
                        obj['tps'][tp_domain] = path_data.reduce(this._sumStats);

                        // Remove the keys which have value == 0;
                        CliqzAttrack.tp_events._stats.forEach(function(eachKey){
                            if(obj['tps'][tp_domain] && obj['tps'][tp_domain][eachKey] == 0)
                                delete obj['tps'][tp_domain][eachKey];
                        });
                    }
                }
                // CliqzUtils.log("Data for url: " + this.hostname + " : " + JSON.stringify(obj),"XOXOX");
                checkBlackList(this.url, obj);
                checkFingerPrinting(this.url, obj);
                return obj;
            };

            this._sumStats = function(a, b) {
                var c = {},
                    stats_keys = new Set(Object.keys(a).concat(Object.keys(b)));
                // paths is a special case
                stats_keys.delete('paths');
                stats_keys.forEach(function(s){
                    c[s] = (a[s] || 0) + (b[s] || 0);
                });
                c['paths'] = a['paths'].concat(b['paths']);
                return c;
            };

        },
        incrementStat: function(req_log, stat_key) {
            if (req_log != null) {
                if(!(stat_key in req_log)) {
                    req_log[stat_key] = 0;
                }
                req_log[stat_key]++;
            }
        }
    }
};
