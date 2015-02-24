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
//	mix: function(q, cliqz, cliqzExtra, instant, history_backfill, custom, bundesligaResults, customResults, maxResults, only_instant){
	mix: function(q, cliqz, cliqzExtra, instant, history_backfill, bundesligaResults, customResults, maxResults, only_instant){
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
        // CliqzUtils.log("backfill:   " + JSON.stringify(history_backfill), "Mixer");
        CliqzUtils.log("only_instant:" + only_instant + " instant:" + instant.length + " cliqz:" + cliqz.length + " extra:" + cliqzExtra.length, "Mixer");

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

        CliqzUtils.log("only_instant:" + only_instant + " instant:" + instant.length + " cliqz:" + cliqz.length + " extra:" + cliqzExtra.length, "Mixer");


        var results = instant;

        for(let i = 0; i < cliqz.length; i++) {
            results.push(Result.cliqz(cliqz[i]));
        }

// NOTE: Simple deduplication is done above, which is much less aggressive than the following function.
// Consider taking some ideas from this function but not all.
        results = Filter.deduplicate(results, -1, 1, 1);

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
                 if(history.length == 0) results.splice(0,1);
                 else if(history.length == 1){
                   // Replace with single result
                   results[0] = Result.generic('favicon', history[0].href, null, history[0].title, null, results[0].search);
                   results[0].comment += " (history single)!"
                   results[0].data.kind = "H";
                 }
                 else if(history.length == 2) results[0].data.template = "pattern-h3";
            }

            // if the first result is a history cluster and 
            // there is a generic EZ, make a combined entry
            if(results.length > 0 &&
               results[0].data && results[0].data.template == "pattern-h2" &&
               cliqzExtra[0].data.template == "entity-generic") {

                results[0].style = "cliqz-extra";

                // combine data from the two entries:
                for (let [key, value] in Iterator(cliqzExtra[0].data))
                    results[0].data[key] = value;

                // use special combined template
                results[0].data.template = "entity-generic-history";

                // limit number of URLs
                results[0].data.urls = results[0].data.urls.slice(0,4);
            }
            // Convert 2/3 size history into 1/3 to place non-generic EZ
            else if(results.length > 0 &&
                    results[0].data && results[0].data.template == "pattern-h2" &&
                    CliqzUtils.TEMPLATES[cliqzExtra[0].data.template] == 2) {
                results[0].data.template = "pattern-h3";
                // limit number of URLs
                results[0].data.urls = results[0].data.urls.slice(0,2);

                results = cliqzExtra.concat(results);

            } else {
                results = cliqzExtra.concat(results);
            }
        }

        // Add custom results to the beginning if there are any
        if(customResults && customResults.length > 0) {
            results = customResults.concat(results);
        }
        // ----------- noResult EntityZone---------------- //
        if(results.length == 0 && !only_instant){
            var path = "http://cdn.cliqz.com/extension/EZ/noResult/";
            var title = CliqzUtils.getLocalizedString('noResultTitle'),
                msg = CliqzUtils.getLocalizedString('noResultMessage'),
                current_search_engine = Services.search.currentEngine.name;

            var alternative_search_engines_data = [// default
                                {"name": "DuckDuckGo", "code": null, "style":"", "base_url": "https://duckduckgo.com"}, //, "logo": path+"duckduckgo.svg", "background-color": "#ff5349"},
                                {"name": "Bing", "code": null, "style":"", "base_url": "http://www.bing.com/search?q=&pc=MOZI"}, //, "logo": path+"Bing.svg", "background-color": "#ffc802"},
                                {"name": "Google", "code": null, "style":"", "base_url": "http://www.google.de"}, //, "logo": path+"google.svg", "background-color": "#5ea3f9"},
                                {"name": "Google Images", "code":null, "style":"", "base_url": "http://images.google.de/"}, //: "logo": path+"google-images-unofficial.svg", "background-color": "#56eac6"},
                                {"name": "Google Maps", "code": null, "style":"", "base_url": "http://maps.google.de/"} //, "logo": path+"google-maps-unofficial.svg", "background-color": "#5267a2"}
                            ],
                alt_s_e;

            for (var i = 0; i< alternative_search_engines_data.length; i++){
                alt_s_e = ResultProviders.getSearchEngines()[alternative_search_engines_data[i].name];
                if (typeof alt_s_e != 'undefined'){
                    alternative_search_engines_data[i].code = alt_s_e.code;
                    var url = alternative_search_engines_data[i].base_url || alt_s_e.base_url;
                    var urlDetails = CliqzUtils.getDetailsFromUrl(url);
                    var logoDetails = CliqzUtils.getLogoDetails(urlDetails);
                    alternative_search_engines_data[i].style = logoDetails.style;
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

        return results;
    }
}

Mixer.init();
