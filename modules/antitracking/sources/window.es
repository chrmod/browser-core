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

export default class {

  constructor(config) {
    this.window = config.window;

    this.popup = background.popup;

    if ( this.popup ) {
      this.onLocationChange = onLocationChange.bind(this);
    }
  }

  init() {
    CliqzAttrack.initWindow(this.window);
    if ( this.popup ) {
      CliqzEvents.sub("core.location_change", this.onLocationChange);
    }
  }

  unload() {
    if ( this.popup ) {
      CliqzEvents.un_sub("core.location_change", this.onLocationChange);
      CliqzUtils.clearInterval(this.interval);
    }
    CliqzAttrack.unloadWindow(window);
  }

  updateBadge() {
    if (this.window !== CliqzUtils.getWindow()) { return; }

    var info = CliqzAttrack.getCurrentTabBlockingInfo(), count;

    try {
      count = info.cookies.blocked;
    } catch(e) {
      count = 0;
    }

    this.popup.setBadge(this.window, count);
  }

};
