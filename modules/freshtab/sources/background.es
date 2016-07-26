import FreshTab from 'freshtab/main';
import News from 'freshtab/news';
import History from 'freshtab/history';
import { utils } from 'core/cliqz';
import SpeedDial from 'freshtab/speed-dial';

const DIALUPS = 'extensions.cliqzLocal.freshtab.speedDials';
const ONE_DAY = 24 * 60 * 60 * 1000;
const FIVE_DAYS = 5 * ONE_DAY;
const PREF_ONBOARDING = 'freshtabOnboarding';

const getInstallationDate = function() {
  return parseInt(utils.getPref(PREF_ONBOARDING, '0'));
}

const isWithinNDaysAfterInstallation = function(days) {
  return getInstallationDate() + ONE_DAY * days > Date.now();
}

/**
* @namespace freshtab
* @class Background
*/

export default {
  /**
  * @method init
  */
  init(settings) {
    utils.bindObjectFunctions(this.actions, this);
    FreshTab.startup(settings.freshTabButton, settings.cliqzOnboarding, settings.channel);
  },
  /**
  * @method unload
  */
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

    _showHelp: isWithinNDaysAfterInstallation.bind(null, 5),

    _showMiniOnboarding() {

      if (getInstallationDate() === 0) {
        utils.setPref(PREF_ONBOARDING, '' + Date.now());
      }

      return isWithinNDaysAfterInstallation(1);
    },

    _isBrowser() {
      return FreshTab.isBrowser;
    },
    /**
    * Get history based & user defined speedDials
    * @method getSpeedDials
    */
    getSpeedDials() {
      var dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : [],
          historyDialups = [],
          customDialups = dialUps.custom ? dialUps.custom : [];

      historyDialups = History.getTopUrls().then(function(results){
        utils.log("History", JSON.stringify(results));
        //hash history urls
        results = results.map(function(r) {
          return {
            title: r.title,
            url: r.url,
            hashedUrl: utils.hash(r.url),
            total_count: r.total_count,
            custom: false
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

              if(utils.stripTrailingSlash(utils.tryDecodeURIComponent(dialup.url)) === url) {
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
          return new SpeedDial(utils.tryDecodeURIComponent(dialup.url), true);
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
     * Remove a speedDial
     * @method removeSpeedDial
     * @param {item}  The item to be removed.
     */
    removeSpeedDial(item) {
      var isCustom = item.custom,
          url = isCustom ? item.url : utils.hash(item.url),
          dialUps = utils.hasPref(DIALUPS, '') ? JSON.parse(utils.getPref(DIALUPS, '', '')) : {},
          found = false,
          type = isCustom ? 'custom' : 'history';

      if(isCustom) {
        dialUps.custom = dialUps.custom.filter(function(dialup) {
          return utils.tryDecodeURIComponent(dialup.url) !== url
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
    * @return all visible speedDials
    */
    getVisibleDials(historyLimit) {
      return this.actions.getSpeedDials().then((results) => {
        return results.speedDials.filter(function(item, index) {
          return (!item.custom && index < historyLimit) || item.custom;
        });
      })
    },
    /**
    * Add a new speedDial to be appeared in the 2nd row
    * @method addSpeedDial
    * @param url {string}
    */
    addSpeedDial(url, index, type) {
      const urlToAdd = utils.stripTrailingSlash(url);

      //history returns most frequest 15 results, but we display up to 5
      //so we need to validate only against visible results
      return this.actions.getVisibleDials(5).then((result) => {
        const isDuplicate = result.some(function(dialup) {
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
          return utils.tryEncodeURIComponent(urlToAdd) === utils.stripTrailingSlash(dialup.url);
        });

        if(isPresent) {
          throw "duplicate";
        } else {
          var dialup = {
            url: utils.tryEncodeURIComponent(urlToAdd)
          };
          if(index !== null) {
            dialUps.custom.splice(index, 0, dialup);
          } else {
            dialUps.custom.push(dialup);
          }
          utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
          return new SpeedDial(urlToAdd, true);
        }
      }).catch(reason => ({ error: true, reason: typeof reason === 'object' ? reason.toString() : reason }));
    },

    /**
    * Parse speedDials
    * @method parseSpeedDials
    */
    parseSpeedDials() {
      return JSON.parse(utils.getPref(DIALUPS, '{}', ''));
    },

    /**
    * Save speedDials
    * @method saveSpeedDials
    * @param dialUps object
    */
    saveSpeedDials(dialUps) {
      utils.setPref(DIALUPS, JSON.stringify(dialUps), '');
    },

    /**
    * Revert history url
    * @method revertHistorySpeedDial
    * @param url string
    */
    revertHistorySpeedDial(url) {
      const dialUps = this.actions.parseSpeedDials();
      delete dialUps.history[utils.hash(url)];
      this.actions.saveSpeedDials(dialUps);
    },

    /**
    * Reset all history speed dials
    * @method resetAllHistory
    */
    resetAllHistory() {
      const dialUps = this.actions.parseSpeedDials();
      dialUps.history = {};
      this.actions.saveSpeedDials(dialUps);
      return this.actions.getSpeedDials();
    },

    /**
    * Get list with top & personalized news
    * @method getNews
    */
    getNews() {

      return News.getNews().then(function(news) {
        News.init();
        var topNews = news.top_h_news || [],
            hbNews = news.hb_news || [];

        topNews = topNews.map(function(r){
          r.title = r.short_title;
          r.personalized = false;
          return r;
        });

        hbNews = hbNews.map( r => {
          r.personalized = true;
         return r;
        });

        return {
          version: news.top_news_version,
          news: topNews.concat(hbNews).map( r => ({
            title: r.title,
            description: r.description,
            displayUrl: utils.getDetailsFromUrl(r.url).cleanHost || r.title,
            logo: utils.getLogoDetails(utils.getDetailsFromUrl(r.url)),
            url: r.url,
            personalized: r.personalized,
          }))
        };
      });

    },
    /**
    * Get configuration regarding locale, onBoarding and browser
    * @method getConfig
    */
    getConfig() {
      var self = this;

      var config = {
        locale: utils.PREFERRED_LANGUAGE,
        showOnboarding: self.actions._showOnboarding(),
        miniOnboarding: self.actions._showMiniOnboarding(),
        showHelp: self.actions._showHelp(),
        isBrowser: self.actions._isBrowser()
      };
      return Promise.resolve(config);
    },
    /**
    * @method takeFullTour
    */
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
    /**
    * revert back to old "new tab"
    * @method revertBack
    */
    revertBack() {
      FreshTab.toggleState();
      utils.getWindow().CLIQZ.Core.refreshButtons();
    },

    getTabIndex() {
      return Promise.resolve(utils.getWindow().gBrowser.tabContainer.selectedIndex);
    },

  }
};
