import utils from '../core/utils';
import background from './background';

export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if (background.CliqzSecureMessage) {
      background.CliqzSecureMessage.initAtWindow(this.window);
    }
  }

  unload() {
  }

  status() {
    if (background.CliqzSecureMessage) {
      return {
        visible: true,
        state: utils.getPref('hpn-query'),
      };
    }
  }
}
