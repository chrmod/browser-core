import CliqzADB, { adbEnabled } from 'adblocker/adblocker';

export default {
  init() {
    if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return;
    }
    CliqzADB.init();
  },

  unload() {
    if (CliqzADB.getBrowserMajorVersion() < CliqzADB.MIN_BROWSER_VERSION) {
      return;
    }
    CliqzADB.unload();
  },

  actions: {
    // handles messages coming from process script
    nodes(url, nodes) {
      if (!adbEnabled()) {
        return { rules: [] };
      }
      const candidates = CliqzADB.adBlocker.engine.getCosmeticsFilters(url, nodes);
      return {
        rules: candidates.map(rule => rule.selector)
      }
    },

    url(url) {
      if (!adbEnabled()) {
        return {
          scripts: [],
          sytles: [],
          type: 'domain-rules'
        }
      }

      const candidates = CliqzADB.adBlocker.engine.getDomainFilters(url);
      return {
        styles: candidates.filter(rule => !rule.scriptInject).map(rule => rule.selector),
        scripts: candidates.filter(rule => rule.scriptInject).map(rule => rule.selector),
        type: 'domain-rules'
      }
    }
  },
};
