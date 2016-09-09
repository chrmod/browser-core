import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { utils, events } from 'core/cliqz';
import CLIQZEnvironment from 'platform/environment';

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const BTN_ID = 'cliqz-cc-btn',
      firstRunPref = 'cliqz-cc-initialized',
      BTN_LABEL = 0,
      TOOLTIP_LABEL = 'CLIQZ',
      TELEMETRY_TYPE = 'control_center';

export default class {
  constructor(config) {
    this.window = config.window;
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this),
      openURL: this.openURL.bind(this),
      updatePref: this.updatePref.bind(this),
      updateState: this.updateState.bind(this),
      resize: this.resizePopup.bind(this),
      "adb-optimized": this.adbOptimized.bind(this),
      "antitracking-activator": this.antitrackingActivator.bind(this),
      "adb-activator": this.adbActivator.bind(this),
      "antitracking-strict": this.antitrackingStrict.bind(this),
      "sendTelemetry": this.sendTelemetry.bind(this)
    }

    this.onLocationChange = this.onLocationChange.bind(this);
  }

  init() {
    this.addCCbutton();
    CliqzEvents.sub("core.location_change", this.onLocationChange);
  }

  unload() {
    CliqzEvents.un_sub("core.location_change", this.onLocationChange);
  }

  onLocationChange() {
    this.prepareData((data) => {
      this.updateState(data.generalState);
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
      state = data.status === 'active' ? 'on' : 'off';
    } else {
      state = data.status;
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
      state = data.status === 'active' ? 'on' : 'off';
    } else {
      state = data.status;
    }
    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: 'adblock_' + data.type,
      state: state,
      action: 'click',
    });
  }

  setBadge(info){
    this.badge.textContent = info;
  }

  updateState(state){
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
            panel = utils.getWindow().document.querySelector("panel[viewId=" + BTN_ID + "]");
        panel.hidePopup();
        this.window.gBrowser.selectedTab = tab;
    }

    utils.telemetry({
      type: TELEMETRY_TYPE,
      target: data.target,
      action: 'click'
    })
  }

  prepareData(cb){
    utils.callAction(
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

      cb({
          activeURL: this.window.gBrowser.currentURI.spec,
          module: moduleData,
          generalState: generalState,
          feedbackURL: utils.FEEDBACK_URL
        });
    });
  }

  getData(data){
    this.prepareData((data) => {
      this.sendMessageToPopup({
        action: 'pushData',
        data: data
      })
    });
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

  handleMessagesFromPopup(message){
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

    if (!utils.getPref(dontHideSearchBar, false)) {
        //try to hide quick search
        try{
            var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
            if(toolbarID){
                utils.setPref(searchBarPosition, toolbarID);
            }
            if(nextEl){
                utils.setPref(searchBarPositionNext, nextEl);
            }
            utils.setPref(dontHideSearchBar, true);
        } catch(e){}
    }

    let button = doc.createElement('toolbarbutton');
    button.setAttribute('id', BTN_ID);
    button.setAttribute('label', BTN_LABEL);
    button.setAttribute('tooltiptext', TOOLTIP_LABEL);

    var div = doc.createElement('div');
    div.setAttribute('id','cliqz-control-center-badge')
    div.setAttribute('class','cliqz-control-center')
    button.appendChild(div);
    div.textContent = BTN_LABEL;

    this.badge = div;

    var panel = doc.createElement('panelview');
    panel.setAttribute('id', BTN_ID);
    panel.setAttribute('flex', '1');

    var vbox = doc.createElement("vbox");
    vbox.classList.add("panel-subview-body");

    panel.appendChild(vbox);

    var iframe;
    panel.addEventListener("ViewShowing", () => {

      function onPopupReady() {
        var body = iframe.contentDocument.body;
        var clientHeight = body.scrollHeight;
        var clientWidth = body.scrollWidth;

        iframe.style.height = toPx(clientHeight);
        iframe.style.width = toPx(clientWidth);

        this.attachMessageHandlers(iframe);
      }

      iframe = doc.createElement('iframe');
      iframe.setAttribute('type', 'content');
      iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html');
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

    button.addEventListener('command', () => {
      this.window.PanelUI.showSubView(
        BTN_ID,
        button,
        this.window.CustomizableUI.AREA_NAVBAR
      );
    }, false);

    // we need more than default max-width
    var style = `
      #${BTN_ID},
      #${BTN_ID} > iframe,
      #${BTN_ID} > panel-subview-body {
        overflow: hidden !important;
      }

      panelmultiview[mainViewId="${BTN_ID}"] > .panel-viewcontainer >
        .panel-viewstack > .panel-mainview:not([panelid="PanelUI-popup"]),
      panel[viewId="${BTN_ID}"] .panel-mainview {
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
}
