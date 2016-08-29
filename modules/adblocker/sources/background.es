import CliqzADB, { adbEnabled } from 'adblocker/adblocker';

function isAdbActive(url) {
  return adbEnabled() &&
         !CliqzADB.adBlocker.isDomainInBlacklist(url) &&
         !CliqzADB.adBlocker.isUrlInBlacklist(url)
}

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
      if (!isAdbActive(url)) {
        return {
          rules: [],
          active: false
        };
      }
      const candidates = CliqzADB.adBlocker.engine.getCosmeticsFilters(url, nodes);
      return {
        rules: candidates.map(rule => rule.selector),
        active: true
      }
    },

    url(url) {
      if (!isAdbActive(url)) {
        return {
          scripts: [],
          sytles: [],
          type: 'domain-rules',
          active: false
        }
      }

      const candidates = CliqzADB.adBlocker.engine.getDomainFilters(url);
      return {
        styles: candidates.filter(rule => !rule.scriptInject && !rule.scriptBlock).map(rule => rule.selector),
        scripts: candidates.filter(rule => rule.scriptInject).map(rule => rule.selector),
        scriptBlock: candidates.filter(rule => rule.scriptBlock).map(rule => rule.selector),
        type: 'domain-rules',
        active: true
      }
    }
  },
};
