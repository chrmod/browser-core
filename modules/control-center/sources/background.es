import { utils } from 'core/cliqz';

export default {
  init() {
    // if Control center is enabled Q button is disabled
    this.buttonEnabled = utils.getPref('controlCenter', false) == true;
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  actions: {
    setBadge(info) {
      utils.getWindow().document.querySelector('#cliqz-control-center-badge').textContent = info;
    }
  }
};
