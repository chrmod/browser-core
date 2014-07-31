'use strict';
var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
    'chrome://cliqzmodules/content/Result.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm?v=0.4.14');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.02');

CliqzUtils.init();

var Mixer = {
	mix: function(q, history, cliqz, mixed, weatherResults ,maxResults){
		var results = [],
            [is_clustered, history_trans] = CliqzClusterHistory.cluster(history, cliqz, q);

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

            if(data)bucketHistoryCluster.push(Result.generic(style, data.url || '', null, '', '', '', data));

            // we have to empty the history_trans so that only the new collapsed/clustered results is
            // displayed
            history_trans = [];
        }


        for (let i = 0; history_trans && i < history_trans.length; i++) {
            let style = history_trans[i]['style'],
                value = history_trans[i]['value'],
                image = history_trans[i]['image'],
                comment = history_trans[i]['comment'],
                label = history_trans[i]['label'];


            // Deduplicate: check if this result is also in the cache results
            let cacheIndex = -1;
            for(let i in cliqz || []) {
                if(cliqz[i].url.indexOf(label) != -1) {
                    bucketHistoryCache.push(Result.cliqz(cliqz[i]));
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

        results = Filter.deduplicate(mixed._results.concat(results), -1, 1, 1);


        results = results.slice(mixed._results.length);

        // all bucketHistoryCluster, there can only be one, even though is's an array for consistency
        if (bucketHistoryCluster.length > 0) {
            if(showQueryDebug)
                bucketHistoryCluster[0].comment += " (Clustering)";
            results.unshift(bucketHistoryCluster[0]);
        }
        return results.slice(0, maxResults);
	}
}
