import FreshTab from 'freshtab/main';
import News from 'freshtab/news';

export default {
  init() {
    FreshTab.startup('chrome://cliqz/content/freshtab/freshtab.html');
  },

  unload() {
    News.unload();
    FreshTab.shutdown();
  }
};
