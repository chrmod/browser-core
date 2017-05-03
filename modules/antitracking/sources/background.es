import background from "../core/base/background";
import * as browser from '../platform/browser';
import CliqzPopupButton from './popup-button';
import CliqzAttrack from './attrack';
import {PrivacyScore} from './privacy-score';
import md5 from './md5';
import { DEFAULT_ACTION_PREF, updateDefaultTrackerTxtRule } from './tracker-txt';
import { utils, events } from '../core/cliqz';
import telemetry from './telemetry';
import Config from './config';
import inject from '../core/kord/inject';
import { updateTimestamp } from './time';

/**
* @namespace antitracking
* @class Background
*/
export default background({
  controlCenter: inject.module('control-center'),

  /**
  * @method init
  * @param settings
  */
  init(settings) {
    if (browser.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
      return;
    }

    // fix for users without pref properly set: set to value from build config
    if (!utils.hasPref('attrackRemoveQueryStringTracking')) {
      utils.setPref('attrackRemoveQueryStringTracking', true);
    }

    this.enabled = false;
    this.clickCache = {};

    utils.bindObjectFunctions( this.popupActions, this );

    // inject configured telemetry module
    telemetry.loadFromProvider(settings.telemetryProvider || 'human-web');

    // load config
    this.config = new Config({});
    this.attrack = CliqzAttrack;

    return this.config.init().then(() => {
      return CliqzAttrack.init(this.config).then(() => {
        if(this.popup){
          this.popup.updateState(utils.getWindow(), true);
        }
      });
    });
  },

  /**
  * @method unload
  */
  unload() {
    if (browser.getBrowserMajorVersion() < CliqzAttrack.MIN_BROWSER_VERSION) {
      return;
    }

    if ( this.popup ) {
      this.popup.destroy();
    }

    CliqzAttrack.unload();

    this.enabled = false;
  },

  actions: {
    addPipelineStep(opts) {
      if (CliqzAttrack.pipeline) {
        CliqzAttrack.pipeline.addPipelineStep(opts);
      }
    },
    removePipelineStep(name) {
      if (CliqzAttrack.pipeline) {
        CliqzAttrack.pipeline.removePipelineStep(name);
      }
    },
    telemetry(opts) {
      return CliqzAttrack.telemetry(opts);
    },
    getWhitelist() {
      return CliqzAttrack.qs_whitelist;
    }
  },

  popupActions: {
    /**
    * @method popupActions.getPopupData
    * @param args
    * @param cb Callback
    */
    getPopupData(args, cb) {

      var info = CliqzAttrack.getCurrentTabBlockingInfo(),
          ps = info.ps;
      // var ps = PrivacyScore.get(md5(info.hostname).substring(0, 16)  'site');

      // ps.getPrivacyScore();

      cb({
        url: info.hostname,
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: utils.getPref('modules.antitracking.enabled'),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname),
        reload: info.reload || false,
        trakersList: info,
        ps: ps
      });

      if (this.popup) {
        this.popup.setBadge(utils.getWindow(), info.cookies.blocked + info.requests.unsafe);
      } else {
        this.controlCenter.windowAction(
          utils.getWindow(),
          'setBadge',
          info.cookies.blocked + info.requests.unsafe
        );
      }
    },
    /**
    * @method popupActions.toggleAttrack
    * @param args
    * @param cb Callback
    */
    toggleAttrack(args, cb) {
      var currentState = utils.getPref('modules.antitracking.enabled');

      if (currentState) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }

      this.popup.updateState(utils.getWindow(), !currentState);

      cb();

      this.popupActions.telemetry( {action: 'click', 'target': (currentState ? 'deactivate' : 'activate')} )
    },
    /**
    * @method popupActions.closePopup
    */
    closePopup(_, cb) {
      this.popup.tbb.closePopup();
      cb();
    },
    /**
    * @method popupActions.toggleWhiteList
    * @param args
    * @param cb Callback
    */
    toggleWhiteList(args, cb) {
      var hostname = args.hostname;
      if (CliqzAttrack.isSourceWhitelisted(hostname)) {
        CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'unwhitelist_domain'} );
      } else {
        CliqzAttrack.addSourceDomainToWhitelist(hostname);
        this.popupActions.telemetry( { action: 'click', target: 'whitelist_domain'} );
      }
      cb();
    },
    /**
    * @method popupActions.updateHeight
    * @param args
    * @param cb Callback
    */
    updateHeight(args, cb) {
      this.popup.updateView(utils.getWindow(), args[0]);
    },

    _isDuplicate(info) {
      const now = Date.now();
      const key = info.tab + info.hostname + info.path;

      // clean old entries
      for (let k of Object.keys(this.clickCache)) {
        if (now - this.clickCache[k] > 60000) {
          delete this.clickCache[k];
        }
      }

      if (key in this.clickCache) {
        return true;
      } else {
        this.clickCache[key] = now;
        return false;
      }
    },

    telemetry(msg) {
      if (msg.includeUnsafeCount) {
        delete msg.includeUnsafeCount
        const info = CliqzAttrack.getCurrentTabBlockingInfo();
        // drop duplicated messages
        if (info.error || this.popupActions._isDuplicate(info)) {
          return;
        }
        msg.unsafe_count = info.cookies.blocked + info.requests.unsafe;
        msg.special = info.error !== undefined;
      }
      msg.type = 'antitracking';
      utils.telemetry(msg);
    }
  },

  events: {
    "prefchange": function onPrefChange(pref) {
      if (pref === DEFAULT_ACTION_PREF) {
        updateDefaultTrackerTxtRule();
      } else if (pref === 'config_ts') {
        // update date timestamp set in humanweb
        updateTimestamp(utils.getPref('config_ts', null));
      }
      this.config.onPrefChange(pref);
    },
    "core:urlbar_focus": CliqzAttrack.onUrlbarFocus,
    "content:dom-ready": function onDomReady(url) {
      const domChecker = CliqzAttrack.pipelineSteps.domChecker;

      if (!domChecker) {
        return;
      }

      domChecker.loadedTabs[url] = true;
      domChecker.recordLinksForURL(url);
      domChecker.clearDomLinks();
    },
    "antitracking:whitelist:add": function (hostname) {
      CliqzAttrack.addSourceDomainToWhitelist(hostname);
      this.popupActions.telemetry({
        action: 'click',
        target: 'whitelist_domain'
      });
    },
    "antitracking:whitelist:remove": function (hostname) {
      if (CliqzAttrack.isSourceWhitelisted(hostname)){
        CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
        this.popupActions.telemetry({
          action: 'click',
          target: 'unwhitelist_domain'
        });
      }
    },
    "control-center:antitracking-strict": function () {
      utils.setPref('attrackForceBlock', !utils.getPref('attrackForceBlock', false));
    },
    "core:mouse-down": function() {
      if (CliqzAttrack.pipelineSteps.cookieContext) {
        CliqzAttrack.pipelineSteps.cookieContext.setContextFromEvent.apply(CliqzAttrack.pipelineSteps.cookieContext, arguments);
      }
    },
    "control-center:antitracking-clearcache": function() {
      CliqzAttrack.clearCache();
      this.popupActions.telemetry({
        action: 'click',
        target: 'clearcache',
      });
    },
  },
});
