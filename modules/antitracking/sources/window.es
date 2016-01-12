import background from 'antitracking/background';
import CliqzAttrack from 'antitracking/attrack';

function onLocationChange(ev) {
  if(this.interval) { CliqzUtils.clearInterval(this.interval); }

  var counter = 8;

  this.updateBadge();

  this.interval = CliqzUtils.setInterval(function () {
    this.updateBadge();

    counter -= 1;
    if (counter <= 0) {
      CliqzUtils.clearInterval(this.interval);
    }
  }.bind(this), 2000);
}

function onPrefChange(pref) {
  if (pref == CliqzAttrack.ENABLE_PREF && CliqzAttrack.isEnabled() != this.enabled) {
    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.initWindow(this.window);
    } else {
      CliqzAttrack.unloadWindow(this.window);
    }
    this.enabled = CliqzAttrack.isEnabled();
  }
};

export default class {

  constructor(config) {
    this.window = config.window;

    this.popup = background.popup;

    if ( this.popup ) {
      this.onLocationChange = onLocationChange.bind(this);
    }
    this.onPrefChange = onPrefChange.bind(this);
    this.enabled = false;
  }

  init() {
    if ( this.popup ) {
      CliqzEvents.sub("core.location_change", this.onLocationChange);
    }
    this.onPrefChange(CliqzAttrack.ENABLE_PREF);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  }

  unload() {
    if ( this.popup ) {
      CliqzEvents.un_sub("core.location_change", this.onLocationChange);
      CliqzUtils.clearInterval(this.interval);
    }
    if (CliqzAttrack.isEnabled()) {
      CliqzAttrack.unloadWindow(this.window);
    }
    CliqzEvents.un_sub("prefchange", this.onPrefChange);
  }

  updateBadge() {
    if (this.window !== CliqzUtils.getWindow()) { return; }

    var info = CliqzAttrack.getCurrentTabBlockingInfo(), count;

    try {
      count = info.cookies.blocked + info.requests.unsafe;
    } catch(e) {
      count = 0;
    }

    this.popup.setBadge(this.window, count);
  }

};
