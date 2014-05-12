'use strict';

var Ci = Components.interfaces;
var Cu = Components.utils;
var Cc = Components.classes;
var EXPORTED_SYMBOLS = ['CLIQZResults'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js?r=' + Math.random());

XPCOMUtils.defineLazyModuleGetter(this, 'Results',
  'chrome://cliqz/content/modules/Results.jsm');

var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CLIQZResults = CLIQZResults || {
    LOG_KEY: 'cliqz results: ',
    TIMEOUT: 500,
    CLIQZR: 'cliqz-results',
    CLIQZS: 'cliqz-suggestions',
    CLIQZC: 'cliqz-custom',
    CLIQZICON: 'http://beta.cliqz.com/favicon.ico',
    TYPE_VIDEO: ['video', 'tv_show', 'youtube'],
    lastSearch: '',
    init: function(){
        CLIQZ.Utils.init();
        CLIQZResults.initProvider();
        CLIQZResults.initResults();


        XPCOMUtils.defineLazyServiceGetter(CLIQZResults.CliqzResults.prototype, 'historyAutoCompleteProvider',
                  '@mozilla.org/autocomplete/search;1?name=history', 'nsIAutoCompleteSearch');


        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CLIQZResults.CliqzResults.prototype.contractID;
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(CONTRACT_ID),
                reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
            )
        }catch(e){}
        var cp = CLIQZResults.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CLIQZResults.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

        CLIQZ.Utils.log('initialized', 'RESULTS');
    },
    destroy: function() {
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CLIQZResults.CliqzResults.prototype.contractID;
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(CONTRACT_ID),
            reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
          );
        }catch(e){}
    },
    getResultsOrder: function(results){
        var order = '';

        for (let r of results) order += CLIQZ.Utils.encodeResultType(r.style);

        return order;
    },
    // SOURCE: https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component
    ProviderAutoCompleteResultCliqz: function(searchString, searchResult,
        defaultIndex, errorDescription) {
        this._searchString = searchString;
        this._searchResult = searchResult;
        this._defaultIndex = defaultIndex;
    },
    // SOURCE: http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
    CliqzResults: function(){},
    initProvider: function(){
        CLIQZResults.ProviderAutoCompleteResultCliqz.prototype = {
            _searchString: '',
            _searchResult: 0,
            _defaultIndex: 0,
            _errorDescription: '',
            _results: [],

            get searchString() { return this._searchString; },
            get searchResult() { return this._searchResult; },
            get defaultIndex() { return this._defaultIndex; },
            get errorDescription() { return this._errorDescription; },
            get matchCount() { return this._results.length; },
            getValueAt: function(index) { return this._results[index].val; },
            getCommentAt: function(index) { return this._results[index].comment; },
            getStyleAt: function(index) { return this._results[index].style; },
            getImageAt: function (index) {
                if(this._results[index].image){
                    return JSON.stringify({
                        image: this._results[index].image,
                        description: this._results[index].imageDescription
                    });
                } else {
                    return undefined;
                }
            },
            getLabelAt: function(index) { return this._results[index].label; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            addResults: function(results){
                this._results = this._results.concat(results);
            }
        };
    },
    initResults: function(){
        CLIQZResults.CliqzResults.prototype = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription : 'Cliqz',
            contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
            resultsTimer: null,

            // history sink, could be called multiple times per query
            onSearchResult: function(search, result) {
                this.historyResults = result;

                // Push a history result as fast as we have it:
                //   Pick the url that is the shortest subset of the first entry
                if( this.mixedResults.matchCount == 0) {

                    // candidate for instant history
                    var candidate_idx = -1;
                    var candidate_url = '';

                    for (let i = 0;
                         this.historyResults && i < this.historyResults.matchCount; i++) {
                        let label = this.historyResults.getLabelAt(i);
                        let urlparts = CLIQZ.Utils.getDetailsFromUrl(label);

                        // check if it should not be filtered, and matches only the domain
                        if(!this.filterResult(label, urlparts) &&
                           urlparts.host.toLowerCase().indexOf(this.searchString) != -1) {

                            CLIQZ.Utils.log(label)

                            if(candidate_idx == -1) {
                                // first entry
                                CLIQZ.Utils.log("first candidate: " + label)
                                candidate_idx = i;
                                candidate_url = label;
                            } else if(candidate_url.indexOf(label) != -1) {
                                // this url is a substring of the previously candidate
                                CLIQZ.Utils.log("found shorter candidate: " + label)
                                candidate_idx = i;
                                candidate_url = label;
                            }
                        }
                    }

                    if(candidate_idx != -1) {
                        var style = this.historyResults.getStyleAt(candidate_idx),
                            value = this.historyResults.getValueAt(candidate_idx),
                            image = this.historyResults.getImageAt(candidate_idx),
                            comment = this.historyResults.getCommentAt(candidate_idx),
                            label = this.historyResults.getLabelAt(candidate_idx);

                        CLIQZ.Utils.log("instant:" + label)
                        var instant = this.resultFactory(style, value, image, comment, label, this.searchString);
                        if(CLIQZ.Utils.cliqzPrefs.getBoolPref('showQueryDebug'))
                            instant.comment += " (instant History Domain)!";

                        this.historyResults.removeValueAt(candidate_idx, false);
                        this.mixedResults.addResults([instant]);
                        this.pushResults(result.searchString);
                    }
                }
            },

            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    CLIQZ.Utils.clearTimeout(this.resultsTimer);
                    var now = (new Date()).getTime();

                    if((now > this.startTime + CLIQZResults.TIMEOUT) ||
                        this.historyResults && this.cliqzResults && this.cliqzSuggestions ){
                        //this.listener.onSearchResult(this, this.mixResults());
                        this.mixedResults.addResults(this.mixResults());
                        this.listener.onSearchResult(this, this.mixedResults);
                        this.resultsTimer = null;
                        this.startTime = null;
                        this.cliqzResults = null;
                        this.cliqzCache = null;
                        this.cliqzSuggestions = null;
                        this.historyResults = null;
                        return;
                    } else {
                        let timeout = this.startTime + CLIQZResults.TIMEOUT - now + 1;
                        this.resultsTimer = CLIQZ.Utils.setTimeout(this.pushResults, timeout, this.searchString);

                        // force update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.listener.onSearchResult(this, this.mixedResults);
                    }
                }
            },
            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var results = [], cache_results = [];
                    if(req.status == 200){
                        var json = JSON.parse(req.response)
                        results = json.result;
                        cache_results = json.cache;
                    }
                    this.cliqzResults = results;
                    this.cliqzCache = cache_results;
                }
                this.pushResults(q);
            },
            // handles suggested queries
            cliqzSuggestionFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var response = [];
                    if(req.status == 200){
                        response = JSON.parse(req.response);
                    }
                    this.cliqzSuggestions = response[1];
                }
                this.pushResults(q);
            },
            resultFactory: function(style, value, image, comment, label, query, thumbnail, imageDescription){
                //try to show host if no comment(page title) is provided
                if(style !== CLIQZResults.CLIQZS       // is not a suggestion
                   && style !== CLIQZResults.CLIQZC       // is not a custom search
                   && (!comment || value == comment)   // no comment(page title) or comment is exactly the url
                   && CLIQZ.Utils.isCompleteUrl(value)){       // looks like an url
                    let host = CLIQZ.Utils.getDetailsFromUrl(value).host
                    if(host){
                        comment = host;
                    }
                }
                if(!comment){
                    comment = value;
                }
                return {
                    style: style,
                    val: value,
                    image: thumbnail, //image || this.createFavicoUrl(value),
                    comment: comment,
                    label: label || value,
                    query: query,
                    imageDescription: imageDescription
                };
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },

            // Find the expanded query that was used for returned URL
            getExpandedQuery: function(url) {
                for(let i in this.cliqzCache || []) {
                    let el = this.cliqzCache[i];
                    for(let j in el.result || []) {
                        var r = el.result[j]

                        if( r == url )
                            return 'Query[' +el.q + '] BIGRAM[' + el.bigram + ']';
                    }
                }
                return "<unknown>"
            },
            createCliqzResult: function(result){
                if(result.snippet){
                    let og = result.snippet.og, thumbnail, duration;
                    if(og && og.image && og.type)
                        for(var type in CLIQZResults.TYPE_VIDEO)
                            if(og.type.indexOf(CLIQZResults.TYPE_VIDEO[type]) != -1){
                                thumbnail = og.image;
                                if(og.duration && parseInt(og.duration)){
                                    let seconds = parseInt(og.duration);
                                    duration = Math.floor(seconds/60) + ':' + seconds%60; //might be undefined
                                }
                                break;
                            }
                    return this.resultFactory(
                        CLIQZResults.CLIQZR, //style
                        result.url, //value
                        null, //image -> favico
                        result.snippet.title,
                        null, //label
                        this.getExpandedQuery(result.url), //query
                        thumbnail, // video thumbnail
                        duration // image description -> video duration
                    );
                } else {
                    return this.resultFactory(CLIQZResults.CLIQZR, result.url);
                }
            },
            // TODO - do this in the mix results after it gets stable
            logResults: function() {
                var bookmarkResults = 0,
                    histResults = 0,
                    tabResults = 0,
                    cliqzResult = 0,
                    cliqzResultSnippet = 0,
                    cliqzResultTitle = 0;

                for (let i = 0;
                     this.historyResults && i < this.historyResults.matchCount && i < 2;
                     i++) {
                    let style = this.historyResults.getStyleAt(i);

                    if(style === 'bookmark' || style === 'tag')bookmarkResults++;
                    if(style.indexOf('action') !== -1)tabResults++;
                    else histResults++;
                }

                for(let i in this.cliqzResults || []) {
                    let r = this.cliqzResults[i];
                    if(r.snippet){
                        if(r.snippet.title){
                            cliqzResultTitle++; //result with snippet and title
                        }
                        else {
                            cliqzResultSnippet++; //result with snippet but no title
                        }
                    } else {
                        cliqzResult++; //result with no snippet
                    }
                }

                var action = {
                    type: 'activity',
                    action: 'results',
                    cliqz_results: cliqzResult,
                    cliqz_results_snippet: cliqzResultSnippet,
                    cliqz_results_title: cliqzResultTitle,
                    history_results: histResults,
                    bookmark_results: bookmarkResults,
                    tab_results: tabResults,
                    custom_results: (this.custom_results || []).length
                };

                return action;
            },
            // check if a result should be kept in final result list
            filterResult: function (url, urlparts) {
                // Ignore result if is this a google search result from history
                if(urlparts.name.toLowerCase() == "google" && urlparts.subdomains.length > 0 &&
                   urlparts.subdomains[0].toLowerCase() == "www" &&
                   (urlparts.path.indexOf("/search?") == 0 || urlparts.path.indexOf("/url?") == 0)) {
                    CLIQZ.Utils.log("Discarding google result page from history: " + url)
                    return true;
                }
                return false;
            },
            // mixes history, results and suggestions
            mixResults: function() {
                var results = [], histResults = 0, bookmarkResults = 0,
                    maxResults = prefs.getIntPref('maxRichResults'),
                    tempLog = this.logResults();

                /// 1) put each result into a bucket
                var bucketHistoryDomain = [],
                    bucketHistoryOther = [],
                    bucketCache = [],
                    bucketHistoryCache = [];


                for (let i = 0;
                     this.historyResults && i < this.historyResults.matchCount;
                     i++) {
                    let style = this.historyResults.getStyleAt(i),
                        value = this.historyResults.getValueAt(i),
                        image = this.historyResults.getImageAt(i),
                        comment = this.historyResults.getCommentAt(i),
                        label = this.historyResults.getLabelAt(i);

                    if(style === 'bookmark' || style === 'tag')bookmarkResults++;
                    else histResults++;

                    // Deduplicate: check if this result is also in the cache results
                    let cacheIndex = -1;
                    for(let i in this.cliqzResults || []) {
                        if(this.cliqzResults[i].url.indexOf(label) != -1) {
                            var tempResult = this.createCliqzResult(this.cliqzResults[i])
                            bucketHistoryCache.push(this.resultFactory(style, value, image, comment, label,
                                tempResult.query, tempResult.image));
                            cacheIndex = i;
                            break;
                        }
                    }

                    if(cacheIndex >= 0) {
                        // if also found in cache, remove so it is not added to cache-only bucket
                        this.cliqzResults.splice(cacheIndex, 1);
                    } else {
                        let urlparts = CLIQZ.Utils.getDetailsFromUrl(label);

                        if(!this.filterResult(label, urlparts)) {
                            // Assign to different buckets if the search string occurs in hostname
                            if(urlparts.host.toLowerCase().indexOf(this.searchString) !=-1)
                                bucketHistoryDomain.push(this.resultFactory(style, value, image, comment, label, this.searchString));
                            else
                                bucketHistoryOther.push(this.resultFactory(style, value, image, comment, label, this.searchString));
                        }
                    }
                }

                for(let i in this.cliqzResults || []) {
                    bucketCache.push(this.createCliqzResult(this.cliqzResults[i]));
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

                results = Results.deduplicate(this.mixedResults._results.concat(results), -1, 1, 1);
                results = results.slice(this.mixedResults._results.length);

                // TODO: move deduplication to before final ordering to make sure all important buckets have entries

                /// 4) Show suggests if not enough results
                if(this.searchString && results.length < maxResults &&
                    (results.length > 0 || (this.cliqzSuggestions || []).length > 0)){

                    results.push(
                            this.resultFactory(
                                CLIQZResults.CLIQZS,
                                this.searchString,
                                CLIQZResults.CLIQZICON,
                                CLIQZ.Utils.createSuggestionTitle(this.searchString)
                            )
                        );
                }
                for(let i=0; i < (this.cliqzSuggestions || []).length && results.length < maxResults ; i++) {
                    if(this.cliqzSuggestions[i].toLowerCase() != this.searchString.toLowerCase()){
                        results.push(
                            this.resultFactory(
                                CLIQZResults.CLIQZS,
                                this.cliqzSuggestions[i],
                                CLIQZResults.CLIQZICON,
                                CLIQZ.Utils.createSuggestionTitle(this.cliqzSuggestions[i])
                            )
                        );
                    }
                }

                results = results.slice(0, maxResults);


                tempLog.result_order = CLIQZResults.getResultsOrder(this.mixedResults._results) + CLIQZResults.getResultsOrder(results);
                CLIQZ.Utils.track(tempLog);


                CLIQZ.Utils.log('Results for ' + this.searchString + ' : ' + results.length
                  + ' (results:' + (this.cliqzResults || []).length
                  + ', suggestions: ' + (this.cliqzSuggestions || []).length
                  + ')' );

                return results;
            },
            analyzeQuery: function(q){
                var customEngine = CLIQZ.Utils.hasCustomEngine(q);
                if(customEngine){
                    q = q.substring(customEngine.prefix.length);
                    this.customResults = [
                        this.resultFactory(
                            CLIQZResults.CLIQZC,
                            q,
                            null,
                            CLIQZ.Utils.createSuggestionTitle(q, customEngine.name),
                            customEngine.getSubmission(q).uri.spec
                        )
                    ];
                }

                return q
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CLIQZ.Utils.log('search: ' + searchString);

                CLIQZResults.lastSearch = searchString;
                this.oldPushLength = 0;
                this.customResults = null;

                var action = {
                    type: 'activity',
                    action: 'key_stroke',
                    current_length: searchString.length
                };
                CLIQZ.Utils.track(action);

                // custom results
                searchString = this.analyzeQuery(searchString);

                this.cliqzResults = null;
                this.cliqzCache = null;
                this.historyResults = null;
                this.cliqzSuggestions = null;

                this.startTime = (new Date()).getTime();
                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CLIQZResults.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, // blocks autocomplete
                        '');

                if(this.customResults && this.customResults.length > 0){
                    this.mixedResults.addResults(this.customResults);
                    this.pushResults(this.searchString);
                }

                // ensure context
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.cliqzSuggestionFetcher = this.cliqzSuggestionFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.filterResult = this.filterResult.bind(this);

                if(searchString.trim().length){
                    // start fetching results and suggestions
                    CLIQZ.Utils.getCachedResults(searchString, this.cliqzResultFetcher);
                    CLIQZ.Utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                } else {
                    this.cliqzResults = [];
                    this.cliqzCache = [];
                    this.cliqzSuggestions = [];
                    this.customResults = [];
                }

                // trigger history search
                this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
            },

            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                CLIQZ.Utils.clearTimeout(this.resultsTimer);
            }
        }
    }
}