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
          customDialups = dialUps.custom ? dialUps.custom : [];

      historyDialups = History.getTopUrls(5).then(function(results){
        utils.log("History", JSON.stringify(results));
        //hash history urls
        results = results.map(function(r) {
          return {
            title: r.title,
            url: r.url,
            hashedUrl: utils.hash(r.url),
            total_count: r.total_count
          }
        });

        function isDeleted(url) {
          return dialUps.history && (url in dialUps.history) && dialUps.history[url].hidden === true;
        }

        function isCustom(url) {
          url = utils.stripTrailingSlash(url);

          var isCustom = false;

          if(dialUps && dialUps.custom) {

            dialUps.custom.some(function(dialup) {

              if(utils.stripTrailingSlash(dialup.url) === url) {
                isCustom = true;
                return true;
              }
            });
          }
          return isCustom;
        }

        results = dialUps.length === 0 ? results : results.filter(function(history) {
          return !isDeleted(history.hashedUrl) && !isCustom(history.url);
        });

        return results.map(function(r){
          return new SpeedDial(r.url, false);
        });
      });

      if(customDialups.length > 0) {
        utils.log(customDialups, "custom dialups");
        customDialups = customDialups.map(function(dialup) {
          return new SpeedDial(dialup.url, true);
        });
      }

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
          url = isCustom ? item.url : utils.hash(item.url),
          dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : {},
          found = false,
          type = isCustom ? 'custom' : 'history';

      if(isCustom) {
        dialUps.custom = dialUps.custom.filter(function(dialup) {
          return dialup.url !== url
        });
      } else {
        if(!dialUps.history) {
          dialUps.history = {};
        }
        dialUps.history[url] = { hidden: true };
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
        var dialUps = JSON.parse(utils.getPref(DIALUPS, '{}', '')),
            details = utils.getDetailsFromUrl(url);

        if(!dialUps.custom) {
          dialUps.custom = [];
        }

        /* before adding new dialup make sure it is not there already
        ** looks like concurrency issues of messaging framework could lead to race conditions
        */
        const isPresent = dialUps.custom.some(function(dialup) {
          return urlToAdd === utils.stripTrailingSlash(dialup.url);
        });

        if(isPresent) {
          throw "duplicate";
        } else {
          dialUps.custom.push({
            url: url
          });
          utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
          return new SpeedDial(url, true);
        }
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
