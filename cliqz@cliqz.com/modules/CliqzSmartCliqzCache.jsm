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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzSmartCliqzCache = _this = CliqzSmartCliqzCache || {
	_smartCliqzCache: { },
	_customDataCache: { },

	// stores SmartCliqz if newer than chached version
	store: function (smartCliqz) {
		var id = this.getId(smartCliqz);

		var cached = this.retrieve(id, false);
		if (!cached) { // || smartCliqz.data.ts > cached.data.ts) {			
			_this._smartCliqzCache[id] = smartCliqz;
			_this._prepareCustomData(id);
		}
	},
	// returns SmartCliqz from cache (false if not found)
	retrieve: function (id) {
		if (_this._smartCliqzCache.hasOwnProperty(id)) {
			_this._log('retrieve: id ' + id);
			return _this._smartCliqzCache[id];
		}
		return false;
	},
	// returns _customized_ SmartCliqz from cache (false if not found)
	retrieveCustomized: function (id) {
		var smartCliqz = _this.retrieve(id);
		smartCliqz && _this._customizeSmartCliqz(smartCliqz);
		return smartCliqz;
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
	_customizeSmartCliqz: function (smartCliqz) {
		var id = _this.getId(smartCliqz);
		if (!_this.isNews(smartCliqz)) {
			_this._log('_customizeSmartCliqz: not news ' + id);
			return smartCliqz;
		}
		
		// TODO: check for expiration and mark dirty
		if (_this._customDataCache[id]) {
			_this._injectCustomData(smartCliqz, 
				_this._customDataCache[id]);
		} else {
			_this._log(
				'_customizeSmartCliqz: custom data not ready yet for ' + id);
		}
	},
	// replaces all keys from custom data in SmartCliqz data
	_injectCustomData: function (smartCliqz, customData) {
		var id = _this.getId(smartCliqz);
		_this._log('_injectCustomData: injecting for id ' + id);
		for (var key in customData) {
			if (customData.hasOwnProperty(key)) {				
				smartCliqz.data[key] = customData[key];
				_this._log('_injectCustomData: injecting key ' + key);
			}
		}
		_this._log('_injectCustomData: done injecting for id ' + id);
	},
	// prepares and stores custom data for SmartCliqz with given id (async.)
	// (if custom data has not been prepared before and has not expired)
	_prepareCustomData: function (id) {
		// TODO: check using hasOwnProperty
		// TODO: check for expiration and mark dirty
		if (this._customDataCache[id]) {
			_this._log('_prepareCustomData: ' + id + ' already cached')
			return;
		}

		_this._log('_prepareCustomData: preparing for id ' + id);
		// TODO: only exceute if currently not running (lock array)
		var _this = this;

		// (1) fetch template from rich header
		this._fetchSmartCliqz(id, function callback(smartCliqz) {
			var id = _this.getId(smartCliqz);
			var domain = smartCliqz.data.domain;

			// (2) fetch history for SmartCliqz domain
			_this._fetchVisitedUrls(domain, function callback(urls) {

				// (3) re-order template categories based on history
				var categories = smartCliqz.data.categories;

				// add some information to facilitate re-ordering
				for (var j = 0; j < categories.length; j++) {
					categories[j].genUrl =
						CliqzHistoryPattern.generalizeUrl(categories[j].url);
					categories[j].matchCount = 0;
					categories[j].originalOrder = j;
				}

				// count category-visit matches (visit url contains category url)
				for (var i = 0; i < urls.length; i++) {
					var url = 
                		CliqzHistoryPattern.generalizeUrl(urls[i]);
					for (var j = 0; j < categories.length; j++) {
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
                _this._customDataCache[id] = {
                	categories: categories.slice(0, 5)
                };

                _this._log('_prepareCustomData: done preparing for id ' + id);
			})
		});
	},
	// fetches SmartCliqz from rich-header's id_to_snippet API (async.)
	_fetchSmartCliqz: function (id, callback) {
		_this._log('_fetchSmartCliqz: start fetching for id ' + id);

		var serviceUrl = 
            'http://rich-header-server.clyqz.com/id_to_snippet?q=' + id;

        CliqzUtils.httpGet(serviceUrl,
        	function success(req) {
        		var smartCliqz = 
        			JSON.parse(req.response).extra.results[0];
        		// match data structure if big machine results
        		smartCliqz.data.subType = smartCliqz.subType;
        		_this._log('_fetchSmartCliqz: done fetching for id ' + id);
        		callback(smartCliqz);
        	});
	},
	// from history, fetches all visits to given domain within 30 days from now (async.)
	_fetchVisitedUrls: function (domain, callback) {
		_this._log('_fetchVisitedUrls: start fetching for domain ' + domain);

		var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        if (!historyService) {
        	_this._log('_fetchVisitedUrls: history service not available');
        	return;
        }

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        CliqzUtils.setTimeout(function fetch() {
        	var result = 
        		historyService.executeQuery(query, options);

	        var container = result.root;
	        container.containerOpen = true;

	        var urls = [];
	        for (var i = 0; i < container.childCount; i ++) {
	             urls[i] = container.getChild(i).uri;
	        }

	        _this._log(
	        		'_fetchVisitedUrls: done fetching ' +  urls.length + 
	        		' URLs for domain ' + domain);
	        callback(urls);
        }, 0);
	},
	// log helper
	_log: function (msg) {
		CliqzUtils.log(msg, 'SmartCliqzCache');
	}
}