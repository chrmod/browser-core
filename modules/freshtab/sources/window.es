import inject from '../core/kord/inject';
import FreshTab from './main';
import prefs from '../core/prefs';
import utils from '../core/utils';

const DISMISSED_ALERTS = 'dismissedAlerts';

const cliqzInitialPages = [
  utils.CLIQZ_NEW_TAB_RESOURCE_URL,
  utils.CLIQZ_NEW_TAB,
  `${utils.CLIQZ_NEW_TAB_RESOURCE_URL}#`,
  `${utils.CLIQZ_NEW_TAB_RESOURCE_URL}#/`,
];

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

    const initialPages = this.window.gInitialPages;
    cliqzInitialPages.forEach((initialPage) => {
      const isInitialPage = initialPages.indexOf(initialPage) >= 0;

      if (!isInitialPage) {
        initialPages.push(initialPage);
      }
    });
  }

  /**
  *@method init
  *@return null
  */
  init() {
    this.showOnboarding();
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive(),
    };
  }

  showOnboarding() {

  }
}
