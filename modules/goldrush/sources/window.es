import background from 'goldrush/background';
import { utils, events } from 'core/cliqz';

// to be able to get the events on page change
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');


////////////////////////////////////////////////////////////////////////////////
function log(s){
  utils.log(s, 'GOLDRUSH - window');
}


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
    // TODO: remove TESTS?
    //background.testOfferFetcher();
    //background.testFIDs();
    //background.testWritingFile();


    // We need to subscribe here to get events everytime the location is
    // changing and is the a new url. We had issues since everytime we switch
    // the tabs we got the event from core.locaiton_change and this is not correct
    // for our project.
    // Check issue https://cliqztix.atlassian.net/projects/GR/issues/GR-117
    //
    this.tabsProgressListener = {
      QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

      onLocationChange: function (aBrowser, aProgress, aRequest, aURI, aFlags) {
        // skip the event if is the same document here
        // https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIWebProgressListener
        //
        log('new event with location: ' + aURI.spec);
        if (aFlags === Components.interfaces.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
          log('discarding event since it is repeated');
          return;
        }
        // else we emit the event here
        log('sending to the background');
        background.onLocationChangeHandler(aURI.spec);
      },
    };
    this.window.gBrowser.addTabsProgressListener(this.tabsProgressListener);

  }

  unload() {
    // remove the progress listener to not get more events here
    this.window.gBrowser.removeProgressListener(this.tabsProgressListener);
  }
}
