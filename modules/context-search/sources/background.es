import { utils } from 'core/cliqz';
import background from 'core/base/background';
import ContextSearch from 'context-search/context-search';

/**
 * @namespace context-search
 * @class Background
 */

class ContextSearchReranker {
  constructor(contextSearch) {
    this.contextSearch = contextSearch;
    this.name = this.contextSearch.name;
  }

  duringResults(input) {
    const qExt = this.contextSearch.getQExt(input.query);
    if (qExt && qExt.trim() !== input.query.trim()) {
      return new Promise((resolve) => {
        utils.getBackendResults(qExt).then(resolve);
      });
    }
    return Promise.resolve(input);
  }

  afterResults(myResults, originalResults) {
    return new Promise((resolve) => {
      const results = [originalResults];
      if (myResults.response) {
        results.push(myResults);
      }
      this.contextSearch.doRerank(results, originalResults.query);
      resolve(originalResults);
    });
  }
}

export default background({

  /**
   * @method init
   */
  init() {
    this.contextSearch = new ContextSearch();
    this.contextSearch.init();
    utils.bindObjectFunctions(this.actions, this);

    utils.RERANKERS.push(new ContextSearchReranker(this.contextSearch));
  },

  /**
   * @method unload
   */
  unload() {
    this.contextSearch.unload();
  },

  events: {
    /**
     * @event ui:click-on-url
     */
    'ui:click-on-url': function () {
      this.contextSearch.invalidCache = true;
    },
    alternative_search() {
      this.contextSearch.invalidCache = true;
    },
    'core:url-meta': function (url, meta) {
      this.contextSearch.addNewUrlToCache(decodeURI(url), meta);
      this.contextSearch.testUrlDistribution(decodeURI(url));
    },

  },
});
