import { utils } from 'core/cliqz';
import background from "core/base/background";
import CliqzADB,
      { ADB_PREF_VALUES,
        ADB_PREF,
        adbEnabled } from 'adblocker/adblocker';

function isAdbActive(url) {
  return adbEnabled() &&
         !CliqzADB.adBlocker.isDomainInBlacklist(url) &&
         !CliqzADB.adBlocker.isUrlInBlacklist(url)
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
    "control-center:adb-optimized": function () {
      utils.setPref(ADB_PREF,
                    utils.getPref(ADB_PREF) == ADB_PREF_VALUES.Enabled ?
                      ADB_PREF_VALUES.Optimized : ADB_PREF_VALUES.Enabled)
    },
    "control-center:adb-activator": function () {
      utils.setPref(ADB_PREF,
                    utils.getPref(ADB_PREF) !== ADB_PREF_VALUES.Disabled ?
                      ADB_PREF_VALUES.Disabled : ADB_PREF_VALUES.Enabled)
    }
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
});
