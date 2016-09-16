import { utils } from 'core/cliqz';

export default {
  init(settings) {

  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  actions: {
    openPopUp() {
      utils.getWindow().document.querySelector('toolbarbutton#cliqz-cc-btn').click()
    },

    setBadge(info) {
      utils.getWindow().document.querySelector('#cliqz-control-center-badge').textContent = info;
    },

    updateState(state) {
       utils.getWindow().document.querySelector('#cliqz-control-center-badge').setAttribute('state', state);
    }
  }
}
