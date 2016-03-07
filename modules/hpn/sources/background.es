import { utils } from 'core/cliqz';

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

		var FF41_OR_ABOVE = false;

		try {
			var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULAppInfo);
			var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
				.getService(Components.interfaces.nsIVersionComparator);

			if(versionChecker.compare(appInfo.version, "41.0") >= 0){
				FF41_OR_ABOVE = true;
			}
		} catch(e){}

		if(FF41_OR_ABOVE && CliqzUtils.getPref("proxyNetwork", true)){
			utils.importModule("hpn/main").then(CliqzSecureMessage => {
				this.CliqzSecureMessage = CliqzSecureMessage.default;
				this.CliqzSecureMessage.init();
			})
		}
	},

	unload() {
		if(this.CliqzSecureMessage)
			this.CliqzSecureMessage.unload();
	}

};
