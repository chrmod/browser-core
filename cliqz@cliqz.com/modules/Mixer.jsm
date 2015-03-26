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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSmartCliqzCache',
    'chrome://cliqzmodules/content/CliqzSmartCliqzCache.jsm');

CliqzUtils.init();

// enriches data kind
function kindEnricher(data, newKindParams) {
    var parts = data.kind && data.kind[0] && data.kind[0].split('|');
    if(parts.length == 2){
        try{
            var kind = JSON.parse(parts[1]);
            for(var p in newKindParams)
                kind[p] = newKindParams[p];
            data.kind[0] = parts[0] + '|' + JSON.stringify(kind);
        } catch(e){}
    }
}

var Mixer = {
    ezCategoriesCache: {},
    ezCache: {},
    ezURLs: {},
    EZ_COMBINE: ['entity-generic', 'entity-search-1', 'entity-portal', 'entity-banking-2'],
    init: function() {
        // nothing
    },
    getEzIdFromExtra: function (extra) {
        try {
            return JSON.parse(extra.data.subType).ez;
        } catch (e) {
            CliqzUtils.log('unable to get EZ id from extra: ' + e, 'Mixer');
            return false;
        }
    },
    getEzCategoriesFromBackend: function (ezId) {
        if (this.ezCategoriesCache[ezId]) {
            return this.ezCategoriesCache[ezId];
        }

        this.fetchEzCategoriesFromBackend(ezId);

        return false;
    },
    fetchEzCategoriesFromBackend: function (ezId) {
        var idToSnippetUrl = 
            'http://rich-header-server.clyqz.com/id_to_snippet?q=' + ezId;
        try {
            CliqzUtils.httpGet(idToSnippetUrl,
                function success(req) {
                    try { 
                        var data = JSON.parse(req.response).extra.results[0].data;
                        Mixer.ezCategoriesCache[ezId] = 
                            Mixer.parseEzCategoriesFromBackend(data);

                        // TODO: does this run async?
                        Mixer.updateEzCategoriesWithHistory(Mixer.ezCategoriesCache[ezId]);
                    } catch (e) {
                        CliqzUtils.log('unable to extract categories from EZ snippet: ' + e, 'Mixer');
                    }
                },
                function error() {
                    CliqzUtils.log('unable to fetch EZ categories from backend: http get failed', 'Mixer');
                });
        } catch (e) {
            CliqzUtils.log('unable to fetch EZ categories from backend: ' + e, 'Mixer');
        }
    },
    parseEzCategoriesFromBackend: function (data) {
        var categories = data.categories;
        for (var i = 0; i < categories.length; i++) {
            categories[i].order = i;
            categories[i].historyMatchCount = 0;
            categories[i].genUrl =
                CliqzHistoryPattern.generalizeUrl(categories[i].url);
        }
        return {
            domain: data.domain,
            categories: categories
        };
    },
    fetchVisitedUrlsFromHistory: function (domain, daysBack) {
        if (!daysBack) {
            daysBack = 30;
        }

        var historyService = Components
            .classes["@mozilla.org/browser/nav-history-service;1"]
            .getService(Components.interfaces.nsINavHistoryService);

        var options = historyService.getNewQueryOptions();

        var query = historyService.getNewQuery();
        query.domain = domain;
        query.beginTimeReference = query.TIME_RELATIVE_NOW;
        query.beginTime = -1 * daysBack * 24 * 60 * 60 * 1000000;
        query.endTimeReference = query.TIME_RELATIVE_NOW;
        query.endTime = 0;

        var result = historyService.executeQuery(query, options);

        var cont = result.root;
        cont.containerOpen = true;

        var urls = [];
        for (var i = 0; i < cont.childCount; i ++) {
             urls[i] = cont.getChild(i).uri;
        }

        return urls;
    },
    updateEzCategoriesWithHistory: function (ezCategoriesBackend) {
        var categoriesBackend = 
            ezCategoriesBackend.categories;
        var visitedUrls = 
            this.fetchVisitedUrlsFromHistory(ezCategoriesBackend.domain);

        for (var u = 0; u < visitedUrls.length; u ++) {
             var url = 
                CliqzHistoryPattern.generalizeUrl(visitedUrls[u]);
             for (var c = 0; c < categoriesBackend.length; c++) {
                if (url.indexOf(categoriesBackend[c].genUrl) > -1) {
                    categoriesBackend[c].historyMatchCount++;
                }
             }
        }
    },
	mix: function(q, cliqz, cliqzExtra, instant, customResults, only_instant){
		var results = [];

        if(!instant)
            instant = [];
        if(!cliqz)
            cliqz = [];
        if(!cliqzExtra)
            cliqzExtra = [];

        // CliqzUtils.log("cliqz: " + JSON.stringify(cliqz), "Mixer");
        // CliqzUtils.log("instant: " + JSON.stringify(instant), "Mixer");
        // CliqzUtils.log("extra:   " + JSON.stringify(cliqzExtra), "Mixer");
        CliqzUtils.log("only_instant:" + only_instant + " instant:" + instant.length + " cliqz:" + cliqz.length + " extra:" + cliqzExtra.length, "Mixer");

        // set trigger method for EZs returned from RH
        for(var i=0; i < (cliqzExtra || []).length; i++) {
            kindEnricher(cliqzExtra[i].data, { 'trigger_method': 'rh_query' });
        }

        // extract the entity zone accompanying the first cliqz result, if any
        if(q.length > 2) { // only is query has more than 2 chars - avoids many unexpected EZ triggerings
            if(cliqz && cliqz.length > 0) {
                if(cliqz[0].extra) {
                    var extra = Result.cliqzExtra(cliqz[0].extra);
                    kindEnricher(extra.data, { 'trigger_method': 'backend_url' });
                    cliqzExtra.push(extra);
                }
            }
        }

        // Was instant history result also available as a cliqz result?
        //  if so, remove from backend list and combine sources in instant result
        var cliqz_new = [];
        var instant_new = [];
        for(let i=0; i < cliqz.length; i++) {
            var cl_url = CliqzHistoryPattern.generalizeUrl(cliqz[i].url, true);
            var duplicate = false;

            if(instant.length > 0) {
                // Does the main link match?
                var instant_url = CliqzHistoryPattern.generalizeUrl(instant[0].label, true);
                if(cl_url == instant_url) {
                    var temp = Result.combine(cliqz[i], instant[0]);
                    // don't keep this one if we already have one entry like this
                    if(instant_new.length == 0)
                        instant_new.push(temp);
                    duplicate = true;
                }

                // Do any of the sublinks match?
                if(instant[0].style == 'cliqz-pattern') {
                    for(var u in instant[0].data.urls) {
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
            }
        }

        // Later in this function, we will modify the contents of instant.
        // To avoid changing the source object, make a copy here, if not already
        // done so in the duplication handling above.
        if(instant_new.length == 0 && instant.length > 0)
            instant_new.push(Result.clone(instant[0]));
        instant = instant_new;

        cliqz = cliqz_new;

        var results = instant;

        for(let i = 0; i < cliqz.length; i++) {
            results.push(Result.cliqz(cliqz[i]));
        }

        // Find any entity zone in the results and cache them for later use
        // go backwards to be sure to cache the newest (which will be first in the list)
        for(var i=(cliqzExtra || []).length - 1; i >= 0; i--){
            var r = cliqzExtra[i];
            if(r.style == 'cliqz-extra'){
                if(r.val != "" && r.data.subType){
                    var eztype = JSON.parse(r.data.subType).ez;
                    var trigger_urls = r.data.trigger_urls || [];
                    if(eztype && trigger_urls.length > 0) {
                        for(var j=0; j < trigger_urls.length; j++) {
                            Mixer.ezURLs[trigger_urls[j]] = eztype;
                        }
                        Mixer.ezCache[eztype] = r;

                        CliqzSmartCliqzCache.store(r);
                    }
                }
            }
        }

        // Take the first entry (if history) and see if we can trigger an EZ with it,
        // this will override an EZ sent by backend.
        if(results.length > 0 && results[0].data && results[0].data.template &&
           results[0].data.template.indexOf("pattern") == 0) {

            var url = results[0].val;
            // if there is no url associated with the first result, try to find it inside
            if(url == "" && results[0].data && results[0].data.urls && results[0].data.urls.length > 0)
                url = results[0].data.urls[0].href;

            url = CliqzHistoryPattern.generalizeUrl(url, true);
            if(Mixer.ezURLs[url]) {
                // TODO: update cached EZ from rich-header-server
                // TODO: perhaps only use this cached data if newer than certain age
                //var ez = Mixer.ezCache[Mixer.ezURLs[url]];
                var ez = CliqzSmartCliqzCache.retrieve(Mixer.ezURLs[url]);
                if(ez) {
                    ez = Result.clone(ez);
                    kindEnricher(ez.data, { 'trigger_method': 'history_url' });
                    cliqzExtra = [ez];
                }
            }
        }

// NOTE: Simple deduplication is done above, which is much less aggressive than the following function.
// Consider taking some ideas from this function but not all.
        results = Filter.deduplicate(results, -1, 1, 1);

        // limit to one entity zone
        cliqzExtra = cliqzExtra.slice(0, 1);

        // add extra (fun search) results at the beginning if a history cluster is not already there
        if(cliqzExtra && cliqzExtra.length > 0) {

            if (cliqzExtra[0].data.news) {
                var ezId = this.getEzIdFromExtra(cliqzExtra[0]);
                if (ezId) {
                    var cat = this.getEzCategoriesFromBackend(ezId);
                    if (cat) {
                        var categories = cat.categories;
                        // sort descending by history match count and original order
                        categories.sort(function compare(a, b) {
                            if (a.historyMatchCount != b.historyMatchCount) {
                                // descending
                                return b.historyMatchCount - a.historyMatchCount;
                            } else {
                                // ascending
                                return a.order - b.order;
                            }
                        });
                        for (var j = 0; j < categories.length; j++) {
                            //CliqzUtils.log('match count ' + categories[j].genUrl + ': ' + categories[j].historyMatchCount, 'Mixer');
                        }
                        cliqzExtra[0].data.categories = categories.slice(0, 5);
                    }
                }
            }
            

            // Did we already make a 'bet' on a url from history that does not match this EZ?
            if(results.length > 0 && results[0].data.template && results[0].data.template == "pattern-h2" &&
               CliqzHistoryPattern.generalizeUrl(results[0].val, true) != CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true)) {
                // do not show the EZ
                CliqzUtils.log("History cluster " + results[0].val + " does not match EZ " + cliqzExtra[0].val, "Mixer");
            } else {
                CliqzUtils.log("EZ (" + cliqzExtra[0].data.kind + ") for " + cliqzExtra[0].val, "Mixer");

                // Remove entity links form history
                if(results.length > 0 && results[0].data.template && results[0].data.template.indexOf("pattern") == 0) {
                    var mainUrl = cliqzExtra[0].val;
                    var history = results[0].data.urls;
                    CliqzHistoryPattern.removeUrlFromResult(history, mainUrl);
                    // Go through entity data and search for urls
                    for(var k in cliqzExtra[0].data) {
                        for(var l in cliqzExtra[0].data[k]) {
                            if(cliqzExtra[0].data[k][l].url) {
                                CliqzHistoryPattern.removeUrlFromResult(history, cliqzExtra[0].data[k][l].url);
                            }
                        }
                    }
                    // Change size or remove history if necessary
                    if(history.length == 0) {
                        CliqzUtils.log("No history left after deduplicating with EZ links.")
                        results.splice(0,1);
                    }
                    else if(history.length == 2) results[0].data.template = "pattern-h3";
                }

                // remove any BM results covered by EZ
                var results_new = [];
                for(let i=0; i < results.length; i++) {
                    if(results[i].style.indexOf("cliqz-pattern") == 0)
                        results_new.push(results[i]);
                    else if(CliqzHistoryPattern.generalizeUrl(results[i].val) != CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val))
                        results_new.push(results[i]);
                }
                results = results_new;

                // if the first result is a history cluster and
                // there is an EZ of a supported types then make a combined entry
                if(results.length > 0 && results[0].data && results[0].data.template == "pattern-h2" &&
                   Mixer.EZ_COMBINE.indexOf(cliqzExtra[0].data.template) != -1 &&
                   CliqzHistoryPattern.generalizeUrl(results[0].val, true) == CliqzHistoryPattern.generalizeUrl(cliqzExtra[0].val, true) ) {

                    var temp_history = results[0];
                    var old_kind = temp_history.data.kind;
                    results[0] = cliqzExtra[0];
                    results[0].data.kind = (results[0].data.kind || []).concat(old_kind || []);
                    results[0].data.urls = (temp_history.data.urls || []).slice(0,4);
                }
                // Convert 2/3 size history into 1/3 to place below EZ
                else if(results.length > 0 &&
                        results[0].data && results[0].data.template == "pattern-h2" &&
                        CliqzUtils.TEMPLATES[cliqzExtra[0].data.template] == 2) {
                    results[0].data.template = "pattern-h3";
                    // limit number of URLs
                    results[0].data.urls = (results[0].data.urls || []).slice(0,2);
                    results = cliqzExtra.concat(results);
                } else {
                    results = cliqzExtra.concat(results);
                }
            }
        }

        // Change history cluster size if there are only two links and it is h2
        if(results.length > 0 && results[0].data.template == "pattern-h2" && results[0].data.urls.length == 2) {
          results[0].data.template = "pattern-h3-cluster";
        }

        // Add custom results to the beginning if there are any
        if(customResults && customResults.length > 0) {
            results = customResults.concat(results);
        }

        //allow maximum 3 BM results
        var cliqzRes = 0;
        results = results.filter(function(r){
            if(r.style.indexOf('cliqz-results ') == 0) cliqzRes++;
            return cliqzRes <= 3;
        })

        // ----------- noResult EntityZone---------------- //
        if(results.length == 0 && !only_instant){
            var alternative_search_engines_data = [// default
                {"name": "DuckDuckGo", "base_url": "https://duckduckgo.com"},
                {"name": "Bing", "base_url": "http://www.bing.com/search?q=&pc=MOZI"},
                {"name": "Google", "base_url": "http://www.google.de"},
                {"name": "Google Images", "base_url": "http://images.google.de/"},
                {"name": "Google Maps", "base_url": "http://maps.google.de/"}
            ];

            for (var i = 0; i< alternative_search_engines_data.length; i++){
                var alt_s_e = ResultProviders.getSearchEngines()[alternative_search_engines_data[i].name];
                if (typeof alt_s_e != 'undefined'){
                    alternative_search_engines_data[i].code = alt_s_e.code;
                    var url = alternative_search_engines_data[i].base_url || alt_s_e.base_url;
                    alternative_search_engines_data[i].style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(url)).style;
                    alternative_search_engines_data[i].text = alt_s_e.prefix.slice(1);
                }
            }

            results.push(
                Result.cliqzExtra(
                    {
                        data:
                        {
                            template:'noResult',
                            text_line1: CliqzUtils.getLocalizedString('noResultTitle'),
                            text_line2: CliqzUtils.getLocalizedString('noResultMessage', Services.search.currentEngine.name),
                            "search_engines": alternative_search_engines_data,
                            //use local image in case of no internet connection
                            "cliqz_logo": "chrome://cliqzres/content/skin/img/cliqz.svg"
                        },
                        subType: JSON.stringify({empty:true})
                    }
                )
            );
        }

        return results;
    }
}

Mixer.init();
