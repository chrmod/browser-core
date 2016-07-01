import {utils} from "core/cliqz";
import CliqzAntiPhishing from "anti-phishing/anti-phishing";

export default class {
  constructor(settings) {

  }

  init() {

  }

  unload() {

  }

  changeAntiPhishingState() {
    utils.setPref('cliqz-anti-phishing-enabled', !utils.getPref('cliqz-anti-phishing-enabled', false));
  }

  createButtonItem(win) {
    if (!CliqzAntiPhishing.isAntiPhishingActive()) {
      return;
    }
    var doc = win.document,
        menu = doc.createElement('menu'),
        menuPopup = doc.createElement('menupopup');

    menu.setAttribute('label', utils.getLocalizedString('anti-phishing'));

    // HumanWeb checkbox
    menuPopup.appendChild(
      win.CLIQZ.Core.createCheckBoxItem(
        doc,
        'cliqz-anti-phishing-enabled',
        utils.getLocalizedString('anti-phishing-enabled'),
        true,
        this.changeAntiPhishingState)
    );

    menu.appendChild(menuPopup);

    return menu;
  }
}
