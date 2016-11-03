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
import CookieContext from 'antitracking/components/cookie-context';
import TrackerProxy from 'antitracking/components/tracker-proxy';

var countReload = false;

function logBreakageEnabled() {
  return utils.getPref('attrackLogBreakage', false);
}

var CliqzAttrack = {
    VERSION: '0.97',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    VERSIONCHECK_URL: 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
    URL_ALERT_RULES: 'chrome://cliqz/content/anti-tracking-rules.json',
    URL_BLOCK_RULES: 'https://cdn.cliqz.com/anti-tracking/whitelist/anti-tracking-block-rules.json',
    ENABLE_PREF: 'antiTrackTest',
    debug: false,
    msgType:'attrack',
    timeCleaningCache: 180*1000,
    whitelist: null,
    similarAddon: false,
    tokenDomainCountThreshold: 2,
    safeKeyExpire: 7,
    localBlockExpire: 24,
    shortTokenLength: 8,
    safekeyValuesThreshold: 4,
    placeHolder: '',
    tp_events: null,
    recentlyModified: new TempSet(),
    cliqzHeader: 'CLIQZ-AntiTracking',
    obfuscate: function(s, method) {
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
    visitCache: {},
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
    onTabLocationChange: function(evnt) {
        CliqzAttrack.domChecker.onTabLocationChange(evnt);
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
        }, two_mins);

        pacemaker.register(function tp_event_commit() {
            CliqzAttrack.tp_events.commit();
            CliqzAttrack.tp_events.push();
        }, two_mins);

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

        CliqzAttrack.qs_whitelist = CliqzAttrack.isBloomFilterEnabled() ? new AttrackBloomFilter() : new QSWhitelist();
        const initPromises = [];
        initPromises.push(CliqzAttrack.qs_whitelist.init());
        CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist);
        CliqzAttrack.blockLog.init();

        // force clean requestKeyValue
        events.sub("attrack:safekeys_updated", (version, forceClean) => {
            if (forceClean) {
                CliqzAttrack.tokenExaminer.clearCache();
            }
        });

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
      CliqzAttrack.tokenExaminer = new TokenExaminer(CliqzAttrack.qs_whitelist, CliqzAttrack.shortTokenLength, CliqzAttrack.safekeyValuesThreshold, CliqzAttrack.safeKeyExpire);
      const tokenTelemetry = new TokenTelemetry({
        generateAttrackPayload: CliqzAttrack.generateAttrackPayload,
        msgType: telemetry.msgType,
        telemetry: telemetry.telemetry
      });
      CliqzAttrack.domChecker = new DomChecker();
      const tokenChecker = new TokenChecker(CliqzAttrack.qs_whitelist, CliqzAttrack.blockLog, CliqzAttrack.tokenDomainCountThreshold, CliqzAttrack.shortTokenLength, {}, CliqzAttrack.hashProb);
      const blockRules = new BlockRules();
      CliqzAttrack.cookieContext = new CookieContext();
      const trackerProxy = new TrackerProxy();

      CliqzAttrack.components = [pageLogger, CliqzAttrack.tokenExaminer, tokenTelemetry, CliqzAttrack.domChecker,
          tokenChecker, blockRules, CliqzAttrack.cookieContext, trackerProxy];

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
        CliqzAttrack.tokenExaminer.examineTokens.bind(CliqzAttrack.tokenExaminer),
        tokenTelemetry.extractKeyTokens.bind(tokenTelemetry),
        pageLogger.attachStatCounter.bind(pageLogger),
        pageLogger.logRequestMetadata.bind(pageLogger),
        CliqzAttrack.domChecker.checkDomLinks.bind(CliqzAttrack.domChecker),
        CliqzAttrack.domChecker.parseCookies.bind(CliqzAttrack.domChecker),
        tokenChecker.findBadTokens.bind(tokenChecker),
        trackerProxy.checkShouldProxy.bind(trackerProxy),
        function checkHasBadTokens(state) {
          return (state.badTokens.length > 0)
        },
        blockRules.applyBlockRules.bind(blockRules),
        function checkQSEnabled(state) {
          return CliqzAttrack.isQSEnabled();
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
                  tmp_url = tmp_url.replace(badTokens[i], CliqzAttrack.obfuscate(badTokens[i], rule));
              }

              // In case unsafe tokens were in the hostname, the URI is not valid
              // anymore and we can cancel the request.
              if (!tmp_url.startsWith(state.urlParts.protocol + '://' + state.urlParts.hostname)) {
                response.cancel = true;
                return false;
              }

              state.incrementStat('token_blocked_' + rule);

              if (trackerProxy.shouldProxy(tmp_url)) {
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
        function checkIsWhitelisted(state) {
          if (CliqzAttrack.isInWhitelist(state.urlParts.hostname)) {
            state.incrementStat('cookie_allow_whitelisted');
            return false;
          }
          return true;
        },
        CliqzAttrack.cookieContext.checkVisitCache.bind(CliqzAttrack.cookieContext),
        CliqzAttrack.cookieContext.checkContextFromEvent.bind(CliqzAttrack.cookieContext),
        function shouldBlockCookie(state) {
          const _key = state.requestContext.getOriginWindowID() + ":" + state.sourceUrl;
          const shouldBlock = CliqzAttrack.isCookieEnabled(state.sourceUrlParts.hostname);
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
