import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
import { utils } from 'core/cliqz';

const DEL_DIALUPS = 'extensions.cliqzLocal.delDialups';
//const DIALUPS = 'extensions.cliqzLocal.dialups';
const DIALUPS = 'extensions.cliqzLocal.speedDials';

function sanitizeUrl(url) {
  url = utils.cleanUrlProtocol(url);
  url = utils.stripTrailingSlash(url);
  return url;
}

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
        ** Return if url is a deleted history entry
        */
        function isDeleted(url) {
          return (url in dialUps) && dialUps[url].history === false;
        }

        function isCustom(url) {
          return (url in dialUps) && dialUps[url].custom;
        }

        results = dialUps.length === 0 ? results : results.filter(function(history) {
          return !isDeleted(history.url) && !isCustom(history.url);
        });

        //utils.log(results, "HISTORY RESULTS");

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

      if(dialUps.length !== 0) {
        customDialups = Object.keys(dialUps).filter(function(dialup){
          return dialUps[dialup].custom;
        });
      }

      //utils.log(customDialups, "CUSTOM RESULTS")

      customDialups = customDialups.map(function(url) {
        var details = utils.getDetailsFromUrl(url);
        return {
          title: url,
          url: url,
          displayTitle: details.cleanHost || details.friendly_url || url,
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

    addSpeedDial(url) {
      utils.log(url, "Add speed dial");
      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          isPresent = false;

      //validate existing urls
      return this.actions.getSpeedDials().then((result) => {
        return new Promise((resolve) => {
          result.speedDials.some(function(dialup) {
            var dialupUrl = sanitizeUrl(dialup.url),
                urlToAdd = sanitizeUrl(url);

            //www.bild.de & user adds bild.de
            if(!(dialupUrl.startsWith('www') && urlToAdd.startsWith('www'))) {
              dialupUrl = utils.removeWww(dialupUrl);
              urlToAdd = utils.removeWww(urlToAdd);
            }
            if (dialupUrl === urlToAdd) {
              utils.log(dialup.url, "isPresent");
              isPresent = true;
              return true;
            }
          });
          resolve({
            error: isPresent,
            reason: 'duplicate'
          });
        });

      }).then(function(obj) {
        if(isPresent) {
          return new Promise((resolve) => {
            resolve(obj);
          });
        } else {

          if(url in dialUps) {
            dialUps[url].custom = true;
          } else {
            dialUps[url] = {
              custom: true
            };
          }
          utils.setPref(DIALUPS, JSON.stringify(dialUps), '');

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
        }
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
