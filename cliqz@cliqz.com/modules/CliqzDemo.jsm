'use strict';

/*
 * This module allows selected web pages to interact with the CLIQZ
 * extension, for example, to open the dropdown or to imulate typing
 * a query. To this end, this module exports a set of functions by
 * attaching these functions to an element in the DOM of the target
 * web page.
 *
 * author: Dominik Schmidt (cliqz)
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzDemo'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var PROXY_ID = "cliqzDemoProxy";

function _log(msg) {
	CliqzUtils.log(msg, 'CliqzDemo');
}

function _onPageLoad (aEvent) {
	var doc = aEvent.originalTarget;

	if (doc.nodeName != "#document") return;	
	if (CliqzUtils.getDetailsFromUrl(doc.location.toString()).name != "cliqz") return;

	var proxy = doc.getElementById(PROXY_ID);
	if (proxy) {
		Cu.exportFunction(CliqzDemo.demoQuery, proxy, {  defineAs: "demoQuery" });
		Cu.exportFunction(CliqzDemo.openDropdown, proxy, {  defineAs: "openDropdown" });
		Cu.exportFunction(CliqzDemo.clearDropdown, proxy, {  defineAs: "clearDropdown" });
		Cu.exportFunction(CliqzDemo.typeInUrlbar, proxy, {  defineAs: "typeInUrlbar" });

		proxy.style.visibility = 'visible';
	}
}

var CliqzDemo = {
	init: function (win) {
		win.gBrowser.addEventListener("DOMContentLoaded", _onPageLoad, false);	
	},
	unload: function (win) {
		win.gBrowser.removeEventListener("DOMContentLoaded", _onPageLoad, false);	
	},
	demoQuery: function (query) {
		CliqzDemo.clearDropdown();
		CliqzDemo.openDropdown();
		CliqzDemo.typeInUrlbar(query);
	},
	openDropdown: function () {
		var core = CliqzUtils.getWindow().CLIQZ.Core;
		core.popup._openAutocompletePopup(core.urlbar, core.urlbar);
	},
	clearDropdown: function () {
		var results = 
			CliqzUtils.getWindow().CLIQZ.Core.popup.cliqzBox.resultsBox;

        while (results.firstChild) {
            results.removeChild(results.firstChild);
        }        
    },
	typeInUrlbar: function (text, pos, core) {
        if (!pos) {
            pos = 0;
        }

        if (!core) {
        	core = CliqzUtils.getWindow().CLIQZ.Core;
        	core.urlbar.focus();
        }

        if (pos < text.length) {
            CliqzUtils.setTimeout(function() {
            	core.urlbar.mInputField.setUserInput(text.substr(0, ++pos));                
                CliqzDemo.typeInUrlbar(text, pos, core);
            }, 125 + Math.random(250)); 
        }
    }
}