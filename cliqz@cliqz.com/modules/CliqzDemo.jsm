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

function _log(msg) {
	CliqzUtils.log(msg, 'CliqzDemo');
}

function _onPageLoad (aEvent) {
	var doc = aEvent.originalTarget;
	if (doc.nodeName != "#document") return;
	_log("loaded event processed");
}

var CliqzDemo = {
	init: function (window) {
		_log("added event listener to gBrowser");
		window.gBrowser.addEventListener("DOMContentLoaded", _onPageLoad, false);	
	},
	unload: function (window) {
		window.gBrowser.removeEventListener("DOMContentLoaded", _onPageLoad, false);	
	}
}