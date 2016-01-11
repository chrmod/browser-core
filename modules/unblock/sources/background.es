import CliqzUnblock from 'unblock/main';

export default {

  init(settings) {
    CliqzUnblock.init(settings.unblockUI);
    this.onPrefChange = this.onPrefChange.bind(this);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  },

  unload() {
    CliqzEvents.un_sub("prefchange:"+ CliqzUnblock.PREF_MODE, this.onPrefChange);
    CliqzUnblock.unload();
  },

  onPrefChange(pref) {
    if(pref == CliqzUnblock.PREF_MODE) {
      CliqzUnblock.onModeChanged();
    }
  }
};
