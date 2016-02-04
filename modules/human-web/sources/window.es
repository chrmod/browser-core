import { utils } from "core/cliqz";
import HumanWeb from "human-web/human-web";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  enabled() {
    return utils.getPref("humanWeb", false)
           && !utils.getPref("dnt", false)
           && !utils.isPrivate(this.window);
  }

  init() {
    if (!this.enabled()) {
      return;
    }

    HumanWeb.init(this.window);

    this.window.gBrowser.addProgressListener(HumanWeb.listener);

    try {
      let hs = Cc["@mozilla.org/browser/nav-history-service;1"]
                 .getService(Ci.nsINavHistoryService);
      hs.addObserver(HumanWeb.historyObserver, false);
    } catch(e) {
      utils.log(e, "HumanWeb History Observer error");
    }
  }

  unload() {
    if (!this.enabled()) {
      return;
    }

    try {
      let hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
      hs.removeObserver(HumanWeb.historyObserver);
    } catch(e) {}

    this.window.gBrowser.removeProgressListener(HumanWeb.listener);

    window.gBrowser.tabContainer.childNodes.forEach( tab => {
      const currentBrowser = this.window.gBrowser.getBrowserForTab(tab);
      currentBrowser.contentDocument.removeEventListener("keypress",  HumanWeb.captureKeyPressPage,true);
      currentBrowser.contentDocument.removeEventListener("mousemove", HumanWeb.captureMouseMovePage,true);
      currentBrowser.contentDocument.removeEventListener("mousedown", HumanWeb.captureMouseClickPage,true);
      currentBrowser.contentDocument.removeEventListener("scroll",    HumanWeb.captureScrollPage,true);
      currentBrowser.contentDocument.removeEventListener("copy",      HumanWeb.captureCopyPage,true);
    }
  }

  createButtonItem(win) {
    var doc = win.document,
        menu = doc.createElement('menu'),
        menuPopup = doc.createElement('menupopup');

    menu.setAttribute('label', 'Human Web');

    // HumanWeb checkbox
    menuPopup.appendChild(
      win.CLIQZ.Core.createCheckBoxItem(
        doc,
        'dnt',
        utils.getLocalizedString('btnSafeSearch'),
        false,
        this.changeHumanWebState)
    );

    // HumanWeb learn more button
    menuPopup.appendChild(
      win.CLIQZ.Core.createSimpleBtn(
        doc,
        utils.getLocalizedString('btnSafeSearchDesc'),
        function(){
          utils.openTabInWindow(win, 'https://cliqz.com/privacy#humanweb');
        },
        'safe_search_desc')
    );

    menu.appendChild(menuPopup);

    return menu;
  }

  changeHumanWebState() {
    if(utils.getPref("humanWeb", false) && !utils.getPref('dnt', false)){
      HumanWeb.unloadAtBrowser();
    } else {
      HumanWeb.initAtBrowser();
    }

    utils.extensionRestart(function() {
      utils.setPref('dnt', !utils.getPref('dnt', false));
    });
  }
}
