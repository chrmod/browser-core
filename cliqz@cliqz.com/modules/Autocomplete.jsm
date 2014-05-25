'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['Autocomplete'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js?r=' + Math.random());
Cu.import('chrome://cliqzmodules/content/Mixer.jsm?r=' + Math.random());
Cu.import('chrome://cliqzmodules/content/Result.jsm?r=' + Math.random());

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm');


var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var Autocomplete = Autocomplete || {
    LOG_KEY: 'cliqz results: ',
    TIMEOUT: 500,
    lastSearch: '',
    init: function(){
        CLIQZ.Utils.init();
        Autocomplete.initProvider();
        Autocomplete.initResults();

        XPCOMUtils.defineLazyServiceGetter(Autocomplete.CliqzResults.prototype, 'historyAutoCompleteProvider',
                  '@mozilla.org/autocomplete/search;1?name=history', 'nsIAutoCompleteSearch');

        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = Autocomplete.CliqzResults.prototype.contractID;
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(CONTRACT_ID),
                reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
            )
        }catch(e){}
        var cp = Autocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([Autocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

        CLIQZ.Utils.log('initialized', 'RESULTS');
    },
    destroy: function() {
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = Autocomplete.CliqzResults.prototype.contractID;
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
        Autocomplete.ProviderAutoCompleteResultCliqz.prototype = {
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
        Autocomplete.CliqzResults.prototype = {
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

                    for (let i = 0; this.historyResults && i < this.historyResults.matchCount; i++) {

                        let label = this.historyResults.getLabelAt(i);
                        let urlparts = CLIQZ.Utils.getDetailsFromUrl(label);

                        // check if it should not be filtered, and matches only the domain
                        if(!Result.isValid(label, urlparts) &&
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
                        var instant = Result.generic(style, value, image, comment, label, this.searchString);
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

                    if((now > this.startTime + Autocomplete.TIMEOUT) ||
                        this.historyResults && this.cliqzResults && this.cliqzSuggestions ){
                        //this.listener.onSearchResult(this, this.mixResults());
                        this.mixedResults.addResults(this.mixResults());
                        this.listener.onSearchResult(this, this.mixedResults);
                        if(this.startTime)
                            CliqzTimings.add("result", (new Date()).getTime() - this.startTime);
                        else
                            CLIQZ.Utils.log("undefined startTime!", "Autocomplete")
                        this.startTime = undefined;
                        this.resultsTimer = null;
                        this.startTime = null;
                        this.cliqzResults = null;
                        this.cliqzCache = null;
                        this.cliqzSuggestions = null;
                        this.historyResults = null;
                        return;
                    } else {
                        let timeout = this.startTime + Autocomplete.TIMEOUT - now + 1;
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
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
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
            // mixes history, results and suggestions
            mixResults: function() {
                var maxResults = prefs.getIntPref('maxRichResults'),
                    tempLog = this.logResults();


                var results = Mixer.mix(
                            this.searchString,
                            this.historyResults,
                            this.cliqzResults,
                            this.mixedResults,
                            this.cliqzSuggestions,
                            this.cliqzCache,
                            maxResults
                    );


                tempLog.result_order = Autocomplete.getResultsOrder(this.mixedResults._results) + Autocomplete.getResultsOrder(results);
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
                        Result.generic(
                            Result.CLIQZC,
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

                Autocomplete.lastSearch = searchString;
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

                this.mixedResults = new Autocomplete.ProviderAutoCompleteResultCliqz(
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