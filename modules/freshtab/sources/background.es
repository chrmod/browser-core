import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
import { utils } from 'core/cliqz';

const DEL_DIALUPS = 'extensions.cliqzLocal.delDialups';
const DIALUPS = 'extensions.cliqzLocal.dialups';

export default {
  init(settings) {
    utils.bindObjectFunctions(this.actions, this);
    FreshTab.startup(settings.freshTabABtest, settings.freshTabButton, settings.cliqzOnboarding, settings.channel);
  },

  unload() {
    News.unload();
    FreshTab.shutdown();
  },

  actions: {
    _showOnboarding() {
        var showOnboarding = false;
        if(FreshTab.cliqzOnboarding === 1 && !utils.hasPref('browserOnboarding')) {
          utils.setPref('browserOnboarding', true);
          showOnboarding = true;
        }
        return showOnboarding;
    },

    _showMiniOnboarding() {
       var miniOnboarding = false,
           now = Date.now(),
           ONE_DAY = 24 * 60 * 60 * 1000,
           PREF_ONBOARDING = 'freshtabOnboarding',
           isUserFirstTimeAtFreshTab = parseInt(utils.getPref(PREF_ONBOARDING, '0')) === 0;

      if (isUserFirstTimeAtFreshTab){
        utils.setPref(PREF_ONBOARDING, '' + now);
      }

      var isFirstDayAfterInstallation = parseInt(utils.getPref(PREF_ONBOARDING, '0')) +  ONE_DAY > now;
      if (isFirstDayAfterInstallation) {
        miniOnboarding = true;
      }

      return miniOnboarding;
    },

    getSpeedDials() {
      function filterOutDeleted(results, type) {

        try {
          var deleted = JSON.parse(utils.getPref(DEL_DIALUPS, '', ''));
          results = results.filter(function(item) {
            return deleted[type].indexOf(item.url) === -1;
          });

        } catch(e) {
          utils.log(`Error parsing deleted tiles  ${e.message}`);
        }
        return results;

      }

      var historyDialups = History.getTopUrls().then(function(results){
        utils.log("History", JSON.stringify(results));

        if(utils.hasPref(DEL_DIALUPS, '')) {
          results = filterOutDeleted(results, 'history');
        }

        return results.map(function(r){
          var details = utils.getDetailsFromUrl(r.url);
          return {
            title: r.title,
            url: r.url,
            displayTitle: details.cleanHost || details.friendly_url || r.title,
            custom: false,
            logo: utils.getLogoDetails(details)
          };
        });
      });

      //get custom tiles
      var customDialups = [];
      if (utils.hasPref(DIALUPS, '')) {
        customDialups = JSON.parse(utils.getPref(DIALUPS, '', '')).custom;

        //filterout custom deleted ones
        if(utils.hasPref(DEL_DIALUPS, '')) {
          customDialups = filterOutDeleted(customDialups, 'custom');
        }
      }

      customDialups = customDialups.map(function(r) {
        var details = utils.getDetailsFromUrl(r.url);
        return {
          title: r.url,
          url: r.url,
          displayTitle: details.cleanHost || details.friendly_url || r.url,
          custom: true,
          logo: utils.getLogoDetails(details)
        };
      });

      //Promise all concatenate results and return
      return Promise.all([historyDialups, customDialups]).then(function(results){
        return {
          speedDials: results[0].concat(results[1])
        };
      });
    },

    removeSpeedDial(item) {
      utils.log(item, "Remove speed dial");
    },

    addSpeedDial(item) {
      utils.log(item, "Add speed dial");
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
          hbNewsAll = hbNewsAll.concat(hbNews[domain]);
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

        return {
          version: news.top_news_version,
          news: topNews.concat(hbNewsAll).map( r => ({
            title: r.title,
            displayUrl: utils.getDetailsFromUrl(r.url).domain || r.title,
            logo: utils.getLogoDetails(utils.getDetailsFromUrl(r.url)),
            url: r.url,
            underline: underline,
            personalized: r.personalized,
          }))
        };
      });

    },

    getConfig() {
      var self = this;

      var config = {
        locale: utils.PREFERRED_LANGUAGE,
        showOnboarding: self.actions._showOnboarding(),
        miniOnboarding: self.actions._showMiniOnboarding()
      };
      return Promise.resolve(config);
    },

    takeFullTour() {
      var onboardingWindow = utils.getWindow().CLIQZ.System.get("onboarding/window").default;
      new onboardingWindow({settings: {}, window: utils.getWindow()}).fullTour();

      utils.telemetry({
        "type": "onboarding",
        "product": "cliqz",
        "action": "click",
        "action_target": "tour",
        "version": 1.0
      });
    },

    revertBack() {
      FreshTab.toggleState();
      utils.getWindow().CLIQZ.Core.refreshButtons();
    }
  }
};
