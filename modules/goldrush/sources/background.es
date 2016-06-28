import { utils, events } from 'core/cliqz';
import { OfferManager } from 'goldrush/offer_manager';
import background from 'core/base/background';
import LoggingHandler from 'goldrush/logging_handler';
import GoldrushConfigs from 'goldrush/goldrush_configs';

var nsIHttpChannel = Components.interfaces.nsIHttpChannel;



////////////////////////////////////////////////////////////////////////////////
// consts

const MODULE_NAME = 'background';


export default background({
  enabled() {
    return true;
  },

  init(settings) {
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
    LoggingHandler.info(MODULE_NAME, 'unloading background');

    // destroy classes
    if (this.offerManager) {
      this.offerManager.destroy();
      delete this.offerManager;
      this.offerManager = null;
    }

    // TODO: GR-137 && GR-140: temporary fix
    events.un_sub('core.location_change', this.onTabOrWinChangedHandler.bind(this));

    events.un_sub('core.window_closed', this.onWindowClosed.bind(this));

    LoggingHandler.info(MODULE_NAME, 'background script unloaded');
  },

  //////////////////////////////////////////////////////////////////////////////
  onLocationChangeHandler(url, referrer) {
    if (!this.offerManager) {
      return;
    }
    var u = utils.getDetailsFromUrl(url);
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
      LoggingHandler.error(MODULE_NAME,
                           'Exception catched when processing a new event: ' + e,
                           LoggingHandler.ERR_INTERNAL);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  onWindowClosed(data) {
    LoggingHandler.info(MODULE_NAME, 'window closed!!: remaining: ' + data.remaining);
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
