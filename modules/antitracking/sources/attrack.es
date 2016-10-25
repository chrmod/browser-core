/*
 * This module prevents user from 3rd party tracking
 */
import pacemaker from 'antitracking/pacemaker';
import * as persist from 'antitracking/persistent-state';
import TempSet from 'antitracking/temp-set';
import HttpRequestContext from 'antitracking/webrequest-context';
import PageEventTracker from 'antitracking/tp_events';
import md5 from 'antitracking/md5';
import { parseURL, dURIC, getHeaderMD5, URLInfo, shuffle, findOauth } from 'antitracking/url';
import { getGeneralDomain, sameGeneralDomain } from 'antitracking/domain';
import { HashProb } from 'antitracking/hash';
import { TrackerTXT, sleep, getDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { AttrackBloomFilter } from 'antitracking/bloom-filter';
import * as datetime from 'antitracking/time';
import QSWhitelist from 'antitracking/qs-whitelists';
import BlockLog from 'antitracking/block-log';
import { utils, events } from 'core/cliqz';
import ResourceLoader from 'core/resource-loader';
import core from 'core/background';
import CookieChecker from 'antitracking/cookie-checker';
import TrackerProxy from 'antitracking/tracker-proxy';
import { compressionAvailable, splitTelemetryData, compressJSONToBase64, generatePayload } from 'antitracking/utils';
import * as browser from 'platform/browser';
import WebRequest from 'core/webrequest';
import telemetry from 'antitracking/telemetry';
import console from 'core/console';

import { determineContext, skipInternalProtocols, checkSameGeneralDomain } from 'antitracking/components/context';
import PageLogger from 'antitracking/components/page-logger';
import TokenExaminer from 'antitracking/components/token-examiner';
import TokenTelemetry from 'antitracking/components/token-telemetry';
import DomChecker from 'antitracking/components/dom-checker';
import TokenChecker from 'antitracking/components/token-checker';
import BlockRules from 'antitracking/components/block-rules';

var countReload = false;

/**
 * Add padding characters to the left of the given string.
 *
 * @param {string} str  - original string.
 * @param {string} char - char used for padding the string.
 * @param {number} size - desired size of the resulting string (after padding)
**/
function leftpad(str, char, size) {
  // This function only makes sens if `char` is a character.
  if (char.length != 1) {
    throw new Error("`char` argument must only contain one character");
  }

  if (str.length >= size) {
    return str;
  }
  else {
    return (char.repeat(size - str.length) + str);
  }
}

/**
 * Remove any trace of source domains, or hashes of source domains
 * from the data to be sent to the backend. This is made to ensure
 * there is no way to backtrack to user's history using data sent to
 * the backend.
 *
 * Replace all the keys of `trackerData` (which are 16-chars prefixes of
 * hash of the source domain) by unique random strings of size 16 (which is
 * expected by backend). We don't have to make them unique among all data,
 * it is enough to ensure unicity on a per-tracker basis.
 *
 * @param {Object} trackerData - associate source domains to key/value pairs.
**/
function anonymizeTrackerTokens(trackerData) {
  // Random base id
  const min = 1;
  const max = Number.MAX_SAFE_INTEGER;
  let randId = Math.floor(Math.random() * (max - min + 1)) + min;

  // Anonymize the given tracker data
  let anonymizedTrackerData = {};

  for (let originalKey in trackerData) {
    const newRandomKey = leftpad(randId.toString().substr(0, 16), '0', 16);
    randId = (randId + 1) % max;
    anonymizedTrackerData[newRandomKey] = trackerData[originalKey];
  }

  return anonymizedTrackerData;
}

function logBreakageEnabled() {
  return utils.getPref('attrackLogBreakage', false);
}

var CliqzAttrack = {
    VERSION: '0.96',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    VERSIONCHECK_URL: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
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
    whitelist: null,
    obsCounter: {},
    similarAddon: false,
    blockingFailed:{},
    reloadWhiteList:{},
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    shortTokenLength: 8,
    safekeyValuesThreshold: 4,
    cChecker: new CookieChecker(),
    qsBlockRule: null,  // list of domains should be blocked instead of shuffling
    blocked: null,  // log what's been blocked
    placeHolder: '',
    tp_events: null,
    tokens: null,
    instantTokenCache: {},
    requestKeyValue: null,
    recentlyModified: new TempSet(),
    cliqzHeader: 'CLIQZ-AntiTracking',
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
    bootupWhitelistCache: {},
    blockedCache: {},
    visitCache: {},
    contextOauth: {}, linksFromDom: {},
    cookiesFromDom: {},
    loadedTabs: {},
    breakageCache: {},
    getBrowserMajorVersion: function() {
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
        return parseInt(appInfo.version.split('.')[0]);
    },
    getPrivateValues: function(window) {
        // creates a list of return values of functions may leak private info
        var p = {};
        // var navigator = CliqzUtils.getWindow().navigator;
        var navigator = window.navigator;
        // plugins
        for (var i = 0; i < navigator.plugins.length; i++) {
            var name = navigator.plugins[i].name;
            if (name.length >= 8) {
                p[name] = true;
            }
        }
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
    onOpenRequest: [],
    executeComponentStack: function(components, initialState, logKey) {
      const state = initialState;
      const response = {};
      for (let i=0; i<components.length; i++) {
        // console.log(logKey, state.url, 'Step: ' + components[i].name);
        try {
          const cont = components[i](state, response);
          if (!cont) {
            console.log(logKey, state.url, 'Break at', components[i].name);
            break;
          }
        } catch(e) {
          console.error(logKey, 'Step exception', e);
          break;
        }
      }
      console.log(logKey, state.url, response);
      return response;
    },
    httpopenObserver: {
        observe : function(requestDetails) {
          return CliqzAttrack.executeComponentStack(CliqzAttrack.onOpenRequest, requestDetails, 'ATTRACK.OPEN');
        }
    },
    httpResponseObserver: {
        observe: function(requestDetails) {
            if (!CliqzAttrack.qs_whitelist.isReady()) {
                return;
            }
            var requestContext = new HttpRequestContext(requestDetails),
                url = requestContext.url;

            if (!url) return;
            var url_parts = URLInfo.get(url);
            var referrer = requestContext.getReferrer();
            var same_gd = false;

            var source_url = requestContext.getSourceURL(),
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
                    CliqzAttrack.tp_events.onRedirect(redirect_url_parts, requestContext.getOuterWindowID(), requestContext.isChannelPrivate());
                }
                return;
            }

            if (source_url == '' || source_url.indexOf('about:')==0) return;

            if (source_url != null) {
                source_url_parts = URLInfo.get(source_url);
                // extract and save tokens
                same_gd = sameGeneralDomain(url_parts.hostname, source_url_parts.hostname) || false;
                if (same_gd) return;

                if(url_parts.hostname != source_url_parts.hostname)
                    var req_log = CliqzAttrack.tp_events.get(url, url_parts, source_url, source_url_parts, source_tab);
                if (req_log) {
                    CliqzAttrack.tp_events.incrementStat(req_log, 'resp_ob');
                    CliqzAttrack.tp_events.incrementStat(req_log, 'content_length', parseInt(requestContext.getResponseHeader('Content-Length')) || 0);
                    CliqzAttrack.tp_events.incrementStat(req_log, `status_${requestContext.channel.responseStatus}`);
                }

                // is cached?
                let cached = requestContext.isCached;
                CliqzAttrack.tp_events.incrementStat(req_log, cached ? 'cached' : 'not_cached');


                // broken by attrack?
                if (CliqzAttrack.recentlyModified.has(source_tab + url) && requestContext.channel.responseStatus >= 400 && logBreakageEnabled()) {
                  const dedupKey = [source_url, url_parts.hostname, url_parts.path].join('-');
                  CliqzAttrack.breakageCache[dedupKey] = CliqzAttrack.breakageCache[dedupKey] || {
                    hostname: md5(source_url_parts.hostname).substring(0, 16),
                    path: md5(source_url_parts.path),
                    status: requestContext.channel.responseStatus,
                    url_info: {
                      protocol: url_parts.protocol,
                      hostname: url_parts.hostname,
                      path: md5(url_parts.path),
                      params: url_parts.getKeyValuesMD5(),
                      status: requestContext.channel.responseStatus
                    },
                    context: requestContext.getWindowDepth(),
                    count: 0
                  };
                  CliqzAttrack.breakageCache[dedupKey].count += 1;
                }
            }
        }
    },
    httpmodObserver: {
        observe : function(requestDetails) {
          return CliqzAttrack.executeComponentStack(CliqzAttrack.onModifyRequest, requestDetails, 'ATTRACK.MOD');
        }
    },
    allowCookie: function(url, req_metadata, reason) {
        if (CliqzAttrack.debug) CliqzUtils.log("ALLOWING because of " + reason + " " + req_metadata['dst'] + ' %% ' + url, CliqzAttrack.LOG_KEY);
    },
    blockCookie: function(url, req_metadata, reason) {
        if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie REMOVED (" + reason + "): "  + req_metadata['dst'] + " >>> " + url, CliqzAttrack.LOG_KEY);
        CliqzAttrack.blockedCache[req_metadata['dst']] = req_metadata['ts'];
    },
    onTabLocationChange: function(evnt) {
        CliqzAttrack.domChecker.onTabLocationChange(evnt);
        var url = evnt.url;

        CliqzAttrack.linksFromDom[url] = {};

        if (evnt.isLoadingDocument) {
            // when a new page is loaded, try to extract internal links and cookies
            var doc = evnt.document;
            CliqzAttrack.loadedTabs[url] = false;

            if(doc) {
                if (doc.body) {
                    CliqzAttrack.recordLinksForURL(url);
                }
                doc.addEventListener(
                    'DOMContentLoaded',
                    function(ev) {
                        CliqzAttrack.loadedTabs[url] = true;
                        CliqzAttrack.recordLinksForURL(url);
                    });
                CliqzAttrack.clearDomLinks();
            }
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
        return CliqzUtils.getPref('attrackBlockCookieTracking', true);
    },
    isQSEnabled: function() {
        return CliqzUtils.getPref('attrackRemoveQueryStringTracking', true);
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
    initPacemaker: function() {
        let two_mins = 2 * 60 * 1000;

        // create a constraint which returns true when the time changes at the specified fidelity
        function timeChangeConstraint(name, fidelity) {
            if (fidelity == "day") fidelity = 8;
            else if(fidelity == "hour") fidelity = 10;
            return function (task) {
                var timestamp = datetime.getTime().slice(0, fidelity),
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

        function cleanTimestampCache(cacheObj, timeout, currTime) {
          const keys = Object.keys(cacheObj)
          keys.forEach(function(k) {
            if (currTime - cacheObj[k] || 0 > timeout) {
              delete cacheObj[k];
            }
          });
        }

        pacemaker.register(function clean_caches(currTime) {
          // visit cache
          cleanTimestampCache(CliqzAttrack.visitCache, CliqzAttrack.timeCleaningCache, currTime);
          // reload whitelist
          cleanTimestampCache(CliqzAttrack.reloadWhiteList, CliqzAttrack.timeCleaningCache, currTime);
           // blocked cache
          cleanTimestampCache(CliqzAttrack.blockedCache, CliqzAttrack.timeCleaningCache, currTime);
          // record cache
          cleanTimestampCache(CliqzAttrack.linksRecorded, 1000, currTime);
        }, two_mins);

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
        // let hourly = 60 * 60 * 1000;
        // pacemaker.register(CliqzAttrack.pruneRequestKeyValue, hourly);

        // pacemaker.register(function annotateSafeKeys() {
        //     CliqzAttrack.qs_whitelist.annotateSafeKeys(CliqzAttrack.requestKeyValue);
        // }, 10 * 60 * 60 * 1000);

        pacemaker.register(function pushBreakageTelemetry() {
          Object.keys(CliqzAttrack.breakageCache).forEach((k) => {
            const payload = CliqzAttrack.breakageCache[k];
            const msg = {
              'type': telemetry.msgType,
              'action': 'attrack.breakage',
              'payload': CliqzAttrack.generateAttrackPayload(payload)
            };
            telemetry.telemetry(msg);
          });
          CliqzAttrack.breakageCache = {};
        }, 10 * 60 * 1000);

    },
    /** Global module initialisation.
     */
    init: function() {
        // disable for older browsers
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }

        // Replace getWindow functions with window object used in init.
        if (CliqzAttrack.debug) CliqzUtils.log("Init function called:", CliqzAttrack.LOG_KEY);

        if (!CliqzAttrack.hashProb) {
          CliqzAttrack.hashProb = new HashProb();
        }

        // load all caches:
        // Large dynamic caches are loaded via the persist module, which will lazily propegate changes back
        // to the browser's sqlite database.
        // Large static caches (e.g. token whitelist) are loaded from sqlite
        // Smaller caches (e.g. update timestamps) are kept in prefs
        if (!this._tokens) {
          this._tokens = new persist.AutoPersistentObject("tokens", (v) => CliqzAttrack.tokens = v, 60000);
        }
        //this._blocked = new persist.AutoPersistentObject("blocked", (v) => CliqzAttrack.blocked = v, 300000);

        CliqzAttrack.qs_whitelist = CliqzAttrack.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
        const initPromises = [];
        initPromises.push(CliqzAttrack.qs_whitelist.init());
        CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist);
        CliqzAttrack.blockLog.init();

        if (!this._requestKeyValue) {
          this._requestKeyValue = new persist.AutoPersistentObject("requestKeyValue", (v) => CliqzAttrack.requestKeyValue = v, 60000);
        }
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

        CliqzAttrack.checkInstalledAddons();

        if (CliqzAttrack.visitCache == null) {
            CliqzAttrack.visitCache = {};
        }

        CliqzAttrack.initPacemaker();
        pacemaker.start();

        WebRequest.onBeforeRequest.addListener(CliqzAttrack.httpopenObserver.observe, undefined, ['blocking']);
        WebRequest.onBeforeSendHeaders.addListener(CliqzAttrack.httpmodObserver.observe, undefined, ['blocking']);
        WebRequest.onHeadersReceived.addListener(CliqzAttrack.httpResponseObserver.observe);

        try {
            CliqzAttrack.disabled_sites = new Set(JSON.parse(CliqzUtils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));
        } catch(e) {
            CliqzAttrack.disabled_sites = new Set();
        }

        // note: if a 0 value were to be saved, the default would be preferred. This is ok because these options
        // cannot have 0 values.
        CliqzAttrack.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold')) || 4;
        CliqzAttrack.shortTokenLength = parseInt(persist.getValue('shortTokenLength')) || 8;

        CliqzAttrack.placeHolder = persist.getValue('placeHolder', CliqzAttrack.placeHolder);
        CliqzAttrack.cliqzHeader = persist.getValue('cliqzHeader', CliqzAttrack.cliqzHeader);

        CliqzAttrack.trackerProxy = new TrackerProxy();
        CliqzAttrack.trackerProxy.init();

        CliqzAttrack.tp_events = new PageEventTracker((payloadData) => {
          // take telemetry data to be pushed and add module metadata
          const enabled = {
            'qs': CliqzAttrack.isQSEnabled(),
            'cookie': CliqzAttrack.isCookieEnabled(),
            'bloomFilter': CliqzAttrack.isBloomFilterEnabled(),
            'trackTxt': CliqzAttrack.isTrackerTxtEnabled(),
            'forceBlock': CliqzAttrack.isForceBlockEnabled(),
          };
          const updateInTime = CliqzAttrack.qs_whitelist.isUpToDate();
          payloadData.forEach((pageload) => {
            const payl = {
              'data': [pageload],
              'ver': CliqzAttrack.VERSION,
              'conf': enabled,
              'addons': CliqzAttrack.similarAddon,
              'updateInTime': updateInTime,
            }
            telemetry.telemetry({'type': telemetry.msgType, 'action': 'attrack.tp_events', 'payload': payl});
          });
        });

        CliqzAttrack.initComponents();

        return Promise.all(initPromises);
    },
    initComponents: function() {
      CliqzAttrack.unloadComponents();

      const pageLogger = new PageLogger(CliqzAttrack.tp_events, CliqzAttrack.blockLog);
      const tokenExaminer = new TokenExaminer(CliqzAttrack.qs_whitelist, CliqzAttrack.shortTokenLength, CliqzAttrack.safekeyValuesThreshold, CliqzAttrack.safeKeyExpire);
      const tokenTelemetry = new TokenTelemetry({
        generateAttrackPayload: CliqzAttrack.generateAttrackPayload,
        msgType: telemetry.msgType,
        telemetry: telemetry.telemetry
      });
      CliqzAttrack.domChecker = new DomChecker();
      const tokenChecker = new TokenChecker(CliqzAttrack.qs_whitelist, CliqzAttrack.blockLog, CliqzAttrack.tokenDomainCountThreshold, CliqzAttrack.shortTokenLength, {}, CliqzAttrack.hashProb);
      const blockRules = new BlockRules();

      CliqzAttrack.components = [pageLogger, tokenExaminer, tokenTelemetry, CliqzAttrack.domChecker,
          tokenChecker, blockRules];

      CliqzAttrack.components.forEach((comp) => {
        if (comp.init) {
          comp.init();
        }
      });

      function cancelRecentlyModified(state, response) {
        const sourceTab = state.requestContext.getOriginWindowID();
        const url = state.url;
        if (CliqzAttrack.recentlyModified.contains(sourceTab + url)) {
          CliqzAttrack.recentlyModified.delete(sourceTab + url);
          response.cancel = true;
          return false;
        }
        return true;
      };

      CliqzAttrack.onOpenRequest = [
        CliqzAttrack.qs_whitelist.isReady.bind(CliqzAttrack.qs_whitelist),
        determineContext,
        pageLogger.checkIsMainDocument.bind(pageLogger),
        skipInternalProtocols,
        checkSameGeneralDomain,
        cancelRecentlyModified,
        tokenExaminer.examineTokens.bind(tokenExaminer),
        tokenTelemetry.extractKeyTokens.bind(tokenTelemetry),
        pageLogger.attachStatCounter.bind(pageLogger),
        pageLogger.logRequestMetadata.bind(pageLogger),
        CliqzAttrack.domChecker.checkDomLinks.bind(CliqzAttrack.domChecker),
        CliqzAttrack.domChecker.parseCookies.bind(CliqzAttrack.domChecker),
        tokenChecker.findBadTokens.bind(tokenChecker),
        function checkShouldProxy(state) {
          if (CliqzAttrack.trackerProxy.checkShouldProxy(state.url)) {
            state.incrementStat('proxy');
          }
          return true;
        },
        function checkHasBadTokens(state) {
          return (state.badTokens.length > 0)
        },
        blockRules.applyBlockRules.bind(blockRules),
        function checkQSEnabled(state) {
          const _key = state.requestContext.getOriginWindowID() + ":" + state.sourceUrl;
          return CliqzAttrack.isQSEnabled() && !(CliqzAttrack.reloadWhiteList[_key]);
        },
        function checkSourceWhitelisted(state) {
          if (CliqzAttrack.isSourceWhitelisted(state.sourceUrlParts.hostname)) {
            state.incrementStat('source_whitelisted');
            return false;
          }
          return true;
        },
        function checkShouldBlock(state) {
          return state.badTokens.length > 0 && CliqzAttrack.qs_whitelist.isUpToDate();
        },
        function applyBlock(state, response) {
          const badTokens = state.badTokens;
          var rule = CliqzAttrack.getDefaultRule(),
              _trackerTxt = TrackerTXT.get(state.sourceUrlParts);
          if (!CliqzAttrack.isForceBlockEnabled() && CliqzAttrack.isTrackerTxtEnabled()) {
              if (_trackerTxt.last_update === null) {
                  // The first update is not ready yet for this first party, allow it
                  state.incrementStat('tracker.txt_not_ready' + rule);
                  return;
              }
              rule = _trackerTxt.getRule(state.urlParts.hostname);
          }
          console.log('ATTRACK', rule, 'URL:', state.urlParts.hostname, state.urlParts.path, 'TOKENS:', badTokens);
          if (rule == 'block') {
              state.incrementStat('token_blocked_' + rule);
              response.cancel = true;
              return false;
          } else {
              var tmp_url = state.requestContext.url;
              for (var i = 0; i < badTokens.length; i++) {
                  if (tmp_url.indexOf(badTokens[i]) < 0) {
                      badTokens[i] = encodeURIComponent(badTokens[i])
                  }
                  tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule, CliqzAttrack.replacement));
              }

              // In case unsafe tokens were in the hostname, the URI is not valid
              // anymore and we can cancel the request.
              if (!tmp_url.startsWith(state.urlParts.protocol + '://' + state.urlParts.hostname)) {
                response.cancel = true;
                return false;
              }

              state.incrementStat('token_blocked_' + rule);

              if (CliqzAttrack.trackerProxy.checkShouldProxy(tmp_url)) {
                  state.incrementStat('proxy');
              }
              CliqzAttrack.recentlyModified.add(state.requestContext.getOriginWindowID() + state.url, 30000);
              CliqzAttrack.recentlyModified.add(state.requestContext.getOriginWindowID() + tmp_url, 30000);

              response.redirectUrl = tmp_url;
              response.requestHeaders = response.requestHeaders || [];
              response.requestHeaders.push({name: CliqzAttrack.cliqzHeader, value: ' '})
              return true;
          }
        }
      ];
      CliqzAttrack.onModifyRequest = [
        determineContext,
        // pageLogger.checkIsMainDocument.bind(pageLogger),
        function checkIsMainDocument(state) {
          return !state.requestContext.isFullPage();
        },
        skipInternalProtocols,
        checkSameGeneralDomain,
        pageLogger.attachStatCounter.bind(pageLogger),
        function catchMissedOpenListener(state, response) {
          if (state.reqLog && state.reqLog.c === 0) {
            // take output from httpopenObserver and copy into our response object
            const openResponse = CliqzAttrack.httpopenObserver.observe(state) || {};
            Object.keys(openResponse).forEach((k) => {
              response[k] = openResponse[k];
            });
          }
          return true;
        },
        function checkHasCookie(state) {
          state.cookieData = state.requestContext.getCookieData();
          if (state.cookieData && state.cookieData.length>10) {
            state.incrementStat('cookie_set');
            return true;
          } else {
            return false;
          }
        },
        function checkNewTab(state) {
          if (state.sourceUrl.indexOf('about:') === 0) {
            state.incrementStat('cookie_allow_newtab');
            return false;
          }
          return true;
        },
        function checkIsWhitelisted(state) {
          if (CliqzAttrack.isInWhitelist(state.urlParts.hostname)) {
            state.incrementStat('cookie_allow_whitelisted');
            return false;
          }
          return true;
        },
        function checkVisitCache(state) {
          state.hostGD = getGeneralDomain(state.urlParts.hostname);
          state.sourceGD = getGeneralDomain(state.sourceUrlParts.hostname);
          const diff = Date.now() - (CliqzAttrack.visitCache[state.hostGD] || 0);
          if (diff < CliqzAttrack.timeActive && CliqzAttrack.visitCache[state.sourceGD]) {
            state.incrementStat('cookie_allow_visitcache');
            return false;
          }
          return true;
        },
        function checkContextFromEvent(state) {
          if (CliqzAttrack.cChecker.contextFromEvent) {
            const time = Date.now();
            const url = state.url;

            var diff = time - (CliqzAttrack.cChecker.contextFromEvent.ts || 0);
            if (diff < CliqzAttrack.timeAfterLink) {

                const hostGD = getGeneralDomain(state.urlParts.hostname);
                if (hostGD === CliqzAttrack.cChecker.contextFromEvent.cGD) {
                    CliqzAttrack.visitCache[state.hostGD] = time;
                    var src = null;
                    state.incrementStat('cookie_allow_userinit_same_context_gd');
                    return false;
                }
                var pu = url.split(/[?&;]/)[0];
                if (CliqzAttrack.cChecker.contextFromEvent.html.indexOf(pu)!=-1) {
                    if (CliqzAttrack.debug) CliqzUtils.log(">>> Cookie ALLOWED (type2): " + pu + " " + CliqzAttrack.cChecker.contextFromEvent.html, CliqzAttrack.LOG_KEY);

                    // the url is in pu
                    if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                        CliqzAttrack.visitCache[state.hostGD] = time;
                        stateincrementStat('cookie_allow_userinit_same_gd_link');
                        return false;
                    }
                }
            }
          }
          return true;
        },
        function checkOAuth(state) {
          if (CliqzAttrack.contextOauth) {
              const time = Date.now();
              const url = state.url;
              var diff = time - (CliqzAttrack.contextOauth.ts || 0);
              if (diff < CliqzAttrack.timeActive) {

                  var pu = url.split(/[?&;]/)[0];

                  if (CliqzAttrack.contextOauth.html.indexOf(pu)!=-1) {
                      // the url is in pu
                      if (state.urlParts && state.urlParts.hostname && state.urlParts.hostname!='') {
                          let contextFromEvent = browser.contextFromEvent();
                          if (contextFromEvent && contextFromEvent.html && contextFromEvent.html.indexOf(pu)!=-1) {

                              if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and click " + url, CliqzAttrack.LOG_KEY);
                              var host = getGeneralDomain(url_parts.hostname);
                              var src = null;
                              if (source_url_parts && source_url_parts.hostname) src = source_url_parts.hostname;
                              tp_events.incrementStat(req_log, 'cookie_allow_oauth');
                              tp_events.incrementStat(req_log, 'req_oauth');
                              CliqzAttrack.allowCookie(url, {'dst': url_parts.hostname, 'src': src, 'data': cookie_data, 'ts': curr_time}, "contextOauth");
                              return false;
                          }
                          else {
                              if (CliqzAttrack.debug) CliqzUtils.log("OAUTH and NOT click " + url, CliqzAttrack.LOG_KEY);
                          }
                      }
                  }
              }
          }
          return true;
        },
        function shouldBlockCookie(state) {
          const _key = state.requestContext.getOriginWindowID() + ":" + state.sourceUrl;
          const shouldBlock = CliqzAttrack.isCookieEnabled(state.sourceUrlParts.hostname) && !(CliqzAttrack.reloadWhiteList[_key]);
          if (!shouldBlock) {
            state.incrementStat('bad_cookie_sent');
          }
          return shouldBlock;
        },
        function blockCookie(state, response) {
          state.incrementStat('cookie_blocked');
          state.incrementStat('cookie_block_tp1');
          response.requestHeaders = response.requestHeaders || [];
          response.requestHeaders.push({name: 'Cookie', value: ''});
          response.requestHeaders.push({name: CliqzAttrack.cliqzHeader, value: ' '});
          return true;
        }
      ];
    },
    unloadComponents: function() {
      (CliqzAttrack.components || []).forEach((comp) => {
        if (comp.unload) {
          comp.unload();
        }
      });
      CliqzAttrack.components = [];
    },
    /** Per-window module initialisation
     */
    initWindow: function(window) {
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }
        CliqzAttrack.getPrivateValues(window);
    },
    unload: function() {
        // don't need to unload if disabled
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }
        //Check is active usage, was sent

        // force send tab telemetry data
        CliqzAttrack.tp_events.commit(true, true);
        CliqzAttrack.tp_events.push(true);

        CliqzAttrack.blockLog.destroy();
        CliqzAttrack.qs_whitelist.destroy();

        WebRequest.onBeforeRequest.removeListener(CliqzAttrack.httpopenObserver.observe);
        WebRequest.onBeforeSendHeaders.removeListener(CliqzAttrack.httpmodObserver.observe);
        WebRequest.onHeadersReceived.removeListener(CliqzAttrack.httpResponseObserver.observe);

        pacemaker.stop();

        CliqzAttrack.trackerProxy.destroy();

        this._trackerLoader.stop();
        this._cookieWhitelistLoader.stop();
        if (this._blockRulesLoader) {
          this._blockRulesLoader.stop();
        }

        CliqzAttrack.unloadComponents();

        events.un_sub("attrack:safekeys_updated");
    },
    checkInstalledAddons: function() {
        System.import('platform/antitracking/addon-check').then( (addons) => {
            CliqzAttrack.similarAddon = addons.checkInstalledAddons();
        }).catch( (e) => {
            utils.log("Error loading addon checker", "attrack");
        });
    },
    generateAttrackPayload: function(data, ts) {
        const extraAttrs = CliqzAttrack.qs_whitelist.getVersion();
        extraAttrs.ver = CliqzAttrack.VERSION;
        ts = ts || datetime.getHourTimestamp();
        return generatePayload(data, ts, false, extraAttrs);
    },
    sendTokens: function() {
        // send tokens every 5 minutes
        let data = {},
            hour = datetime.getTime(),
            limit = Object.keys(CliqzAttrack.tokens).length / 12;

        // sort tracker keys by lastSent, i.e. send oldest data first
        let sortedTrackers = Object.keys(CliqzAttrack.tokens).sort((a, b) => {
            return parseInt(CliqzAttrack.tokens[a].lastSent || 0) - parseInt(CliqzAttrack.tokens[b].lastSent || 0)
        });

        for (let i in sortedTrackers) {
            let tracker = sortedTrackers[i];

            if (limit > 0 && Object.keys(data).length > limit) {
                break;
            }

            let tokenData = CliqzAttrack.tokens[tracker];
            if (!(tokenData.lastSent) || tokenData.lastSent < hour) {
                delete(tokenData.lastSent);
                data[tracker] = anonymizeTrackerTokens(tokenData);
                delete(CliqzAttrack.tokens[tracker]);
            }
        }

        if (Object.keys(data).length > 0) {
            const compress = compressionAvailable();

            splitTelemetryData(data, 20000).map((d) => {
                const payl = CliqzAttrack.generateAttrackPayload(d);
                const msg = {
                    'type': telemetry.msgType,
                    'action': 'attrack.tokens',
                    'payload': payl
                };
                if ( compress ) {
                    msg.compressed = true;
                    msg.payload = compressJSONToBase64(payl);
                }
                telemetry.telemetry(msg);
            });
        }
        CliqzAttrack._tokens.setDirty();
    },
    hourChanged: function() {
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
                persist.setValue('shortTokenLength', versioncheck.shortTokenLength);
                CliqzAttrack.shortTokenLength = parseInt(versioncheck.shortTokenLength) || CliqzAttrack.shortTokenLength;
            }

            if (versioncheck.safekeyValuesThreshold) {
                persist.setValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
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
    loadBlockRules: function() {
        CliqzAttrack.qsBlockRule = [];
        CliqzAttrack._blockRulesLoader = new ResourceLoader( ['antitracking', 'anti-tracking-block-rules.json'], {
          remoteURL: CliqzAttrack.URL_BLOCK_RULES,
          cron: 24 * 60 * 60 * 1000,
        });
        const updateRules = (rules) => { CliqzAttrack.qsBlockRule = rules || []};
        CliqzAttrack._blockRulesLoader.load().then(updateRules);
        CliqzAttrack._blockRulesLoader.onUpdate(updateRules);
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
            if (tok.length < 12 && !CliqzAttrack.hashProb.isHash(tok))
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
        if (isPrivate) {
          return;
        }
        var keyTokens = url_parts.getKeyValuesMD5();
        if (keyTokens.length > 0) {
            var s = md5(url_parts.hostname).substr(0, 16);
            refstr = md5(refstr).substr(0, 16);
            callback(s, keyTokens, refstr, isPrivate);
        }
    },
    saveKeyTokens: function(s, keyTokens, r, isPrivate) {
        if (isPrivate) {
          return;
        }
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
                    v_len: kv.v_len
                };
            }
            CliqzAttrack.tokens[s][r]['kv'][k][tok].c += 1;
        }
        CliqzAttrack._tokens.setDirty();
    },
    linksRecorded: {}, // cache when we recorded links for each url
    recordLinksForURL(url) {
      if (CliqzAttrack.loadedTabs[url]) {
        return;
      }
      const now = Date.now();
      const lastQuery = CliqzAttrack.linksRecorded[url] || 0;
      if (now - lastQuery < 1000) {
        return
      }
      CliqzAttrack.linksRecorded[url] = now;
      return Promise.all([

        core.getCookie(url).then(
          cookie => CliqzAttrack.cookiesFromDom[url] = cookie
        ),

        Promise.all([
          core.queryHTML(url, 'a[href]', 'href'),
          core.queryHTML(url, 'link[href]', 'href'),
          core.queryHTML(url, 'script[src]', 'src').then(function (hrefs) {
            return hrefs.filter( href => href.indexOf('http') === 0 );
          }),
        ]).then(function (reflinks) {
          var hrefSet = reflinks.reduce((hrefSet, hrefs) => {
            hrefs.forEach( href => hrefSet[href] = true );
            return hrefSet;
          }, {});

          CliqzAttrack.linksFromDom[url] = hrefSet;
        })

      ]);
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
    /** Get info about trackers and blocking done in a specified tab.
     *
     *  Returns an object describing anti-tracking actions for this page, with keys as follows:
     *    cookies: 'allowed' and 'blocked' counts.
     *    requests: 'safe' and 'unsafe' counts. 'Unsafe' means that unsafe data was seen in a request to a tracker.
     *    trackers: more detailed information about each tracker. Object with keys being tracker domain and values
     *        more detailed blocking data.
     */
    getTabBlockingInfo: function(tabId, url) {
      var result = {
          tab: tabId,
          hostname: '',
          path: '',
          cookies: {allowed: 0, blocked: 0},
          requests: {safe: 0, unsafe: 0},
          trackers: {},
          companies: {},
          ps: null
        };

      // ignore special tabs
      if (url && (url.indexOf('about') == 0 || url.indexOf('chrome') == 0)) {
        result.error = 'Special tab';
        return result;
      }

      if (!(tabId in CliqzAttrack.tp_events._active)) {
        // no tp event, but 'active' tab = must reload for data
        // otherwise -> system tab
        if (browser.isWindowActive(tabId)) {
          result.reload = true;
        }
        result.error = 'No Data';
        return result;
      }

      var tabData = CliqzAttrack.tp_events._active[tabId],
        trackers = Object.keys(tabData.tps).filter(function(domain) {
          return CliqzAttrack.qs_whitelist.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16));
        }),
        plain_data = tabData.asPlainObject(),
        firstPartyCompany = CliqzAttrack.tracker_companies[getGeneralDomain(tabData.hostname)];
      result.hostname = tabData.hostname;
      result.path = tabData.path;

      trackers.forEach(function(dom) {
        result.trackers[dom] = {};
        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs'].forEach(function (k) {
          result.trackers[dom][k] = plain_data.tps[dom][k] || 0;
        });
        // actual block count can be in several different signals, depending on configuration. Aggregate them into one.
        result.trackers[dom].tokens_removed = ['empty', 'replace', 'placeholder', 'block'].reduce((cumsum, action) => {
            return cumsum + (plain_data.tps[dom]['token_blocked_' + action] || 0);
        }, 0);

        result.cookies.allowed += result.trackers[dom]['cookie_set'] - result.trackers[dom]['cookie_blocked'];
        result.cookies.blocked += result.trackers[dom]['cookie_blocked'];
        result.requests.safe += result.trackers[dom]['c'] - result.trackers[dom].tokens_removed;
        result.requests.unsafe += result.trackers[dom].tokens_removed;

        let tld = getGeneralDomain(dom),
          company = tld;
        // find the company behind this tracker. I
        // If the first party is from a tracker company, then do not add the company so that the actual tlds will be shown in the list
        if (tld in CliqzAttrack.tracker_companies && CliqzAttrack.tracker_companies[tld] !== firstPartyCompany) {
          company = CliqzAttrack.tracker_companies[tld];
        }
        if (!(company in result.companies)) {
          result.companies[company] = [];
        }
        result.companies[company].push(dom);
      });

      return result;
    },
    getCurrentTabBlockingInfo: function(_gBrowser) {
      var tabId, urlForTab;
      try {
        var gBrowser = _gBrowser || CliqzUtils.getWindow().gBrowser,
            selectedBrowser = gBrowser.selectedBrowser;
        // on FF < 38 selectBrowser.outerWindowID is undefined, so we get the windowID from _loadContext
        tabId = selectedBrowser.outerWindowID || selectedBrowser._loadContext.DOMWindowID;
        urlForTab = selectedBrowser.currentURI.spec;
      } catch (e) {
      }
      return CliqzAttrack.getTabBlockingInfo(tabId, urlForTab);
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
      telemetry.telemetry({
        'type': telemetry.msgType,
        'action': 'attrack.whitelistDomain',
        'payload': domain
      });
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    removeSourceDomainFromWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.delete(domain);
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    onUrlbarFocus(){
      countReload = true;
    }
};

export default CliqzAttrack;
