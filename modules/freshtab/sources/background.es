import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
import { utils } from 'core/cliqz';
import SpeedDial from 'freshtab/speed-dial';

const DIALUPS = 'extensions.cliqzLocal.freshtab.speedDials';

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
      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          historyDialups = [],
          customDialups = [];

      var historyDialups = History.getTopUrls(5).then(function(results){
        utils.log("History", JSON.stringify(results));

        function isDeleted(url) {
          return (url in dialUps) && dialUps[url].history === false;
        }

        function isCustom(url) {
          return (url in dialUps) && dialUps[url].custom;
        }

        results = dialUps.length === 0 ? results : results.filter(function(history) {
          return !isDeleted(history.url) && !isCustom(history.url);
        });

        return results.map(function(r){
          return new SpeedDial(r.url, false);
        });
      });

      if(dialUps.length !== 0) {
        customDialups = Object.keys(dialUps).filter(function(dialup){
          return dialUps[dialup].custom;
        });
      }

      customDialups = customDialups.map(function(url) {
        return new SpeedDial(url, true);
      });

      //Promise all concatenate results and return
      return Promise.all([historyDialups, customDialups]).then(function(results){
        return {
          speedDials: results[0].concat(results[1])
        };
      });
    },

    /**
    * @param Object item
    * {
    *   custom: true,
    *   url: https://www.cliqz.com
    *  }
    */
    removeSpeedDial(item) {
      var isCustom = item.custom,
          url = item.url,
          dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : {},
          found = false,
          type = isCustom ? 'custom' : 'history';

      if(url in dialUps) {
        dialUps[url][type] = false;
      } else {
        dialUps[url] = {};
        dialUps[url][type] = false;
      }

      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
    },
    /**
     * @param String url
     */
    addSpeedDial(url) {
      const urlToAdd = utils.stripTrailingSlash(url);
      //validate existing urls
      return this.actions.getSpeedDials().then((result) => {
        const isDuplicate = result.speedDials.some(function(dialup) {
          return urlToAdd === utils.stripTrailingSlash(dialup.url);
        });

        if(isDuplicate) {
          throw "duplicate";
        }
      }).then(function(obj) {
        var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : {},
            details = utils.getDetailsFromUrl(url);

        if(url in dialUps) {
          dialUps[url].custom = true;
        } else {
          dialUps[url] = {
            custom: true
          };
        }
        utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
        return new SpeedDial(url, true);

      }).catch(reason => ({ error: true, reason }));
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
