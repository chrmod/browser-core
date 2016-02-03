import { utils } from "core/cliqz";
import HumanWeb from "human-web/human-web";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    if(utils.getPref("humanWeb", false) && !utils.getPref("dnt", false)
       && !utils.isPrivate(this.window)){
      HumanWeb.init(this.window);
      this.window.gBrowser.addProgressListener(HumanWeb.listener);
    }

    if (!utils.isPrivate(this.window)) {
      try {
        var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
        if(utils.getPref("humanWeb", false)){
            //Also need to add for Humanweb
            hs.addObserver(CliqzHumanWeb.historyObserver, false);
        }
      } catch(e) {}
    }
  }

  unload() {
    if (!utils.isPrivate(this.window)) {
      try {
          var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
          if (utils.getPref("humanWeb", false) ){
              //Also, remove from Humanweb
              hs.removeObserver(HumanWeb.historyObserver);
          }
      } catch(e) {}
    }

    if(utils.getPref("humanWeb", false)
        && !utils.getPref("dnt", false)
        && !utils.isPrivate(this.window)) {

      this.window.gBrowser.removeProgressListener(HumanWeb.listener);

      var numTabs = window.gBrowser.tabContainer.childNodes.length;

      for (var i=0; i<numTabs; i++) {
        var currentTab = gBrowser.tabContainer.childNodes[i];
        var currentBrowser = gBrowser.getBrowserForTab(currentTab);
        currentBrowser.contentDocument.removeEventListener("keypress", HumanWeb.captureKeyPressPage,true);
        currentBrowser.contentDocument.removeEventListener("mousemove", HumanWeb.captureMouseMovePage,true);
        currentBrowser.contentDocument.removeEventListener("mousedown", HumanWeb.captureMouseClickPage,true);
        currentBrowser.contentDocument.removeEventListener("scroll", HumanWeb.captureScrollPage,true);
        currentBrowser.contentDocument.removeEventListener("copy", HumanWeb.captureCopyPage,true);
      }
    }
  }

  createButtonItem(win) {
    var doc = win.document,
        menu = doc.createElement('menu'),
        menuPopup = doc.createElement('menupopup');


    menu.setAttribute('label', 'Human Web');

    // HumanWeb checkbox
    menuPopup.appendChild(
      this.createCheckBoxItem(
        doc,
        'dnt',
        utils.getLocalizedString('btnSafeSearch'),
        false,
        this.changeHumanWebState)
    );

    // HumanWeb learn more button
    menuPopup.appendChild(
      this.createSimpleBtn(
        doc,
        utils.getLocalizedString('btnSafeSearchDesc'),
        function(){
          CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/privacy#humanweb');
        },
        'safe_search_desc')
    );

    menu.appendChild(menuPopup)
    return menu
  }

  changeHumanWebState() {
    if(utils.getPref("humanWeb", false) && !utils.getPref('dnt', false)){
      HumanWeb.unloadAtBrowser();
    } else {
      HumanWeb.initAtBrowser();
    }

    utils.extensionRestart(function(){
      utils.setPref('dnt', !utils.getPref('dnt', false));
    });
  }
}
