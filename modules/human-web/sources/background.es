import { utils } from "core/cliqz";
import background from "core/base/background";
import HumanWeb from "human-web/human-web";
import hs from "core/history-service";

/**
* @namespace human-web
* @class Background
*/
export default background({
  /**
  * @method enabled
  * @return pref
  */
  enabled(settings) {
    return utils.getPref("humanWeb", false);
  },

  /**
  * @method init
  */
  init(settings) {
    let FF48_OR_ABOVE = false;

    try {
      const appInfo = Components.classes['@mozilla.org/xre/app-info;1']
        .getService(Components.interfaces.nsIXULAppInfo);
      const versionChecker = Components.classes['@mozilla.org/xpcom/version-comparator;1']
        .getService(Components.interfaces.nsIVersionComparator);

      if (versionChecker.compare(appInfo.version, '48.0') >= 0) {
        FF48_OR_ABOVE = true;
      }
    } catch (e) { utils.log(e); }

    if (FF48_OR_ABOVE) {
      this.enabled = true;
      HumanWeb.initAtBrowser();
      utils.bindObjectFunctions(this.actions, this);
      hs.addObserver(HumanWeb.historyObserver, false);
    } else {
      this.enabled = false;
    }
  },

  unload() {
    hs.removeObserver(HumanWeb.historyObserver);

    HumanWeb.unloadAtBrowser();
    HumanWeb.unload();
  },

  beforeBrowserShutdown() {
    HumanWeb.unload();
  },

  events: {
    /**
    * @event ui:click-on-url
    */
    "ui:click-on-url": function (data) {
      HumanWeb.queryCache[data.url] = {
        d: 1,
        q: data.query,
        t: data.type,
        pt: data.positionType,
      };
    },
     /**
    * @event control-center:toggleHumanWeb
    */
    "control-center:toggleHumanWeb": function() {
      if(utils.getPref("humanWeb", false) && !utils.getPref('dnt', false)){
        HumanWeb.unloadAtBrowser();
      } else {
        HumanWeb.initAtBrowser();
      }

      utils.app.extensionRestart(() => {
        utils.setPref('dnt', !utils.getPref('dnt', false));
      });
    },
    "core:mouse-down": function onMouseDown() {
      HumanWeb.captureMouseClickPage.apply(HumanWeb, arguments);
    },
  },

  actions: {
    /**
    * @method actions.recordKeyPress
    */
    recordKeyPress() {
      HumanWeb.captureKeyPressPage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordMouseMove
    */
    recordMouseMove() {
      HumanWeb.captureMouseMovePage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordScroll
    */
    recordScroll() {
      HumanWeb.captureScrollPage.apply(HumanWeb, arguments);
    },
    /**
    * @method actions.recordCopy
    */
    recordCopy() {
      HumanWeb.captureCopyPage.apply(HumanWeb, arguments);
    },

    /**
     * Check whether there is some state for this url.
     * @param  {String}  url
     * @return {Boolean}     true if a state object exists.
     */
    isProcessingUrl(url) {
      return HumanWeb.state.v[url] !== undefined;
    },

    /**
     * Add some data to the metadata for a url under the specified key. If data
     * already exists, we will merge it, overwriting any duplicates.
     *
     * @param {String} url
     * @param {String} key  object key under-which to add this data
     * @param {Object} data data to add
     * @returns {Promise} Resolves if data was added, rejects if we have no state
     * for this url.
     */
    addDataToUrl(url, key, data) {
      if (HumanWeb.state.v[url]) {
        HumanWeb.state.v[url][key] = Object.keys(data).reduce((acc, val) => {
          acc[val] = data[val];
          return acc;
        }, HumanWeb.state.v[url][key] || {});
        return Promise.resolve();
      }
      return Promise.reject();
    },
  }
})
