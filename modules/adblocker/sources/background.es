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
  },
};
