import CliqzSecureMessage from 'hpn/main';

export default {
	init() {
		/*
		let appShell = Cc['@mozilla.org/appshell/appShellService;1']
		.getService(Ci.nsIAppShellService);


		let isReady = function() {
			var hiddenWindow;

			try {
				hiddenWindow = appShell.hiddenDOMWindow &&
				appShell.hiddenDOMWindow.window;
			} catch (ex) {
			}

			if ( !hiddenWindow) {
				return false;
			}
			Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/crypto-kjur.js', hiddenWindow);
			CliqzSecureMessage.RSAKey = hiddenWindow.RSAKey;
			CliqzSecureMessage.sha1 = hiddenWindow.CryptoJS.SHA1;
			return true;
		};

		if ( isReady() ) {
			CliqzSecureMessage.init();
		}
		*/
		CliqzSecureMessage.init();
	},

	unload() {
		CliqzSecureMessage.unload();
	}

};