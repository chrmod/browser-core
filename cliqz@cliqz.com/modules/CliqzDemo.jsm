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

 // FIXME: add telemtry signal for click on demo

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

function _createFakeCursor (win) {
	var callout = win.document.createElement('panel'),
        content = win.document.createElement('div'),
        parent = win.CLIQZ.Core.popup.parentElement;

    callout.className = "onboarding-container";
	content.className = "onboarding-cursor";

	callout.setAttribute("id", "CliqzDemoCursor");	
    callout.setAttribute("level", "top");
    //callout.setAttribute("ignorekeys", "true");
    callout.setAttribute("noautofocus", "true");

	callout.appendChild(content);
    parent.appendChild(callout);

    return callout;
}

// FIXME: NOT GLOBAL
var callout;

var CliqzDemo = {
	init: function (win) {
		win.gBrowser.addEventListener("DOMContentLoaded", _onPageLoad, false);
		callout = _createFakeCursor(win);
	},
	unload: function (win) {
		win.gBrowser.removeEventListener("DOMContentLoaded", _onPageLoad, false);
		// FIXME: DELETE CURSOR CALLOUT
	},
	demoQuery: function (query) {
		CliqzDemo.clearDropdown();
		CliqzDemo.openDropdown();
		CliqzDemo.typeInUrlbar(query);
	
		CliqzUtils.setTimeout(function () {
			
			callout.openPopup(CliqzUtils.getWindow().CLIQZ.Core.popup.cliqzBox.resultsBox, "overlap", 150, 40);	
			
		}, 500);
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
            }, 125); 
        }
    }
}