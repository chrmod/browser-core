/*
 * This module prevents user from 3rd party tracking
 */
import inject from '../core/kord/inject';
import pacemaker from 'antitracking/pacemaker';
import * as persist from 'antitracking/persistent-state';
import TempSet from 'antitracking/temp-set';
import PageEventTracker from 'antitracking/tp_events';
import md5 from 'antitracking/md5';
import { URLInfo, shuffle } from 'antitracking/url';
import { getGeneralDomain } from 'antitracking/domain';
import { HashProb } from 'antitracking/hash';
import { TrackerTXT, getDefaultTrackerTxtRule } from 'antitracking/tracker-txt';
import { AttrackBloomFilter } from 'antitracking/bloom-filter';
import * as datetime from 'antitracking/time';
import QSWhitelist from 'antitracking/qs-whitelists';
import BlockLog from 'antitracking/block-log';
import { utils, events } from 'core/cliqz';
import ResourceLoader from 'core/resource-loader';
import { compressionAvailable, compressJSONToBase64, generatePayload } from 'antitracking/utils';
import * as browser from 'platform/browser';
import WebRequest from 'core/webrequest';
import telemetry from 'antitracking/telemetry';
import console from 'core/console';
import { fetch } from 'core/http';
import Pipeline from './pipeline';

import { determineContext, skipInternalProtocols, checkSameGeneralDomain } from 'antitracking/steps/context';
import PageLogger from 'antitracking/steps/page-logger';
import TokenExaminer from 'antitracking/steps/token-examiner';
import TokenTelemetry from 'antitracking/steps/token-telemetry';
import DomChecker from 'antitracking/steps/dom-checker';
import TokenChecker from 'antitracking/steps/token-checker';
import BlockRules from 'antitracking/steps/block-rules';
import CookieContext from 'antitracking/steps/cookie-context';
import TrackerProxy from 'antitracking/steps/tracker-proxy';
import RedirectTagger from 'antitracking/steps/redirect-tagger';

var countReload = false;

function queryHTML(...args) {
  const core = inject.module('core');
  return core.action('queryHTML', ...args);
}

function getCookie(...args) {
  const core = inject.module('core');
  return core.action('getCookie', ...args);
}

