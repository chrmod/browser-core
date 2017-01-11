import { utils } from 'core/cliqz';
import background from 'core/base/background';
import CliqzADB,
      { ADB_PREF_VALUES,
        ADB_PREF,
        ADB_PREF_OPTIMIZED,
        adbEnabled } from 'adblocker/adblocker';

function isAdbActive(url) {
  return adbEnabled() &&
         !CliqzADB.adBlocker.isDomainInBlacklist(url) &&
         !CliqzADB.adBlocker.isUrlInBlacklist(url);
}

export default background({
  enabled() { return true; },

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

  events: {
    'control-center:adb-optimized': () => {
      utils.setPref(ADB_PREF_OPTIMIZED, !utils.getPref(ADB_PREF_OPTIMIZED, false));
    },
    'control-center:adb-activator': (data) => {
      const isUrlInBlacklist = CliqzADB.adBlocker.isUrlInBlacklist(data.url);
      const isDomainInBlacklist = CliqzADB.adBlocker.isDomainInBlacklist(data.url);

      // We first need to togle it off to be able to turn it on for the right thing - site or domain
      if (isUrlInBlacklist) {
        CliqzADB.adBlocker.toggleUrl(data.url);
      }

      if (isDomainInBlacklist) {
        CliqzADB.adBlocker.toggleUrl(data.url, true);
      }

      if (data.status === 'active') {
        utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
      } else if (data.status === 'off') {
        if (data.option === 'all-sites') {
          utils.setPref(ADB_PREF, ADB_PREF_VALUES.Disabled);
        } else {
          utils.setPref(ADB_PREF, ADB_PREF_VALUES.Enabled);
          CliqzADB.adBlocker.toggleUrl(data.url, data.option === 'domain');
        }
      }
    },
  },

  actions: {
    // handles messages coming from process script
    nodes(url, nodes) {
      if (!isAdbActive(url)) {
        return {
          rules: [],
          active: false,
        };
      }
      const candidates = CliqzADB.adBlocker.engine.getCosmeticsFilters(url, nodes);
      return {
        rules: candidates.map(rule => rule.selector),
        active: true,
      };
    },

    url(url) {
      if (!isAdbActive(url)) {
        return {
          scripts: [],
          sytles: [],
          type: 'domain-rules',
          active: false,
        };
      }

      const candidates = CliqzADB.adBlocker.engine.getDomainFilters(url);
      return {
        styles: candidates
          .filter(rule => !rule.scriptInject && !rule.scriptBlock)
          .map(rule => rule.selector),
        scripts: candidates.filter(rule => rule.scriptInject).map(rule => rule.selector),
        scriptBlock: candidates.filter(rule => rule.scriptBlock).map(rule => rule.selector),
        type: 'domain-rules',
        active: true,
      };
    },
  },
});
