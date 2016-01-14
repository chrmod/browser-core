import FreshTab from 'freshtab/main';
import News from 'freshtab/news';

export default {
  init(settings) {
    FreshTab.startup(settings.freshTabABtest, settings.freshTabButton, settings.cliqzOnboarding);
  },

  unload() {
    News.unload();
    FreshTab.shutdown();
  }
};
