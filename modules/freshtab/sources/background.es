import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import { utils } from 'core/cliqz';

export default {
  init(settings) {
    utils.bindObjectFunctions(this.actions, this);
    FreshTab.startup(settings.freshTabABtest, settings.freshTabButton, settings.cliqzOnboarding);
  },

  unload() {
    News.unload();
    FreshTab.shutdown();
  },

  actions: {
    getSpeedDials() {
      return Promise.resolve([1,2,3]);
    }
  }
};
