import CliqzLoyalty from 'loyalty/main';

export default class {

  constructor(settings) {
    this.window = settings.window;
    this.needPlaceHolder = CliqzUtils.getPref('firstStartDone', false);
  }

  init() {
    var win = this.window;
    var btn_id = CliqzLoyalty.getBrowserButtonID();
    if (this.needPlaceHolder)
        ToolbarButtonManager.setDefaultPosition(btn_id, 'nav-bar', BTN_ID);

    var button = win.document.createElement('toolbarbutton');
    button.setAttribute('id', btn_id);
    button.setAttribute('tooltiptext', 'CLIQZ for Glory');
    button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
    button.setAttribute('image', CliqzLoyalty.getBrowserIcon(false));
    button.addEventListener("command",
        function(ev){
            CLIQZEnvironment.openTabInWindow(win, 'about:cliqzloyalty');
            CliqzLoyalty.onBrowserIconClick();
        }
        , false);

    ToolbarButtonManager.restorePosition(win.document, button);
  }

  unload() { }

  createButtonItem() { }
}
