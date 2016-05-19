import CliqzUnblock from 'unblock/main';
import YoutubeUnblocker from 'unblock/youtube';
import background from "core/base/background";
import { utils, events } from "core/cliqz";

export default background({

  init(settings) {
    this.loadPlugins();
    CliqzUnblock.init(settings.unblockUI);
    this.onPrefChange = this.onPrefChange.bind(this);
    CliqzEvents.sub("prefchange", this.onPrefChange);
  },

  enabled() {
    return CliqzUnblock.isEnabled();
  },

  unload() {
    CliqzEvents.un_sub("prefchange:"+ CliqzUnblock.PREF_MODE, this.onPrefChange);
    CliqzUnblock.unload();
  },

  loadPlugins() {
    if (CliqzUtils.getPref('unblock.plugin.youtube', true)) {
      CliqzUnblock.unblockers.push(new YoutubeUnblocker());
    }
  },

  onPrefChange(pref) {
    if(pref == CliqzUnblock.PREF_MODE) {
      CliqzUnblock.onModeChanged();
    }
  },

  events: {
    "core.location_change": function(url) {
      CliqzUnblock.pageObserver(url);
    },
    "core:tab_select": function(event) {
      CliqzUnblock.tabSelectListener(event);
    }
  }
});
