import FreshTab from 'freshtab/main';
import prefs from '../core/prefs';
import utils from '../core/utils';

const { CLIQZ_NEW_TAB, CLIQZ_NEW_TAB_RESOURCE_URL } = utils;

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
    this.cliqzOnboarding = config.settings.cliqzOnboarding;
    this.showNewBrandAlert = config.settings.showNewBrandAlert;
  }
  /**
  *@method init
  *@return null
  */
  init() {
    const initialPages = this.window.gInitialPages;

    if (!initialPages) {
      return;
    }

    if (initialPages.indexOf(CLIQZ_NEW_TAB) === -1) {
      initialPages.push(CLIQZ_NEW_TAB);
    }

    if (initialPages.indexOf(CLIQZ_NEW_TAB_RESOURCE_URL) === -1) {
      initialPages.push(CLIQZ_NEW_TAB_RESOURCE_URL);
    }
  }

  unload() {}

  status() {
    return {
      visible: true,
      enabled: FreshTab.isActive()
    }
  }
};
