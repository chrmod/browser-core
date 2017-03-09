import { utils } from 'core/cliqz';
import { addStylesheet, removeStylesheet } from "../core/helpers/stylesheet";

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const CustomizableUI = Cu.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;
const STYLESHEET_URL = 'chrome://cliqz/content/pairing/css/burger_menu.css';

/**
* @namespace pairing
* @class Window
*/
export default class {
  /**
  * @constructor
  */

  constructor(settings) {
    this.window = settings.window;
  }
  /**
  * @method init
  */
  init() {
    if (this.status().visible) {
      CustomizableUI.createWidget({
        id: 'mobilepairing_btn',
        defaultArea: CustomizableUI.AREA_PANEL,
        label: 'Connect',
        tooltiptext: 'Connect',
        onCommand: () => {
          const gBrowser = utils.getWindow().gBrowser;
          gBrowser.selectedTab = gBrowser.addTab('about:preferences#connect');
          utils.telemetry({
            type: 'burger_menu',
            version: 1,
            action: 'click',
            target: 'connect',
          });
        },
      });

      addStylesheet(this.window.document, STYLESHEET_URL);
    }
  }

  unload() {
    if (this.status().visible) {
      CustomizableUI.destroyWidget('mobilepairing_btn');
      removeStylesheet(this.window.document, STYLESHEET_URL);
    }
  }

  status() {
    return {
      visible: utils.getPref('connect', false),
    };
  }
}
