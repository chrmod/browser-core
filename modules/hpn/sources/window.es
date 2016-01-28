import CliqzSecureMessage from 'hpn/main';

const prefKey = 'hpn-query', // 0 - enable, 1 - disable
      BLOCK = false,
      ALLOW = true;
export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
  	CliqzSecureMessage.initAtWindow(this.window);
  }

  unload() {
  }

	createButtonItem(win){
	    var doc = win.document,
	        menu = doc.createElement('menu'),
	        menuPopup = doc.createElement('menupopup');

	    menu.setAttribute('label', 'Secure channel');

	    var safeSearchBtn = win.CLIQZ.Core.createCheckBoxItem(doc, 'hpn-query', CliqzUtils.getLocalizedString('btnSafeSearch'), true);
	    menuPopup.appendChild(safeSearchBtn);

	    menuPopup.appendChild(
	        win.CLIQZ.Core.createSimpleBtn(
	            doc,
	            CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
	            function(){
	                    CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/privacy#humanweb');
	                },
	            'safe_search_desc'
	        )
	    );

	    menu.appendChild(menuPopup)
	    return menu
	}


};