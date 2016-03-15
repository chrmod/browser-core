import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import Cache from 'smart-cliqz-cache/cache';

Components.utils.import('chrome://cliqzmodules/content/Result.jsm');

const URL_PREPARSING_RULES = {
  'amazon.de':     /(node=\d+)/,                  // node id
  'otto.de':       /otto.de\/([\w|-]{3,})/,           // first part of URL
  'zalando.de':    /zalando.de\/([\w|-]{3,})/,          // first part of URL
  'skygo.sky.de':  /sky.de\/([\w|-]{3,})/,            // first part of URL
  'strato.de':     /strato.de\/([\w|-]{3,})/,           // first part of URL
  'bonprix.de':    /bonprix.de\/kategorie\/([\w|-]{3,})/,     // first part of URL after 'kategorie'
  'expedia.de':    /(?:expedia.de\/([\w|-]{3,})|([\w|-]{4,})\.expedia.de)/,
                                  // first part of URL or subdomain
  'linguee.de':    /linguee.de\/[\?]?([\w|-]{3,})/,       // first part of URL, also allowing for parameters
  'tvspielfilm.de':/tvspielfilm.de\/(?:tv-programm\/)?(?:sendungen\/)?([\w|-]{3,})/,
                                  // first part of URL, ignoring some paths
  'kino.de':     /kino.de\/(?:filme|trailer)?\/?([\w|-]{3,})/,  // first part of URL, ignoring some paths
  'ricardo.ch':    /(\w{4,})?\.?ricardo.ch\/(?:kaufen)?\/?([\w|-]{3,})?/,
                                  // first part of URL, ignoring some paths, or subdomain
  'kabeldeutschland.de':
          /kabeldeutschland.de\/(?:csc\/produkte\/)?([\w|-]{3,})/,
                                  // first part of URL, ignoring some paths
  'tchibo.de':    /(\w{4,})?\.?tchibo.de\/([\w|-]{3,})?/,     // first part of URL or subdomain
  'holidaycheck.de':
          /holidaycheck.de\/([\w|-]{3,})/,        // first part of URL
  'chefkoch.de':  /chefkoch\-?(blog)?.de\/([\w|-]{3,})?/,     // first part of URL or blog (FIXME: won't get fetched from history since different domain)
  '1und1.de':   /(?:hosting\.)?(\w{4,})?\.?1und1.de\/([\w|-]{3,})?/,
                                  // first part of URL or subdomain (ignoring some)
  'immowelt.de':  /immowelt.de\/(?:immobilien|wohnen)?\/?([\w|-]{3,})?/,
                                  // first part of URL, ignoring some paths
  'mediamarkt.de':/mediamarkt.de\/mcs\/productlist\/([\w|-]{3,})?/,
                                  // product list name
  'saturn.de':    /saturn.de\/mcs\/productlist\/([\w|-]{3,})?/  // product list name
  // 'zdf.de':    /(\w{4,})?\.de/,              // won't work since all links are from different domains
};
const SMART_CLIQZ_ENDPOINT = 'http://newbeta.cliqz.com/api/v1/rich-header?path=/id_to_snippet&q=';
const CUSTOM_DATA_CACHE_FOLDER = 'cliqz';
const CUSTOM_DATA_CACHE_FILE = 'smartcliqz-custom-data-cache.json';
// maximum number of items (e.g., categories or links) to keep
const MAX_ITEMS = 5;

/*
 * This module caches SmartCliqz results in the extension. It
 * also customizes news SmartCliqz and a set of selected domains
 * by re-ordering categories and links based on the user's browsing
 * history.
 *
 * author: Dominik Schmidt (cliqz)
 */
