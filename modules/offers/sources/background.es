import { utils, events } from 'core/cliqz';
import { OfferManager } from 'offers/offer_manager';
import background from 'core/base/background';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';



////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';


export default background({
  enabled() {
    return true;
  },

  init(settings) {

    // check if we need to do something or not
    if (!CliqzUtils.getPref('grFeatureEnabled', false)) {
      return;
    }

    // configure the preferences here
    OffersConfigs.OFFER_SUBCLUSTER_SWITCH = CliqzUtils.getPref('grOfferSwitchFlag', false);

    // check for some other flags here:
    //
    // enable logging into the console
    if (CliqzUtils.getPref('offersLogsEnabled', false)) {
      LoggingHandler.LOG_ENABLED = true;
    }
    // enable logs in file
    if (CliqzUtils.getPref('offersFileLogsEnabled', false)) {
      LoggingHandler.SAVE_TO_FILE = true;
    }
    // avoid read history from file
    if (CliqzUtils.getPref('offersAvoidReadHistory', false)) {
      OffersConfigs.LOAD_HISTORY_EVENTS = false;
    }
    // avoid load / save cupon handler data
    if (CliqzUtils.getPref('offersAvoidLoadCuponsData', false)) {
      OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG = false;
    }
    // reset coupons data
    if (CliqzUtils.getPref('offersResetCouponsData', false)) {
      OffersConfigs.COUPON_HANDLER_RESET_FILE = true;
    }

    // check if we need to set dev flags or not
    // extensions.cliqz.offersDevFlag
    if (CliqzUtils.getPref('offersDevFlag', false)) {
      OffersConfigs.LOAD_HISTORY_EVENTS = false;
      OffersConfigs.COUPON_HANDLER_RESET_FILE = true;
      OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG = false;
      // enable logs?
      LoggingHandler.LOG_ENABLED = true;
      LoggingHandler.SAVE_TO_FILE = true;
    }

    // init the logging
    LoggingHandler.init();

    // define all the variables here
    this.db = null;
    // offer manager
    this.offerManager = new OfferManager();

    // TODO: GR-137 && GR-140: temporary fix
    events.sub('core.location_change', this.onTabOrWinChangedHandler.bind(this));
    events.sub('core.window_closed', this.onWindowClosed.bind(this));

    // print the timestamp
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
      '\n\n' +
      '------------------------------------------------------------------------\n' +
      '                           NEW SESSION STARTED\n' +
      'Version: ' + OffersConfigs.CURRENT_VERSION + '\n' +
      'timestamp: ' + Date.now() + '\n' +
      'switchFlag: ' + OffersConfigs.OFFER_SUBCLUSTER_SWITCH + '\n' +
      'LoggingHandler.LOG_ENABLED: ' + LoggingHandler.LOG_ENABLED + '\n' +
      'LoggingHandler.SAVE_TO_FILE: ' + LoggingHandler.SAVE_TO_FILE + '\n' +
      'OffersConfigs.LOAD_HISTORY_EVENTS: ' + OffersConfigs.LOAD_HISTORY_EVENTS + '\n' +
      'OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG: ' + OffersConfigs.COUPON_HANDLER_LOAD_FILE_FLAG + '\n' +
      'OffersConfigs.COUPON_HANDLER_RESET_FILE: ' + OffersConfigs.COUPON_HANDLER_RESET_FILE + '\n' +
      'dev_flag: ' + CliqzUtils.getPref('offersDevFlag', false) + '\n' +
      '------------------------------------------------------------------------\n'
      );
  },

  //////////////////////////////////////////////////////////////////////////////
  unload() {
    // nothing to do, this is on hard unload, we want beforeBrowserShutdown
  },

  //////////////////////////////////////////////////////////////////////////////
  start() {
    // nothing to do
  },

  //////////////////////////////////////////////////////////////////////////////
  beforeBrowserShutdown() {
    // check if we have the feature  enabled
    if (!CliqzUtils.getPref('grFeatureEnabled', false)) {
      return;
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'unloading background');

    // destroy classes
    if (this.offerManager) {
      this.offerManager.savePersistentData();
      this.offerManager.destroy();
      delete this.offerManager;
      this.offerManager = null;
    }

    // TODO: GR-137 && GR-140: temporary fix
    events.un_sub('core.location_change', this.onTabOrWinChangedHandler.bind(this));

    events.un_sub('core.window_closed', this.onWindowClosed.bind(this));

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'background script unloaded');
  },

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    if (!this.offerManager) {
      return;
    }
    var u = utils.getDetailsFromUrl(url);
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'location changed to ' + u.host);

    // now we add the referrer to the url
    if (referrer) {
      var referrerUrlDetails = utils.getDetailsFromUrl(referrer);
      u['referrer'] = referrerUrlDetails.name;
    } else {
      u['referrer'] = '';
    }

    try {
      this.offerManager.processNewEvent(u);
    } catch (e) {
      // log this error, is nasty, something went wrong
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  onWindowClosed(data) {
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'window closed!!: remaining: ' + data.remaining);
    // GR-147: if this is the last window then we just save everything here
    if (data.remaining === 0) {
      // save alles here
      if (this.offerManager) {
        this.offerManager.savePersistentData();
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  onTabOrWinChangedHandler(url, win) {
    // check if this is the window
    // EX-2561: private mode then we don't do anything here
    if (!win || utils.isPrivate(win)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'window is private skipping: onTabOrWinChangedHandler');
      return;
    }
    if (!this.offerManager) {
      return;
    }

    try {
      var u = utils.getDetailsFromUrl(url);
      this.offerManager.onTabOrWinChanged(u);
    } catch (e) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched on onTabOrWinChangedHandler: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  events: {
    'core:coupon-detected': function(args) {
      if(this.offerManager){
        this.offerManager.addCouponAsUsedStats(args['domain'], args['code']);
      }
    }
  }

});
