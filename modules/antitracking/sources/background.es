import CliqzPopupButton from 'antitracking/popup-button';
import CliqzAttrack from 'antitracking/attrack';

Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

export default {

  init(settings) {
    this.buttonEnabled = CliqzUtils.getPref("attrackUI", false);
    this.enabled = false;

    if ( this.buttonEnabled ) {
      this.popup = new CliqzPopupButton({
        name: "antitracking",
        actions: this.popupActions
      });
      this.popup.attach();
    }

    this.onPrefChange = function(pref) {
      if (pref == CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() != this.enabled) {
        if (CliqzAttrack.isEnabled()) {
          // now enabled, initialise module
          CliqzAttrack.init();
        } else {
          // disabled, unload module
          CliqzAttrack.unload();
        }
        this.enabled = CliqzAttrack.isEnabled();
      }
    }.bind(this);

    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  },

  unload() {
    if ( this.popup ) {
      this.popup.destroy();
    }

    CliqzEvents.un_sub("prefchange", this.onPrefChange);

    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.unload();
      this.enabled = false;
    }
  },

  popupActions: {
    getPopupData(args, cb) {
      var info = CliqzAttrack.getCurrentTabBlockingInfo();
      if (info.error) {
        info = {
          cookies: {
            blocked: 0
          },
          requests: {
            unsafe: 0
          }
        };
      }

      cb({
        url: info.hostname,
        cookiesCount: info.cookies.blocked,
        requestsCount: info.requests.unsafe,
        enabled: CliqzUtils.getPref("antiTrackTest"),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname)
      });
    },

    toggleAttrack(args, cb) {
      if ( CliqzUtils.getPref("antiTrackTest") ) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }
      cb();
    },

    toggleWhiteList(args, cb) {
      var hostname = args.hostname;
      if (CliqzAttrack.isSourceWhitelisted(hostname)) {
        CliqzAttrack.removeSourceDomainFromWhitelist(hostname);
      } else {
        CliqzAttrack.addSourceDomainToWhitelist(hostname);
      }
      cb();
    }
  }
};
