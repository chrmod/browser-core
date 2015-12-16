import CliqzPopupButton from 'antitracking/popup-button';
import CliqzAttrack from 'antitracking/attrack';

export default {
  init(settings) {
    this.buttonEnabled = settings.antitrackingButton;

    CliqzAttrack.init();

    if ( this.buttonEnabled ) {
      this.popup = new CliqzPopupButton({
        name: "antitracking",
        actions: this.popupActions
      });
      this.popup.attach();
    }
  },

  unload() {
    if ( this.popup ) {
      this.popup.destroy();
    }

    try {
      CliqzAttrack.unload();
    } catch(e) { }
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
