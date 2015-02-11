'use strict';
/*
 * This module mixes the results from cliqz with the history
 *
 */

var EXPORTED_SYMBOLS = ['Mixer'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Components.utils.import('resource://gre/modules/Services.jsm');

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

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
    'chrome://cliqzmodules/content/ResultProviders.jsm');

CliqzUtils.init();

var Mixer = {
    ezCache: {},
    ezURLs: {},
    init: function() {
        // nothing
    },
	mix: function(q, history, cliqz, cliqzExtra, instant, bundesligaResults, maxResults, only_instant){
		var results = [];

        // CliqzUtils.log("results: " + JSON.stringify(results), "Mixer");
        // CliqzUtils.log("instant: " + JSON.stringify(instant), "Mixer");
        // CliqzUtils.log("extra:   " + JSON.stringify(cliqzExtra), "Mixer");

        if(!instant)
            instant = [];
        if(!cliqz)
            cliqz = [];

        if (CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
          var [history_trans, cluster_data] = [history, null];
        } else {
          var [history_trans, cluster_data] = CliqzClusterHistory.cluster(history);
        }

		/// 1) put each result into a bucket
        var bucketHistoryDomain = [],
            bucketHistoryOther = [],
            bucketCache = [],
            bucketHistoryCache = [],
            bucketHistoryCluster = [],
            bucketBookmark = [],
            bucketBookmarkCache = [];

        // Was instant history result also available as a cliqz result?
        //  if so, remove from backend list and combine sources in instant result
        var cliqz_new = [];
        var instant_new = [];
        var any_duplicates = false;
        for(let i=0; i < cliqz.length; i++) {
            var cl_url = CliqzHistoryPattern.generalizeUrl(cliqz[i].url, true);
            var duplicate = false;

            if(instant.length > 0) {
                // Does the main link match?
                var instant_url = CliqzHistoryPattern.generalizeUrl(instant[0].label, true);
                if(cl_url == instant_url) {
                    var temp = Result.combine(cliqz[i], instant[0]);
                    instant_new.push(temp);
                    duplicate = true;
                }

                // Do any of the sublinks match?
                if(instant[0].style == 'cliqz-pattern') {
                    for(let u = 0; u < instant[0].data.urls; u++) {
                        var instant_url = CliqzHistoryPattern.generalizeUrl(instant[0].data.urls[u].href);
                        if (instant_url == cl_url) {
                            // TODO: find a way to combine sources for clustered results
                            duplicate = true;
                            break;
                        }
                    }
                }
            }
            if (!duplicate) {
                cliqz_new.push(cliqz[i]);
            } else {
                any_duplicates = true;
            }
        }
        if(any_duplicates)
            instant = [instant_new[0]];
        else if(instant.length > 0)
            instant = [Result.clone(instant[0])];
        cliqz = cliqz_new;

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
                    tempResult.data.kind = CliqzUtils.encodeResultType(style).concat(tempResult.data.kind);;
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

        if(!only_instant) { // do not mix in everything is this is only for instant result

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
        }

        var unfiltered = instant.concat(results);
        results = Filter.deduplicate(unfiltered, -1, 1, 1);

        // Find any entity zone in the results and cache them for later use
        if(cliqzExtra && cliqzExtra.length > 0) {
            for(var i=0; i < cliqzExtra.length; i++){
                var r = cliqzExtra[i];
                if(r.style == 'cliqz-extra'){
                    if(r.val != "" && r.data.subType){
                        var eztype = JSON.parse(r.data.subType).ez;

                        if(eztype) {
                            CliqzUtils.log("Caching EZ " + eztype, "Mixer")
                            Mixer.ezCache[eztype] = r;
                            var temp_url = CliqzHistoryPattern.generalizeUrl(r.val, true);
                            Mixer.ezURLs[temp_url] = eztype;
                        }
                    }
                }
            }
        } else if(results.length > 0) {
            // Take the first entry and see if we can trigger an EZ with it
            var url = CliqzHistoryPattern.generalizeUrl(results[0].label, true);
            CliqzUtils.log("Check if url triggers EZ: " + url, "Mixer");
            if(Mixer.ezURLs[url]) {
                CliqzUtils.log("Yes, it is cached? ID: "  + Mixer.ezURLs[url], "Mixer");
                var ez = Mixer.ezCache[Mixer.ezURLs[url]];
                if(ez) {
                    CliqzUtils.log("Yes, here it is: " + JSON.stringify(ez), "Mixer");
                    cliqzExtra = [ez];
                }
            }
        }

        // add extra (fun search) results at the beginning
        if(cliqzExtra && cliqzExtra.length > 0) {

            // if the first result is a history cluster,
            // combine it with the entity zone
            if(results.length > 0 && 
               results[0].data && results[0].data.template == "pattern" &&
               results[0].data.height == "h2" && 
               cliqzExtra[0].data.template == "entity-generic") {

                results[0].style = "cliqz-extra";

                // combine data from the two entries:
                for (let [key, value] in Iterator(cliqzExtra[0].data))
                    results[0].data[key] = value;

                // use special combined template
                results[0].data.template = "entity-generic-history";

                // limit number of URLs
                results[0].data.urls = results[0].data.urls.slice(0,4);
                results = [results[0]];
            
            } else {
                results = cliqzExtra.concat(results);
            }
        }
            

        // ----------- noResult EntityZone---------------- //
        if(results.length == 0 && !only_instant){
            var path = "http://cdn.cliqz.com/extension/EZ/noResult/";
            var title = CliqzUtils.getLocalizedString('noResultTitle'),
                msg = CliqzUtils.getLocalizedString('noResultMessage'),
                current_search_engine = Services.search.currentEngine.name;

            var alternative_search_engines_data = [// default
                                {"name": "DuckDuckGo", "code": null, "logo": path+"duckduckgo.svg", "background-color": "#ff5349"},
                                {"name": "Bing", "code": null, "logo": path+"Bing.svg", "background-color": "#ffc802"},
                                {"name": "Google", "code": null, "logo": path+"google.svg", "background-color": "#5ea3f9"},
                                {"name": "Google Images", "code": null, "logo": path+"google-images-unofficial.svg", "background-color": "#56eac6"},
                                {"name": "Google Maps", "code": null, "logo": path+"google-maps-unofficial.svg", "background-color": "#5267a2"}
                            ],
                alt_s_e;

            for (var i = 0; i< alternative_search_engines_data.length; i++){
                alt_s_e = ResultProviders.getSearchEngines()[alternative_search_engines_data[i].name];
                if (typeof alt_s_e != 'undefined'){
                    alternative_search_engines_data[i].code = alt_s_e.code;
                }
            }

            results.push(
                Result.cliqzExtra(
                    {
                        data:
                        {
                            template:'noResult',
                            text_line1: title,
                            text_line2: msg.replace("...", current_search_engine),
                            "search_engines": alternative_search_engines_data,
                            "cliqz_logo": path+"EZ-no-results-cliqz.svg"
                        },
                        subType: JSON.stringify({empty:true})
                    }
                )
            );
        }

        // CliqzUtils.log("results:   " + JSON.stringify(results), "Mixer");

        return [results.slice(0, maxResults), unfiltered];
    }
}

Mixer.init();

