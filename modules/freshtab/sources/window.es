import inject from '../core/kord/inject';
import FreshTab from './main';
import prefs from '../core/prefs';
import utils from '../core/utils';


/**
* @namespace freshtab
*/
export default class {
  /**
  * @class Window
  * @constructor
  */
  constructor(config) {
    this.onInstall = prefs.get('new_session');
    this.buttonEnabled = config.settings.freshTabButton;
    this.window = config.window;
    this.showNewBrandAlert = config.settings.showNewBrandAlert;
  }
  /**
  *@method init
  *@return null
  */
  init() {
    this.core = inject.module('core');
    this.clearUrlbar();
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive(),
    };
  }

  clearUrlbar() {
    const currentUrl = this.window.gBrowser.selectedBrowser.currentURI.spec;
    const initialPages = this.window.gInitialPages;
    const cliqzInitialPages = [
      utils.CLIQZ_NEW_TAB_RESOURCE_URL,
      utils.CLIQZ_NEW_TAB,
    ];

    cliqzInitialPages.forEach((initialPage) => {
      const isInitialPage = initialPages.indexOf(initialPage) >= 0;
      const isCurrentUrl = cliqzInitialPages.indexOf(currentUrl) >= 0;

      if (!isInitialPage) {
        initialPages.push(initialPage);
      }

      if (isCurrentUrl) {
        this.core.action('setUrlbar', '');
      }
    });
  }
}
