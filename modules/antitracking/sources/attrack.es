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
import { AttrackBloomFilter } from 'antitracking/bloom-filter';
import * as datetime from 'antitracking/time';
import TrackingTable from 'antitracking/local-tracking-table';
import CliqzHumanWeb from 'human-web/human-web';
import QSWhitelist from 'antitracking/qs-whitelists';
import BlockLog from 'antitracking/block-log';
import { utils, events } from 'core/cliqz';
import {ChannelListener} from 'antitracking/channel-listener';
import ResourceLoader from 'core/resource-loader';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/AddonManager.jsm");

var countReload = false;
var nsIHttpChannel = Ci.nsIHttpChannel;
var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);

var cListener = new ChannelListener();

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
    VERSIONCHECK_URL: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    // URL_ALERT_TEMPLATE: 'chrome://cliqz/content/anti-tracking-index.html',
    // URL_ALERT_TEMPLATE_2: 'chrome://cliqz/content/anti-tracking-index-2.html',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    ENABLE_PREF: 'antiTrackTest',
    debug: false,
    msgType:'attrack',
    timeCleaningCache: 180*1000,
    timeAfterLink: 5*1000,
    timeActive: 20*1000,
    timeBootup: 10*1000,
    bootupTime: Date.now(),
    bootingUp: true,
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
    blockingFailed:{},
    trackReload:{},
    reloadWhiteList:{},
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    shortTokenLength: 8,
    safekeyValuesThreshold: 4,
    qsBlockRule: null,  // list of domains should be blocked instead of shuffling
    blocked: null,  // log what's been blocked
    placeHolder: '',
    observerService: Components.classes["@mozilla.org/observer-service;1"]
                                .getService(Components.interfaces.nsIObserverService),
    tp_events: tp_events,
    tokens: null,
    instantTokenCache: {},
    requestKeyValue: null,
    recentlyModified: new TempSet(),
    cliqzHeader: 'CLIQZ-AntiTracking',
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
        case 'empty':
            return '';
        case 'replace':
            return shuffle(s);
        case 'same':
            return s;
        case 'placeholder':
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
            if (!CliqzAttrack.qs_whitelist.isReady()) {
                return;
            }

            var aChannel = subject.QueryInterface(nsIHttpChannel);
            var requestContext = new HttpRequestContext(subject);
            var url = requestContext.url;
            if (!url || url == '') return;
            var url_parts = URLInfo.get(url);

            if (requestContext.isFullPage()) {
                CliqzAttrack.tp_events.onFullPage(url_parts, requestContext.getOuterWindowID());
                if (CliqzAttrack.isTrackerTxtEnabled()) {
                    TrackerTXT.get(url_parts).update();
                }
                CliqzAttrack.blockLog.incrementLoadedPages();
                return;
            }

            // find the ok tokens fields
            var isPrivate = requestContext.isChannelPrivate();
            if (!isPrivate) {
                CliqzAttrack.examineTokens(url_parts);
            }

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
                CliqzAttrack.extractKeyTokens(url_parts, source_url_parts['hostname'], isPrivate, CliqzAttrack.saveKeyTokens);
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
                    tp_events.incrementStat(req_log, 'c');
                    if(url_parts['query'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_qs');
                    }
                    if(url_parts['parameters'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_ps');
                    }
                    if(url_parts['fragment'].length > 0) {
                        tp_events.incrementStat(req_log, 'has_fragment');
                    }
                    let content_type = requestContext.getContentPolicyType();
                    if (!content_type) {
                        CliqzAttrack.tp_events.incrementStat(req_log, "type_unknown");
                    } else {
                        CliqzAttrack.tp_events.incrementStat(req_log, "type_" + content_type);
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
                            tp_events.incrementStat(req_log, 'token.has_'+ key);
                            tp_events.incrementStat(req_log, 'token.'+ key, stats[key]);
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
                            tp_events.incrementStat(req_log, 'req_rule_aborted');
                            return;
                        }
                    }
                }

                if(badTokens.length > 0) {
                    tp_events.incrementStat(req_log, 'bad_qs');
                    tp_events.incrementStat(req_log, 'bad_tokens', badTokens.length);
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

                    if (badTokens.length > 0 && CliqzAttrack.qs_whitelist.isUpToDate()) {
                        // determin action based on tracker.txt
                        var rule = CliqzAttrack.getDefaultRule(),
                            _trackerTxt = TrackerTXT.get(source_url_parts);
                        if (!CliqzAttrack.isForceBlockEnabled() && CliqzAttrack.isTrackerTxtEnabled()) {
                            if (_trackerTxt.last_update === null) {
                                // The first update is not ready yet for this first party, allow it
                                tp_events.incrementStat(req_log, 'tracker.txt_not_ready' + rule);
                                return;
                            }
                            rule = _trackerTxt.getRule(url_parts.hostname);
                        }
                        if (rule == 'block') {
                            subject.cancel(Components.results.NS_BINDING_ABORTED);
                            tp_events.incrementStat(req_log, 'token_blocked_' + rule);
                        } else {
                            var tmp_url = aChannel.URI.spec;
                            for (var i = 0; i < badTokens.length; i++) {
                                if (tmp_url.indexOf(badTokens[i]) < 0) {
                                    badTokens[i] = encodeURIComponent(badTokens[i])
                                }
                                tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule, CliqzAttrack.replacement));
                            }
                            aChannel.setRequestHeader(CliqzAttrack.cliqzHeader, ' ', false);
                            cListener = new ChannelListener(CliqzAttrack.cliqzHeader);
                            aChannel.notificationCallbacks = cListener;
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
                    tp_events.incrementStat(req_log, 'has_post');

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
                                    tp_events.incrementStat(req_log, 'post_altered');
                                }
                                tp_events.incrementStat(req_log, 'bad_post');

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
            if (!CliqzAttrack.qs_whitelist.isReady()) {
                return;
            }
            var aChannel = subject.QueryInterface(nsIHttpChannel),
                requestContext = new HttpRequestContext(subject),
                isPrivate = requestContext.isChannelPrivate(),
                url = requestContext.url;
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
            if (requestContext.isFullPage()) {
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
                CliqzAttrack.extractHeaderTokens(url_parts, source_url_parts['hostname'], headers, isPrivate, CliqzAttrack.saveKeyTokens);
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
                    tp_events.incrementStat(req_log, 'resp_ob');
                    Object.keys(stats).forEach(function(key) {
                        tp_events.incrementStat(req_log, 'header.' + key, stats[key] || 0);
                    });
                }
                if (Object.keys(badHeaders) > 0) {
                    tp_events.incrementStat(req_log, 'bad_headers');
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
            if (requestContext.isFullPage()) {
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

            if ((source_url_parts && source_url_parts['hostname'] == 'browser' && source_url_parts['path'] == "/content/browser.xul") ||
                (source_url === '')) {
                // extension_resource type may indicate favicon, check if it looks like a favicon url
                var baseurl = url.split('#')[0];
                if(url_parts.path.indexOf('/favicon.') == 0 || baseurl in CliqzAttrack.favicons) {
                    // block favicon cookies
                    req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                    tp_events.incrementStat(req_log, 'cookie_allow_favicon');
                    CliqzAttrack.allowCookie(aChannel, url, {'dst': 'favicon', 'src': url_parts.hostname, 'data': cookie_data, 'ts': curr_time, 'type': 'favicon'}, "favicon");
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
            }

            req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
            tp_events.incrementStat(req_log, 'cookie_set');
            if (source_url.indexOf('about:')==0) {
                // it's a brand new tab, and the url is loaded externally,
                // about:home, about:blank
                tp_events.incrementStat(req_log, 'cookie_allow_newtab');
                CliqzAttrack.allowCookie(aChannel, url, {'dst': url_parts.hostname, 'src': source_url, 'data': cookie_data, 'ts': curr_time}, "about:blank");
                return;
            }

            // check if domain is whitelisted,
            if (CliqzAttrack.isInWhitelist(url_parts.hostname)) {
                tp_events.incrementStat(req_log, 'cookie_allow_whitelisted');
                if (CliqzAttrack.debug) CliqzUtils.log("Is whitelisted (type: direct): " + url, CliqzAttrack.LOG_KEY);
                return;
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
                tp_events.incrementStat(req_log, 'cookie_allow_visitcache');
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
                            tp_events.incrementStat(req_log, 'cookie_allow_userinit');
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
                                tp_events.incrementStat(req_log, 'cookie_allow_oauth');
                                tp_events.incrementStat(req_log, 'req_oauth');
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
                        tp_events.incrementStat(req_log, 'cookie_blocked');
                        tp_events.incrementStat(req_log, 'cookie_block_tp1');
                        CliqzAttrack.blockCookie(aChannel, source_url_parts.hostname, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type1')
                        return;
                    }
                    else {
                        // was not enabled, therefore the cookie gets sent
                        // cookie_sent
                        tp_events.incrementStat(req_log, 'bad_cookie_sent');
                    }

                }

            }
            else {
                if (CliqzAttrack.bootingUp) {

                    if ((curr_time - CliqzAttrack.bootupTime) > CliqzAttrack.timeBootup) CliqzAttrack.bootingUp = false;

                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Booting up: "  + url + " : " + url_parts.hostname, CliqzAttrack.LOG_KEY);
                    var key = url_parts.hostname + url_parts.path;
                    if (key && key!='') CliqzAttrack.bootupWhitelistCache[key] = true;
                    tp_events.incrementStat(req_log, 'cookie_allow_bootingup');
                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED because bootup: " + key, CliqzAttrack.LOG_KEY);

                }
                else {

                    var key = url_parts.hostname + url_parts.path;
                    if (CliqzAttrack.bootupWhitelistCache[key]==null) {

                        if (CliqzAttrack.isCookieEnabled(source_url_parts.hostname) && !(CliqzAttrack.reloadWhiteList[_key])) {
                            // blocking cookie
                            var src = null;
                            if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                            tp_events.incrementStat(req_log, 'cookie_blocked');
                            tp_events.incrementStat(req_log, 'cookie_block_tp2');
                            CliqzAttrack.blockCookie(aChannel, url, {'src': src, 'dst': url_parts.hostname, 'data': cookie_data, 'ts': curr_time}, 'type2')
                            return;
                        }
                        else {
                            // was not enabled, therefore the cookie gets sent
                            // cookie_sent
                            tp_events.incrementStat(req_log, 'bad_cookie_sent');
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
        if (CliqzAttrack.debug) CliqzUtils.log("ALLOWING because of " + reason + " " + req_metadata['dst'] + ' %% ' + url, CliqzAttrack.LOG_KEY);
    },
    blockCookie: function(channel, url, req_metadata, reason) {
        // Ref sent:
        // CliqzUtils.log("REF SENT: " + channel.getRequestHeader("Referer") + " to: " + req_metadata['dst']);
        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie REMOVED (" + reason + "): "  + req_metadata['dst'] + " >>> " + url, CliqzAttrack.LOG_KEY);
        // blocking cookie
        channel.setRequestHeader("Cookie", "", false);
        channel.setRequestHeader(CliqzAttrack.cliqzHeader, ' ', false);
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
    getDefaultRule: function() {
        if (CliqzAttrack.isForceBlockEnabled()) {
            return 'block';
        } else {
            return getDefaultTrackerTxtRule();
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
    isForceBlockEnabled: function() {
        return CliqzUtils.getPref('attrackForceBlock', false);
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
                    lastHour = persist.getValue(name + "lastRun") || timestamp;
                persist.setValue(name +"lastRun", timestamp);
                return timestamp != lastHour;
            };
        }

        pacemaker.register(CliqzAttrack.updateConfig, 3 * 60 * 60 * 1000);

        // send instant cache tokens whenever hour changes
        pacemaker.register(CliqzAttrack.sendTokens, 5 * 60 * 1000);
        // if the hour has changed
        pacemaker.register(CliqzAttrack.hourChanged, two_mins, timeChangeConstraint("hourChanged", "hour"));

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

        pacemaker.register(function annotateSafeKeys() {
            CliqzAttrack.qs_whitelist.annotateSafeKeys(CliqzAttrack.requestKeyValue);
        }, 10 * 60 * 60 * 1000);

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

        hash.init();

        // load all caches:
        // Large dynamic caches are loaded via the persist module, which will lazily propegate changes back
        // to the browser's sqlite database.
        // Large static caches (e.g. token whitelist) are loaded from sqlite
        // Smaller caches (e.g. update timestamps) are kept in prefs
        persist.init();
        this._tokens = new persist.AutoPersistentObject("tokens", (v) => CliqzAttrack.tokens = v, 60000);
        //this._blocked = new persist.AutoPersistentObject("blocked", (v) => CliqzAttrack.blocked = v, 300000);

        CliqzAttrack.qs_whitelist = CliqzAttrack.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
        CliqzAttrack.qs_whitelist.init();
        CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist);
        CliqzAttrack.blockLog.init();

        this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", (v) => CliqzAttrack.requestKeyValue = v, 60000);
        // force clean requestKeyValue
        events.sub("attrack:safekeys_updated", (version, forceClean) => {
            if (forceClean) {
                CliqzAttrack._requestKeyValue.clear();
            }
        });

        if (CliqzAttrack.qsBlockRule == null) CliqzAttrack.loadBlockRules();

        // load tracker companies data
        this._trackerLoader = new ResourceLoader( ['antitracking', 'tracker_owners.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/tracker_owners_list.json',
            cron: 24 * 60 * 60 * 1000,
        });
        this._trackerLoader.load().then(CliqzAttrack._parseTrackerCompanies);
        this._trackerLoader.onUpdate(CliqzAttrack._parseTrackerCompanies);

        // load cookie whitelist
        this._cookieWhitelistLoader = new ResourceLoader( ['antitracking', 'cookie_whitelist.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/whitelist/cookie_whitelist.json',
            cron: 24 * 60 * 60 * 1000
        });
        var updateCookieWhitelist = (data) => { CliqzAttrack.whitelist = data }
        this._cookieWhitelistLoader.load().then(updateCookieWhitelist);
        this._cookieWhitelistLoader.onUpdate(updateCookieWhitelist);

        // @konarkm : Since we already have window, passing it.
        // Saves from calling CliqzUtils.getWindow() in getPrivateValues();
        CliqzAttrack.checkInstalledAddons();


        // var win_id = CliqzUtils.getWindowID();

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }

        CliqzAttrack.initPacemaker();
        pacemaker.start();

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

        HttpRequestContext.initCleaner();

        // note: if a 0 value were to be saved, the default would be preferred. This is ok because these options
        // cannot have 0 values.
        CliqzAttrack.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold')) || 4;
        CliqzAttrack.shortTokenLength = parseInt(persist.getValue('shortTokenLength')) || 8;

        CliqzAttrack.placeHolder = persist.getValue('placeHolder', CliqzAttrack.placeHolder);
        CliqzAttrack.cliqzHeader = persist.getValue('cliqzHeader', CliqzAttrack.cliqzHeader);
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

        CliqzAttrack.blockLog.destroy();
        CliqzAttrack.qs_whitelist.destroy();

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

        pacemaker.stop();
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
            payl = CliqzAttrack.qs_whitelist.attachVersion(payl);
        return payl;
    },
    sendTokens: function(hourChanged) {
        // send tokens every 5 minutes
        let data = {},
            hour = datetime.getTime();
        if (!hourChanged) {  // send 1/12 of data
            for (let tracker in CliqzAttrack.tokens) {
                if (Object.keys(data).length > Object.keys(CliqzAttrack.tokens).length / 12) {
                    break;
                }
                let tokenData = CliqzAttrack.tokens[tracker];
                if (!(tokenData.lastSent) || tokenData.lastSent < hour) {
                    data[tracker] = tokenData;
                    delete(data[tracker].lastSent);
                    delete(CliqzAttrack.tokens[tracker]);
                }
            }
        } else {  // send everything that has not been send in the last hour
            for (let tracker in CliqzAttrack.tokens) {
                let tokenData = CliqzAttrack.tokens[tracker];
                if (!(tokenData.lastSent) || tokenData.lastSent < hour) {
                    data[tracker] = tokenData;
                    delete(data[tracker].lastSent);
                    delete(CliqzAttrack.tokens[tracker]);
                }
            }
        }
        if (Object.keys(data).length > 0) {
            var payl = CliqzAttrack.generatePayload(data, datetime.getHourTimestamp(), true, true);
            CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.tokens', 'payload': payl});
        }
        CliqzAttrack._tokens.setDirty();
    },
    hourChanged: function() {
        // clear the tokens if the hour changed
        if (CliqzAttrack.tokens && Object.keys(CliqzAttrack.tokens).length > 0) {
            if (CliqzAttrack.local_tracking.isEnabled()) {
                CliqzAttrack.local_tracking.loadTokens(CliqzAttrack.tokens);
            }
            // reset the state
            CliqzAttrack.sendTokens(true);
        }

        // trigger other hourly events
        events.pub("attrack:hour_changed");
    },
    updateConfig: function() {
        var today = datetime.getTime().substring(0, 10);
        utils.httpGet(CliqzAttrack.VERSIONCHECK_URL +"?"+ today, function(req) {
            // on load
            var versioncheck = JSON.parse(req.response);

            // config in versioncheck
            if (versioncheck.placeHolder) {
                persist.setValue('placeHolder', versioncheck.placeHolder);
                CliqzAttrack.placeHolder = versioncheck.placeHolder;
            }

            if (versioncheck.shortTokenLength) {
                persist.saveValue('shortTokenLength', versioncheck.shortTokenLength);
                CliqzAttrack.shortTokenLength = parseInt(versioncheck.shortTokenLength) || CliqzAttrack.shortTokenLength;
            }

            if (versioncheck.safekeyValuesThreshold) {
                persist.saveValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
                CliqzAttrack.safekeyValuesThreshold = parseInt(versioncheck.safekeyValuesThreshold) || CliqzAttrack.safekeyValuesThreshold;
            }

            if (versioncheck.cliqzHeader) {
                persist.setValue('cliqzHeader', versioncheck.cliqzHeader);
                CliqzAttrack.cliqzHeader = versioncheck.cliqzHeader;
            }

            // fire events for list update
            events.pub("attrack:updated_config", versioncheck);
        }, utils.log, 10000);
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
    isInWhitelist: function(domain) {
        if(!CliqzAttrack.whitelist) return false;
        var keys = CliqzAttrack.whitelist;
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
        if (!CliqzAttrack.qs_whitelist.isTrackerDomain(s)) return [];

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
            CliqzAttrack.blockLog.tokenDomain.addTokenOnFirstParty(tok, sourceD);
            return CliqzAttrack.blockLog.tokenDomain.getNFirstPartiesForToken(tok);
        };

        var _incrStats = function(cc, prefix, tok, key, val) {
            if (cc == 0)
                stats['short_no_hash']++;
            else if (cc < CliqzAttrack.tokenDomainCountThreshold)
                stats[prefix+'_newToken']++;
            else {
                _addBlockLog(s, key, val, prefix);
                badTokens.push(val);
                if (cc == CliqzAttrack.tokenDomainCountThreshold)
                    stats[prefix + '_countThreshold']++;
                stats[prefix]++;
                return true;
            }
            return false;
        };

        var _addBlockLog = (s, key, val, prefix) => {
            CliqzAttrack.blockLog.blockLog.add(source_url, s, key, val, prefix);
        }

        var _checkTokens = function(key, val) {
            CliqzAttrack.blockLog.incrementCheckedTokens();

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
            if (CliqzAttrack.qs_whitelist.isSafeKey(s, md5(key))) {
                stats['safekey']++;
                return;
            }

            if (source_url.indexOf(tok) == -1) {
                if (!CliqzAttrack.qs_whitelist.isSafeToken(s, md5(tok))) {
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
        CliqzAttrack.blockLog.incrementBlockedTokens(badTokens.length);
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
            if (CliqzAttrack.qs_whitelist.isTrackerDomain(s)) continue;

            if (CliqzAttrack.qs_whitelist.isSafeToken(s, md5(tok)))
                badHeaders[key] = tok;
        }
        return badHeaders;
    },
    examineTokens: function(url_parts) {
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
            if (CliqzAttrack.qs_whitelist.isSafeKey(s, key))
                return;
            if (CliqzAttrack.requestKeyValue[s] == null)
                CliqzAttrack.requestKeyValue[s] = {};
            if (CliqzAttrack.requestKeyValue[s][key] == null)
                CliqzAttrack.requestKeyValue[s][key] = {};

            CliqzAttrack.requestKeyValue[s][key][tok] = today;
            // see at least 3 different value until it's safe
            let valueCount = Object.keys(CliqzAttrack.requestKeyValue[s][key]).length
            if ( valueCount > CliqzAttrack.safekeyValuesThreshold ) {
                CliqzAttrack.qs_whitelist.addSafeKey(s, key, valueCount);
                // keep the last seen token
                CliqzAttrack.requestKeyValue[s][key] = {tok: today};
            }
            CliqzAttrack._requestKeyValue.setDirty();
        });
    },
    extractKeyTokens: function(url_parts, refstr, isPrivate, callback) {
        // keys, value of query strings will be sent in md5
        // url, refstr will be sent in half of md5
        var keyTokens = url_parts.getKeyValuesMD5();
        if (keyTokens.length > 0) {
            var s = md5(url_parts.hostname).substr(0, 16);
            refstr = md5(refstr).substr(0, 16);
            callback(s, keyTokens, refstr, isPrivate);
        }
    },
    extractHeaderTokens: function(url_parts, refstr, header, isPrivate, callback) {
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
            callback(s, keyTokens, refstr, isPrivate);
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
    saveKeyTokens: function(s, keyTokens, r, isPrivate) {
        // anything here should already be hash
        if (CliqzAttrack.tokens[s] == null) CliqzAttrack.tokens[s] = {lastSent: datetime.getTime()};
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
                    v_len: kv.v_len,
                    isPrivate: isPrivate
                };
            }
            CliqzAttrack.tokens[s][r]['kv'][k][tok].c += 1;
        }
        CliqzAttrack._tokens.setDirty();
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
                    var win = tabbrowser.getBrowserForOuterWindowID(int_id)
                    // check for http URI.
                    if (win !== undefined) {
                        return win.currentURI && (win.currentURI.schemeIs('http') || win.currentURI.schemeIs('https'))
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
                            // check for http URI.
                            if (tabwindow.document.documentURI.substring(0, 4) === 'http') {
                                let contents = tabwindow._content;
                                return true;
                            } else {
                                return false;
                            }
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
      var result = {
          hostname: '',
          cookies: {allowed: 0, blocked: 0},
          requests: {safe: 0, unsafe: 0},
          trackers: {},
          companies: {}
        };

      if (! (tab_id in CliqzAttrack.tp_events._active) ) {
        // no tp event, but 'active' tab = must reload for data
        // otherwise -> system tab
        if ( CliqzAttrack.tab_listener.isWindowActive(tab_id) ) {
            result.reload = true;
        }
        result.error = 'No Data';
        return result;
      }

      var tab_data = CliqzAttrack.tp_events._active[tab_id],
        trackers = Object.keys(tab_data.tps).filter(function(domain) {
          return CliqzAttrack.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16));
        }),
        plain_data = tab_data.asPlainObject();
      result.hostname = tab_data.hostname;

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
    /** Parse tracker owners list {Company: [list, of, domains]}, into lookup table {domain: Company}
     */
    _parseTrackerCompanies: function(company_list) {
      var rev_list = {};
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
      }
    },
    /** Disables anti-tracking immediately.
     */
    disableModule: function() {
      CliqzUtils.setPref(CliqzAttrack.ENABLE_PREF, false);
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
      CliqzAttrack.saveSourceDomainWhitelist();
    }
};

export default CliqzAttrack;
