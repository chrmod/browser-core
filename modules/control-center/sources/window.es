import ToolbarButtonManager from 'q-button/ToolbarButtonManager';
import { simpleBtn } from 'q-button/buttons';
import { utils } from 'core/cliqz';
import CLIQZEnvironment from "platform/environment";

const BTN_ID = 'cliqz-button1',
      firstRunPref = 'firstStartDone1';

export default class {
  constructor(config) {
    this.window = config.window;
    this.actions = {
      setBadge: this.setBadge.bind(this)
    }
  }

  init() {
    this.addCCbutton();

    //TODO: can we make it smarter?
    // this.window.CLIQZ.ControlCenter.actions = this.actions
  }

  unload() {

  }

  setBadge(info){
    this.badge.textContent = info;
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
    div.textContent = "CLIQZ";

    this.badge = div;

    menupopup.addEventListener('popupshowing', (ev) => {
        // only care about top level menu
        if(ev.target.id != 'cliqz_menupopup') return;

        if(menupopup.children.length == 0){
          var iframe = doc.createElement('iframe');
          iframe.setAttribute('src','chrome://cliqz/content/control-center/index.html');
          iframe.style.width = "455px";
          iframe.style.height = "700px";
          menupopup.appendChild(iframe);
        }
      }
    );
    button.addEventListener('command', () => {
        if(button.children[0] && button.children[0].openPopup)
        button.children[0].openPopup(button,"after_start", -370, 0, false, true);
    }, false);

    ToolbarButtonManager.restorePosition(doc, button);
  }
}
