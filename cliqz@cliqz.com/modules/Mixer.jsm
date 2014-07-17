'use strict';
var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm?v=0.4.16');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.16');

var _log = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
    log = function(str){
        _log.logStringMessage('Mixer.jsm: ' + str);
    };

CliqzUtils.init();

var Mixer = {
	mix: function(q, history, cliqz, mixed, weatherResults, worldCupResults ,maxResults){
		var results = [],
            [is_clustered, history_trans] = CliqzClusterHistory.cluster(history);

		/// 1) put each result into a bucket
        var bucketHistoryDomain = [],
            bucketHistoryOther = [],
            bucketCache = [],
            bucketHistoryCache = [],
            bucketHistoryCluster = [];


        if (is_clustered) {
            let style = history_trans[0]['style'],
                value = history_trans[0]['value'],
                image = history_trans[0]['image'],
                comment = history_trans[0]['data']['summary'],
                label = history_trans[0]['label'],
                // if is_cluster the object has additional data
                data = history_trans[0]['data'];

            bucketHistoryCluster.push(Result.generic(Result.CLIQZCLUSTER, '', null, '', '', '', data));

            // we have to empty the history_trans so that only the new collapsed/clustered results is
            // displayed
            history_trans = [];
        }


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
                let urlparts = CliqzUtils.getDetailsFromUrl(label);

                if(Result.isValid(label, urlparts)) {
                    // Assign to different buckets if the search string occurs in hostname
                    if(urlparts.host.toLowerCase().indexOf(q) !=-1)
                        bucketHistoryDomain.push(Result.generic(style, value, image, comment, label, q));
                    else
                        bucketHistoryOther.push(Result.generic(style, value, image, comment, label, q));
                }
            }
        }

        for(let i in cliqz || []) {
            bucketCache.push(Result.cliqz(cliqz[i]));
        }

        /// 2) Prepare final result list from buckets

        var showQueryDebug = CliqzUtils.cliqzPrefs.getBoolPref('showQueryDebug')

        // the top history with matching domain will be show already via instant-serve


        // all bucketHistoryCluster, there can only be one, even though is's an array for consistency
        if (bucketHistoryCluster.length > 0) {
            if(showQueryDebug)
                bucketHistoryCluster[0].comment += " (Clustering)";
            results.push(bucketHistoryCluster[0]);
        }

        // all bucketHistoryCache
        for(let i = 0; i < bucketHistoryCache.length; i++) {
            if(showQueryDebug)
                bucketHistoryCache[i].comment += " (History and vertical: " + bucketHistoryCache[i].query + ")!";
            results.push(bucketHistoryCache[i]);
        }

        // top 1 of bucketCache
        if(bucketCache.length > 0) {
            if(showQueryDebug)
                bucketCache[0].comment += " (top vertical: " + bucketCache[0].query + ")!";
            results.push(bucketCache[0]);
        }

        // top 2 of bucketHistoryDomain
        for(let i = 0; i < Math.min(bucketHistoryDomain.length, 2); i++) {
            if(showQueryDebug)
                bucketHistoryDomain[i].comment += " (top History Domain)!";
            results.push(bucketHistoryDomain[i]);
        }

        // rest of bucketCache
        for(let i = 1; i < bucketCache.length && i < 10; i++) {
            if(showQueryDebug)
                bucketCache[i].comment += " (" + bucketCache[i].query + ")!";
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

        // add external weather API results
        if(weatherResults && weatherResults.length > 0)
            results = weatherResults.concat(results);

        // add external world cup API results
        if(worldCupResults && worldCupResults.length > 0)
            results = worldCupResults.concat(results);

        results = Filter.deduplicate(mixed._results.concat(results), -1, 1, 1);
        results = results.slice(mixed._results.length);



        return results.slice(0, maxResults);
	}
}
