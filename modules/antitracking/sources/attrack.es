/*
 * This module prevents user from 3rd party tracking
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/AddonManager.jsm");

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
        if (tok.length >= 8) {
            qsMD5[md5(key)] = md5(tok);
        }
    }
    for (var key in ps) {
        var tok = dURIC(qs[key]);
        while (tok != dURIC(tok)) {
            tok = dURIC(tok);
        }
        if (tok.length >= 8) {
            qsMD5[md5(key)] = md5(tok);
        }
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
        if (this.loadInfo == null || this.loadInfo.parentOuterWindowID === undefined) {
            return this.getOuterWindowID();
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
        return this.loadInfo ? this.loadInfo.contentPolicyType : this._legacyGetContentPolicyType();
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
    },
    _legacyGetContentPolicyType: function() {
        // try to get policy get page load type
        let load_type = CliqzAttrack.getPageLoadType(this.channel);

        if (load_type == "fullpage") {
            return 6;
        } else if (load_type == "frame") {
            return 7;
        }

        // XHR is easy
        if (CliqzAttrack.isXHRRequest(this.channel)) {
            return 11;
        }

        // other types
        return 1;
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

var getBrowserMajorVersion = function() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                    .getService(Components.interfaces.nsIXULAppInfo);
    return parseInt(appInfo.version.split('.')[0]);
};

var CliqzAttrack = {
    VERSION: '0.93',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    URL_TOKEN_WHITELIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    // URL_ALERT_TEMPLATE: 'chrome://cliqz/content/anti-tracking-index.html',
    // URL_ALERT_TEMPLATE_2: 'chrome://cliqz/content/anti-tracking-index-2.html',
    URL_SAFE_KEY: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json',
    URL_SAFE_KEY_VERSIONCHECK: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    URL_BLOCK_REPROT_LIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json',
    URL_TRACKER_COMPANIES: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
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
    blacklist:[],
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
    probHashLogM: null,
    probHashThreshold: 0.0165,
    probHashChars: {' ': 38, '-': 37, '.': 36, '1': 26, '0': 35, '3': 28, '2': 27, '5': 30, '4': 29, '7': 32, '6': 31, '9': 34, '8': 33, 'a': 0, 'c': 2, 'b': 1, 'e': 4, 'd': 3, 'g': 6, 'f': 5, 'i': 8, 'h': 7, 'k': 10, 'j': 9, 'm': 12, 'l': 11, 'o': 14, 'n': 13, 'q': 16, 'p': 15, 's': 18, 'r': 17, 'u': 20, 't': 19, 'w': 22, 'v': 21, 'y': 24, 'x': 23, 'z': 25},
    isHashProb: function(str) {
        var log_prob = 0.0;
        var trans_c = 0;
        str = str.toLowerCase().replace(/[^a-z0-9\.\- ]/g,'');
        for(var i=0;i<str.length-1;i++) {
            var pos1 = CliqzAttrack.probHashChars[str[i]];
            var pos2 = CliqzAttrack.probHashChars[str[i+1]];

            log_prob += CliqzAttrack.probHashLogM[pos1][pos2];
            trans_c += 1;
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

                    if (CliqzAttrack.isSourceWhitelisted(source_url_parts.hostname)) {
                        CliqzAttrack.tp_events.incrementStat(req_log, "source_whitelisted");
                        return;
                    }

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

            // Needed to collect data transferred for human-web

            if(url == 'https://safe-browsing.cliqz.com/'){
                var cl = aChannel.getRequestHeader("Content-Length");
                if(cl && CliqzHumanWeb.actionStats){
                    if(CliqzHumanWeb.actionStats["sz"]){
                        CliqzHumanWeb.actionStats["sz"] +=  parseInt(cl);
                    }
                    else{
                        CliqzHumanWeb.actionStats["sz"] = parseInt(cl);
                    }
                }
            }
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
                    if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !(CliqzAttrack.reloadWhiteList[_key])) {
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

                        if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !(CliqzAttrack.reloadWhiteList[_key])) {
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
    isCookieEnabled: function(source_hostname) {
        if (source_hostname != undefined && CliqzAttrack.isSourceWhitelisted(source_hostname)) {
            return false;
        }
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
    initialiseAntiRefererTracking: function() {
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
    pacemakerId: null,
    tpace: 10*1000,
    tmult: 1/10.0,
    windowsRef: [],
    windowsMem: {},
    alertRules: null,
    alertTemplate: null,
    alertAlreadyShown: {},
    /** Global module initialisation.
     */
    init: function() {
        // disable for older browsers
        if (!CliqzAttrack.isEnabled() || getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }

        CliqzAttrack.initialiseAntiRefererTracking();

        // Replace getWindow functions with window object used in init.

        if (CliqzAttrack.debug) CliqzUtils.log("Init function called:", CliqzAttrack.LOG_KEY);
        CliqzAttrack.initDB();
        CliqzUtils.httpGet(
            'chrome://cliqz/content/prob.json',
            function success(req) {
                CliqzAttrack.probHashLogM = JSON.parse(req.response);
            });
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

        if (Object.keys(CliqzAttrack.tracker_companies).length == 0) {
            CliqzAttrack.loadTrackerCompanies();
        }

        // if (CliqzAttrack.QSStats == null) CliqzAttrack.loadQSStats();

        // @konarkm : Since we already have window, passing it.
        // Saves from calling CliqzUtils.getWindow() in getPrivateValues();
        CliqzAttrack.checkInstalledAddons();


        // var win_id = CliqzUtils.getWindowID();

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }

        if (CliqzAttrack.pacemakerId==null) {
            CliqzAttrack.pacemakerId = CliqzUtils.setInterval(CliqzAttrack.pacemaker, CliqzAttrack.tpace, null);
        }

        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpmodObserver, "http-on-modify-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpopenObserver, "http-on-opening-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-response", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-cached-response", false);

        CliqzAttrack.disabled_sites = new Set(JSON.parse(CliqzUtils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));

    },
    /** Per-window module initialisation
     */
    initWindow: function(window) {
        if (getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION || !CliqzAttrack.isEnabled()) {
            return;
        }
        // Load listerners:
        window.gBrowser.addProgressListener(CliqzAttrack.listener);
        window.gBrowser.addProgressListener(CliqzAttrack.tab_listener);
        window.CLIQZ.Core.urlbar.addEventListener('focus', onUrlbarFocus);

        CliqzAttrack.getPrivateValues(window);
    },
    unload: function() {
        // don't need to unload if disabled
        if (getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION || !CliqzAttrack.isEnabled()) {
            return;
        }
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

        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            try{
                var win = enumerator.getNext();
                CliqzAttrack.unloadWindow(win);
            }
            catch(e){}
        }

        CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpmodObserver, 'http-on-modify-request');
        CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpopenObserver, 'http-on-opening-request');
        CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpResponseObserver, 'http-on-examine-cached-response');
        CliqzAttrack.observerService.removeObserver(CliqzAttrack.httpResponseObserver, 'http-on-examine-response');

    },
    unloadWindow: function(window) {
        window.gBrowser.removeProgressListener(CliqzAttrack.tab_listener);
        window.gBrowser.removeProgressListener(CliqzAttrack.listener);
        window.gBrowser.removeProgressListener(onUrlbarFocus);
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
    lastUpdate: ['0', '0'],
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
        var today = CliqzAttrack.getTime().substring(0, 8);
        CliqzUtils.httpGet(CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK +"?"+ today, function(req) {
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
        var today = CliqzAttrack.getTime().substring(0, 8);
        CliqzUtils.httpGet(
            CliqzAttrack.URL_TOKEN_WHITELIST +"?"+ today,
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
        var today = CliqzAttrack.getTime().substring(0, 8);
        CliqzUtils.httpGet(
            CliqzAttrack.URL_SAFE_KEY +"?"+ today,
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
        var keyTokens = getQSMD5(url_parts['query_keys'], url_parts['parameter_keys']),
          s = md5(url_parts.hostname).substr(0, 16);
        refstr = md5(refstr).substr(0, 16);
        CliqzAttrack.saveKeyTokens(s, keyTokens, refstr);
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
                    if(prev_graph && prev_graph.isReferredFrom(ref_parts)) {
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
                // @konarkm : This was added to collect data for experiment, safe to stop collecting it now.
                // checkBlackList(this.url, obj);
                // checkFingerPrinting(this.url, obj);
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
    },
    /** Get info about trackers and blocking done in a specified tab.
     *
     *  Returns an object describing anti-tracking actions for this page, with keys as follows:
     *    cookies: 'allowed' and 'blocked' counts.
     *    requests: 'safe' and 'unsafe' counts. 'Unsafe' means that unsafe data was seen in a request to a tracker.
     *    trackers: more detailed information about each tracker. Object with keys being tracker domain and values
     *        more detailed blocking data.
     */
    getTabBlockingInfo: function(tab_id) {
      if (! (tab_id in CliqzAttrack.tp_events._active) ) {
        return {'error': 'Tab ID ' + tab_id + ' not active'};
      }
      var tab_data = CliqzAttrack.tp_events._active[tab_id],
        result = {
          hostname: tab_data.hostname,
          cookies: {allowed: 0, blocked: 0},
          requests: {safe: 0, unsafe: 0},
          trackers: {},
          companies: {}
        },
        trackers = Object.keys(tab_data.tps).filter(function(domain) {
          return md5(CliqzAttrack.getGeneralDomain(domain)).substring(0, 16) in CliqzAttrack.tokenExtWhitelist;
        }),
        plain_data = tab_data.asPlainObject();

      trackers.forEach(function(dom) {
        result.trackers[dom] = {};
        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'tokens_blocked', 'req_aborted'].forEach(function (k) {
          result.trackers[dom][k] = (k in plain_data.tps[dom] ? plain_data.tps[dom][k] : 0);
        });
        result.cookies.allowed += result.trackers[dom]['cookie_set'] - result.trackers[dom]['cookie_blocked'];
        result.cookies.blocked += result.trackers[dom]['cookie_blocked'];
        result.requests.safe += result.trackers[dom]['c'] - result.trackers[dom]['bad_qs'];
        result.requests.unsafe += result.trackers[dom]['bad_qs'];

        let tld = CliqzAttrack.getGeneralDomain(dom),
          company = tld;
        if (tld in CliqzAttrack.tracker_companies) {
          company = CliqzAttrack.tracker_companies[tld];
        }
        if (!(company in result.companies)) {
          result.companies[company] = [];
        }
        result.companies[company].push(dom);
      });

      return result;
    },
    getCurrentTabBlockingInfo: function() {
      return CliqzAttrack.getTabBlockingInfo(CliqzUtils.getWindow().gBrowser.selectedTab.linkedBrowser._loadContext.DOMWindowID);
    },
    tracker_companies: {},
    loadTrackerCompanies: function() {
      CliqzUtils.loadResource(CliqzAttrack.URL_TRACKER_COMPANIES, function(req) {
        try {
          CliqzAttrack._parseTrackerCompanies(req.response);
        } catch(e) {
          CliqzUtils.log(e);
        }
      });
    },
    /** Parse tracker owners list {Company: [list, of, domains]}, into lookup table {domain: Company}
     */
    _parseTrackerCompanies: function(response) {
      var rev_list = {},
        company_list = JSON.parse(response);
      for (var company in company_list) {
        company_list[company].forEach(function(d) {
          rev_list[d] = company;
        });
      }
      CliqzAttrack.tracker_companies = rev_list;
    },
    /** Enables Attrack module with cookie, QS and referrer protection enabled.
     *  if module_only is set to true, will not set preferences for cookie, QS and referrer protection (for selective loading in AB tests)
     */
    enableModule: function(module_only) {
      if (CliqzAttrack.isEnabled()) {
          return;
      }
      CliqzUtils.setPref('antiTrackTest', true);
      if (!module_only) {
        CliqzUtils.setPref('attrackBlockCookieTracking', true);
        CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
        CliqzUtils.setPref('attrackRefererTracking', true);
      }
      CliqzAttrack.init();
      var enumerator = Services.wm.getEnumerator('navigator:browser');
      while (enumerator.hasMoreElements()) {
          var win = enumerator.getNext();
          CliqzAttrack.initWindow(win);
      }
      // telemetry
      CliqzUtils.telemetry({
        'type': 'attrack',
        'action': 'enable_' + (module_only ? 'abtest' : 'manual')
      });
    },
    /** Disables anti-tracking immediately.
     */
    disableModule: function() {
      CliqzAttrack.unload();
      CliqzUtils.setPref('antiTrackTest', false);
      CliqzUtils.telemetry({
        'type': 'attrack',
        'action': 'disable'
      });
    },
    disabled_sites: new Set(),
    DISABLED_SITES_PREF: "attrackSourceDomainWhitelist",
    saveSourceDomainWhitelist: function() {
      CliqzUtils.setPref(CliqzAttrack.DISABLED_SITES_PREF,
        JSON.stringify(Array.from(CliqzAttrack.disabled_sites)));
    },
    isSourceWhitelisted: function(hostname) {
        return CliqzAttrack.disabled_sites.has(hostname);
    },
    addSourceDomainToWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.add(domain);
      CliqzUtils.telemetry({
        'type': 'attrack',
        'action': 'domain_whitelist_add'
      });
      // also send domain to humanweb
      CliqzHumanWeb.telemetry({
        'type': CliqzHumanWeb.msgType,
        'action': 'attrack.whitelistDomain',
        'payload': domain
      });
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    removeSourceDomainFromWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.delete(domain);
      CliqzUtils.telemetry({
        'type': 'attrack',
        'action': 'domain_whitelist_remove'
      });
      CliqzAttrack.saveSourceDomainWhitelist();
    }
};

export default CliqzAttrack;