export default class {
  constructor() {
    this.TRIGGER_URLS_CACHE_FILE = 'cliqz/smartcliqz-trigger-urls-cache.json';

    this._smartCliqzCache = new Cache();
    // re-customize after an hour
    this._customDataCache = new Cache(3600);
    this._isCustomizationEnabledByDefault = true;
    this._isInitialized = false;
    // to prevent fetching while fetching is still in progress
    this._fetchLock = {};

    mkdir(CUSTOM_DATA_CACHE_FOLDER).then(() => {
      // TODO: detect when loaded; allow save only afterwards
      this._customDataCache.load(CUSTOM_DATA_CACHE_FILE);
    }).catch((e) => {
      this._log('init: unable to create cache folder:' + e);
    });

    this.triggerUrls = new Cache(false);
    this.triggerUrls.load(this.TRIGGER_URLS_CACHE_FILE);

    // run every 24h at most
    const ts = utils.getPref('smart-cliqz-last-clean-ts');
    let delay = 0;
    if (ts) {
      const lastRun = new Date(Number(ts));
      delay = Math.max(0, 86400000 - (Date.now() - lastRun));
    }
    this._log('scheduled SmartCliqz trigger URL cleaning in ' + (delay / 1000 / 60) + ' min');
    this.cleanTriggerUrls = this.cleanTriggerUrls.bind(this);
    this._cleanTriggerUrlsTimeout = utils.setTimeout(this.cleanTriggerUrls, delay + 5000);

    this._isInitialized = true;
    this._log('init: initialized');
  }

  // clean trigger URLs that are no longer valid
  cleanTriggerUrls() {
    const deleteIfWithoutTriggerUrl = function(id, cachedUrl) {
      if (!this._cleanTriggerUrlsTimeout) {
        return;
      }
      try {
        this._fetchSmartCliqz(id).then(function(smartCliqz) {
          if (smartCliqz.data && smartCliqz.data.trigger_urls) {
            let found = false;
            for (let i = 0; i < smartCliqz.data.trigger_urls.length; i++) {
              if (cachedUrl === smartCliqz.data.trigger_urls[i]) {
                found = true;
                break;
              }
            }
            if (!found) {
              this._log('SmartCliqz trigger URL cache: deleting ' + cachedUrl);
              this.triggerUrls.delete(cachedUrl);
              this.triggerUrls.save(this.TRIGGER_URLS_CACHE_FILE);
            }
          }
        }).catch(function(e) {
          if (e.type && e.type === 'ID_NOT_FOUND') {
            this._log('ID ' + id + ' not found on server: removing SmartCliqz from cache');
            this.triggerUrls.delete(cachedUrl);
            this.triggerUrls.save(this.TRIGGER_URLS_CACHE_FILE);
          } else {
            this._log('error fetching SmartCliqz: ' + e);
          }
        });
      } catch (e) {
        this._log('error during cleaning trigger URLs: ' + e);
      }
    };

    this._log('cleaning SmartCliqz trigger URLs...');
    let delay = 1;
    for (let cachedUrl in this.triggerUrls._cache) {
      const id = this.triggerUrls.retrieve(cachedUrl);
      if (id) {
        utils.setTimeout(
          deleteIfWithoutTriggerUrl.bind(this, id, cachedUrl),
          (delay++) * 1000);
      }
    }
    utils.setTimeout((function() {
      this._log('done cleaning SmartCliqz trigger URLs');
      utils.setPref('smart-cliqz-last-clean-ts', Date.now().toString());
      // next cleaning in 24h
      this._cleanTriggerUrlsTimeout = utils.setTimeout(this.cleanTriggerUrls, 86400000);
    }).bind(this), delay * 1000);
  }

