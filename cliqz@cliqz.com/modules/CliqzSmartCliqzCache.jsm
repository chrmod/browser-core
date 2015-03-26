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

var Cache = function (life) {
	this._cache = { };
	this._life = life * 1000;
};

Cache.prototype.store = function (key, value, time) {
	time = time || Date.now();

	if (this.isNew(key, value, time)) {
		this._cache[key] = {
			time: time,
			value: value
		};
	}
};

Cache.prototype.retrieve = function (key) {
	if (!this.isCached(key)) {
		return false;
	}
	return this._cache[key].value;
};

Cache.prototype.isCached = function (key) {
	return this._cache.hasOwnProperty(key);
};

Cache.prototype.isNew = function (key, value, time) {
	return !this.isCached(key) || 
		(time > this._cache[key].time);
};

Cache.prototype.isStale = function (key) {
	return (Date.now() - this._cache[key].time) > life;
};

var CliqzSmartCliqzCache = CliqzSmartCliqzCache || {	
	_customDataCache: { },
	_smartCliqzCache: new Cache(60),

	// stores SmartCliqz if newer than chached version
	store: function (smartCliqz) {
		var id = this.getId(smartCliqz);

		// TODO: use timestamp from SmartCliqz
		this._smartCliqzCache.store(id, smartCliqz);
		if (this.isNews(smartCliqz)) {
			// start preparing to be ready as soon as possible
			this._prepareCustomData(id);
		}
	},
	// returns SmartCliqz from cache (false if not found)
	retrieve: function (id) {
		return this._smartCliqzCache.retrieve(id);
	},
	// returns _customized_ SmartCliqz from cache (false if not found)
	retrieveCustomized: function (id) {
		var smartCliqz = this._smartCliqzCache.retrieve(id);
		if (smartCliqz && this.isNews(smartCliqz)) {			
			this._customizeSmartCliqz(smartCliqz);
		}
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
	// re-orders categories based on visit frequency
	_customizeSmartCliqz: function (smartCliqz) {
		var id = this.getId(smartCliqz);
		
		// TODO: check for expiration and mark dirty
		if (this._customDataCache[id]) {
			this._injectCustomData(smartCliqz, 
				this._customDataCache[id]);
		} else {
			this._log(
				'_customizeSmartCliqz: custom data not ready yet for ' + id);
		}
	},
	// replaces all keys from custom data in SmartCliqz data
	_injectCustomData: function (smartCliqz, customData) {
		var id = this.getId(smartCliqz);
		this._log('_injectCustomData: injecting for id ' + id);
		for (var key in customData) {
			if (customData.hasOwnProperty(key)) {				
				smartCliqz.data[key] = customData[key];
				this._log('_injectCustomData: injecting key ' + key);
			}
		}
		this._log('_injectCustomData: done injecting for id ' + id);
	},
	// prepares and stores custom data for SmartCliqz with given id (async.),
	// (if custom data has not been prepared before and has not expired)
	_prepareCustomData: function (id) {
		// TODO: check using hasOwnProperty
		// TODO: check for expiration and mark dirty
		if (this._customDataCache[id]) {
			if (this._customDataCache[id].bestBefore > Date.now) {
				this._log('_prepareCustomData: ' + id + ' expired')	
			} else {
				this._log('_prepareCustomData: ' + id + ' already cached')	
				return;
			}
		}

		this._log('_prepareCustomData: preparing for id ' + id);
		// TODO: only execute if currently not running (lock array)
		
		// (1) fetch template from rich header
		var _this = this;
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

                _this._customDataCache[id] = {
                	bestBefore: _this._addTimeToDate(Date.now(), 'second', 10),
                	categories: categories.slice(0, 5)
                };

                _this._log('_prepareCustomData: done preparing for id ' + id);
			})
		});
	},
	// fetches SmartCliqz from rich-header's id_to_snippet API (async.)
	_fetchSmartCliqz: function (id, callback) {
		this._log('_fetchSmartCliqz: start fetching for id ' + id);

		var serviceUrl = 
            'http://rich-header-server.clyqz.com/id_to_snippet?q=' + id;

        var _this = this;
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
		this._log('_fetchVisitedUrls: start fetching for domain ' + domain);

		var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        if (!historyService) {
        	this._log('_fetchVisitedUrls: history service not available');
        	return;
        }

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * 30 * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        var _this = this;
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
	_addTimeToDate: function(date, interval, units) {
		var future = new Date(date);		  
		switch(interval.toLowerCase()) {
			case 'year'   :  future.setFullYear(future.getFullYear() + units);  break;			
			case 'month'  :  future.setMonth(future.getMonth() + units);  break;
			case 'week'   :  future.setDate(future.getDate() + 7 * units);  break;
			case 'day'    :  future.setDate(future.getDate() + units);  break;
			case 'hour'   :  future.setTime(future.getTime() + units * 3600000);  break;
			case 'minute' :  future.setTime(future.getTime() + units * 60000);  break;
			case 'second' :  future.setTime(future.getTime() + units * 1000);  break;
		}
		return future;
	},
	// log helper
	_log: function (msg) {
		CliqzUtils.log(msg, 'SmartCliqzCache');
	}
}