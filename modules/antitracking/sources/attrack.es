/*
 * This module prevents user from 3rd party tracking
 */
import pacemaker from 'antitracking/pacemaker';
import * as persist from 'antitracking/persistent-state';
import TempSet from 'antitracking/temp-set';
import HeaderInfoVisitor from 'antitracking/header-info-visitor';
import { HttpRequestContext, getRefToSource } from 'antitracking/http-request-context';
import tp_events from 'antitracking/tp_events';
import md5 from 'antitracking/md5';
import { parseURL, dURIC, getHeaderMD5, URLInfo } from 'antitracking/url';
import { getGeneralDomain, sameGeneralDomain } from 'antitracking/domain';
import * as hash from 'antitracking/hash';
import { TrackerTXT, sleep, getDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { AttrackBloomFilter, bloomFilter } from 'antitracking/bloom-filter';
import * as datetime from 'antitracking/time';
import TrackingTable from 'antitracking/local-tracking-table';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/AddonManager.jsm");

var countReload = false;
var nsIHttpChannel = Ci.nsIHttpChannel;
var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);

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

function onUrlbarFocus(){
    countReload = true;
}

var faviconService = Components.classes["@mozilla.org/browser/favicon-service;1"]
        .getService(Components.interfaces.mozIAsyncFavicons);

var getBrowserMajorVersion = function() {
    var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                    .getService(Components.interfaces.nsIXULAppInfo);
    return parseInt(appInfo.version.split('.')[0]);
};

