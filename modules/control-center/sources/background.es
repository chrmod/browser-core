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
    }
  }
}
