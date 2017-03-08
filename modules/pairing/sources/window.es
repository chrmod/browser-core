import { utils } from 'core/cliqz';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
const CustomizableUI = Cu.import('resource:///modules/CustomizableUI.jsm', null).CustomizableUI;

/**
* @namespace pairing
* @class Window
*/
export default class {
  /**
  * @method init
  */
  init() {
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

    Cu.import('resource://gre/modules/Services.jsm');
    const sss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService);

    let css = '';
    css += '@-moz-document url("chrome://browser/content/browser.xul") {';
    css += '    #mobilepairing_btn {';
    // a 16px x 16px icon for when in toolbar
    css += '        list-style-image: url("chrome://cliqz/content/pairing/images/pairing-icon.svg")';
    css += '    }';
    css += '    #mobilepairing_btn[cui-areatype="menu-panel"],';
    css += '        toolbarpaletteitem[place="palette"] > #mobilepairing_btn {';
    // a 32px x 32px icon for when in toolbar
    css += '    }';
    css += '        list-style-image: url("chrome://cliqz/content/pairing/images/pairing-icon.svg");';
    css += '}';

    const cssEnc = encodeURIComponent(css);
    const newURIParam = {
      aURL: `data:text/css,${cssEnc}`,
      aOriginCharset: null,
      aBaseURI: null,
    };
    this.cssUri = Services.io.newURI(
      newURIParam.aURL,
      newURIParam.aOriginCharset,
      newURIParam.aBaseURI,
    );
    sss.loadAndRegisterSheet(this.cssUri, sss.AUTHOR_SHEET);
  }

  unload() {
    const sss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService);
    sss.unregisterSheet(this.cssUri, sss.AUTHOR_SHEET);
    CustomizableUI.destroyWidget('mobilepairing_btn');
  }

  status() {
    return {
      visible: true,
    };
  }
}
