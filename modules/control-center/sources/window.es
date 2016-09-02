import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { simpleBtn } from 'q-button/buttons';
import { utils, events } from 'core/cliqz';
import CLIQZEnvironment from 'platform/environment';

function toPx(pixels) {
  return pixels.toString() + 'px';
}

const BTN_ID = 'cliqz-button1',
      firstRunPref = 'firstStartDone1';

export default class {
  constructor(config) {
    this.window = config.window;
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this),
      openURL: this.openURL.bind(this),
      updatePref: this.updatePref.bind(this),
      resize: this.resizePopup.bind(this),
      "adb-activator": events.pub.bind(events, "control-center:adb-activator"),
      "adb-optimized": events.pub.bind(events, "control-center:adb-optimized"),
      "antitracking-activator": events.pub.bind(events, "control-center:antitracking-activator"),
      "antitracking-strict": events.pub.bind(events, "control-center:antitracking-strict")
    }
  }

  init() {
    this.addCCbutton();
  }

  unload() {

  }

  setBadge(info){
    this.badge.textContent = info;
  }

  updatePref(data){
    this.window.console.log('updatePref', data);

    // NASTY!
    if(data.pref == 'extensions.cliqz.dnt') data.value = !data.value;

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
    this.window.console.log('openURL', data);
    switch(data.url) {
      case 'history':
        this.window.PlacesCommandHook.showPlacesOrganizer('History');
        break;
      default:
        var tab = utils.openLink(this.window, data.url, true);
        this.window.gBrowser.selectedTab = tab;
    }
  }

  getData(){
    utils.callAction(
      "core",
      "getWindowStatus",
      [this.window]
    ).then((moduleData) => {
      var generalState = 'active';


      if(moduleData['anti-phishing'] && !moduleData['anti-phishing'].enabled){
        generalState = 'inactive';
      }

      if(moduleData.antitracking && !moduleData.antitracking.enabled){
        generalState = 'critical';
      }

      moduleData.adult = { visible: true, state: utils.getAdultFilterState() };
      if(utils.hasPref('browser.privatebrowsing.apt', '')){
        moduleData.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      this.sendMessageToPopup({
        action: 'pushData',
        data: {
          activeURL: this.window.gBrowser.currentURI.spec,
          module: moduleData,
          generalState: generalState
        }
      })
    });
  }

  attachMessageHandlers(iframe){
    this.iframe = iframe;
    this.iframe.contentWindow.addEventListener('message', this.decodeMessagesFromPopup.bind(this))
    this.actions.getData();
  }

  decodeMessagesFromPopup(ev){
    var data = JSON.parse(ev.data);
    if(data.target == 'cliqz-control-center' &&
       data.origin == 'iframe'){
      this.handleMessagesFromPopup(data.message);
    }
  }

  handleMessagesFromPopup(message){
    this.window.console.log('IN BACKGROUND', message);
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

        ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
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
    button.setAttribute('label', 'CLIQZ');
    button.setAttribute('tooltiptext', 'CLIQZ');

    var div = doc.createElement('div');
    div.setAttribute('id','cliqz-control-center-badge')
    div.setAttribute('class','cliqz-control-center')
    div.style.backgroundImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'cliqz_btn.svg)';
    button.appendChild(div);
    div.textContent = 'CLIQZ';

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
}
