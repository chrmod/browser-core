'use strict';
var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Filter',
  'chrome://cliqzmodules/content/Filter.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

CliqzUtils.init();

var Mixer = {
	mix: function(q, history, cliqz, cliqzExtra, mixed, weatherResults, bundesligaResults, maxResults){
		var results = [],
            [is_clustered, history_trans] = CliqzClusterHistory.cluster(history, cliqz, q),
            showQueryDebug = CliqzUtils.cliqzPrefs.getBoolPref('showQueryDebug');

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

            bucketHistoryCluster.push(
                    Result.generic(style, data.url || '', null, '', '', '', data));

            // we have to delete the clustered result from history_trans so that
            // we don't display it as history
            history_trans = history_trans.slice(1);
        }

        // Was instant history result also available as a cliqz result
        for(let i in cliqz || []) {
            if(mixed.matchCount == 1 && cliqz[i].url == mixed.getLabelAt(0)) {
                let st = mixed.getStyleAt(0),
                    va = mixed.getValueAt(0),
                    im = mixed.getImageAt(0),
                    co = mixed.getCommentAt(0),
                    la = mixed.getLabelAt(0),
                    da = mixed.getDataAt(0);

                // combine sources
                var tempCliqzResult = Result.cliqz(cliqz[i]);
                st = CliqzUtils.combineSources(st, tempCliqzResult.style);

                if(showQueryDebug)
                    co = co.slice(0,-2) + " and vertical: " + tempCliqzResult.query + ")!";

                // create new instant entry to replace old one
                var newInstant = Result.generic(st, va, im, co, la, da);
                mixed._results.splice(0);
                mixed.addResults([newInstant]);
            }
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
                if(cliqz[i].url == label) {
                    // combine sources
                    var tempResult = Result.cliqz(cliqz[i]);
                    tempResult.style = CliqzUtils.combineSources(style, tempResult.style);

                    bucketHistoryCache.push(tempResult);
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

        // add external bundesliga API results
        if(bundesligaResults && bundesligaResults.length > 0)
            results = bundesligaResults.concat(results);

        results = Filter.deduplicate(mixed._results.concat(results), -1, 1, 1);

        results = results.slice(mixed._results.length);

        // all bucketHistoryCluster, there can only be one, even though is's an array for consistency
        if (bucketHistoryCluster.length > 0) {
            if(showQueryDebug)
                bucketHistoryCluster[0].comment += " (Clustering)";
            results.unshift(bucketHistoryCluster[0]);
        }

        // add extra (fun search) results at the beginning
        if(cliqzExtra) results = cliqzExtra.concat(results);

        return results.slice(0, maxResults);
	}
}