  // stores SmartCliqz if newer than chached version
  store(smartCliqz) {
    const id = this.getId(smartCliqz);

    this._smartCliqzCache.store(id, smartCliqz,
      this.getTimestamp(smartCliqz));

    try {
      if (this.isCustomizationEnabled() &&
        (this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz)) &&
         this._customDataCache.isStale(id)) {

        this._log('store: found stale data for id ' + id);
        this._prepareCustomData(id);
      }
    } catch (e) {
      this._log('store: error while customizing data: ' + e);
    }
  }

  fetchAndStore(id) {
    if (this._fetchLock.hasOwnProperty(id)) {
      this._log('fetchAndStore: fetching already in progress for id ' + id);
      return;
    }

    this._log('fetchAndStore: for id ' + id);
    this._fetchLock[id] = true;
    this._fetchSmartCliqz(id).then((function (smartCliqz) {
      // limit number of categories/links
      if (smartCliqz.hasOwnProperty('data')) {
        if (smartCliqz.data.hasOwnProperty('links')) {
          smartCliqz.data.links = smartCliqz.data.links.slice(0, MAX_ITEMS);
        }
        if (smartCliqz.data.hasOwnProperty('categories')) {
          smartCliqz.data.categories = smartCliqz.data.categories.slice(0, MAX_ITEMS);
        }
      }
      this.store(smartCliqz);
      delete this._fetchLock[id];
    }).bind(this), (function (reason) {
      this._log('fetchAndStore: error while fetching data: ' +
                 reason.type + ' ' + reason.message);
      delete this._fetchLock[id];
    }).bind(this));
  }

  // returns SmartCliqz from cache (false if not found);
  // customizes SmartCliqz if news or domain supported, and user preference is set
  retrieve(id) {
    const smartCliqz = this._smartCliqzCache.retrieve(id);

    if (this.isCustomizationEnabled() && smartCliqz &&
      (this.isNews(smartCliqz) || this.isDomainSupported(smartCliqz))) {
      try {
        this._customizeSmartCliqz(smartCliqz);
      } catch (e) {
        this._log('retrieveCustomized: error while customizing data: ' + e);
      }
    }
    return smartCliqz;
  }

  // extracts domain from SmartCliqz
  getDomain(smartCliqz) {
    // TODO: define one place to store domain
    if (smartCliqz.data.domain) {
      return smartCliqz.data.domain;
    } else if (smartCliqz.data.trigger_urls && smartCliqz.data.trigger_urls.length > 0) {
      return utils.generalizeUrl(smartCliqz.data.trigger_urls[0]);
    } else {
      return false;
    }
  }

  // extracts id from SmartCliqz
  getId(smartCliqz) {
    return smartCliqz.data.__subType__.id;
  }

  // extracts timestamp from SmartCliqz
  getTimestamp(smartCliqz) {
    return smartCliqz.data.ts;
  }

  // returns true this is a news SmartCliqz
  isNews(smartCliqz) {
    return (typeof smartCliqz.data.news !== 'undefined');
  }

  // returns true if there are pre-parsing rules available for the SmartCliqz's domain
  isDomainSupported(smartCliqz) {
    return URL_PREPARSING_RULES.hasOwnProperty(this.getDomain(smartCliqz));
  }

  // returns true if the user enabled customization
  isCustomizationEnabled() {
    try {
      const isEnabled = utils.getPref('enableSmartCliqzCustomization', undefined);
      return isEnabled === undefined ?
        this._isCustomizationEnabledByDefault : isEnabled;
    } catch(e) {
        return this._isCustomizationEnabledByDefault;
    }
  }

  // re-orders categories based on visit frequency
  _customizeSmartCliqz(smartCliqz) {
    const id = this.getId(smartCliqz);

    if (this._customDataCache.isCached(id)) {
      this._injectCustomData(smartCliqz, this._customDataCache.retrieve(id));

      if (this._customDataCache.isStale(id)) {
        this._log('_customizeSmartCliqz: found stale data for ' + id);
        this._prepareCustomData(id);
      }
    } else {
      this._log('_customizeSmartCliqz: custom data not yet ready for ' + id);
    }
  }

  // replaces all keys from custom data in SmartCliqz data
  _injectCustomData(smartCliqz, customData) {
    const id = this.getId(smartCliqz);
    this._log('_injectCustomData: injecting for id ' + id);
    for (let key in customData) {
      if (customData.hasOwnProperty(key)) {
        smartCliqz.data[key] = customData[key];
        this._log('_injectCustomData: injecting key ' + key);
      }
    }
    this._log('_injectCustomData: done injecting for id ' + id);
  }

  // prepares and stores custom data for SmartCliqz with given id (async.),
  // (if custom data has not been prepared before and has not expired)
  _prepareCustomData(id) {
    if (this._customDataCache.isStale(id)) {
      // update time so that this method is not executed multiple
      // times while not yet finished (runs asynchronously)
      this._customDataCache.refresh(id);
      this._log('_prepareCustomData: preparing for id ' + id);
    } else {
      this._log('_prepareCustomData: already updated or in update progress ' + id);
      return;
    }

    // FIXME: if any of the following steps fail, stale custom data
    //        will linger around; possible fix: if it fails, delete
    //        custom data from cache

    // for stats
    const oldCustomData = this._customDataCache.retrieve(id);
    const _this = this;

    // (1) fetch template from rich header
    this._fetchSmartCliqz(id).then((function (smartCliqz) {
      const id = this.getId(smartCliqz);
      const domain = this.getDomain(smartCliqz);

      // (2) fetch history for SmartCliqz domain
      // FIXME: occasionnaly throws `TypeError: this._fetchVisitedUrls(...) is undefined`
      //        if `this` is used
      _this._fetchVisitedUrls(domain, (function callback(urls) {

        // (3) re-order template categories based on history

        // TODO: define per SmartCliqz what the data field to be customized is called
        if (!this.isNews(smartCliqz)) {
          smartCliqz.data.categories = smartCliqz.data.links;
        }

        let categories = smartCliqz.data.categories.slice();

        // add some information to facilitate re-ordering
        for (let j = 0; j < categories.length; j++) {
          categories[j].genUrl = this._preparseUrl(categories[j].url, domain);
          categories[j].matchCount = 0;
          categories[j].originalOrder = j;
        }

        // count category-visit matches (visit url contains category url)
        for (let i = 0; i < urls.length; i++) {
          const url = this._preparseUrl(urls[i], domain);
          for (let j = 0; j < categories.length; j++) {
            if (this._isMatch(url, categories[j].genUrl)) {
              categories[j].matchCount++;
            }
          }
        }

        // re-order by match count; on tie use original order
        categories.sort(function compare(a, b) {
          if (a.matchCount !== b.matchCount) {
              return b.matchCount - a.matchCount; // descending
          } else {
              return a.originalOrder - b.originalOrder; // ascending
          }
        });

        categories = categories.slice(0, MAX_ITEMS);

        let oldCategories = oldCustomData ?
          // previous customization: use either categories (news) or links (other SmartCliqz)
          (this.isNews(smartCliqz) ? oldCustomData.categories : oldCustomData.links) :
          // no previous customization: use default order
          smartCliqz.data.categories;

        // send some stats
        this._sendStats(id, oldCategories, categories, oldCustomData ? true : false, urls);

        // TODO: define per SmartCliqz what the data field to be customized is called
        if (this.isNews(smartCliqz)) {
          this._customDataCache.store(id, { categories: categories });
        } else {
          this._customDataCache.store(id, { links: categories });
        }

        this._log('_prepareCustomData: done preparing for id ' + id);
        this._customDataCache.save(CUSTOM_DATA_CACHE_FILE);
      }).bind(this)).bind(this)   ;
    }).bind(this), (function (reason) {
      this._log('_prepareCustomData: error while fetching data: ' +
                reason.type + ' ' + reason.message);
    }).bind(this));
  }

  // extracts relevant information to base matching on
  _preparseUrl(url, domain) {
    url = utils.generalizeUrl(url);

    // domain-specific preparations
    if (domain) {
      const rule = URL_PREPARSING_RULES[domain];
      if (rule) {
        const match = rule.exec(url);
        if (match) {
          // this._log('_preparseUrl: match '' + match[1] + '' for url ' + url);
          // find first match
          for (let i = 1; i < match.length; i++) {
            if (match[i]) {
              url = match[i];
              break;
            }
          }
        } else {
          // leave URL untouched
          // this._log('_preparseUrl: no match for url ' + url);
        }
      } else {
        // no rule found (e.g., for news domains)
        // this._log('_preparseUrl: no rule found for domain ' + domain);
      }
    }

    return url;
  }

  // checks if URL from history matches a category URL
  _isMatch(historyUrl, categoryUrl) {
    // TODO: check for subcategories, for example,
    //       Spiegel 'Soziales' has URL 'wirtschaft/soziales',
    //     thus such entries are counted twice, for 'Sozialez',
    //     but also for 'Wirtschaft'
    return historyUrl.indexOf(categoryUrl) > -1;
  }

  // fetches SmartCliqz from rich-header's id_to_snippet API (async.)
  _fetchSmartCliqz(id) {
    this._log('_fetchSmartCliqz: start fetching for id ' + id);

    const promise = new Promise((function (resolve, reject) {
      const endpointUrl = SMART_CLIQZ_ENDPOINT + id;

      utils.httpGet(endpointUrl, (function success(req) {
        try {
          const smartCliqzData = JSON.parse(req.response).extra.results[0];
          const smartCliqzIdExists = (typeof smartCliqzData !== 'undefined');
          let smartCliqz;

          if (!smartCliqzIdExists) {
            reject({
              type: 'ID_NOT_FOUND',
              message: id + ' not found on server'
            });
          } else {
            smartCliqz = Result.cliqzExtra(smartCliqzData);
            this._log('_fetchSmartCliqz: done fetching for id ' + id);
            resolve(smartCliqz);
          }
        } catch (e) {
          reject({
            type: 'UNKNOWN_ERROR',
            message: e
          });
        }
      }).bind(this), function error() {
        reject({
          type: 'HTTP_REQUEST_ERROR',
          message: ''
        });
      });
    }).bind(this));
    return promise;
  }

  // from history, fetches all visits to given domain within 30 days from now (async.)
  _fetchVisitedUrls(domain, callback) {
    this._log('_fetchVisitedUrls: start fetching for domain ' + domain);
    // TODO: make cross platform
    const historyService = Components
      .classes['@mozilla.org/browser/nav-history-service;1']
      .getService(Components.interfaces.nsINavHistoryService);

    if (!historyService) {
      this._log('_fetchVisitedUrls: history service not available');
      return;
    }

    const options = historyService.getNewQueryOptions();

    const query = historyService.getNewQuery();
    query.domain = domain;
    // 30 days from now
    query.beginTimeReference = query.TIME_RELATIVE_NOW;
    query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
    query.endTimeReference = query.TIME_RELATIVE_NOW;
    query.endTime = 0;

    utils.setTimeout((function fetch() {
      const result = historyService.executeQuery(query, options);

      const container = result.root;
      container.containerOpen = true;

      let urls = [];
      for (let i = 0; i < container.childCount; i ++) {
        urls[i] = container.getChild(i).uri;
      }

      this._log(
          '_fetchVisitedUrls: done fetching ' +  urls.length +
          ' URLs for domain ' + domain);
      callback(urls);
    }).bind(this), 0);
  }

  _sendStats(id, oldCategories, newCategories, isRepeatedCustomization, urls) {
    const stats = {
      type: 'activity',
      action: 'smart_cliqz_customization',
      // SmartCliqz id
      id: id,
      // total number of URLs retrieved from history
      urlCandidateCount: urls.length,
      // number of URLs that produced a match within shown categories (currently 5)
      urlMatchCount: 0,
      // average number of URL matches across shown categories
      urlMatchCountAvg: 0,
      // standard deviation of URL matches across shown categories
      urlMatchCountSd: 0,
      // number of categories that changed (per position; swap counts twice)
      categoriesPosChangeCount: 0,
      // number of categories kept after re-ordering (positions might change)
      categoriesKeptCount: 0,
      // average position change of a kept categories
      categoriesKeptPosChangeAvg: 0,
      // true, if this customization is a re-customization
      isRepeatedCustomization: isRepeatedCustomization
    };

    let oldPositions = { };
    const length = Math.min(oldCategories.length, newCategories.length);

    for (let i = 0; i < length; i++) {
      stats.urlMatchCount += newCategories[i].matchCount;
      oldPositions[oldCategories[i].title] = i;

      if (newCategories[i].title !== oldCategories[i].title) {
        stats.categoriesPosChangeCount++;
      }
    }
    stats.urlMatchCountAvg = stats.urlMatchCount / length;

    for (let i = 0; i < length; i++) {
      stats.urlMatchCountSd +=
        Math.pow(stats.urlMatchCountAvg - newCategories[i].matchCount, 2);
    }
    stats.urlMatchCountSd /= length;
    stats.urlMatchCountSd = Math.sqrt(stats.urlMatchCountSd);

    for (let i = 0; i < length; i++) {
      if (oldPositions.hasOwnProperty(newCategories[i].title)) {
        stats.categoriesKeptCount++;
        stats.categoriesKeptPosChangeAvg +=
          Math.abs(i - oldPositions[newCategories[i].title]);

      }
    }
    stats.categoriesKeptPosChangeAvg /= stats.categoriesKeptCount;

    utils.telemetry(stats);
  }

  // log helper
  _log(msg) {
    utils.log(msg, 'smart-cliqz-cache');
  }

  unload() {
    utils.clearTimeout(this._cleanTriggerUrlsTimeout);
  }
}
