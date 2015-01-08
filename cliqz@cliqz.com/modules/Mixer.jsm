'use strict';
/*
 * This module mixes the results from cliqz with the history
 *
 */

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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

CliqzUtils.init();

var Mixer = {
	mix: function(q, history, cliqz, cliqzExtra, mixed, bundesligaResults, maxResults){
		var results = [];
    if (CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
      var [is_clustered, history_trans] = [false, history];
    } else {
      var [is_clustered, history_trans] = CliqzClusterHistory.cluster(history, cliqz, q);
    }

		/// 1) put each result into a bucket
        var bucketHistoryDomain = [],
            bucketHistoryOther = [],
            bucketCache = [],
            bucketHistoryCache = [],
            bucketHistoryCluster = [],
            bucketBookmark = [],
            bucketBookmarkCache = [];


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

                // do this for all types except clustering for now
                // TODO: find a way to report where all clustered values come from
                if(st != 'cliqz-cluster' && st != 'cliqz-series' && st != 'cliqz-pattern') {
                    // combine sources
                    var tempCliqzResult = Result.cliqz(cliqz[i]);
                    st = CliqzUtils.combineSources(st, tempCliqzResult.style);

                    co = co.slice(0,-2) + " and vertical: " + tempCliqzResult.query + ")!";

                    // create new instant entry to replace old one
                    var newInstant = Result.generic(st, va, im, co, la, da);
                    mixed._results.splice(0);
                    mixed.addResults([newInstant]);
                }
            }
        }

        for (let i = 0; history_trans && i < history_trans.length; i++) {
            let style = history_trans[i]['style'],
                value = history_trans[i]['value'],
                image = history_trans[i]['image'],
                comment = history_trans[i]['comment'],
                label = history_trans[i]['label'];

            var bookmark = false;
            if (style.indexOf('tag') == 0 || style.indexOf('bookmark') == 0) {
                bookmark = true;
            }

            // Deduplicate: check if this result is also in the cache results
            let cacheIndex = -1;
            for(let i in cliqz || []) {
                if(cliqz[i].url == label) {
                    // combine sources
                    var tempResult = Result.cliqz(cliqz[i]);
                    tempResult.style = CliqzUtils.combineSources(style, tempResult.style);

                    //use the title from history/bookmark - might be manually changed - eg: for tag results
                    if(comment) tempResult.comment = comment;

                    if (bookmark)
                        bucketBookmarkCache.push(tempResult);
                    else
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

                if(bookmark) {
                    bucketBookmark.push(Result.generic(style, value, image, comment, label, q));
                }
                else if(Result.isValid(label, urlparts)) {
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
        // all bucketBookmarksCache
        for(let i = 0; i < bucketBookmarkCache.length; i++) {
            bucketBookmarkCache[i].comment += " (bookmark and vertical: " + bucketBookmarkCache[i].query + ")!";
            results.push(bucketBookmarkCache[i]);
        }

        // all bucketBookmarks
        for(let i = 0; i < bucketBookmark.length; i++) {
            bucketBookmark[i].comment += " (bookmark: " + bucketBookmark[i].query + ")!";
            results.push(bucketBookmark[i]);
        }

        // all bucketHistoryCache
        for(let i = 0; i < bucketHistoryCache.length; i++) {
            bucketHistoryCache[i].comment += " (history and vertical: " + bucketHistoryCache[i].query + ")!";
            results.push(bucketHistoryCache[i]);
        }

        // top 1 of bucketCache
        if(bucketCache.length > 0) {
            bucketCache[0].comment += " (top vertical: " + bucketCache[0].query + ")!";
            results.push(bucketCache[0]);
        }

        // top 2 of bucketHistoryDomain
        for(let i = 0; i < Math.min(bucketHistoryDomain.length, 2); i++) {
            bucketHistoryDomain[i].comment += " (top history domain)!";
            results.push(bucketHistoryDomain[i]);
        }

        // rest of bucketCache
        for(let i = 1; i < bucketCache.length && i < 10; i++) {
            bucketCache[i].comment += " (vertical: " + bucketCache[i].query + ")!";
            results.push(bucketCache[i]);
        }

        // rest of bucketHistoryDomain
        for(let i = 2; i < bucketHistoryDomain.length; i++) {
            bucketHistoryDomain[i].comment += " (history domain)!";
            results.push(bucketHistoryDomain[i]);
        }

        // all bucketHistoryOther
        for(let i = 0; i < bucketHistoryOther.length; i++) {
            bucketHistoryOther[i].comment += " (history other)!";
            results.push(bucketHistoryOther[i]);
        }

        // add external bundesliga API results
        if(bundesligaResults && bundesligaResults.length > 0)
            results = bundesligaResults.concat(results);

        results = Filter.deduplicate(mixed._results.concat(results), -1, 1, 1);

        results = results.slice(mixed._results.length);

        // all bucketHistoryCluster, there can only be one, even though is's an array for consistency
        if (bucketHistoryCluster.length > 0) {
            bucketHistoryCluster[0].comment += " (clustering)!";
            results.unshift(bucketHistoryCluster[0]);
        }

        // add extra (fun search) results at the beginning
        if(cliqzExtra) results = cliqzExtra.concat(results);
        if(results.length == 0 && mixed.matchCount == 0 && CliqzUtils.getPref('showNoResults')){
            results.push(
                Result.cliqzExtra(
                    {
                        data:
                        {
                            template:'text',
                            title: CliqzUtils.getLocalizedString('noResultTitle'),
                            //message: CliqzUtils.getLocalizedString('noResultMessage')
                        }
                    }
                )
            );
        }

        return results.slice(0, maxResults);
	}
}
