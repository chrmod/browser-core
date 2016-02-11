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
        utils.log("History", JSON.stringify(results));
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
      let underline = utils.getPref('freshTabNewsUnderline');

      return News.getNews().then(function(news) {
        News.init();
        //utils.log('Start getting news', news);
        var topNews = news.top_h_news,
            hbNews = news.hb_news || {},
            hbNewsAll = [];

        Object.keys(hbNews).forEach(function(domain) {
          hbNewsAll = hbNewsAll.concat(hbNews[domain])
        });

        topNews = topNews.map(function(r){
          r.title = r.short_title;
          r.personalized = false;
          return r;
        });

        hbNewsAll = hbNewsAll.map( r => {
          r.personalized = true;
          return r;
        });
        return topNews.concat(hbNewsAll);
      }).then(function (results) {
        return results.map(function(r){
          return {
            title: r.title,
            displayUrl: utils.getDetailsFromUrl(r.url).domain || r.title,
            logo: utils.getLogoDetails(utils.getDetailsFromUrl(r.url)),
            url: r.url,
            underline: underline,
            personalized: r.personalized
          }
        });
      });

    }
  }
};
