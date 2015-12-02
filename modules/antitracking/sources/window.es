import background from 'antitracking/background';

export default class {

  constructor(settings) {
    this.window = settings.window;

    this.popup = background.popup;
  }

  init() {
    this.listenToLocationChange();
  }

  unload() {
    CliqzUtils.clearInterval(this.interval);
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

  listenToLocationChange()  {
    CliqzEvents.sub("core.location_change", function (ev) {
      var counter = 8;

      CliqzUtils.clearInterval(this.interval);
      this.updateBadge();

      this.interval = CliqzUtils.setInterval(function () {
        this.updateBadge();

        counter -= 1;
        if (counter <= 0) {
          CliqzUtils.clearInterval(this.interval);
        }
      }.bind(this), 2000);
    }.bind(this));
  }
};
