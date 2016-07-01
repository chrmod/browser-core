import { utils, events } from 'core/cliqz';
import { OfferManager } from 'goldrush/offer_manager';
import background from 'core/base/background';
import LoggingHandler from 'goldrush/logging_handler';
import GoldrushConfigs from 'goldrush/goldrush_configs';



////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';


export default background({
  enabled() {
    return true;
  },

  init(settings) {
    // configure the preferences here
    GoldrushConfigs.OFFER_SUBCLUSTER_SWITCH = CliqzUtils.getPref('grOfferSwitchFlag', true);

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
    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
      '\n\n' +
      '------------------------------------------------------------------------\n' +
      '                           NEW SESSION STARTED\n' +
      'Version: ' + GoldrushConfigs.CURRENT_VERSION + '\n' +
      'timestamp: ' + Date.now() + '\n' +
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
    GoldrushConfigs.LOG_ENABLED &&
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

    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'background script unloaded');
  },

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    if (!this.offerManager) {
      return;
    }
    var u = utils.getDetailsFromUrl(url);
    GoldrushConfigs.LOG_ENABLED &&
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
      GoldrushConfigs.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  onWindowClosed(data) {
    GoldrushConfigs.LOG_ENABLED &&
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
  onTabOrWinChangedHandler(url) {
    if (!this.offerManager) {
      return;
    }

    try {
      var u = utils.getDetailsFromUrl(url);
      this.offerManager.onTabOrWinChanged(u);
    } catch (e) {
      GoldrushConfigs.LOG_ENABLED &&
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
