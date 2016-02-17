import { utils } from "core/cliqz";
import HumanWeb from "human-web/human-web";
import hs from "core/history-service";

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;
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

    hs.addObserver(HumanWeb.historyObserver, false);

    this._dataCollectionTimer = utils.setTimeout(this.showDataCollectionMessage.bind(this), 1000);
  }

  unload() {
    if (!this.enabled()) {
      return;
    }

    utils.clearTimeout(this._dataCollectionTimer);

    hs.removeObserver(HumanWeb.historyObserver);

    this.window.gBrowser.removeProgressListener(HumanWeb.listener);

    window.gBrowser.tabContainer.childNodes.forEach( tab => {
      const currentBrowser = this.window.gBrowser.getBrowserForTab(tab);
      currentBrowser.contentDocument.removeEventListener("keypress",  HumanWeb.captureKeyPressPage,true);
      currentBrowser.contentDocument.removeEventListener("mousemove", HumanWeb.captureMouseMovePage,true);
      currentBrowser.contentDocument.removeEventListener("mousedown", HumanWeb.captureMouseClickPage,true);
      currentBrowser.contentDocument.removeEventListener("scroll",    HumanWeb.captureScrollPage,true);
      currentBrowser.contentDocument.removeEventListener("copy",      HumanWeb.captureCopyPage,true);
    });
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

  /**
   * dataCollectionMessageState
   *   0 - not shown
   *   1 - shown
   *   2 - ignored
   *   3 - learn more
   */
  showDataCollectionMessage() {
    if (!this.settings.showDataCollectionMessage ||
       utils.getPref('dataCollectionMessageState', 0) !== 0) {
      return;
    }

    function updateDataCollectionState(state) {
      utils.telemetry({
        type: 'dataCollectionMessage',
        state: state
      });

      utils.setPref('dataCollectionMessageState', state);
    }

    let box = this.window.document.getElementById("global-notificationbox"),
        buttons = [];

    buttons.push({
      label: utils.getLocalizedString("learnMore"),
      callback: () => {
        let learnMoreUrl = 'chrome://cliqz/content/human-web/humanweb.html';
        this.window.gBrowser.selectedTab = this.window.gBrowser.addTab(learnMoreUrl);
        updateDataCollectionState(3);
      }
    });

    box.appendNotification(
      utils.getLocalizedString("dataCollection"),
      null,
      null,
      box.PRIORITY_INFO_HIGH,
      buttons,
      function () {
        // notification hides if the user closes it or presses learn more
        if(utils.getPref('dataCollectionMessageState', 0) < 2){
          updateDataCollectionState(2);
        }
      }
    );

    updateDataCollectionState(1);
  }
}
