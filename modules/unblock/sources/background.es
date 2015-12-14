import CliqzUnblock from 'unblock/main';

Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

export default {

  init() {
    CliqzUnblock.init();
    this.onPrefChange = function(pref) {
      if(pref == CliqzUnblock.PREF_MODE) {
        CliqzUnblock.onModeChanged();
      }
    }
    CliqzEvents.sub("prefchange", this.onPrefChange);
  },

  unload() {
    CliqzEvents.un_sub("prefchange:"+ CliqzUnblock.PREF_MODE, this.onPrefChange);
    CliqzUnblock.unload();
  }
};
