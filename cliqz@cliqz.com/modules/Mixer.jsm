'use strict';
var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZ',
  'chrome://cliqz/content/utils.js');

var _log = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
    log = function(str){
    _log.logStringMessage('Mixer.jsm: ' + str);
}

var Mixer = {
	mix: function(history, cliqz, mixed, maxResults){
		var results = [];

		/// 1) put each result into a bucket
        var bucketHistoryDomain = [],
            bucketHistoryOther = [],
            bucketCache = [],
            bucketHistoryCache = [];


        for (let i = 0;
             history && i < history.matchCount;
             i++) {
            let style = history.getStyleAt(i),
                value = history.getValueAt(i),
                image = history.getImageAt(i),
                comment = history.getCommentAt(i),
                label = history.getLabelAt(i);

            // Deduplicate: check if this result is also in the cache results
            let cacheIndex = -1;
            for(let i in cliqz || []) {
                if(cliqz[i].url.indexOf(label) != -1) {
                    var tempResult = Result.cliqz(cliqz[i])
                    bucketHistoryCache.push(Result.generic(style, value, image, comment, label,
                        tempResult.query, tempResult.image));
                    cacheIndex = i;
                    break;
                }
            }

            if(cacheIndex >= 0) {
                // if also found in cache, remove so it is not added to cache-only bucket
                cliqz.splice(cacheIndex, 1);
            } else {
                let urlparts = CLIQZ.Utils.getDetailsFromUrl(label);

                if(!Result.isValid(label, urlparts)) {
                    // Assign to different buckets if the search string occurs in hostname
                    if(urlparts.host.toLowerCase().indexOf(this.searchString) !=-1)
                        bucketHistoryDomain.push(Result.generic(style, value, image, comment, label, this.searchString));
                    else
                        bucketHistoryOther.push(Result.generic(style, value, image, comment, label, this.searchString));
                }
            }
        }

        for(let i in cliqz || []) {
            bucketCache.push(Result.cliqz(cliqz[i]));
        }

        /// 2) Prepare final result list from buckets

        var showQueryDebug = CLIQZ.Utils.cliqzPrefs.getBoolPref('showQueryDebug')

        // the top history with matching domain will be show already via instant-serve

        // all bucketHistoryCache
        for(let i = 0; i < bucketHistoryCache.length; i++) {
            if(showQueryDebug)
                bucketHistoryCache[i].comment += " (History and Cache: " + bucketHistoryCache[i].query + ")!";
            results.push(bucketHistoryCache[i]);
        }

        // top 1 of bucketCache
        if(bucketCache.length > 0) {
            if(showQueryDebug)
                bucketCache[0].comment += " (top Cache: " + bucketCache[0].query + ")!";
            results.push(bucketCache[0]);
        }

        // top 2 of bucketHistoryDomain
        for(let i = 0; i < Math.min(bucketHistoryDomain.length, 2); i++) {
            if(showQueryDebug)
                bucketHistoryDomain[i].comment += " (top History Domain)!";
            results.push(bucketHistoryDomain[i]);
        }

        // rest of bucketCache
        for(let i = 1; i < bucketCache.length && i < 4; i++) {
            if(showQueryDebug)
                bucketCache[i].comment += " (Cache: " + bucketCache[i].query + ")!";
            results.push(bucketCache[i]);
        }

        // rest of bucketHistoryDomain
        for(let i = 2; i < bucketHistoryDomain.length; i++) {
            if(showQueryDebug)
                bucketHistoryDomain[i].comment += " (History Domain)!";
            results.push(bucketHistoryDomain[i]);
        }

        // all bucketHistoryOther
        for(let i = 0; i < bucketHistoryOther.length; i++) {
            if(showQueryDebug)
                bucketHistoryOther[i].comment += " (History Other)!";
            results.push(bucketHistoryOther[i]);
        }

        results = Filter.deduplicate(mixed._results.concat(results), -1, 1, 1);
        results = results.slice(mixed._results.length);

        // TODO: move deduplication to before final ordering to make sure all important buckets have entries

        /// 4) Show suggests if not enough results
        if(this.searchString && results.length < maxResults &&
            (results.length > 0 || (this.cliqzSuggestions || []).length > 0)){

            results.push(
                    Result.generic(
                        Result.CLIQZS,
                        this.searchString,
                        Result.CLIQZICON,
                        CLIQZ.Utils.createSuggestionTitle(this.searchString)
                    )
                );
        }
        for(let i=0; i < (this.cliqzSuggestions || []).length && results.length < maxResults ; i++) {
            if(this.cliqzSuggestions[i].toLowerCase() != this.searchString.toLowerCase()){
                results.push(
                    Result.generic(
                        Result.CLIQZS,
                        this.cliqzSuggestions[i],
                        Result.CLIQZICON,
                        CLIQZ.Utils.createSuggestionTitle(this.cliqzSuggestions[i])
                    )
                );
            }
        }

        return results.slice(0, maxResults);
	}
}