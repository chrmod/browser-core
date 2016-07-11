import background from 'offers/background';
import LoggingHandler from 'offers/logging_handler';
import OffersConfigs from 'offers/offers_configs';
import {utils} from 'core/cliqz';

// to be able to get the events on page change
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');



////////////////////////////////////////////////////////////////////////////////
// Consts
//
const MODULE_NAME = 'window';


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
export default class {
  constructor(settings) {
    // check if we have the feature  enabled
    if (!CliqzUtils.getPref('grFeatureEnabled', false)) {
      return;
    }
    this.window = settings.window;
    this.settings = settings.settings;
    // GR-117 -> check comment below in init()
    this.tabsProgressListener = null;
  }

  init() {
    // check if we have the feature  enabled
    if (!CliqzUtils.getPref('grFeatureEnabled', false)) {
      return;
    }

    // EX-2561: private mode then we don't do anything here
    if (utils.isPrivate(this.window)) {
      LoggingHandler.LOG_ENABLED &&
      LoggingHandler.info(MODULE_NAME, 'we are in private mode, avoid any logic here');
      return;
    }

    // We need to subscribe here to get events everytime the location is
    // changing and is the a new url. We had issues since everytime we switch
    // the tabs we got the event from core.locaiton_change and this is not correct
    // for our project.
    // Check issue https://cliqztix.atlassian.net/projects/GR/issues/GR-117
    //
    this.tabsProgressListener = {
      QueryInterface: XPCOMUtils.generateQI(['nsIWebProgressListener', 'nsISupportsWeakReference']),

      onLocationChange: function (aBrowser, aProgress, aRequest, aURI, aFlags) {
        // get the referer if we have one
        let referrer = (aRequest && (aRequest.referrer) && (aRequest.referrer.asciiSpec)) ?
                        aRequest.referrer.asciiSpec :
                        '';
        // skip the event if is the same document here
        // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener
        //
        LoggingHandler.LOG_ENABLED &&
        LoggingHandler.info(MODULE_NAME, 'new event with location: ' + aURI.spec + ' - referrer: ' + referrer);
        if (aFlags === Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
          LoggingHandler.LOG_ENABLED &&
          LoggingHandler.info(MODULE_NAME, 'discarding event since it is repeated');
          return;
        }
        // else we emit the event here
        background.onLocationChangeHandler(aURI.spec, referrer);
      },
    };
    this.window.gBrowser.addTabsProgressListener(this.tabsProgressListener);

  }

  unload() {
    // remove the progress listener to not get more events here
    if (this.window) {
      this.window.gBrowser.removeProgressListener(this.tabsProgressListener);
    }
  }
}