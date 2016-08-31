import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { simpleBtn } from 'q-button/buttons';
import { utils, Promise } from 'core/cliqz';
import config from 'core/config';
import CLIQZEnvironment from 'platform/environment';


const BTN_ID = 'cliqz-button1',
      firstRunPref = 'firstStartDone1';

export default class {
  constructor(config) {
    this.config = config;
    this.window = config.window;
    this.actions = {
      setBadge: this.setBadge.bind(this),
      getData: this.getData.bind(this)
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

  getHttpsEverywhereState() {
    return new Promise((resolve, reject) =>
      {
        if(this.config.settings.channel == '40'){ //browser
          AddonManager.getAddonByID("https-everywhere@cliqz.com", function(addon){
            if(addon && addon.isActive){
              resolve({
                visible: true,
                active: utils.getPref('extensions.https_everywhere.globalEnabled', false, '')
              });
            } else resolve({});
          });
        } else resolve({});
      });
  }

  getData(){
    this.getHttpsEverywhereState().then((httpsEverywhere) => {
      // gets dynamic data from all the modules
      var data = this.getModulesData();

      data.httpsEverywhere = httpsEverywhere;
      data.adult = { visible: true, state: utils.getAdultFilterState() };
      if(utils.hasPref('browser.privatebrowsing.apt', '')){
        data.apt = { visible: true, state: utils.getPref('browser.privatebrowsing.apt', false, '') }
      }

      this.sendMessageToPopup({
        action: 'pushData',
        data: data
      })
    });
  }

  getModulesData(){
    var modules = {};

    for (var moduleName in this.window.CLIQZ.Core.windowModules){
      var mod = this.window.CLIQZ.Core.windowModules[moduleName];

      modules[moduleName] = null

      if ('controlCenterData' in mod) {
        try {
          modules[moduleName] = mod.controlCenterData()
        } catch(e) { /* no data for control-center */ }
      }
    }

    return modules;
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

    var menupopup = doc.createElement('menupopup');
    menupopup.setAttribute('id', 'cliqz_menupopup');
    button.appendChild(menupopup);

    var div = doc.createElement('div');
    div.setAttribute('id','cliqz-control-center-badge')
    div.setAttribute('class','cliqz-control-center')
    div.style.backgroundImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'cliqz_btn.svg)';
    button.appendChild(div);
    div.textContent = 'CLIQZ';

    this.badge = div;

    menupopup.addEventListener('popupshowing', (ev) => {
        // only care about top level menu
        if(ev.target.id != 'cliqz_menupopup') return;

        if(menupopup.children.length == 0){
          var iframe = doc.createElement('iframe');
          iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html?' + this.rand);
          iframe.style.width = '455px';
          iframe.style.height = '700px';
          menupopup.appendChild(iframe);

          this.attachMessageHandlers(iframe);
        }
      }
    );
    button.addEventListener('command', () => {
        if(button.children[0] && button.children[0].openPopup)
        button.children[0].openPopup(button,'after_start', -370, 0, false, true);
    }, false);

    ToolbarButtonManager.restorePosition(doc, button);
  }
}
