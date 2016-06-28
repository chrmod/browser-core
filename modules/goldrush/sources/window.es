import background from 'goldrush/background';
import LoggingHandler from 'goldrush/logging_handler';

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
    this.window = settings.window;
    this.settings = settings.settings;
    // GR-117 -> check comment below in init()
    this.tabsProgressListener = null;

    //this.window.document.style.border = '5px solid red';
  }

  init() {
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
        LoggingHandler.info(MODULE_NAME, 'new event with location: ' + aURI.spec + ' - referrer: ' + referrer);
        if (aFlags === Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
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
    this.window.gBrowser.removeProgressListener(this.tabsProgressListener);
  }
}
