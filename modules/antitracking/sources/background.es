import CliqzPopupButton from 'antitracking/popup-button';

export default {
  init() {
    this.popup = new CliqzPopupButton({
      name: "antitracking",
      actions: this.popupActions
    });
    this.popup.attach();
  },

  unload() {
    this.popup.destroy();
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
