import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { utils, events } from 'core/cliqz';
import CLIQZEnvironment from 'platform/environment';
import background from 'control-center/background';
import UITour from 'platform/ui-tour';

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const BTN_ID = 'cliqz-cc-btn',
      PANEL_ID = BTN_ID + '-panel',
      firstRunPref = 'cliqz-cc-initialized',
      BTN_LABEL = 0,
      TOOLTIP_LABEL = 'CLIQZ',
      TELEMETRY_TYPE = 'control_center';

export default class {
  constructor(config) {
    if(!background.buttonEnabled){
      return;
    }

    this.window = config.window;
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this),
      openURL: this.openURL.bind(this),
      updatePref: this.updatePref.bind(this),
      updateState: this.updateState.bind(this),
      refreshState: this.refreshState.bind(this),
      resize: this.resizePopup.bind(this),
      "adb-optimized": this.adbOptimized.bind(this),
      "antitracking-activator": this.antitrackingActivator.bind(this),
      "adb-activator": this.adbActivator.bind(this),
      "antitracking-strict": this.antitrackingStrict.bind(this),
      "sendTelemetry": this.sendTelemetry.bind(this),
      "openPopUp": this.openPopUp.bind(this),
      "openMockPopUp": this.openMockPopUp.bind(this),
      "setMockBadge": this.setMockBadge.bind(this)
    }
  }

  init() {
    if(background.buttonEnabled){
      this.addCCbutton();
      CliqzEvents.sub("core.location_change", this.actions.refreshState);
    }
  }

  unload() {
    if(background.buttonEnabled){
      CliqzEvents.un_sub("core.location_change", this.actions.refreshState);
    }
  }

  refreshState() {
    this.prepareData().then((data) => {
      this.setState(data.generalState);
    });
  }

  adbOptimized(data) {
    events.pub("control-center:adb-optimized");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'adblock_fair',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  antitrackingStrict(data) {
    events.pub("control-center:antitracking-strict");
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'attrack_fair',
      action: 'click',
      state: data.status === true ? 'on' : 'off'
    });
  }

  antitrackingActivator(data){

    events.pub("control-center:antitracking-activator", data);
    var state;
    if(data.type === 'switch') {
      state = data.state === 'active' ? 'on' : 'off';
    } else {
      state = data.state;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'attrack_' + data.type,
      state: state,
      action: 'click',
    });
  }

  adbActivator(data){

    events.pub("control-center:adb-activator", data);
    var state;
    if(data.type === 'switch') {
      state = data.state === 'active' ? 'on' : 'off';
    } else {
      state = data.state;
    }
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'adblock_' + data.type,
      state: state,
      action: 'click',
    });
  }

  setMockBadge(info) {
    this.updateBadge(info);
  }

  updateBadge(info) {
    this.badge.textContent = info;
  }

  isOnboarding() {
    var step = utils.getPref('cliqz-onboarding-v2-step', 1);
    return this.window.gBrowser.currentURI.spec === "about:onboarding" && step === 2;
  }

  setBadge(info, mock){
    if(!this.isOnboarding()) {
      this.updateBadge(info);
    }
  }

  updateState(state){
    if(!background.buttonEnabled){
      return;
    }

    // set the state of the current window
    this.setState(state);

    // go to all the other windows and refresh the state
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win != this.window){
        setTimeout((win) => {
          utils.callWindowAction(
            win,
            'control-center',
            'refreshState',
            []
          );
        }, 200, win);
      }
      else {
        // current window - nothing to do
      }
    }
  }

  setState(state){
    this.badge.setAttribute('state', state);
  }

  updatePref(data){

    // NASTY!
    if(data.pref == 'extensions.cliqz.dnt') data.value = !data.value;

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      state: data.value,
      action: 'click'
    });

    // more NASTY
    if(data.pref == 'extensions.cliqz.share_location'){
      utils.callAction(
        "geolocation",
        "setLocationPermission",
        [data.value]
      );

      return;
    }

    utils.setPref(data.pref, data.value, '' /* full pref name required! */);
  }

  openURL(data){
    switch(data.url) {
      case 'history':
        this.window.PlacesCommandHook.showPlacesOrganizer('History');
        break;
      default:
        var tab = utils.openLink(this.window, data.url, true),
            panel = this.window.document.querySelector("panel[viewId=" + PANEL_ID + "]");
        if(data.closePopup == true) panel.hidePopup();
        this.window.gBrowser.selectedTab = tab;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click'
    })
  }

  prepareData(){
    return utils.callAction(
      "core",
      "getWindowStatus",
      [this.window]
    ).then((moduleData) => {
      var generalState = 'active';
      if(moduleData['anti-phishing'] && !moduleData['anti-phishing'].active){
        generalState = 'inactive';
      }

      if(moduleData.antitracking && !moduleData.antitracking.enabled){
        if(moduleData.antitracking.isWhitelisted){
          // only this website is whitelisted
          generalState = 'inactive';
        }
        else {
          // completely disabled
          generalState = 'critical';
        }
      }

      moduleData.adult = { visible: true, state: utils.getAdultFilterState() };
      if(utils.hasPref('browser.privatebrowsing.apt', '')){
        moduleData.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      return {
          activeURL: this.window.gBrowser.currentURI.spec,
          module: moduleData,
          generalState: generalState,
          feedbackURL: utils.FEEDBACK_URL,
          onboarding: this.isOnboarding(),
          debug: utils.getPref('showConsoleLogs', false)
        }
    });
  }

  numberAnimation() {

  }

  _getMockData() {
    var self = this;
    var numberCounter = 0;
    var numberAnimation = function () {
      if(numberCounter === 27)
       return

      if(numberCounter < 18)
        self.mockedData.antitracking.totalCount = numberCounter;

      self.mockedData.adblocker.totalCount = numberCounter;
      self.sendMessageToPopup({
        action: 'pushData',
        data: {
          activeURL: 'examplepage.de/webpage',
          module: self.mockedData,
          "generalState":"active",
          "feedbackURL":"https://cliqz.com/feedback/1.2.99-40",
          "onboarding": true
        }
      });

      numberCounter++;
      setTimeout(numberAnimation, 40);
    }
    numberAnimation();
  }

  openMockPopUp(data) {
    this.isMocked = true;
    this.mockedData = data;
    this.openPopUp();
  }

  getData() {
    if(this.isMocked){
      this._getMockData();
      this.isMocked = false;
    } else {
      this.prepareData().then(data => {
        this.sendMessageToPopup({
          action: 'pushData',
          data: data
        })
      }).catch(e => utils.log(e.toString(), "getData error"))
    }
  }

  attachMessageHandlers(iframe){

    this.iframe = iframe;
    this.iframe.contentWindow.addEventListener('message', this.decodeMessagesFromPopup.bind(this))
  }

  decodeMessagesFromPopup(ev){
    var data = JSON.parse(ev.data);
    if(data.target == 'cliqz-control-center' &&
       data.origin == 'iframe'){
      this.handleMessagesFromPopup(data.message);
    }
  }

  handleMessagesFromPopup(message) {

    this.actions[message.action](message.data);
  }

  sendMessageToPopup(message) {
    this.iframe.contentWindow.postMessage(JSON.stringify({
      target: 'cliqz-control-center',
      origin: 'window',
      message: message
    }), '*')
  }

  addCCbutton() {
    var doc = this.window.document;
    var firstRunPrefVal = utils.getPref(firstRunPref, false);
    if (!firstRunPrefVal) {
        utils.setPref(firstRunPref, true);

        ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'bookmarks-menu-button');
    }

    let button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', TOOLTIP_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);

    var div = doc.createElement('div');
    div.setAttribute('id','cliqz-control-center-badge')
    div.setAttribute('class','cliqz-control-center')
    button.appendChild(div);
    div.textContent = BTN_LABEL;

    this.badge = div;

    var panel = doc.createElement('panelview');
    panel.setAttribute('id', PANEL_ID);
    panel.setAttribute('flex', '1');
    panel.setAttribute('panelopen', "true")
    panel.setAttribute("animate", "true")
    panel.setAttribute("type", "arrow");


    var vbox = doc.createElement("vbox");
    vbox.classList.add("panel-subview-body");

    panel.appendChild(vbox);

    var iframe;
    function onPopupReady() {
      var body = iframe.contentDocument.body;
      var clientHeight = body.scrollHeight;
      var clientWidth = body.scrollWidth;

      iframe.style.height = toPx(clientHeight);
      iframe.style.width = toPx(clientWidth);

      this.attachMessageHandlers(iframe);
    }

    function createIframe() {
      iframe = doc.createElement('iframe');
      iframe.setAttribute('type', 'content');
      iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html');
    }

    panel.addEventListener("ViewShowing", () => {
      createIframe();
      iframe.addEventListener('load', onPopupReady.bind(this), true);

      vbox.appendChild(iframe);

      utils.telemetry({
        type: TELEMETRY_TYPE,
        target: 'icon',
        action: 'click',
      });
    });

    panel.addEventListener("ViewHiding", function () {
      vbox.removeChild(iframe);
    });

    doc.getElementById('PanelUI-multiView').appendChild(panel);

    UITour.targets.set("cliqz", { query: '#cliqz-cc-btn', widgetName: 'cliqz-cc-btn', allowAdd: true });
    var promise = UITour.getTarget(this.window, "cliqz");
    var win = this.window
    promise.then(function(target) {
      button.addEventListener('command', () => {

        if (this.isOnboarding()) {
          createIframe();
          UITour.showInfo(win, target, "", "");
          iframe.addEventListener('load', onPopupReady.bind(this), true);
          doc.getElementById("UITourTooltipDescription").appendChild(iframe)
        } else {
          win.PanelUI.showSubView(
            PANEL_ID,
            button,
            win.CustomizableUI.AREA_NAVBAR
          );
        }
      }.bind(this));
    }.bind(this));

    // we need more than default max-width
    var style = `
      #${PANEL_ID},
      #${PANEL_ID} > iframe,
      #${PANEL_ID} > panel-subview-body {
        overflow: hidden !important;
      }

      panelmultiview[mainViewId="${PANEL_ID}"] > .panel-viewcontainer >
        .panel-viewstack > .panel-mainview:not([panelid="PanelUI-popup"]),
      panel[viewId="${PANEL_ID}"] .panel-mainview {
        max-width: 50em !important;
      }
    `;

    var styleURI = Services.io.newURI(
        'data:text/css,' + encodeURIComponent(style),
        null,
        null
    );

    doc.defaultView.QueryInterface(Ci.nsIInterfaceRequestor)
      .getInterface(Ci.nsIDOMWindowUtils)
      .loadSheet(styleURI, 1);

    ToolbarButtonManager.restorePosition(doc, button);
  }

  resizePopup({ width, height }) {
    this.iframe.style.width = toPx(width);
    this.iframe.style.height = toPx(height);
  }

  sendTelemetry(data) {
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click',
      state: data.state
    });
  }

  openPopUp() {
    this.window.document.querySelector('toolbarbutton#' + BTN_ID).click();
  }
}
