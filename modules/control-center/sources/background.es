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
      utils.getWindow().document.querySelector('toolbarbutton#cliqz-cc-btn').click();
      //keep control-center popup open for 1,5sec to prevent user closing it immediately
      utils.setPref("ui.popup.disable_autohide", true, '');
      setTimeout(function() {
        utils.setPref("ui.popup.disable_autohide", false, '');
      }, 1500);
    },

    setBadge(info) {
      utils.getWindow().document.querySelector('#cliqz-control-center-badge').textContent = info;
    },

    updateState(state) {
       utils.getWindow().document.querySelector('#cliqz-control-center-badge').setAttribute('state', state);
    }
  }
}
