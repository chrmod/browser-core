'use strict';
/*
 * This module implements the core functionality based on nsIAutoCompleteResult interface
 * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
 */

var EXPORTED_SYMBOLS = ['CliqzAutocomplete'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/Mixer.jsm');
Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

var CliqzAutocomplete = {
    LOG_KEY: 'CliqzAutocomplete',
    TIMEOUT: 1000,
    HISTORY_TIMEOUT: 200,
    SCROLL_SIGNAL_MIN_TIME: 500,
    lastPattern: null,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
    hasUserScrolledCurrentResults: false, // set to true whenever user scrolls, set to false when new results are shown
    lastResultsUpdateTime: null, // to measure how long a result has been shown for
    resultsOverflowHeight: 0, // to determine if scrolling is possible (i.e., overflow > 0px)
    afterQueryCount: 0,
    discardedResults: 0,
    isPopupOpen: false,
    lastPopupOpen: null,
    lastQueryTime: null,
    lastDisplayTime: null,
    lastFocusTime: null,
    highlightFirstElement: false,
    spellCorrectionDict: {},
    spellCorr: {
        'on': false,
        'correctBack': {},
        'override': false,
        'pushed': null,
        'userConfirmed': false,
        'searchTerms': []
    },
    getResultsOrder: function(results){
        return results.map(function(r){
            return r.data.kind;
        });
    },
    isUrlBarEmpty: function() {
        var urlbar = CliqzUtils.getWindow().CLIQZ.Core.urlbar;
        return urlbar.value.length == 0;
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
    resetSpellCorr: function() {
        CliqzAutocomplete.spellCorr = {
            'on': false,
            'correctBack': {},
            'override': false,
            'pushed': null,
            'userConfirmed': false,
            'searchTerms': []
        }
    },
    initProvider: function(){
        CliqzAutocomplete.ProviderAutoCompleteResultCliqz.prototype = {
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
            getValueAt: function(index) { return (this._results[index] || {}).val; },
            getFinalCompleteValueAt: function(index) { return null; }, //FF31+
            getCommentAt: function(index) { return (this._results[index] || {}).comment; },
            getStyleAt: function(index) { return (this._results[index] || {}).style; },
            getImageAt: function (index) { return ''; },
            getLabelAt: function(index) { return (this._results[index] || {}).label; },
            getDataAt: function(index) { return (this._results[index] || {}).data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            setResults: function(results){

                this._results = this.filterUnexpected(results);

                CliqzAutocomplete.lastResult = this;
                var order = CliqzAutocomplete.getResultsOrder(this._results);
                CliqzUtils.setResultOrder(order);
            },

            filterUnexpected: function(results){
                // filter out ununsed/unexpected results
                var ret=[];
                for(var i=0; i < results.length; i++){
                    var r = results[i];
                    if(r.style == 'cliqz-extra'){
                        if(r.data){
                            if(r.data.template && CliqzUtils.TEMPLATES.hasOwnProperty(r.data.template)===false){
                                // unexpected/unknown template
                                continue;
                            }
                        }
                    }

                    // If one of the results is data.only = true Remove all others.
                    // if (!r.invalid && r.data && r.data.only) {
                    //  return [r];
                    //}

                    ret.push(r);
                }
                return ret;
            }
        }
    },
    // a result is done once a new result comes in, or once the popup closes
    markResultsDone: function(newResultsUpdateTime) {
        // is there a result to be marked as done?
        if (CliqzAutocomplete.lastResultsUpdateTime) {
            var resultsDisplayTime = Date.now() - CliqzAutocomplete.lastResultsUpdateTime;
            this.sendResultsDoneSignal(resultsDisplayTime);
        }
        // start counting elapsed time anew
        CliqzAutocomplete.lastResultsUpdateTime = newResultsUpdateTime;
        CliqzAutocomplete.hasUserScrolledCurrentResults = false;
    },
    sendResultsDoneSignal: function(resultsDisplayTime) {
        // reduced traffic: only consider telemetry data if result was shown long enough (e.g., 0.5s)
        if (resultsDisplayTime > CliqzAutocomplete.SCROLL_SIGNAL_MIN_TIME) {
            var action = {
                type: 'activity',
                action: 'results_done',
                has_user_scrolled: CliqzAutocomplete.hasUserScrolledCurrentResults,
                results_display_time: resultsDisplayTime,
                results_overflow_height: CliqzAutocomplete.resultsOverflowHeight,
                can_user_scroll: CliqzAutocomplete.resultsOverflowHeight > 0
            };
            CliqzUtils.telemetry(action);
        }
    },
    initResults: function(){
        CliqzAutocomplete.CliqzResults.prototype = {
            resultsTimer: null,
            historyTimer: null,
            historyTimeout: false,
            instant: [],

            historyTimeoutCallback: function(params) {
                CliqzUtils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                this.historyTimeout = true;
            },
            onHistoryDone: function(result, resultExtra) {
                if(!this.startTime) {
                    return; // no current search, just discard
                }

                var now = Date.now();

                if(result)this.historyResults = result;
                if(resultExtra) {
                    //Lucian: not very elegant
                    this.cliqzResultsExtra = [resultExtra];
                    this.historyTimeout = true;
                    this.pushResults(this.searchString);
                    return;
                }
                this.latency.history = now - this.startTime;

                // Choose an instant result if we have all history results (timeout)
                // and we haven't already chosen one
                if(result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                    CliqzUtils.clearTimeout(this.historyTimer);
                    CliqzHistoryPattern.addFirefoxHistory(result);
                }
            },
            isHistoryReady: function() {
                return this.historyResults && this.historyResults.ready;
            },
            historyPatternCallback: function(res) {
                // abort if we already have results
                if(this.mixedResults.matchCount > 0) return;

                if (res.query == this.searchString && CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
                    CliqzAutocomplete.lastPattern = res;

                    // Create instant result
                    var instant = CliqzHistoryPattern.createInstantResult(res, this.searchString);
                    if(instant)
                        this.instant = [instant];
                    else
                        this.instant = [];

                    var latency = 0;
                    if (CliqzHistoryPattern.latencies[res.query]) {
                        latency = (new Date()).getTime() - CliqzHistoryPattern.latencies[res.query];
                    }
                    this.latency.patterns = latency;

                    this.pushResults(this.searchString);
                }
            },
            pushTimeoutCallback: function(params) {
                CliqzUtils.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
                this.pushResults(params);
            },
            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                //CliqzUtils.log('q' + " " + JSON.stringify(CliqzAutocomplete.cliqzSuggestions), 'spellcorr');
                // special case: user has deleted text from urlbar

                if(q.length != 0 && CliqzAutocomplete.isUrlBarEmpty())
                    return;

                if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
                    var now = Date.now();

                    if((now > this.startTime + CliqzAutocomplete.TIMEOUT) || // 1s timeout
                       (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out
                       this.cliqzResults) { // all results are ready
                        /// Push full result

                        CliqzUtils.clearTimeout(this.resultsTimer);
                        CliqzUtils.clearTimeout(this.historyTimer);

                        this.mixResults(false);

                        this.latency.mixed = Date.now() - this.startTime;

                        this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = Date.now() - this.startTime;
                        if(this.cliqzResults)
                            var country = this.cliqzCountry;

                        this.sendResultsSignal(this.mixedResults._results, false, CliqzAutocomplete.isPopupOpen, country);

                        this.startTime = null;
                        this.resultsTimer = null;
                        this.historyTimer = null;
                        this.cliqzResults = null;
                        this.cliqzResultsExtra = null;
                        this.cliqzCache = null;
                        this.historyResults = null;
                        this.instant = [];
                        return;
                    } else if(this.isHistoryReady()) {
                        /// Push instant result

                        this.latency.mixed = Date.now() - this.startTime;

                        this.mixResults(true);

                        // try to update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = Date.now() - this.startTime;
                        //instant result, no country info yet
                        this.sendResultsSignal(this.mixedResults._results, true, CliqzAutocomplete.isPopupOpen);
                    } else {
                        /// Nothing to push yet, probably only cliqz results are received, keep waiting
                    }
                }
            },
            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {
                // be sure this is not a delayed result
                if(q != this.searchString) {
                    this.discardedResults += 1; // count results discarded from backend because they were out of date
                } else {
                    this.latency.backend = Date.now() - this.startTime;
                    var results = [];
                    var country = "";

                    var json = JSON.parse(req.response);
                    results = json.result || [];
                    country = json.country;
                    this.cliqzResultsExtra = []

                    if(json.images && json.images.results && json.images.results.length >0){
                        var imgs = json.images.results.filter(function(r){
                            //ignore empty results
                            return Object.keys(r).length != 0;
                        });

                        this.cliqzResultsExtra =imgs.map(Result.cliqzExtra);
                    }

                    var hasExtra = function(el){
                        if(!el || !el.results || el.results.length == 0) return false;
                        el.results = el.results.filter(function(r){
                            //ignore empty results
                            return r.hasOwnProperty('url');
                        })

                        return el.results.length != 0;
                    }

                    if(hasExtra(json.extra)) {
                        this.cliqzResultsExtra = json.extra.results.map(Result.cliqzExtra);
                    }
                    this.latency.cliqz = json.duration;

                    this.cliqzResults = results.filter(function(r){
                        // filter results with no or empty url
                        return r.url != undefined && r.url != '';
                    });

                    this.cliqzCountry = country;
                }
                this.pushResults(q);
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            // mixes backend results, entity zones, history and custom results
            mixResults: function(only_instant) {
                var results = Mixer.mix(
                            this.searchString,
                            this.cliqzResults,
                            this.cliqzResultsExtra,
                            this.instant,
                            this.customResults,
                            only_instant
                    );
                CliqzAutocomplete.lastResultIsInstant = only_instant;
                CliqzAutocomplete.afterQueryCount = 0;

                this.mixedResults.setResults(results);
            },
            analyzeQuery: function(q){
                var parts = CliqzResultProviders.getCustomResults(q);
                this.customResults = parts[1];
                return parts[0];
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CliqzAutocomplete.lastQueryTime = Date.now();
                CliqzAutocomplete.lastDisplayTime = null;
                CliqzAutocomplete.lastResult = null;
                CliqzAutocomplete.lastSuggestions = null;
                this.oldPushLength = 0;
                this.customResults = null;
                this.latency = {
                    cliqz: null,
                    history: null,
                    backend: null,
                    mixed: null,
                    all: null
                };

                CliqzUtils.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

                var action = {
                    type: 'activity',
                    action: 'key_stroke',
                    current_length: searchString.length
                };
                CliqzUtils.telemetry(action);

                if(CliqzAutocomplete.lastSearch.length > searchString.length) {
                  CliqzAutocomplete.spellCorr.override = true;
                }
                // analyse and modify query for custom results
                CliqzAutocomplete.lastSearch = searchString;
                searchString = this.analyzeQuery(searchString);

                // spell correction
                var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
                if (!CliqzAutocomplete.spellCorr.override &&
                    urlbar.selectionEnd == urlbar.selectionStart &&
                    urlbar.selectionEnd == urlbar.value.length) {
                    var parts = CliqzSpellCheck.check(searchString);
                    var newSearchString = parts[0];
                    var correctBack = parts[1];

                    for (var c in correctBack) {
                        CliqzAutocomplete.spellCorr.correctBack[c] = correctBack[c];
                    }

                } else {
                    // user don't want spell correction
                    var newSearchString = searchString;
                }
                this.wrongSearchString = searchString;
                if (newSearchString != searchString) {
                    // the local spell checker kicks in
                    var action = {
                        type: 'activity',
                        action: 'spell_correction',
                        current_length: searchString.length
                    }
                    CliqzUtils.telemetry(action);
                    CliqzAutocomplete.spellCorr.on = true;
                    searchString = newSearchString;
                    CliqzAutocomplete.spellCorr['userConfirmed'] = false;
                }

                this.cliqzResults = null;
                this.cliqzResultsExtra = null;
                this.cliqzCountry = null;
                this.cliqzCache = null;
                this.historyResults = null;
                this.instant = [];

                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, // blocks autocomplete
                        '');

                this.startTime = Date.now();
                this.mixedResults.suggestionsRecieved = false;
                // ensure context
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                this.historyPatternCallback = this.historyPatternCallback.bind(this);

                CliqzHistoryPattern.historyCallback = this.historyPatternCallback;

                CliqzUtils.log("called once " + urlbar.value + ' ' + searchString , "spell corr")
                if(searchString.trim().length){
                    // start fetching results
                    CliqzUtils.getCliqzResults(searchString, this.cliqzResultFetcher);

                    // if spell correction, no suggestions
                    if (CliqzAutocomplete.spellCorr.on && !CliqzAutocomplete.spellCorr.override) {
                        this.suggestionsRecieved = true;
                        // change the wrong string to the real wrong string
                        for (var p in CliqzAutocomplete.spellCorr.correctBack) {
                            if (this.wrongSearchString.indexOf(CliqzAutocomplete.spellCorr.correctBack[p]) == -1) {
                                this.wrongSearchString = this.wrongSearchString.replace(p, CliqzAutocomplete.spellCorr.correctBack[p]);
                            }
                        }
                        this.cliqzSuggestions = [searchString, this.wrongSearchString];
                        CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                        CliqzUtils.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');
                        urlbar.mInputField.value = searchString;
                    } else {
                        //CliqzUtils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                    }
                    // begin history pattern search
                    CliqzHistoryPattern.detectPattern(searchString);

                    CliqzUtils.clearTimeout(this.resultsTimer);
                    this.resultsTimer = CliqzUtils.setTimeout(this.pushTimeoutCallback, CliqzAutocomplete.TIMEOUT, this.searchString);
                } else {
                    this.cliqzResults = [];
                    this.cliqzResultsExtra = [];
                    this.cliqzCountry = "";
                    this.customResults = [];
                    CliqzAutocomplete.resetSpellCorr();
                }

                // trigger history search
                CLIQZEnvironment.historySearch(
                    searchString.trim(),
                    this.onHistoryDone.bind(this),
                    searchParam,
                    CliqzAutocomplete.sessionStart);
                CliqzUtils.log('1');

                CliqzUtils.clearTimeout(this.historyTimer);
                this.historyTimer = CliqzUtils.setTimeout(this.historyTimeoutCallback, CliqzAutocomplete.HISTORY_TIMEOUT, this.searchString);
                this.historyTimeout = false;
            },
            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                CliqzUtils.clearTimeout(this.resultsTimer);
                CliqzUtils.clearTimeout(this.historyTimer);
            },

            sendResultsSignal: function(results, instant, popup, country) {
                var action = {
                    type: 'activity',
                    action: 'results',
                    query_length: CliqzAutocomplete.lastSearch.length,
                    result_order: results.map(function(r){ return r.data.kind; }),
                    instant: instant,
                    popup: CliqzAutocomplete.isPopupOpen ? true : false,
                    latency_cliqz: this.latency.cliqz,
                    latency_history: this.latency.history,
                    latency_patterns: this.latency.patterns,
                    latency_backend: this.latency.backend,
                    latency_mixed: this.latency.mixed,
                    latency_all: this.startTime? Date.now() - this.startTime : null,
                    discarded: this.discardedResults,
                    v: 1
                };

                // reset count of discarded backend results
                this.discardedResults = 0;

                if (CliqzAutocomplete.lastAutocompleteType) {
                  action.autocompleted = CliqzAutocomplete.lastAutocompleteType;
                  action.autocompleted_length = CliqzAutocomplete.lastAutocompleteLength;
                }
                if(country)
                    action.country = country;

                if (CliqzAutocomplete.isPopupOpen) {
                    // don't mark as done if popup closed as the user does not see anything
                    CliqzAutocomplete.markResultsDone(Date.now());
                }

                // remembers if the popup was open for last result
                CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                if (results.length > 0) {
                    CliqzAutocomplete.lastDisplayTime = Date.now();
                }
                CliqzUtils.telemetry(action);
            }
        }
    }
}

CliqzAutocomplete.initProvider();
CliqzAutocomplete.initResults();
