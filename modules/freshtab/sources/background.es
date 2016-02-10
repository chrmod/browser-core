import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
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
      return History.getTopUrls(5).then(function(results){
        return results.map(function(r){
          var details = utils.getDetailsFromUrl(r.url);
          return {
            title: r.title,
            url: r.url,
            displayTitle: details.cleanHost || details.friendly_url || r.title,
            logo: utils.getLogoDetails(details)
          }
        });
      });
    },
    getNews() {
      return Promise.resolve(["1", "2"]);
    }
  }
};
