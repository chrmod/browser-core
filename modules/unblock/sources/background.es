import CliqzUnblock from 'unblock/main';

export default {

  init(settings) {
    CliqzUnblock.init(settings.unblockUI);
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
