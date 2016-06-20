'use strict';
/**
 * This modules implements reranking of results using user specific data
 */

var EXPORTED_SYMBOLS = ['CliqzWikipediaDeduplication'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
    'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
    'chrome://cliqzmodules/content/CliqzUtils.jsm');



var CliqzWikipediaDeduplication = {
    LOG_KEY: 'CliqzWikipediaDeduplication',
    name: 'lang_deduplication',

    /* choose best url from list based on original order (reranking)*/
    chooseUrlByIndex: function(searchedUrls, originalUrls){
        let maxPos = originalUrls.length;
        let bestUrl = null;
        Object.keys(searchedUrls).forEach( function (lang) {
            let urls = searchedUrls[lang];
            urls.forEach(function (url){
                let i = originalUrls.indexOf(url);
                if (i < maxPos){
                    maxPos = i;
                    bestUrl = url;
                }
            });
        });
        return bestUrl;
    },
    /* choose best url from list taking language into account */
    chooseUrlByLang: function(searchedUrls, originalUrls, requestedLangs){
        if (requestedLangs == null || requestedLangs.length == 0){
            return this.chooseUrlByIndex(searchedUrls, originalUrls);
        }
        let maxPos = originalUrls.length;
        let bestUrl = null;
        Object.keys(searchedUrls).forEach( function (lang) {
            let urls = searchedUrls[lang];
            urls.forEach(function (url) {
                let i = originalUrls.indexOf(url);
                if (i < maxPos && requestedLangs.indexOf(lang) != -1) {
                    maxPos = i;
                    bestUrl = url;
                }
            });
        });
        if (bestUrl == null){
            bestUrl = this.chooseUrlByIndex(searchedUrls, originalUrls);
        }
        return bestUrl

    },
    /*strip protocol from url*/
    urlStripProtocol: function(url){
        var toRemove = ["https://", "http://",
            "www2.", "www.",
            "mobile.", "mobil.", "m."];
        toRemove.forEach(function (part) {
            if (url.toLowerCase().startsWith(part)){
                url = url.substring(part.length);
            }
        });
        return url;
    },
    /*get most used user languages*/
    getUserLanguages(factor){
        factor = typeof factor !== 'undefined' ? factor : false;
        let availableLangs = CliqzLanguage.state(true);
        let langs = [];
        let lastValue = null;
        availableLangs.forEach(function(langObj) {
            // langObj = ["de", 0.0123]
            if (lastValue == null) lastValue = langObj[1];
            if (lastValue * factor >= langObj[1]){
                langs.push(langObj[0]);
                lastValue = langObj[1];
            }

        });
        return langs;
    },
    // dedup of languages for wikipedia case
    doRerank: function (response) {
        //reset telemetry
        var telemetrySignal = {};
        let userLangs = this.getUserLanguages();

        // dict of wiki languages to urls
        let wikiLangs = {};

        // list of all wiki urls
        let wikiUrls = [];

        // list of candidates to dedup with back link to original url
        // {"de.wikipedia.org/url": "Https://de.wikipedia.org/URL"}
        let candidates = {};

        // list of all urls in response
        let allUrls = [];

        // dedup result
        let dedups = {};

        // process response and fill all structures
        response.forEach(function (r) {
            let obj = CliqzUtils.getDetailsFromUrl(r.url);
            if (obj.domain == "wikipedia.org" && obj.subdomains.length) {
                let lang = obj.subdomains[0];
                if (wikiLangs[lang] == null) wikiLangs[lang] = [];
                wikiLangs[lang].push(r.url);
                candidates[this.urlStripProtocol(r.url).toLowerCase()] = r.url;
                wikiUrls.push(r.url);
                dedups[r.url] = [];
            }
            allUrls.push(r.url);

        }, this);
        telemetrySignal['available_languages'] = Object.keys(wikiLangs).length;
        if (Object.keys(wikiLangs).length > 1) {
            // we have wikipedia with different langs, try possible dedup
            let bestUrl = this.chooseUrlByLang(wikiLangs, allUrls, userLangs);

            let ind = allUrls.indexOf(bestUrl);
            let bestUrlData = response[ind];
            let langlinks = [];
            try {
                langlinks = bestUrlData.snippet.rich_data.langlinks;
            } catch (e) {
            }
            langlinks.forEach(function (langlink) {
                let stripUrl = this.urlStripProtocol(langlink).toLowerCase();
                let stripLang = stripUrl.split(".")[0];
                if ((stripUrl in candidates) && (userLangs.indexOf(stripLang) == -1)) {
                    var originalUrl = candidates[stripUrl];
                    dedups[bestUrl].push(originalUrl);
                    dedups[bestUrl].concat(dedups[originalUrl]);
                    delete dedups[originalUrl];
                }
            }, this);
            let deduped = wikiUrls.length - Object.keys(dedups).length;
            telemetrySignal['total_urls'] = wikiUrls.length;
            telemetrySignal['removed_urls'] = deduped;

            if(deduped > 0) {
                // backward structure with link where deduped url is pointing
                let invertedUrls = {};
                Object.keys(dedups).forEach(function (k) {
                    dedups[k].forEach(function (url) {
                        invertedUrls[url] = k;
                    });
                });
                var dedupResponse = [];
                for (let i = 0; i < response.length; i++) {
                    let responseObj = response[i];
                    if (responseObj.url in invertedUrls) {
                        // this url should be replaced by main url
                        let mainInd = allUrls.indexOf(invertedUrls[responseObj.url]);
                        if (mainInd != -1) {
                            let mainObj = response[mainInd];
                            dedupResponse.push(mainObj);
                            delete allUrls[mainInd];
                        }
                    }
                    else {
                        dedupResponse.push(responseObj);
                        delete allUrls[i];
                    }
                }
                response = dedupResponse;
            }
        }
        // if no dedups found
        return {
            telemetrySignal: telemetrySignal,
            response: response
        };
    }
    
};