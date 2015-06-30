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

	_log("loaded event processed");

	var proxy = doc.getElementById(PROXY_ID);
	if (proxy) {
		_log("proxy found");
		Cu.exportFunction(CliqzDemo.openDropdown, proxy, {  defineAs: "openDropdown" });
	}
}

var CliqzDemo = {
	init: function (win) {
		_log("added event listener to gBrowser");
		win.gBrowser.addEventListener("DOMContentLoaded", _onPageLoad, false);	
	},
	unload: function (win) {
		win.gBrowser.removeEventListener("DOMContentLoaded", _onPageLoad, false);	
	},
	openDropdown: function () {
		var core = CliqzUtils.getWindow().CLIQZ.Core;
		_log("core is " + core);
		core.popup._openAutocompletePopup(core.urlbar, core.urlbar);
	}
}