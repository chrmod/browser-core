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
      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          historyDialups = [],
          customDialups = [];

      var historyDialups = History.getTopUrls(5).then(function(results){
        utils.log("History", JSON.stringify(results));

        /*
        ** Apart from checking non deleted history entries
        * I filter out custom tiles as well
        */
        function isNotDeleted(history) {
          var isNotDeleted = true;

          for(var i = 0; i < dialUps.length; i++) {
            var dialup = dialUps[i];
            if ((dialup.url === history.url && dialup.deleted === true && dialup.custom === false) ||
                (dialup.url === history.url && dialup.custom === true)) {
              isNotDeleted = false;
              break;
            }
          }
          return isNotDeleted;
        }

        results = dialUps.length === 0 ? results : results.filter(function(history) {

          return isNotDeleted(history);
        });

        utils.log(results, "HISTORY RESULTS");

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

      customDialups = dialUps.length === 0 ? [] : dialUps.filter(function(dialup) {
        return !dialup.deleted && dialup.custom;
      });

      utils.log(customDialups, "CUSTOM RESULTS")

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
        utils.log(results[0], "history dialups");
        utils.log(results[1], "custom dialups")
        return {
          speedDials: results[0].concat(results[1])
        };
      });
    },

    removeSpeedDial(item) {
      var isCustom = item.custom,
          url = item.url,
          dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          found = false;

      for(var i = 0; i < dialUps.length; i++) {
        if(dialUps[i].url === url) {
          dialUps[i].deleted = true;
          found = true;
          break;
        }
      }
      if(found === false) {
        dialUps.push({
          url: url,
          deleted: true,
          custom: isCustom
        });
      }

      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
    },

    addSpeedDial(url) {
      utils.log(url, "Add speed dial");

      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          found = false;

      for(var i = 0; i < dialUps.length; i++) {
        if(dialUps[i].url === url) {
          dialUps[i].deleted = false;
          dialUps[i].custom = true;
          found = true;
          break;
        }
      }
      if(found === false) {
        dialUps.push({
          url: url,
          deleted: false,
          custom: true
        });
      }

      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');

      //@TODO move this part
      return new Promise((resolve) => {
        utils.log("Resolve the promise!!!")
        var details = utils.getDetailsFromUrl(url),
            obj = {
              title: url,
              url: url,
              displayTitle: details.cleanHost || details.friendly_url || url,
              custom: true,
              logo: utils.getLogoDetails(details)
            }
        resolve(obj);
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