var CliqzAttrack = {
    VERSION: '0.97',
    MIN_BROWSER_VERSION: 35,
    LOG_KEY: 'attrack',
    ENABLE_PREF: 'modules.antitracking.enabled',
    debug: false,
    msgType:'attrack',
    whitelist: null,
    similarAddon: false,
    tp_events: null,
    recentlyModified: new TempSet(),
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
            return CliqzAttrack.config.placeHolder;
        default:
            return CliqzAttrack.config.placeHolder;
        }
    },
    visitCache: {},
    getBrowserMajorVersion: function() {
        var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                        .getService(Components.interfaces.nsIXULAppInfo);
        return parseInt(appInfo.version.split('.')[0]);
    },
    getPrivateValues: function(window) {
        // creates a list of return values of functions may leak private info
        var p = {};
        // var navigator = utils.getWindow().navigator;
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
    httpopenObserver: function(requestDetails) {
      return CliqzAttrack.pipeline.execute('open', requestDetails);
    },
    httpResponseObserver: function(requestDetails) {
      return CliqzAttrack.pipeline.execute('response', requestDetails);
    },
    httpmodObserver: function(requestDetails) {
      return CliqzAttrack.pipeline.execute('modify', requestDetails);
    },
    getDefaultRule: function() {
        if (CliqzAttrack.isForceBlockEnabled()) {
            return 'block';
        } else {
            return getDefaultTrackerTxtRule();
        }
    },
    isEnabled: function() {
        return utils.getPref(CliqzAttrack.ENABLE_PREF, false);
    },
    isCookieEnabled: function(source_hostname) {
        if (source_hostname != undefined && CliqzAttrack.isSourceWhitelisted(source_hostname)) {
            return false;
        }
        return utils.getPref('attrackBlockCookieTracking', true);
    },
    isQSEnabled: function() {
        return utils.getPref('attrackRemoveQueryStringTracking', true);
    },
    isFingerprintingEnabled: function() {
        return utils.getPref('attrackCanvasFingerprintTracking', false);
    },
    isReferrerEnabled: function() {
        return utils.getPref('attrackRefererTracking', false);
    },
    isTrackerTxtEnabled: function() {
        return utils.getPref('trackerTxt', false);
    },
    isBloomFilterEnabled: function() {
        return utils.getPref('attrackBloomFilter', false);
    },
    isForceBlockEnabled: function() {
        return utils.getPref('attrackForceBlock', false);
    },
    initPacemaker: function() {
        const two_mins = 2 * 60 * 1000;

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

        // pacemaker.register(CliqzAttrack.updateConfig, 3 * 60 * 60 * 1000);

        // if the hour has changed
        pacemaker.register(CliqzAttrack.hourChanged, two_mins, timeChangeConstraint("hourChanged", "hour"));

        pacemaker.register(function tp_event_commit() {
            CliqzAttrack.tp_events.commit();
            CliqzAttrack.tp_events.push();
        }, two_mins);

    },
    telemetry: function({ message, raw = false, compress = false, ts = undefined }) {
      if (!message.type) {
        message.type = telemetry.msgType;
      }
      if (raw !== true) {
        message.payload = CliqzAttrack.generateAttrackPayload(message.payload, ts);
      }
      if (compress === true && compressionAvailable()) {
        message.compressed = true;
        message.payload = compressJSONToBase64(message.payload);
      }
      telemetry.telemetry(message);
    },
    /** Global module initialisation.
     */
    init: function(config) {
        this.config = config;
        // disable for older browsers
        if (CliqzAttrack.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
            return;
        }

        // Replace getWindow functions with window object used in init.
        if (CliqzAttrack.debug) utils.log("Init function called:", CliqzAttrack.LOG_KEY);

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
        CliqzAttrack.blockLog = new BlockLog(CliqzAttrack.qs_whitelist, CliqzAttrack.telemetry);
        CliqzAttrack.blockLog.init();

        // force clean requestKeyValue
        events.sub("attrack:safekeys_updated", (version, forceClean) => {
            if (forceClean && CliqzAttrack.pipelineSteps.tokenExaminer) {
                CliqzAttrack.pipelineSteps.tokenExaminer.clearCache();
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

        CliqzAttrack.initPacemaker();
        pacemaker.start();

        WebRequest.onBeforeRequest.addListener(CliqzAttrack.httpopenObserver, undefined, ['blocking', 'requestHeaders']);
        WebRequest.onBeforeSendHeaders.addListener(CliqzAttrack.httpmodObserver, undefined, ['blocking', 'requestHeaders']);
        WebRequest.onHeadersReceived.addListener(CliqzAttrack.httpResponseObserver, undefined, ['responseHeaders']);

        try {
            CliqzAttrack.disabled_sites = new Set(JSON.parse(utils.getPref(CliqzAttrack.DISABLED_SITES_PREF, "[]")));
        } catch(e) {
            CliqzAttrack.disabled_sites = new Set();
        }

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
            CliqzAttrack.telemetry({
              message: {'type': telemetry.msgType, 'action': 'attrack.tp_events', 'payload': payl},
              raw: true,
            });
          });
        });

        CliqzAttrack.initPipeline();

        return Promise.all(initPromises);
    },
    initPipeline: function() {
      CliqzAttrack.unloadPipeline();
      const pipeline = CliqzAttrack.pipeline;

      // initialise classes which are used as steps in listeners
      const steps = {
        pageLogger: new PageLogger(CliqzAttrack.tp_events, CliqzAttrack.blockLog),
        tokenExaminer: new TokenExaminer(CliqzAttrack.qs_whitelist, this.config),
        tokenTelemetry: new TokenTelemetry(CliqzAttrack.telemetry),
        domChecker: new DomChecker(),
        tokenChecker: new TokenChecker(CliqzAttrack.qs_whitelist, CliqzAttrack.blockLog, {}, CliqzAttrack.hashProb, CliqzAttrack.config),
        blockRules: new BlockRules(),
        cookieContext: new CookieContext(),
        trackerProxy: new TrackerProxy(CliqzAttrack.qs_whitelist),
        redirectTagger: new RedirectTagger(),
      };

      CliqzAttrack.pipelineSteps = steps;

      // initialise step objects
      Object.keys(steps).forEach((key) => {
        const step = steps[key];
        if (step.init) {
          step.init();
        }
      });

      // create pipeline for on open request
      pipeline.addAll(['open'], [
        CliqzAttrack.qs_whitelist.isReady.bind(CliqzAttrack.qs_whitelist),
        determineContext,
        steps.pageLogger.logMainDocument.bind(steps.pageLogger),
        skipInternalProtocols,
        checkSameGeneralDomain,
        CliqzAttrack.cancelRecentlyModified.bind(CliqzAttrack),
        steps.tokenExaminer.examineTokens.bind(steps.tokenExaminer),
        steps.tokenTelemetry.extractKeyTokens.bind(steps.tokenTelemetry),
        steps.pageLogger.attachStatCounter.bind(steps.pageLogger),
        steps.pageLogger.logRequestMetadata.bind(steps.pageLogger),
        steps.domChecker.checkDomLinks.bind(steps.domChecker),
        steps.domChecker.parseCookies.bind(steps.domChecker),
        steps.tokenChecker.findBadTokens.bind(steps.tokenChecker),
        steps.trackerProxy.checkShouldProxy.bind(steps.trackerProxy),
        function checkHasBadTokens(state) {
          return (state.badTokens.length > 0)
        },
        steps.blockRules.applyBlockRules.bind(steps.blockRules),
        CliqzAttrack.isQSEnabled.bind(CliqzAttrack),
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
        CliqzAttrack.applyBlock.bind(CliqzAttrack),
      ]);

      // create pipeline for on modify request
      pipeline.addAll(['modify'], [
        determineContext,
        function checkIsMainDocument(state) {
          return !state.requestContext.isFullPage();
        },
        skipInternalProtocols,
        checkSameGeneralDomain,
        steps.pageLogger.attachStatCounter.bind(steps.pageLogger),
        function catchMissedOpenListener(state, response) {
          if ((state.reqLog && state.reqLog.c === 0) || steps.redirectTagger.isFromRedirect(state.url)) {
            // take output from httpopenObserver and copy into our response object
            const openResponse = CliqzAttrack.httpopenObserver(state) || {};
            Object.keys(openResponse).forEach((k) => {
              response[k] = openResponse[k];
            });
          }
          return true;
        },
        function overrideUserAgent(state, response) {
          if (utils.getPref('attrackOverrideUserAgent', false) === true) {
            const domainHash = md5(getGeneralDomain(state.urlParts.hostname)).substring(0, 16);
            if (CliqzAttrack.qs_whitelist.isTrackerDomain(domainHash)) {
              response.requestHeaders = response.requestHeaders || [];
              response.requestHeaders.push({name: 'User-Agent', value: 'CLIQZ'});
              state.incrementStat('override_user_agent');
            }
          }
          return true;
        },
        function checkHasCookie(state) {
          state.cookieData = state.requestContext.getCookieData();
          if (state.cookieData && state.cookieData.length>5) {
            state.incrementStat('cookie_set');
            return true;
          } else {
            return false;
          }
        },
        CliqzAttrack.checkIsCookieWhitelisted.bind(CliqzAttrack),
        steps.cookieContext.checkVisitCache.bind(steps.cookieContext),
        steps.cookieContext.checkContextFromEvent.bind(steps.cookieContext),
        function shouldBlockCookie(state) {
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
          response.requestHeaders.push({name: CliqzAttrack.config.cliqzHeader, value: ' '});
          return true;
        },
      ]);

      // create pipeline for on response received
      pipeline.addAll(['response'], [
        CliqzAttrack.qs_whitelist.isReady.bind(CliqzAttrack.qs_whitelist),
        determineContext,
        function checkMainDocumentRedirects(state) {
          if (state.requestContext.isFullPage()) {
            if ([300, 301, 302, 303, 307].indexOf(state.requestContext.channel.responseStatus) >= 0) {
              // redirect, update location for tab
              // if no redirect location set, stage the tab id so we don't get false data
              let redirect_url = state.requestContext.getResponseHeader("Location");
              let redirect_url_parts = URLInfo.get(redirect_url);
              // if redirect is relative, use source domain
              if (!redirect_url_parts.hostname) {
                redirect_url_parts.hostname = state.urlParts.hostname;
                redirect_url_parts.path = redirect_url;
              }
              CliqzAttrack.tp_events.onRedirect(redirect_url_parts, state.requestContext.getOuterWindowID(), state.requestContext.isChannelPrivate());
            }
            return false;
          }
          return true;
        },
        skipInternalProtocols,
        function skipBadSource(state) {
          return state.sourceUrl !== '' && state.sourceUrl.indexOf('about:') === -1;
        },
        checkSameGeneralDomain,
        steps.redirectTagger.checkRedirectStatus.bind(steps.redirectTagger),
        steps.pageLogger.attachStatCounter.bind(steps.pageLogger),
        function logResponseStats(state) {
          if (state.incrementStat) {
            state.incrementStat('resp_ob');
            state.incrementStat('content_length', parseInt(state.requestContext.getResponseHeader('Content-Length')) || 0);
            state.incrementStat(`status_${state.requestContext.channel.responseStatus}`)
            state.incrementStat(state.requestContext.isCached ? 'cached' : 'not_cached');
          }
          return true;
        },
        function checkSetCookie(state) {
          // if there is a set-cookie header, continue
          const setCookie = state.requestContext.getResponseHeader("Set-Cookie");
          if (setCookie) {
            state.incrementStat('set_cookie_set');
            return true;
          }
          return false;
        },
        function shouldBlockCookie(state) {
          return CliqzAttrack.isCookieEnabled(state.sourceUrlParts.hostname);
        },
        CliqzAttrack.checkIsCookieWhitelisted.bind(CliqzAttrack),
        steps.cookieContext.checkVisitCache.bind(steps.cookieContext),
        steps.cookieContext.checkContextFromEvent.bind(steps.cookieContext),
        function blockSetCookie(state, response) {
          response.responseHeaders = [{name: 'Set-Cookie', value: ''}];
          state.incrementStat('set_cookie_blocked');
          return true;
        },
      ]);
    },
    unloadPipeline: function() {
      Object.keys(CliqzAttrack.pipelineSteps || {}).forEach((key) => {
        const step = CliqzAttrack.pipelineSteps[key];
        if (step.unload) {
          step.unload();
        }
      });
      CliqzAttrack.pipeline = new Pipeline();
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

        WebRequest.onBeforeRequest.removeListener(CliqzAttrack.httpopenObserver);
        WebRequest.onBeforeSendHeaders.removeListener(CliqzAttrack.httpmodObserver);
        WebRequest.onHeadersReceived.removeListener(CliqzAttrack.httpResponseObserver);

        pacemaker.stop();

        this._trackerLoader.stop();
        this._cookieWhitelistLoader.stop();

        CliqzAttrack.unloadPipeline();

        events.clean_channel("attrack:safekeys_updated");
    },
    checkInstalledAddons: function() {
        System.import('platform/antitracking/addon-check').then( (addons) => {
            addons.checkInstalledAddons().then((adds) => {
              CliqzAttrack.similarAddon = adds;
            });
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
    cancelRecentlyModified: function(state, response) {
      const sourceTab = state.requestContext.getOriginWindowID();
      const url = state.url;
      if (CliqzAttrack.recentlyModified.contains(sourceTab + url)) {
        CliqzAttrack.recentlyModified.delete(sourceTab + url);
        response.cancel = true;
        return false;
      }
      return true;
    },
    applyBlock: function(state, response) {
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
      if (CliqzAttrack.debug) {
        console.log('ATTRACK', rule, 'URL:', state.urlParts.hostname, state.urlParts.path, 'TOKENS:', badTokens);
      }
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

          // TODO: do this nicer
          // if (CliqzAttrack.pipelineSteps.trackerProxy && CliqzAttrack.pipelineSteps.trackerProxy.shouldProxy(tmp_url)) {
          //     state.incrementStat('proxy');
          // }
          CliqzAttrack.recentlyModified.add(state.requestContext.getOriginWindowID() + state.url, 30000);
          CliqzAttrack.recentlyModified.add(state.requestContext.getOriginWindowID() + tmp_url, 30000);

          response.redirectUrl = tmp_url;
          response.requestHeaders = response.requestHeaders || [];
          response.requestHeaders.push({name: CliqzAttrack.config.cliqzHeader, value: ' '})
          return true;
      }
    },
    checkIsCookieWhitelisted: function(state) {
      if (CliqzAttrack.isInWhitelist(state.urlParts.hostname)) {
        const stage = state.responseStatus !== undefined ? 'set_cookie' : 'cookie';
        state.incrementStat(`${stage}_allow_whitelisted`);
        return false;
      }
      return true;
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
        ['c', 'cookie_set', 'cookie_blocked', 'bad_cookie_sent', 'bad_qs', 'set_cookie_blocked'].forEach(function (k) {
          result.trackers[dom][k] = plain_data.tps[dom][k] || 0;
        });
        // actual block count can be in several different signals, depending on configuration. Aggregate them into one.
        result.trackers[dom].tokens_removed = ['empty', 'replace', 'placeholder', 'block'].reduce((cumsum, action) => {
            return cumsum + (plain_data.tps[dom]['token_blocked_' + action] || 0);
        }, 0);

        result.cookies.allowed += result.trackers[dom].cookie_set - result.trackers[dom].cookie_blocked;
        result.cookies.blocked += result.trackers[dom].cookie_blocked + result.trackers[dom].set_cookie_blocked;
        result.requests.safe += result.trackers[dom].c - result.trackers[dom].tokens_removed;
        result.requests.unsafe += result.trackers[dom].tokens_removed;

        // add set cookie blocks to cookie blocked count
        result.trackers[dom].cookie_blocked += result.trackers[dom].set_cookie_blocked;

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
        var gBrowser = _gBrowser || utils.getWindow().gBrowser,
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
      utils.setPref(CliqzAttrack.ENABLE_PREF, true);
      if (!module_only) {
        utils.setPref('attrackBlockCookieTracking', true);
        utils.setPref('attrackRemoveQueryStringTracking', true);
      }
    },
    /** Disables anti-tracking immediately.
     */
    disableModule: function() {
      utils.setPref(CliqzAttrack.ENABLE_PREF, false);
    },
    disabled_sites: new Set(),
    DISABLED_SITES_PREF: "attrackSourceDomainWhitelist",
    saveSourceDomainWhitelist: function() {
      utils.setPref(CliqzAttrack.DISABLED_SITES_PREF,
        JSON.stringify(Array.from(CliqzAttrack.disabled_sites)));
    },
    isSourceWhitelisted: function(hostname) {
        return CliqzAttrack.disabled_sites.has(hostname);
    },
    addSourceDomainToWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.add(domain);
      // also send domain to humanweb
      CliqzAttrack.telemetry({
        message: {
          'type': telemetry.msgType,
          'action': 'attrack.whitelistDomain',
          'payload': domain
        },
        raw: true,
      });
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    removeSourceDomainFromWhitelist: function(domain) {
      CliqzAttrack.disabled_sites.delete(domain);
      CliqzAttrack.saveSourceDomainWhitelist();
    },
    onUrlbarFocus(){
      countReload = true;
    },
    clearCache: function() {
      if (CliqzAttrack.pipelineSteps.tokenExaminer) {
        CliqzAttrack.pipelineSteps.tokenExaminer.clearCache();
      }
      if (CliqzAttrack.pipelineSteps.tokenChecker) {
        CliqzAttrack.pipelineSteps.tokenChecker.blockLog.clear();
      }
    },
};

export default CliqzAttrack;