var CliqzAttrack = {
    VERSION: '0.95',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    URL_TOKEN_WHITELIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    // URL_ALERT_TEMPLATE: 'chrome://cliqz/content/anti-tracking-index.html',
    // URL_ALERT_TEMPLATE_2: 'chrome://cliqz/content/anti-tracking-index-2.html',
    URL_SAFE_KEY: 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json',
    URL_SAFE_KEY_VERSIONCHECK: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    URL_BLOCK_REPORT_LIST: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-report-list.json',
    URL_TRACKER_COMPANIES: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
    ENABLE_PREF: 'antiTrackTest',
    debug: false,
    msgType:'attrack',
    timeCleaningCache: 180*1000,
    timeAfterLink: 5*1000,
    timeActive: 20*1000,
    timeBootup: 10*1000,
    bootupTime: Date.now(),
    bootingUp: true,
    localBlocked: null,
    checkedToken: null,
    loadedPage: null,
    wrongTokenLastSent: null,
    blockedToken: null,
    cookieTraffic: {'sent': [], 'blocked': [], 'csent': 0, 'cblocked': 0},
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
    bloomFilter: bloomFilter,
    blacklist:[],
    blockingFailed:{},
    trackReload:{},
    reloadWhiteList:{},
    tokenDomain: null,
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    shortTokenLength: 8,
    qsBlockRule: null,  // list of domains should be blocked instead of shuffling
    blocked: null,  // log what's been blocked
    placeHolder: '',
    blockReportList: null,
    observerService: Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Components.interfaces.nsIObserverService),
    tp_events: tp_events,
    tokens: null,
    instantTokenCache: {},
    tokenExtWhitelist: null,
    safeKey: null,
    requestKeyValue: null,
    recentlyModified: new TempSet(),
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
    replacement: "",
    obfuscate: function(s, method, replacement) {
        // used when action != 'block'
        // default is a placeholder
        switch(method) {
        case 'replace':
            return replacement;
        case 'random':
            return shuffle(s);
        case 'same':
            return s;
        case 'placeHolder':
            return CliqzAttrack.placeHolder;
        default:
            return CliqzAttrack.placeHolder;
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
    visitCache: {},
    contextOauth: {},
    linksFromDom: {},
    cookiesFromDom: {},
    loadedTabs: {},
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
    httpopenObserver: {
        observe : function(subject, topic, data) {
            if ((CliqzAttrack.isBloomFilterEnabled() && CliqzAttrack.bloomFilter === null) ||
                (!(CliqzAttrack.isBloomFilterEnabled()) &&
                 (CliqzAttrack.safeKey == null || CliqzAttrack.requestKeyValue == null || CliqzAttrack.tokenExtWhitelist == null))) {
                return;
            }

            var aChannel = subject.QueryInterface(nsIHttpChannel);
            var requestContext = new HttpRequestContext(subject);
            var url = requestContext.url;
            if (!url || url == '') return;
            var url_parts = URLInfo.get(url);

            if (requestContext.getContentPolicyType() == 6) {
                CliqzAttrack.tp_events.onFullPage(url_parts, requestContext.getOuterWindowID());
                if (CliqzAttrack.isTrackerTxtEnabled()) {
                    TrackerTXT.get(url_parts).update();
                }
                return;
            }

            // find the ok tokens fields
            CliqzAttrack.examineTokens(url_parts, CliqzAttrack.sendInstantSafeKey);

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
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) return;


                // extract and save tokens
                CliqzAttrack.extractKeyTokens(url_parts, source_url_parts['hostname']);
                try{
                    let source = getRefToSource(subject, referrer);
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
                        // determin action based on tracker.txt
                        var rule = getDefaultTrackerTxtRule(),
                            _trackerGD = getGeneralDomain(url_parts.hostname),
                            _trackerTxt = TrackerTXT.get(source_url_parts);
                        if (CliqzAttrack.isTrackerTxtEnabled()) {
                            if (_trackerTxt.last_update === null)
                                // The first update is not ready yet
                                sleep(300);
                            if (_trackerGD in _trackerTxt.rules)
                                rule = _trackerTxt.rules[_trackerGD];
                        }
                        if (rule == 'block') {
                            subject.cancel(Components.results.NS_BINDING_ABORTED);
                            tp_events.incrementStat(req_log, 'token_blocked_' + rule);
                        } else {
                            var tmp_url = aChannel.URI.spec;
                            for (var i = 0; i < badTokens.length; i++)
                                tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule, CliqzAttrack.replacement));
                            try {
                                aChannel.URI.spec = tmp_url;
                                tp_events.incrementStat(req_log, 'token_blocked_' + rule);
                            } catch(error) {
                                aChannel.redirectTo(Services.io.newURI(tmp_url, null, null));
                                tp_events.incrementStat(req_log, 'token_red_' + rule);
                            }
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
            if (!CliqzAttrack.isBloomFilterEnabled() && (CliqzAttrack.safeKey == null || CliqzAttrack.requestKeyValue == null || CliqzAttrack.tokenExtWhitelist == null) ||
                CliqzAttrack.isBloomFilterEnabled() && CliqzAttrack.bloomFilter.bloomFilter == null){
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

            // full page
            if (requestContext.getContentPolicyType() == 6) {
                if ([300, 301, 302, 303, 307].indexOf(requestContext.channel.responseStatus) >= 0) {
                    // redirect, update location for tab
                    // if no redirect location set, stage the tab id so we don't get false data
                    let redirect_url = requestContext.getResponseHeader("Location");
                    let redirect_url_parts = URLInfo.get(redirect_url);
                    // if redirect is relative, use source domain
                    if (!redirect_url_parts.hostname) {
                        redirect_url_parts.hostname = url_parts.hostname;
                        redirect_url_parts.path = redirect_url;
                    }
                    CliqzAttrack.tp_events.onRedirect(redirect_url_parts, requestContext.getOuterWindowID());
                }
                return;
            }

            if (source_url == '' || source_url.indexOf('about:')==0) return;

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);
                // extract and save tokens
                //var valid_ref = CliqzAttrack.isTabURL(source_url);
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
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

                // is cached?
                let cached = topic === 'http-on-examine-cached-response';
                CliqzAttrack.tp_events.incrementStat(req_log, cached ? 'cached' : 'not_cached');
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
            var curr_time = Date.now();
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
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname);
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

            var host = getGeneralDomain(url_parts.hostname);
            var diff = curr_time - (CliqzAttrack.visitCache[host] || 0);

            // This is order to only allow visited sources from browser. Else some redirect calls
            // Getting leaked.
            var s_host = '';
            if(source_url && source_url_parts.hostname){
                s_host = getGeneralDomain(source_url_parts.hostname);
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
                            var host = getGeneralDomain(url_parts.hostname);
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
                                var host = getGeneralDomain(url_parts.hostname);
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
                        if (req_log) req_log.bad_cookie_sent++;
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
        if (getGeneralDomain(req_metadata['dst']) in CliqzAttrack.blacklist) CliqzUtils.log("This was blocked by other extensions: ","XOXOX");
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
    listener: {
        tmpURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {

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

            // New location, means a page loaded on the top window, visible tab
            var activeURL = CliqzHumanWeb.currentURL();
            var curr_time = Date.now();

            if ((activeURL.indexOf('about:')!=0) && (activeURL.indexOf('chrome:')!=0)) {

                var url_parts = CliqzHumanWeb.parseURL(activeURL);

                if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                    var host = getGeneralDomain(url_parts.hostname);
                    //var host = url_parts.hostname;
                    if (host=='google.com') {
                        if (CliqzAttrack.debug) CliqzUtils.log("ADDING google to visitCache: " + url_parts.hostname + ' (LOCATION CHANGE)', CliqzAttrack.LOG_KEY);
                    }
                    CliqzAttrack.visitCache[host] = curr_time;
                }
            }

        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {

        }
    },
    isEnabled: function() {
        return CliqzUtils.getPref(CliqzAttrack.ENABLE_PREF, false);
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
    isTrackerTxtEnabled: function() {
        return CliqzUtils.getPref('trackerTxt', false);
    },
    isBloomFilterEnabled: function() {
        return CliqzUtils.getPref('attrackBloomFilter', false);
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
                CliqzUtils.clearPref('attrackRefererPreferences');
            }
        }
    },
    initPacemaker: function() {
        let two_mins = 2 * 60 * 1000;

        // create a constraint which returns true when the time changes at the specified fidelity
        function timeChangeConstraint(name, fidelity) {
            if (fidelity == "day") fidelity = 8;
            else if(fidelity == "hour") fidelity = 10;
            return function (task) {
                var timestamp = CliqzHumanWeb.getTime().slice(0, fidelity),
                    lastHour = persist.get_value(name + "lastRun") || timestamp;
                CliqzUtils.log("name: " + timestamp +" - "+ lastHour, "xxx");
                persist.set_value(name +"lastRun", timestamp);
                return timestamp != lastHour;
            };
        }

        if (!CliqzAttrack.isBloomFilterEnabled())
            // check for new whitelists every 3 hours
            pacemaker.register(CliqzAttrack.loadRemoteWhitelists, 3 * 60 * 60 * 1000);
        else
            // check for new bloom filter every 10 minutes
            pacemaker.register(CliqzAttrack.updateBloomFilter, 10 * 60 * 1000);

        // send instant cache tokens whenever hour changes
        // clear instant token every hour
        pacemaker.register(CliqzAttrack.sendInstantTokens, 5 * 60 * 1000);
        pacemaker.register(CliqzAttrack.sendTokens, two_mins, timeChangeConstraint("tokens", "hour"));

        // every 2 mins
        pacemaker.register(function clean_visitCache(curr_time) {
            var keys = Object.keys(CliqzAttrack.visitCache);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.visitCache[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) delete CliqzAttrack.visitCache[keys[i]];
            }
        }, two_mins);

        pacemaker.register(function clean_reloadWhiteList(curr_time) {
            var keys = Object.keys(CliqzAttrack.reloadWhiteList);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.reloadWhiteList[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) {
                    delete CliqzAttrack.reloadWhiteList[keys[i]];
                }
            }
        }, two_mins);

        pacemaker.register(function clean_trackReload(curr_time) {
            var keys = Object.keys(CliqzAttrack.trackReload);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.trackReload[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) {
                    delete CliqzAttrack.trackReload[keys[i]];
                }
            }
        }, two_mins);

        pacemaker.register(function clean_blockedCache(curr_time) {
            var keys = Object.keys(CliqzAttrack.blockedCache);
            for(var i=0;i<keys.length;i++) {
                var diff = curr_time - (CliqzAttrack.blockedCache[keys[i]] || 0);
                if (diff > CliqzAttrack.timeCleaningCache) delete CliqzAttrack.blockedCache[keys[i]];
            }
        }, two_mins);

        pacemaker.register(function prune_traffic() {
            CliqzAttrack.cookieTraffic['blocked'].splice(200);
            CliqzAttrack.cookieTraffic['sent'].splice(200);
        });

        var bootup_task = pacemaker.register(function bootup_check(curr_time) {
            if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) {
                CliqzUtils.log("bootup end");
                CliqzAttrack.bootingUp = false;
                pacemaker.deregister(bootup_task);
            }
        });

        pacemaker.register(function tp_event_commit() {
            CliqzAttrack.tp_events.commit();
            CliqzAttrack.tp_events.push();
        }, two_mins);

        // every hour
        let hourly = 60 * 60 * 1000;
        pacemaker.register(CliqzAttrack.pruneSafeKey, hourly);
        pacemaker.register(CliqzAttrack.pruneTokenDomain, hourly);
        pacemaker.register(CliqzAttrack.pruneRequestKeyValue, hourly);

        // send tracking occurances whenever day changes
        pacemaker.register(function sendTrackingDetections() {
            if (CliqzAttrack.local_tracking.isEnabled()) {
                CliqzAttrack.local_tracking.getTrackingOccurances(function(results) {
                    if (results.length > 0) {
                        CliqzAttrack.local_tracking.getTableSize(function(table_size) {
                            var payl = {
                                'ver': CliqzAttrack.VERSION,
                                'ts': datetime.getTime().substring(0, 8),
                                'data': {
                                    'lt': results.map(function(tup) {
                                        return {'tp': tup[0], 'k': tup[1], 'v': tup[2], 'n': tup[3]};
                                    }),
                                    'c': table_size
                                }
                            };
                            CliqzHumanWeb.telemetry({
                                'type': CliqzHumanWeb.msgType,
                                'action': 'attrack.tracked',
                                'payload': payl
                            });
                        });
                    }
                    CliqzAttrack.local_tracking.cleanTable();
                });
            }
        }, hourly, timeChangeConstraint("local_tracking", "day"));

    },
    /** Global module initialisation.
     */
    init: function() {
        // disable for older browsers
        if (getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }

        CliqzAttrack.initialiseAntiRefererTracking();

        // Replace getWindow functions with window object used in init.

        if (CliqzAttrack.debug) CliqzUtils.log("Init function called:", CliqzAttrack.LOG_KEY);
        CliqzUtils.httpGet('chrome://cliqz/content/antitracking/blacklist.json',
            function success(req){
                CliqzAttrack.blacklist = JSON.parse(req.response).tpdomains;
            },
            function error(){
                CliqzUtils.log("Could not load blacklist.")
            }
         );

         hash.init();

        // load all caches:
        // Large dynamic caches are loaded via the persist module, which will lazily propegate changes back
        // to the browser's sqlite database.
        // Large static caches (e.g. token whitelist) are loaded from sqlite
        // Smaller caches (e.g. update timestamps) are kept in prefs
        persist.init();
        this._tokens = new persist.AutoPersistentObject("tokens", (v) => CliqzAttrack.tokens = v, 60000);
        this._blocked = new persist.AutoPersistentObject("blocked", (v) => CliqzAttrack.blocked = v, 300000);

        // whitelist is loaded even if we're using bloom filter at the moment, as it is still used in some places.
        // we need to tidy this!
        CliqzAttrack.tokenExtWhitelist = {};
        this._tokenWhitelist = new persist.PersistentObject("tokenExtWhitelist", (v) => CliqzAttrack.tokenExtWhitelist = v);

        this._safekey = new persist.AutoPersistentObject("safeKey", (v) => CliqzAttrack.safeKey = v, 300000);
        try {
            CliqzAttrack.lastUpdate = JSON.parse(persist.get_value("lastUpdate"));
            if (CliqzAttrack.lastUpdate.length != 2) {
                throw "invalid lastUpdate value";
            }
        } catch(e) {
            CliqzAttrack.lastUpdate = ['0', '0'];
        }

        this._tokenDomain = new persist.AutoPersistentObject("tokenDomain", (v) => CliqzAttrack.tokenDomain = v, 300000);
        this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", (v) => CliqzAttrack.requestKeyValue = v, 60000);

        if (CliqzAttrack.qsBlockRule == null) CliqzAttrack.loadBlockRules();
        if (CliqzAttrack.blockReportList == null) CliqzAttrack.loadReportLists();

        ['localBlocked', 'checkedToken', 'loadedPage', 'blockedToken'].forEach(function(name) {
            persist.create_persistent(name, (v) => CliqzAttrack[name] = v);
        });

        if (Object.keys(CliqzAttrack.tracker_companies).length == 0) {
            CliqzAttrack.loadTrackerCompanies();
        }

        // @konarkm : Since we already have window, passing it.
        // Saves from calling CliqzUtils.getWindow() in getPrivateValues();
        CliqzAttrack.checkInstalledAddons();


        // var win_id = CliqzUtils.getWindowID();

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }

        CliqzAttrack.initPacemaker();

        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpmodObserver, "http-on-modify-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpopenObserver, "http-on-opening-request", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-response", false);
        CliqzAttrack.observerService.addObserver(CliqzAttrack.httpResponseObserver, "http-on-examine-cached-response", false);

        try {
            CliqzAttrack.disabled_sites = new Set(JSON.parse(CliqzUtils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));
        } catch(e) {
            CliqzAttrack.disabled_sites = new Set();
        }

        CliqzAttrack.local_tracking = new TrackingTable();

        // update bloom filter
        if (CliqzAttrack.isBloomFilterEnabled())
            CliqzAttrack.updateBloomFilter();

        HttpRequestContext.initCleaner();
    },
    /** Per-window module initialisation
     */
    initWindow: function(window) {
        if (getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
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
        if (getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }
        //Check is active usage, was sent

        // force send tab telemetry data
        CliqzAttrack.tp_events.commit(true, true);
        CliqzAttrack.tp_events.push(true);

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

        pacemaker.destroy();
        HttpRequestContext.unloadCleaner();
    },
    unloadWindow: function(window) {
        window.gBrowser.removeProgressListener(CliqzAttrack.tab_listener);
        window.gBrowser.removeProgressListener(CliqzAttrack.listener);
        if (window.CLIQZ) {
            window.CLIQZ.Core.urlbar.removeEventListener('focus', onUrlbarFocus);
        }
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
    attachVersion: function(payl) {
        if (CliqzAttrack.isBloomFilterEnabled()) {
            if (CliqzAttrack.bloomFilter != null)
                payl['bloomFilterversion'] = CliqzAttrack.bloomFilter.version;
            else
                payl['bloomFilterversion'] = null;
        } else {
            payl['whitelist'] = persist.get_value('tokenWhitelistVersion', '');
            payl['safeKey'] = persist.get_value('safeKeyExtVersion', '');
        }
        return payl;
    },
    generatePayload: function(data, ts, instant, attachVersion) {
        var payl = {
            'data': data,
            'ver': CliqzAttrack.VERSION,
            'ts': ts,
            'anti-duplicates': Math.floor(Math.random() * 10000000)
        };
        if (instant)
            payl['instant'] = true;
        if (attachVersion)
            payl = CliqzAttrack.attachVersion(payl);
        return payl;
    },
    sendInstantSafeKey: function(s, key, today) {
        // once there is a new safe key, send it back
        var data = {};
        data[s] = {};
        data[s][key] = today;
        var payl = CliqzAttrack.generatePayload(data, datetime.getTime(), true, true);
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.safekey', 'payload': payl});
    },
    cacheInstantTokens: function(s, r, kv) {
        // If this is the first apperance of this token within an hour,
        // We will cache it and send every five minutes
        var k = kv.k,
            tok = kv.v;
        if (!(s in CliqzAttrack.instantTokenCache))
            CliqzAttrack.instantTokenCache[s] = {};
        if (!(r in CliqzAttrack.instantTokenCache[s]))
            CliqzAttrack.instantTokenCache[s][r] = {'kv' : {}};
        if (!(k in CliqzAttrack.instantTokenCache[s][r]['kv']))
            CliqzAttrack.instantTokenCache[s][r]['kv'][k] = {};
        CliqzAttrack.instantTokenCache[s][r]['kv'][k][tok] = {
          c: 1,
          k_len: kv.k_len,
          v_len: kv.v_len
        };
    },
    sendInstantTokens: function(){
        if (Object.keys(CliqzAttrack.instantTokenCache) > 0) {
            var payl = CliqzAttrack.generatePayload(CliqzAttrack.instantTokenCache, datetime.getHourTimestamp(), true, true);
            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.tokens', 'payload': payl});
            CliqzAttrack.instantTokenCache = {};
        }
    },
    sendTokens: function() {
        if (CliqzAttrack.tokens && Object.keys(CliqzAttrack.tokens).length > 0) {
            if (CliqzAttrack.local_tracking.isEnabled()) {
                CliqzAttrack.local_tracking.loadTokens(CliqzAttrack.tokens);
            }
            // reset the state
            this._tokens.clear();
        }

        // send block list
        if (CliqzAttrack.blocked && Object.keys(CliqzAttrack.blocked).length > 0) {
            var payl = CliqzAttrack.generatePayload(CliqzAttrack.blocked, datetime.getHourTimestamp(), false, true);
            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.blocked', 'payload': payl});
            // reset the state
            this._blocked.clear();
        }
    },
    pruneSafeKey: function() {
        var day = datetime.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff = datetime.dateString(day);
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
        CliqzAttrack._safekey.setDirty();
    },
    pruneTokenDomain: function() {
        var day = datetime.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff = datetime.dateString(day);
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
        CliqzAttrack._tokenDomain.setDirty();
        CliqzAttrack._tokenDomain.save();
    },
    pruneRequestKeyValue: function() {
        var day = datetime.newUTCDate();
        day.setDate(day.getDate() - CliqzAttrack.safeKeyExpire);
        var dayCutoff  = datetime.dateString(day);
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
        CliqzAttrack._requestKeyValue.setDirty();
        CliqzAttrack._requestKeyValue.save();
    },
    cleanLocalBlocked: function() {
        var delay = CliqzAttrack.localBlockExpire,
            hour = datetime.newUTCDate();
        hour.setHours(hour.getHours() - delay);
        var hourCutoff = datetime.hourString(hour);
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
            hour = datetime.newUTCDate();
        hour.setHours(hour.getHours() - delay);
        var hourCutoff = datetime.hourString(hour);
        if (CliqzAttrack.lastUpdate[0] > hourCutoff &&
            CliqzAttrack.lastUpdate[1] > hourCutoff)
            return true;
        return false;
    },
    checkWrongToken: function(key) {
        CliqzAttrack.cleanLocalBlocked();
        // send max one time a day
        var day = datetime.getTime().slice(0, 8),
            wrongTokenLastSent = persist.get_value('wrongTokenLastSent', datetime.getTime().slice(0, 8));
        if (wrongTokenLastSent == day) return;  // max one signal per day
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
                        if (!CliqzAttrack.isBloomFilterEnabled()) {
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
                        } else {
                            if (!(bloomFilter.bloomFilter.test(s)) ||
                                (s in CliqzAttrack.safeKey && k in CliqzAttrack.safeKey[s]) ||
                                (bloomFilter.bloomFilter.test(s) && (bloomFilter.bloomFilter.test(s + k) || bloomFilter.bloomFilter.test(s + v)))) {
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
            }
            if (_wrongSource) countWrongPage++;
        }
        // send signal
        // sum checkedToken & blockedToken
        for (var h in CliqzAttrack.checkedToken) countCheckedToken += CliqzAttrack.checkedToken[h];
        for (var h in CliqzAttrack.blockedToken) countBlockedToken += CliqzAttrack.blockedToken[h];
        for (var h in CliqzAttrack.loadedPage) countLoadedPage += CliqzAttrack.loadedPage[h];

        var data = {
            'wrongToken': countWrongPage,
            'checkedToken': countCheckedToken,
            'blockedToken': countBlockedToken,
            'wrongPage': countWrongPage,
            'loadedPage': countLoadedPage
        };
        var payl = CliqzAttrack.generatePayload(data, wrongTokenLastSent, false, true);
        CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.FP', 'payload': payl});
        persist.set_value("wrongTokenLastSent", day);
        CliqzAttrack._updated = {};
    },
    loadRemoteWhitelists: function() {
        var today = datetime.getTime().substring(0, 8),
            safeKeyExtVersion = persist.get_value('safeKeyExtVersion', ''),
            tokenWhitelistVersion = persist.get_value('tokenWhitelistVersion', '');
        CliqzUtils.httpGet(CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK +"?"+ today, function(req) {
            // on load
            var versioncheck = JSON.parse(req.response);
            // new version available
            if(versioncheck['safekey_version'] != safeKeyExtVersion) {
                if (CliqzAttrack.debug) CliqzUtils.log("New version of CliqzAttrack.safeKey available ("+ safeKeyExtVersion +" -> "+ versioncheck['safekey_version'] +")", "attrack");
                if(versioncheck['force_clean'] == true) {
                    if (CliqzAttrack.debug) CliqzUtils.log("Force clean CliqzAttrack.safeKey", "attrack");
                    CliqzAttrack._safekey.clear();
                    CliqzAttrack._requestKeyValue.clear();
                }
                CliqzAttrack.loadRemoteSafeKey();
            } else {
                if (CliqzAttrack.debug) CliqzUtils.log("CliqzAttrack.safeKey version up-to-date", "attrack");
            }
            if(versioncheck['token_whitelist_version'] != tokenWhitelistVersion) {
                if (CliqzAttrack.debug) CliqzUtils.log("New version of CliqzAttrack.tokenExtWhitelist available ("+ tokenWhitelistVersion +" -> "+ versioncheck['token_whitelist_version'] +")", "attrack");
                CliqzAttrack.loadRemoteTokenWhitelist();
            } else {
                if (CliqzAttrack.debug) CliqzUtils.log("CliqzAttrack.tokenExtWhitelist version up-to-date", "attrack");
            }
            // To prevent accidental update of the config file which might enable scramble for AMO users which might not respect
            // tracker.txt and they can be removed by the AB test but we will lose data collection
            // if ('obfuscateMethod' in versioncheck) CliqzAttrack.obfuscateMethod = versioncheck['obfuscateMethod'];
            if ('placeHolder' in versioncheck) CliqzAttrack.placeHolder = versioncheck['placeHolder'];
            // version check may specify the cutoff for short tokens (default 8.)
            if (versioncheck.shortTokenLength) CliqzAttrack.shortTokenLength = parseInt(versioncheck.shortTokenLength);
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
        CliqzAttrack.blockReportList = {};
        CliqzUtils.loadResource(CliqzAttrack.URL_BLOCK_REPORT_LIST, function(req) {
            try {
                CliqzAttrack.blockReportList = JSON.parse(req.response);
            } catch(e) {
                CliqzAttrack.blockReportList = {};
            }
        });
    },
    loadRemoteTokenWhitelist: function() {
        var today = datetime.getTime().substring(0, 8);
        CliqzUtils.httpGet(
            CliqzAttrack.URL_TOKEN_WHITELIST +"?"+ today,
            function(req){
                var tokenExtWhitelist = JSON.parse(req.response),
                    tokenWhitelistVersion = md5(req.response);
                CliqzAttrack._tokenWhitelist.setValue(tokenExtWhitelist);
                persist.set_value('tokenWhitelistVersion', tokenWhitelistVersion);
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded new whitelist version "+ tokenWhitelistVersion, "attrack");
                CliqzAttrack.checkWrongToken('token');
                CliqzAttrack.lastUpdate[1] = datetime.getTime();
                persist.set_value('lastUpdate', JSON.stringify(CliqzAttrack.lastUpdate));
            },
            function() {},
            10000);
    },
    loadRemoteSafeKey: function() {
        var today = datetime.getTime().substring(0, 8);
        CliqzUtils.httpGet(
            CliqzAttrack.URL_SAFE_KEY +"?"+ today,
            function(req) {
                var safeKey = JSON.parse(req.response),
                    s, k,
                    safeKeyExtVersion = md5(req.response);
                for (s in safeKey) {
                    for (k in safeKey[s]) {
                        // r for remote keys
                        safeKey[s][k] = [safeKey[s][k], 'r'];
                    }
                }
                persist.set_value("safeKeyExtVersion", safeKeyExtVersion);
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
                if (CliqzAttrack.debug) CliqzUtils.log("Loaded new safekey version "+ safeKeyExtVersion, "attrack");
                CliqzAttrack.pruneSafeKey();
                CliqzAttrack.checkWrongToken('safeKey');
                CliqzAttrack.lastUpdate[0] = datetime.getTime();
                persist.set_value('lastUpdate', JSON.stringify(CliqzAttrack.lastUpdate));
                CliqzAttrack._safekey.setDirty();
                CliqzAttrack._safekey.save();
            },
            function() {
                // on error
            }, 10000
        );
    },
    updateBloomFilter: function() {
        CliqzAttrack.bloomFilter.checkUpdate(function() {
            CliqzAttrack.lastUpdate[0] = datetime.getTime();
            CliqzAttrack.lastUpdate[0] = datetime.getTime();
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
    checkTokens: function(url_parts, source_url, cookievalue, stats, source_url_parts) {
        // bad tokens will still be returned in the same format

        var s = getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        // If it's a rare 3rd party, we don't do the rest
        if (!CliqzAttrack.isBloomFilterEnabled() && !(s in CliqzAttrack.tokenExtWhitelist) ||
            CliqzAttrack.isBloomFilterEnabled() && (!(bloomFilter.bloomFilter.testSingle(s)))) return [];

        var sourceD = md5(source_url_parts.hostname).substr(0, 16);
        var today = datetime.getTime().substr(0, 8);

        if (url_parts['query'].length == 0 && url_parts['parameters'].length == 0) return [];
        var tok;

        var badTokens = [];

        // stats keys
        ['cookie', 'private', 'cookie_b64', 'private_b64', 'safekey', 'whitelisted',
         'cookie_newToken', 'cookie_countThreshold', 'private_newToken', 'private_countThreshold',
         'short_no_hash', 'cookie_b64_newToken', 'cookie_b64_countThreshold', 'private_b64_newToken',
         'private_b64_countThreshold', 'qs_newToken', 'qs_countThreshold', ].forEach(function(k) {stats[k] = 0;});

        var _countCheck = function(tok) {
            // for token length < 12 and may be not a hash, we let it pass
            if (tok.length < 12 && !hash.isHash(tok))
                return 0;
            // update tokenDomain
            tok = md5(tok);
            if (CliqzAttrack.tokenDomain[tok] === undefined)
                CliqzAttrack.tokenDomain[tok] = {};
            CliqzAttrack.tokenDomain[tok][sourceD] = today;
            CliqzAttrack._tokenDomain.setDirty()
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
                CliqzAttrack._blocked.setDirty();
            }
            // local logging of blocked tokens
            var hour = datetime.getTime(),
                source = md5(source_url);

            if (!(source in CliqzAttrack.localBlocked)) CliqzAttrack.localBlocked[source] = {};
            if (!(s in CliqzAttrack.localBlocked[source])) CliqzAttrack.localBlocked[source][s] = {};
            if (!(k in CliqzAttrack.localBlocked[source][s])) CliqzAttrack.localBlocked[source][s][k] = {};
            if (!(v in CliqzAttrack.localBlocked[source][s][k])) CliqzAttrack.localBlocked[source][s][k][v] = {};
            if (!(hour in CliqzAttrack.localBlocked[source][s][k][v])) CliqzAttrack.localBlocked[source][s][k][v][hour] = 0;
            CliqzAttrack.localBlocked[source][s][k][v][hour]++;
        };

        var _checkTokens = function(key, val) {
            var hour = datetime.getTime();
            if (!(hour in CliqzAttrack.checkedToken)) CliqzAttrack.checkedToken[hour] = 0;
            CliqzAttrack.checkedToken[hour]++;
            var tok = dURIC(val);
            while (tok != dURIC(tok)) {
                tok = dURIC(tok);
            }

            if (tok.length < CliqzAttrack.shortTokenLength || source_url.indexOf(tok) > -1) return;

            // Bad values (cookies)
            for (var c in cookievalue) {
                if ((tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(tok) > -1) {
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
                if ((tok.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(tok) > -1) {
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
                    if ((b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) || c.indexOf(b64) > -1) {
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
                    if (b64.indexOf(c) > -1 && c.length >= CliqzAttrack.shortTokenLength) {
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
            if (!CliqzAttrack.isBloomFilterEnabled() &&  CliqzAttrack.safeKey[s] && CliqzAttrack.safeKey[s][md5(key)] ||
                CliqzAttrack.isBloomFilterEnabled() && CliqzAttrack.safeKey[s] &&
                (CliqzAttrack.safeKey[s][md5(key)] || bloomFilter.bloomFilter.testSingle(s + md5(key)))) {
                stats['safekey']++;
                return;
            }

            if (source_url.indexOf(tok) == -1) {
                if((!CliqzAttrack.isBloomFilterEnabled()) && (!(md5(tok) in CliqzAttrack.tokenExtWhitelist[s])) ||
                   CliqzAttrack.isBloomFilterEnabled() && (!(bloomFilter.bloomFilter.testSingle(s + md5(tok))))) {
                    var cc = _countCheck(tok);
                    _incrStats(cc, 'qs', tok, key, val);
                } else
                    stats['whitelisted']++;
            }
        };

        url_parts.getKeyValues().forEach(function (kv) {
          _checkTokens(kv.k, kv.v);
        });

        // update blockedToken
        var hour = datetime.getTime();
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
            if (!CliqzAttrack.isBloomFilterEnabled() && !(s in CliqzAttrack.tokenExtWhitelist) ||
                CliqzAttrack.isBloomFilterEnabled() && !CliqzAttrack.bloomFilter.bloomFilter.testSingle(s)) continue;

            if (!CliqzAttrack.isBloomFilterEnabled() && !(md5(tok) in CliqzAttrack.tokenExtWhitelist[s]) ||
                CliqzAttrack.isBloomFilterEnabled() && !CliqzAttrack.bloomFilter.bloomFilter.testSingle(s + md5(tok)))
                badHeaders[key] = tok;
        }
        return badHeaders;
    },
    examineTokens: function(url_parts, callback) {
        var day = datetime.newUTCDate();
        var today = datetime.dateString(day);
        // save appeared tokens with field name
        // mark field name as "safe" if different values appears
        var s = getGeneralDomain(url_parts.hostname);
        s = md5(s).substr(0, 16);
        url_parts.getKeyValuesMD5().filter(function (kv) {
          return kv.v_len >= CliqzAttrack.shortTokenLength;
        }).forEach(function (kv) {
            var key = kv.k,
                tok = kv.v;
            if (CliqzAttrack.safeKey[s] &&
                CliqzAttrack.safeKey[s][key])
                return;
            if (CliqzAttrack.requestKeyValue[s] == null)
                CliqzAttrack.requestKeyValue[s] = {};
            if (CliqzAttrack.requestKeyValue[s][key] == null)
                CliqzAttrack.requestKeyValue[s][key] = {};

            CliqzAttrack.requestKeyValue[s][key][tok] = today;
            // see at least 3 different value until it's safe
            if (Object.keys(CliqzAttrack.requestKeyValue[s][key]).length > 2) {
                if (CliqzAttrack.safeKey[s] == null)
                    CliqzAttrack.safeKey[s] = {};
                if (!(key in CliqzAttrack.safeKey[s]) ||
                    CliqzAttrack.safeKey[s][key][0] != today)
                    callback(s, key, today);
                CliqzAttrack.safeKey[s][key] = [today, 'l'];
                CliqzAttrack._safekey.setDirty();
                // keep the last seen token
                CliqzAttrack.requestKeyValue[s][key] = {tok: today};
            }
            CliqzAttrack._requestKeyValue.setDirty();
        });
    },
    extractKeyTokens: function(url_parts, refstr) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        var keyTokens = url_parts.getKeyValuesMD5(),
            s = md5(url_parts.hostname).substr(0, 16);
        refstr = md5(refstr).substr(0, 16);
        CliqzAttrack.saveKeyTokens(s, keyTokens, refstr, CliqzAttrack.cacheInstantTokens);
    },
    extractHeaderTokens: function(url_parts, refstr, header) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        var keyTokens = [];
        for (var k in header) {
            var tok = header[k];
            tok = dURIC(dURIC(tok));
            if (tok.length >= CliqzAttrack.shortTokenLength) {
              keyTokens.push({
                k: md5(k),
                v: md5(tok),
                k_len: k.length,
                v_len: tok.length
              });
            }
        }
        if (Object.keys(keyTokens).length > 0) {
            var s = md5(url_parts.hostname + url_parts.path);
            refstr = md5(refstr).substr(0, 16);
            CliqzAttrack.saveKeyTokens(s, keyTokens, refstr, CliqzAttrack.cacheInstantTokens);
        }
    },
    checkPostReq: function(body, badTokens, cookies) {
        for (var p in CliqzAttrack.privateValues) {
            cookies[p] = true;
        }
        for (var c in cookies) {
            if (c.length < CliqzAttrack.shortTokenLength) continue;
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
    saveKeyTokens: function(s, keyTokens, r, callback) {
        // anything here should already be hash
        if (keyTokens.length === 0) return;
        if (CliqzAttrack.tokens[s] == null) CliqzAttrack.tokens[s] = {};
        if (CliqzAttrack.tokens[s][r] == null) CliqzAttrack.tokens[s][r] = {'c': 0, 'kv': {}};
        CliqzAttrack.tokens[s][r]['c'] =  (CliqzAttrack.tokens[s][r]['c'] || 0) + 1;
        for (var kv of keyTokens) {
            var tok = kv.v,
                k = kv.k;
            if (CliqzAttrack.tokens[s][r]['kv'][k] == null) CliqzAttrack.tokens[s][r]['kv'][k] = {};
            if (CliqzAttrack.tokens[s][r]['kv'][k][tok] == null) {
                CliqzAttrack.tokens[s][r]['kv'][k][tok] = {
                  c: 0,
                  k_len: kv.k_len,
                  v_len: kv.v_len
                };
                // TODO: replace count with checksum
                callback(s, r, kv);
            }
            CliqzAttrack.tokens[s][r]['kv'][k][tok].c += 1;
        }
        this._tokens.setDirty();
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
                    var hour = datetime.getTime();
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
          if (!CliqzAttrack.isBloomFilterEnabled())
            return md5(getGeneralDomain(domain)).substring(0, 16) in CliqzAttrack.tokenExtWhitelist;
          else
            return CliqzAttrack.bloomFilter.bloomFilter.testSingle(md5(getGeneralDomain(domain)).substring(0, 16));
        }),
        plain_data = tab_data.asPlainObject();

      trackers.forEach(function(dom) {
        result.trackers[dom] = {};
        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'tokens_blocked', 'req_aborted'].forEach(function (k) {
          result.trackers[dom][k] = plain_data.tps[dom][k] || 0;
        });
        result.cookies.allowed += result.trackers[dom]['cookie_set'] - result.trackers[dom]['cookie_blocked'];
        result.cookies.blocked += result.trackers[dom]['cookie_blocked'];
        result.requests.safe += result.trackers[dom]['c'] - result.trackers[dom]['bad_qs'];
        result.requests.unsafe += result.trackers[dom]['bad_qs'];

        let tld = getGeneralDomain(dom),
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
      try {
        var tabId = CliqzUtils.getWindow().gBrowser.selectedTab.linkedBrowser._loadContext.DOMWindowID;
      } catch (e) {
      }
      return CliqzAttrack.getTabBlockingInfo(tabId);
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
      CliqzUtils.setPref(CliqzAttrack.ENABLE_PREF, true);
      if (!module_only) {
        CliqzUtils.setPref('attrackBlockCookieTracking', true);
        CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
        CliqzUtils.setPref('attrackRefererTracking', true);
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
      CliqzUtils.setPref(CliqzAttrack.ENABLE_PREF, false);
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
