'use strict';

/*
 * This module caches SmartCliqz results in the extension. It
 * also customizes SmartCliqz results by re-ordering links
 * based on the user's browsing history.
 *
 * author: Dominik Schmidt (cliqz)
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzSmartCliqzCache'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzSmartCliqzCache = CliqzSmartCliqzCache || {
	_smartCliqzCache: { },
	_customDataCache: { },

	// stores SmartCliqz if newer than chached version
	store: function (smartCliqz) {
		var id = this.getId(smartCliqz);

		var cached = this.retrieve(id);
		if (!cached) { // || smartCliqz.data.ts > cached.data.ts) {			
			this._smartCliqzCache[id] = smartCliqz;
			// this._prepareCustomData(id);
		}
	},
	// returns customized SmartCliqz from cache (undefined if not found)
	retrieve: function (id) {
		this._smartCliqzCache[id] && this._customizeSmartCliqz(id);
		return this._smartCliqzCache[id];
	},
	// extracts id from SmartCliqz
	getId: function (smartCliqz) {
		return JSON.parse(smartCliqz.data.subType).ez;
	},
	// returns true this is a news SmartCliqz
	isNews: function (smartCliqz) {
		return (typeof smartCliqz.data.news != 'undefined');
	},
	// if news, re-orders categories based on visit frequency
	_customizeSmartCliqz: function (id) {
		var smartCliqz = this.retrieve(id);
		if (!this.isNews(smartCliqz)) {
			return smartCliqz;
		}

		var _this = this;
		
		// TODO: check for expiration and mark dirty
		if (this._customDataCache[id]) {
			this._injectCustomData(smartCliqz, this._customDataCache[id].data);
		} else {
			// not yet ready: wait (was initiated on store)
		}
	},
	// replaces all keys from custom data in SmartCliqz 
	_injectCustomData: function (smartCliqz, customData) {
		for (var key in customData) {
			if (customData.hasOwnProperty(key)) {
				smartCliqz[key] = customData[key];
			}
		}
	},
	// prepares and stores custom data for SmartCliqz with given id (async.)
	// if custom data has not been prepared before and has not expired
	_prepareCustomData: function (id) {
		// TODO: check for expiration and mark dirty
		if (this._customDataCache[id]) {
			return;
		}

		// TODO: only exceute if currently not running (lock array)
		var _this = this;

		// (1) fetch template from rich header
		this._fetchSmartCliqz(id, function callback(smartCliqz) {
			var id = this.getId(smartCliqz);
			var domain = smartCliqz.domain;

			// (2) fetch history for SmartCliqz domain
			_this._fetchVisitedUrls(domain, function callback(urls) {

				// (3) re-order template categories based on history
				var categories = smartCliqz.categories;

				// add some information to facilitate re-ordering
				for (var j; j < categories.length; j++) {
					categories[j].genUrl =
						CliqzHistoryPattern.generalizeUrl(categories[j].url);
					categories[j].matchCount = 0;
					categories[j].originalOrder = j;
				}

				// count category-visit matches (visit url contains category url)
				for (var i; i < urls.length; i++) {
					var url = 
                		CliqzHistoryPattern.generalizeUrl(urls[i]);
					for (var j; j < categories.length; j++) {
						if (url.indexOf(categories[j].genUrl) > -1) {
		                    categories[j].matchCount++;
		                }
					}
				}

				// re-order by match count; on tie use original order
				categories.sort(function compare(a, b) {
                    if (a.matchCount != b.matchCount) {                        
                        return b.matchCount - a.matchCount; // descending
                    } else {                        
                        return a.originalOrder - b.originalOrder; // ascending
                    }
                });

				// TODO: store timestamp
                _this._customDataCache[id] = categories;
			})
		});
	},
	// fetches SmartCliqz from rich-header's id_to_snippet API (async.)
	_fetchSmartCliqz: function (id, callback) {
		var serviceUrl = 
            'http://rich-header-server.clyqz.com/id_to_snippet?q=' + id;

        CliqzUtils.httpGet(serviceUrl,
        	function success(req) {
        		var smartCliqz = 
        			JSON.parse(req.response).extra.results[0].data;
        		callback(smartCliqz);
        	});
	},
	// from history, fetches all visits to given domain within 30 days from now (async.)
	_fetchVisitedUrls: function (domain, callback) {
		var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        setTimeout(function fetch() {
        	var result = 
        		historyService.executeQuery(query, options);

	        var container = result.root;
	        container.containerOpen = true;

	        var urls = [];
	        for (var i = 0; i < container.childCount; i ++) {
	             urls[i] = cocontainernt.getChild(i).uri;
	        }

	        callback(urls);
        }, 0);
	},
	// log helper
	_log: function (msg) {
		CliqzUtils.log(msg, 'SmartCliqzCache');
	}
}