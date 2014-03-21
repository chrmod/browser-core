'use strict';

var Ci = Components.interfaces;
var Cu = Components.utils;
var Cc = Components.classes;
var EXPORTED_SYMBOLS = ['CLIQZResults'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js');

var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CLIQZResults = CLIQZResults || {
    LOG_KEY: 'cliqz results: ',
    TIMEOUT: 500,
    CLIQZR: 'cliqz-results',
    CLIQZS: 'cliqz-suggestions',
    CLIQZICON: 'http://beta.cliqz.com/favicon.ico',
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
    // SOURCE: https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component
    ProviderAutoCompleteResultCliqz: function(searchString, searchResult,
        defaultIndex, errorDescription, results) {
        this._searchString = searchString;
        this._searchResult = searchResult;
        this._defaultIndex = defaultIndex;
        this._errorDescription = errorDescription;
        this._results = results;
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
            getImageAt: function (index) { return this._results[index].image; },
            getLabelAt: function(index) { return this._results[index].label; },
            QueryInterface: XPCOMUtils.generateQI([  ])
        };
    },
    initResults: function(){
        CLIQZResults.CliqzResults.prototype = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription : 'Cliqz Search ',
            contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
            resultsTimer: null,

            // history sink
            onSearchResult: function(search, result) {
                // be sure this is not a delayed result
                if(result.searchString == this.searchString){ 
                    //CLIQZ.Utils.log('history results: ' + result.matchCount);
                    this.historyResults = result;
                    this.pushResults();
                }
            },

            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function() {
                var now = (new Date()).getTime();
                if((now > this.startTime + CLIQZResults.TIMEOUT) ||
                    this.historyResults && this.cliqzResults /* && this.cliqzSuggestions */){

                    this.listener.onSearchResult(this, this.mixResults());
                    this.resultsTimer = null;
                    this.startTime = null;
                    this.cliqzResults = null;
                    this.cliqzSuggestions = null;
                    this.historyResults = null;
                } else {
                    CLIQZ.Utils.clearTimeout(this.resultsTimer);
                    let timeout = this.startTime + CLIQZResults.TIMEOUT - now + 1;
                    this.resultsTimer = CLIQZ.Utils.setTimeout(this.pushResults, timeout);
                }
            },
            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var results = [], results = [];
                    if(req.status == 200){
                        results = JSON.parse(req.response).result;
                    }
                    this.cliqzResults = results;
                    this.pushResults();
                }
            },
            // handles suggested queries 
            cliqzSuggestionFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var response = [];
                    if(req.status == 200){
                        response = JSON.parse(req.response);
                    }
                    this.cliqzSuggestions = response[1];
                    this.pushResults();
                }
            },
            resultFactory: function(style, value, image, comment, label){
                return {
                    style: style,
                    val: value,
                    image: image || this.createFavicoUrl(value),
                    comment: comment || value,
                    label: label || value
                };
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            // mixes history, results and suggestions
            mixResults_old: function() {
                var results = [], histResults = 0, bookmarkResults = 0;

                for (let i = 0;
                     this.historyResults && i < this.historyResults.matchCount && i < 2;
                     i++) {
                    let style = this.historyResults.getStyleAt(i),
                        value = this.historyResults.getValueAt(i),
                        image = this.historyResults.getImageAt(i),
                        comment = this.historyResults.getCommentAt(i),
                        label = this.historyResults.getLabelAt(i);

                    if(style === 'bookmark')bookmarkResults++;
                    else histResults++;

                    results.push(this.resultFactory(style, value, image, comment, label));
                }

                for(let i in this.cliqzResults || []) {
                    let r = this.cliqzResults[i];
                    if(r.snippet)
                        results.push(this.resultFactory(CLIQZResults.CLIQZR, r.url, null, r.snippet.snippet));
                    else results.push(this.resultFactory(CLIQZResults.CLIQZR, r.url));
                }

                if(results.length < 3){
                    for(let i in this.cliqzSuggestions || []) {
                        results.push(
                            this.resultFactory(
                                CLIQZResults.CLIQZS,
                                this.cliqzSuggestions[i],
                                CLIQZResults.CLIQZICON,
                                this.cliqzSuggestions[i]
                            )
                        );
                    }
                }


                if(results.length === 0) {
                    let message = 'Search "' + this.searchString + '" on your default search engine !';
                    //results.push(this.resultFactory(CLIQZS, this.searchString, CLIQZICON, message));
                }

                results = results.slice(0,prefs.getIntPref('maxRichResults'));

                var mergedResult = new CLIQZResults.ProviderAutoCompleteResultCliqz(this.searchString,
                    Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, '', results);

                CLIQZ.Utils.log('Results for ' + this.searchString + ' : ' + results.length
                  + ' (results:' + (this.cliqzResults || []).length
                  //+ ', suggestions: ' + (this.cliqzSuggestions || []).length 
                  + ')' );

                if(results.length > 0){
                    var action = {
                        type: 'action',
                        action: 'results',
                        cliqzResults: (this.cliqzResults || []).length,
                        historyResults: histResults,
                        bookmarkResults: bookmarkResults
                    };

                    CLIQZ.Utils.track(action);
                }

                return mergedResult;
            },
            // mixes history, results and suggestions
            // Sean's test
            mixResults: function() {
                var results = [], histResults = 0, bookmarkResults = 0;

                /// 1) put each result into a bucket
                var bucketHistoryDomain = [],
                    bucketHistoryOther = [],
                    bucketCache = [],
                    bucketHistoryCache = [];


                for (let i = 0;
                     this.historyResults && i < this.historyResults.matchCount && i < 2;
                     i++) {
                    let style = this.historyResults.getStyleAt(i),
                        value = this.historyResults.getValueAt(i),
                        image = this.historyResults.getImageAt(i),
                        comment = this.historyResults.getCommentAt(i),
                        label = this.historyResults.getLabelAt(i);

                    if(style === 'bookmark')bookmarkResults++;
                    else histResults++;

                    // Deduplicate: check if this result is also in the cache results
                    let cacheIndex = -1;
                    for(let i = 0; i < this.cliqzResults.length; i++) {
                        if(this.cliqzResults[i].url.indexOf(label) != -1) {
                            bucketHistoryCache.push(this.resultFactory(style, value, image, comment, label));
                            cacheIndex = i;
                            break;
                        }
                    }

                    if(cacheIndex >= 0) {
                        // if also found in cache, remove so it is not added to cache-only bucket
                        this.cliqzResults.splice(cacheIndex, 1);
                    } else {
                        // does search string occur in hostname
                        let urlparts = CLIQZ.Utils.getDetailsFromUrl(label);
                        if(urlparts.host.indexOf(this.searchString) !=-1)
                            bucketHistoryDomain.push(this.resultFactory(style, value, image, comment, label));
                        else
                            bucketHistoryOther.push(this.resultFactory(style, value, image, comment, label));
                    }
                }

                for(let i in this.cliqzResults || []) {
                    let r = this.cliqzResults[i];

                    let bucket = bucketCache;

                    if(r.snippet)
                        bucket.push(this.resultFactory(CLIQZResults.CLIQZR, r.url, null, r.snippet.snippet));
                    else bucket.push(this.resultFactory(CLIQZResults.CLIQZR, r.url));
                }

                /// 2) Prepare final result list from buckets
                
                // all bucketHistoryCache
                for(let i = 0; i < bucketHistoryCache.length; i++) {
                    bucketHistoryCache[i].comment += " (History and Cache)";
                    results.push(bucketHistoryCache[i]);
                }

                // top 1 of bucketHistoryDomain
                if(bucketHistoryDomain.length > 0) {
                    bucketHistoryDomain[0].comment += " (History Domain top)";
                    results.push(bucketHistoryDomain[0]);
                }

                // top 1 of bucketCache
                if(bucketCache.length > 0) {
                    bucketCache[0].comment += " (Cache top)";
                    results.push(bucketCache[0]);
                }

                // rest of bucketHistoryDomain 
                for(let i = 1; i < bucketHistoryDomain.length; i++) {
                    bucketHistoryDomain[i].comment += " (History Domain)";
                    results.push(bucketHistoryDomain[i]);
                }

                // rest of bucketCache
                for(let i = 1; i < bucketCache.length && i < 4; i++) {
                    bucketCache[i].comment += " (Cache)";
                    results.push(bucketCache[i]);
                }

                // all bucketHistoryOther
                for(let i = 0; i < bucketHistoryOther.length; i++) {
                    bucketHistoryOther[i].comment += " (History Other)";
                    results.push(bucketHistoryOther[i]);
                }


                /// 4) Show suggests if not enough else
                if(results.length < 3){
                    for(let i in this.cliqzSuggestions || []) {
                        results.push(
                            this.resultFactory(
                                CLIQZResults.CLIQZS,
                                this.cliqzSuggestions[i],
                                CLIQZResults.CLIQZICON,
                                this.cliqzSuggestions[i]
                            )
                        );
                    }
                }


                if(results.length === 0) {
                    let message = 'Search "' + this.searchString + '" on your default search engine !';
                    //results.push(this.resultFactory(CLIQZS, this.searchString, CLIQZICON, message));
                }

                results = results.slice(0,prefs.getIntPref('maxRichResults'));

                var mergedResult = new CLIQZResults.ProviderAutoCompleteResultCliqz(this.searchString,
                    Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, '', results);

                CLIQZ.Utils.log('Results for ' + this.searchString + ' : ' + results.length
                  + ' (results:' + (this.cliqzResults || []).length
                  //+ ', suggestions: ' + (this.cliqzSuggestions || []).length 
                  + ')' );

                if(results.length > 0){
                    var action = {
                        type: 'action',
                        action: 'results',
                        cliqzResults: (this.cliqzResults || []).length,
                        historyResults: histResults,
                        bookmarkResults: bookmarkResults
                    };

                    CLIQZ.Utils.track(action);
                }

                return mergedResult;
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CLIQZ.Utils.log('search: ' + searchString);

                var action = {
                    type: 'action',
                    action: 'key_stroke'
                };

                CLIQZ.Utils.track(action);

                this.cliqzResults = null;
                this.historyResults = null;
                this.cliqzSuggestions = null;
                this.cliqzResultsFromSuggestion = null;
                this.startTime = (new Date()).getTime();
                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                // ensure context

                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.cliqzSuggestionFetcher = this.cliqzSuggestionFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);

                // start fetching results and suggestions
                CLIQZ.Utils.getCachedResults(searchString, this.cliqzResultFetcher);
                CLIQZ.Utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);

                // trigger history search
                this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
            },

            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
            // do we need to something at this step?
            }
        }
    }
}