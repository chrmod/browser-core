import utils from 'core/utils';
import events from 'core/events';
import CliqzAntiPhishing from 'anti-phishing/anti-phishing';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    // this.window.gBrowser.addProgressListener(CliqzAntiPhishing.listener);
    events.sub('HW-activeURL:', CliqzAntiPhishing.onHwActiveURL);
  }

  unload() {
    // this.window.gBrowser.removeProgressListener(CliqzAntiPhishing.listener);
    events.un_sub('HW-activeURL:', CliqzAntiPhishing.onHwActiveURL);
  }

  status() {
    if (utils.getPref('cliqz-anti-phishing', false)) {
      return {
        visible: true,
        active: utils.getPref('cliqz-anti-phishing-enabled', false),
      };
    }
  }
}
