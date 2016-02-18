import CliqzPopupButton from 'antitracking/popup-button';
import CliqzAttrack from 'antitracking/attrack';
import { utils, events } from 'core/cliqz';

export default {

  init(settings) {
    this.buttonEnabled = settings.antitrackingButton && utils.getPref("attrackUI", false);
    this.enabled = false;

    utils.bindObjectFunctions( this.popupActions, this );

    if ( this.buttonEnabled ) {
      this.popup = new CliqzPopupButton({
        name: 'antitracking',
        actions: this.popupActions
      });
      this.popup.attach();
    }

    this.onPrefChange = function(pref) {
      if (pref === CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() !== this.enabled) {
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
    events.sub('prefchange', this.onPrefChange);
  },

  unload() {
    if ( this.popup ) {
      this.popup.destroy();
    }

    events.un_sub('prefchange', this.onPrefChange);

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
        enabled: utils.getPref('antiTrackTest'),
        isWhitelisted: CliqzAttrack.isSourceWhitelisted(info.hostname)
      });
    },

    toggleAttrack(args, cb) {
      if ( utils.getPref('antiTrackTest') ) {
        CliqzAttrack.disableModule();
      } else {
        CliqzAttrack.enableModule();
      }
      cb();
    },

    closePopup(_, cb) {
      this.popup.tbb.closePopup();
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
