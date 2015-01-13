'use strict';
/*
 * This module implements the core functionality based on nsIAutoCompleteResult interface
 * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzAutocomplete'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Mixer.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzBundesliga',
  'chrome://cliqzmodules/content/CliqzBundesliga.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzQueryDebug',
  'chrome://cliqzmodules/content/CliqzQueryDebug.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');


var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CliqzAutocomplete = CliqzAutocomplete || {
    LOG_KEY: 'CliqzAutocomplete',
    TIMEOUT: 1000,
    HISTORY_TIMEOUT: 200,
    lastPattern: null,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
    afterQueryCount: 0,
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
        'pushed': null
    },
    init: function(){
        CliqzUtils.init();
        CliqzAutocomplete.initProvider();
        CliqzAutocomplete.initResults();

        XPCOMUtils.defineLazyServiceGetter(CliqzAutocomplete.CliqzResults.prototype, 'historyAutoCompleteProvider',
                  '@mozilla.org/autocomplete/search;1?name=history', 'nsIAutoCompleteSearch');

        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(CONTRACT_ID),
                reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
            )
        }catch(e){}
        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

        CliqzUtils.log('initialized', CliqzAutocomplete.LOG_KEY);
    },
    destroy: function() {
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(CONTRACT_ID),
            reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
          );
        }catch(e){}
    },
    getResultsOrder: function(results){
        return results.map(function(r){
            return CliqzUtils.encodeResultType(r.style || r.type);
        });
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
            'pushed': null
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
            getValueAt: function(index) { return this._results[index].val; },
            getFinalCompleteValueAt: function(index) { return null; }, //FF31+
            getCommentAt: function(index) { return this._results[index].comment; },
            getStyleAt: function(index) { return this._results[index].style; },
            getImageAt: function (index) { return undefined; },
            getLabelAt: function(index) { return this._results[index].label; },
            getDataAt: function(index) { return this._results[index].data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            addResults: function(results){
                this._results = this.resetUnusedResults(this._results, results);
                CliqzAutocomplete.lastResult = this;
                var order = CliqzAutocomplete.getResultsOrder(this._results);
                CliqzUtils.setResultOrder(order);
            },
            resetUnusedResults: function(oldResults, newResults){
                // We always have at most 1 oldResult, since now we wait for the
                // whole history to be fetched. Thus, the old code can be
                // deleted; as well as this one, if we do not want to log
                // override anymore
                var cleaned = oldResults;
                if (
                    oldResults && oldResults.length > 0 &&
                    newResults && newResults.length > 0 &&
                    (oldResults[0].style == "cliqz-cluster" ||
                    oldResults[0].style == "cliqz-series") &&
                    (newResults[0].style == "cliqz-cluster" ||
                    newResults[0].style == "cliqz-series") &&
                    newResults[0].val
                ) {
                    cleaned = [];
                    if (oldResults[0].hasOwnProperty("override")) {
                        newResults[0].override = oldResults[0].override;
                    }
                }
                // filter out ununsed/unexpected results
                var ret=[], merged = cleaned.concat(newResults);
                for(var i=0; i < merged.length; i++){
                    var r = merged[i];
                    if(r.style == 'cliqz-extra'){
                        if(r.data){
                            if(r.data.template && CliqzUtils.TEMPLATES.indexOf(r.data.template) == -1){
                                // unexpected/unknown template
                                continue;
                            }
                        }
                    }

                    // If one of the results is data.only = true Remove all others.
                    if (!r.invalid && r.data && r.data.only) {
                      return [r];
                    }

                    ret.push(r);
                }
                return ret;
            }
        };
    },
    initResults: function(){
        CliqzAutocomplete.CliqzResults.prototype = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription : 'Cliqz',
            contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
            resultsTimer: null,
            historyTimer: null,
            historyTimeout: false,

            historyTimeoutCallback: function(params) {
                CliqzUtils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                this.historyTimeout = true;
                this.onSearchResult({}, this.historyResults);
            },
            // history sink, could be called multiple times per query
            onSearchResult: function(search, result) {
                if(!this.startTime) {
                    return; // no current search, just discard
                }

                var now = (new Date()).getTime();

                this.historyResults = result;
                this.latency.history = now - this.startTime;
                CliqzTimings.add("search_history", (now - this.startTime));

                //CliqzUtils.log("history results: " + (result ? result.matchCount : "null") + "; done: " + this.isHistoryReady() +
                //               "; time: " + (now - this.startTime), CliqzAutocomplete.LOG_KEY)

                // Choose an instant result if we have all history results (timeout)
                // and we haven't already chosen one
                if(result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                    CliqzUtils.clearTimeout(this.historyTimer);
                    if (CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
                      CliqzHistoryPattern.addFirefoxHistory(result);
                    } else {
                      this.instantResult(search, result);
                    }
                }
            },
            // Pick one history result or a cluster as the instant result to be shown to the user first
            instantResult: function(search, result) {

                let [is_clustered, history_trans] = CliqzClusterHistory.cluster(
                    this.historyResults, [], result.searchString);

                {
                    // Pick the url that is the shortest subset of the first entry
                    // candidate for instant history
                    // NOTE: this should be in else {} below, only we need it
                    // here for AB test tracking
                    var candidate_idx = -1;
                    var candidate_url = '';

                    var searchString = this.searchString.replace('http://','').replace('https://','');

                    for(let i = 0; this.historyResults && i < this.historyResults.matchCount; i++) {

                        let label = this.historyResults.getLabelAt(i);
                        let urlparts = CliqzUtils.getDetailsFromUrl(label);

                        // check if it should not be filtered, and matches the url
                        if(Result.isValid(label, urlparts) &&
                           label.toLowerCase().indexOf(searchString) != -1) {

                            if(candidate_idx == -1) {
                                // first entry
                                CliqzUtils.log("first instant candidate: " + label, CliqzAutocomplete.LOG_KEY)
                                candidate_idx = i;
                                candidate_url = label;
                            } else if(candidate_url.indexOf(label) != -1) {
                                // this url is a substring of the previously candidate
                                CliqzUtils.log("found shorter instant candidate: " + label, CliqzAutocomplete.LOG_KEY)
                                candidate_idx = i;
                                candidate_url = label;
                            }
                        }
                    }
                }
                // If we could cluster the history, put that as the instant result
                if(is_clustered) {
                    let style = history_trans[0]['style'],
                        value = history_trans[0]['value'],
                        image = history_trans[0]['image'],
                        comment = history_trans[0]['data']['summary'],
                        label = history_trans[0]['label'],
                        // if is_cluster the object has additional data
                        data = history_trans[0]['data'];

                    // See if we overrode the original instant result
                    let dataHost = CliqzUtils.getDetailsFromUrl(data.url).host.toLowerCase();
                    let override = candidate_idx != -1 && candidate_url.indexOf(dataHost) == -1;
                    let instant_cluster = Result.generic(
                            style, data.url || '', null, '', '', '', data);
                    instant_cluster.override = override;

                    //this.historyResults.removeValueAt(candidate_idx, false);
                    this.mixedResults.addResults([instant_cluster]);
                    this.pushResults(result.searchString);
                } else {
                    if(candidate_idx != -1) {
                        var style = this.historyResults.getStyleAt(candidate_idx),
                            value = this.historyResults.getValueAt(candidate_idx),
                            image = this.historyResults.getImageAt(candidate_idx),
                            comment = this.historyResults.getCommentAt(candidate_idx),
                            label = this.historyResults.getLabelAt(candidate_idx);

                        var instant = Result.generic(style, value, image, comment, label, this.searchString);
                        instant.comment += " (instant history domain)!";

                        this.historyResults.removeValueAt(candidate_idx, false);
                        this.mixedResults.addResults([instant]);
                        //
                    }
                    this.pushResults(result.searchString);
                }
            },
            isHistoryReady: function() {
                if(this.historyResults &&
                   this.historyResults.searchResult != this.historyResults.RESULT_NOMATCH_ONGOING &&
                   this.historyResults.searchResult != this.historyResults.RESULT_SUCCESS_ONGOING)
                    return true;
                else
                    return false;
            },
            historyPatternCallback: function(res) {
                if (res.query == this.searchString && CliqzHistoryPattern.PATTERN_DETECTION_ENABLED) {
                  CliqzAutocomplete.lastPattern = res;
                  var results = res.filteredResults();

                  if(this.mixedResults.matchCount > 0) return;

                  if(results.length < 1) return;
                  var instantResults = new Array();
                  // Create instant result
                  var instant = CliqzHistoryPattern.createInstantResult(res, results, this.searchString);
                  instantResults.push(instant);

                  var latency = 0;
                  if (CliqzHistoryPattern.latencies[res.query]) {
                    latency = CliqzHistoryPattern.latencies[res.query].endP -
                              CliqzHistoryPattern.latencies[res.query].startP;
                  }
                  this.latency.patterns = latency;

                  this.mixedResults.addResults(instantResults);
                  this.pushResults(this.searchString);
                }
            },
            sendSuggestionsSignal: function(suggestions) {
                var action = {
                    type: 'activity',
                    action: 'suggestions',
                    count:  (suggestions || []).length
                };
                CliqzUtils.track(action);
            },
            pushTimeoutCallback: function(params) {
                CliqzUtils.log("pushResults timeout", CliqzAutocomplete.LOG_KEY);
                this.pushResults(params);
            },
            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                //CliqzUtils.log('q' + " " + JSON.stringify(CliqzAutocomplete.cliqzSuggestions), 'spellcorr');
                // special case: user has deleted text from urlbar
                if(q.length != 0 && CliqzUtils.isUrlBarEmpty())
                    return;

                if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
                    var now = (new Date()).getTime();

                    if((now > this.startTime + CliqzAutocomplete.TIMEOUT) || // 1s timeout
                       (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out
                       this.cliqzResults) { // all results are ready
                        /// Push full result

                        CliqzUtils.clearTimeout(this.resultsTimer);
                        CliqzUtils.clearTimeout(this.historyTimer);

                        this.mixedResults.addResults(this.mixResults());

                        this.latency.mixed = (new Date()).getTime() - this.startTime;

                        this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = (new Date()).getTime() - this.startTime;
                        if(this.cliqzResults)
                            var country = this.cliqzCountry;

                        this.sendResultsSignal(this.mixedResults._results, false, CliqzAutocomplete.isPopupOpen, country);

                        CliqzQueryDebug.recordResults(q, this.cliqzResults, this.historyResults, this.mixedResults);

                        if(this.startTime)
                            CliqzTimings.add("result", (now - this.startTime));
                        this.startTime = null;
                        this.resultsTimer = null;
                        this.historyTimer = null;
                        this.cliqzResults = null;
                        this.cliqzResultsExtra = null;
                        this.cliqzCache = null;
                        this.historyResults = null;
                        return;
                    } else if(this.isHistoryReady()) {
                        /// Push instant result

                        this.latency.mixed = (new Date()).getTime() - this.startTime;

                        // force update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.listener.onSearchResult(this, this.mixedResults);

                        this.latency.all = (new Date()).getTime() - this.startTime;
                        //instant result, no country info yet
                        this.sendResultsSignal(this.mixedResults._results, true, CliqzAutocomplete.isPopupOpen);
                    } else {
                        /// Nothing to push yet, probably only cliqz results are received, keep waiting
                    }
                }
            },
            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    this.latency.backend = (new Date()).getTime() - this.startTime;
                    var results = [];
                    var country = "";
                    if(this.startTime)
                        CliqzTimings.add("search_cliqz", ((new Date()).getTime() - this.startTime));

                    if(req.status == 200 || req.status == 0){
                        var json = JSON.parse(req.response);
                        results = json.result || [];
                        country = json.country;
                        this.cliqzResultsExtra = []

                        if(json.images && json.images.results && json.images.results.length >0)
                            this.cliqzResultsExtra =
                                json.images.results.map(Result.cliqzExtra);

                        if(json.extra && json.extra.results && json.extra.results.length >0)
                            this.cliqzResultsExtra = this.cliqzResultsExtra.concat(
                                json.extra.results.map(Result.cliqzExtra));

                        this.latency.cliqz = json.duration;
                    }
                    this.cliqzResults = results.filter(function(r){
                        // filter results with no or empty url
                        return r.url != undefined && r.url != '';
                    });

                    this.cliqzCountry = country;
                }
                this.pushResults(q);
            },
            // handles suggested queries
            cliqzSuggestionFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var response = JSON.parse(req.response);
                    this.mixedResults.suggestedCalcResult = null;

                    if(this.startTime)
                        CliqzTimings.add("search_suggest", ((new Date()).getTime() - this.startTime));

                    // if suggestion contains calculator result (like " = 12.2 "), remove from suggestion, but store for signals
                    if(q.trim().indexOf("=") != 0 && response.length >1 &&
                            response[1].length > 0  && /^\s?=\s?-?\s?\d+(\.\d+)?(\s.*)?$/.test(response[1][0])){
                        this.mixedResults.suggestedCalcResult = response[1].shift().replace("=", "").trim();
                    }

                    this.mixedResults.suggestionsRecieved = true;
                    this.cliqzSuggestions = response[1];
                    CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                    this.sendSuggestionsSignal(this.cliqzSuggestions);
                }
            },
            cliqzBundesligaCallback: function(res, q) {
                this.cliqzBundesliga = res;
                this.pushResults(q);
            },

            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            // mixes history, results and suggestions
            mixResults: function() {
                var maxResults = prefs.getIntPref('maxRichResults');

                var results = Mixer.mix(
                            this.searchString,
                            this.historyResults,
                            this.cliqzResults,
                            this.cliqzResultsExtra,
                            this.mixedResults,
                            this.cliqzBundesliga,
                            maxResults
                    );

                CliqzAutocomplete.afterQueryCount = 0;

                //if there is a custom cliqzResults - force the opening of the dropdown
                if(results.length == 0 && CliqzUtils.getPref('cliqzResult', false)){
                    results = [Result.generic('cliqz-empty', '')];
                }

                return results;
            },
            analyzeQuery: function(q){
                [q, this.customResults] = ResultProviders.getCustomResults(q);
                return q;
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CliqzAutocomplete.lastQueryTime = (new Date()).getTime();
                CliqzAutocomplete.lastDisplayTime = null;
                CliqzAutocomplete.lastSearch = searchString;
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
                CliqzUtils.track(action);

                // custom results
                searchString = this.analyzeQuery(searchString);
                var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
                if (!CliqzAutocomplete.spellCorr.override &&
                    urlbar.selectionEnd == urlbar.selectionStart &&
                    urlbar.selectionEnd == urlbar.value.length) {
                    var [newSearchString, correctBack] = CliqzSpellCheck.check(searchString);
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
                    CliqzUtils.track(action);
                    CliqzAutocomplete.spellCorr.on = true;
                    searchString = newSearchString;
                }
                this.cliqzResults = null;
                this.cliqzResultsExtra = null;
                this.cliqzCountry = null;
                this.cliqzCache = null;
                this.historyResults = null;
                this.cliqzSuggestions = null;
                this.cliqzBundesliga = null;

                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Ci.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, // blocks autocomplete
                        '');

                this.startTime = (new Date()).getTime();
                this.mixedResults.suggestionsRecieved = false;
                this.mixedResults.customResults = this.customResults;

                if(this.customResults && this.customResults.length > 0){
                    this.mixedResults.customResults = this.customResults;
                    this.mixedResults.addResults(this.customResults);
                    this.pushResults(this.searchString);
                }

                // ensure context
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.cliqzSuggestionFetcher = this.cliqzSuggestionFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                this.cliqzBundesligaCallback = this.cliqzBundesligaCallback.bind(this);
                this.historyPatternCallback = this.historyPatternCallback.bind(this);

                CliqzUtils.log("called once " + urlbar.value + ' ' + searchString , "spell corr")
                if(searchString.trim().length){
                    // start fetching results and suggestions
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
                        CliqzUtils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                    }
                    // begin history pattern search
                    CliqzHistoryPattern.historyCallback = this.historyPatternCallback;
                    CliqzHistoryPattern.detectPattern(searchString);

                    // Fetch bundesliga only if search contains trigger
                    if(CliqzBundesliga.isBundesligaSearch(searchString)) {
                        CliqzBundesliga.get(searchString, this.cliqzBundesligaCallback)
                    } else {
                        this.cliqzBundesliga = [];
                    }
                    CliqzUtils.clearTimeout(this.resultsTimer);
                    this.resultsTimer = CliqzUtils.setTimeout(this.pushTimeoutCallback, CliqzAutocomplete.TIMEOUT, this.searchString);
                } else {
                    this.cliqzResults = [];
                    this.cliqzResultsExtra = [];
                    this.cliqzCountry = "";
                    this.cliqzSuggestions = [];
                    this.customResults = [];
                    this.cliqzBundesliga = [];
                    CliqzAutocomplete.resetSpellCorr();
                }

                // trigger history search
                this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
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
                    clustering_override: CliqzAutocomplete.results && results[0].override ? true : false,
                    latency_cliqz: this.latency.cliqz,
                    latency_history: this.latency.history,
                    latency_patterns: this.latency.patterns,
                    latency_backend: this.latency.backend,
                    latency_mixed: this.latency.mixed,
                    latency_all: this.startTime? (new Date()).getTime() - this.startTime : null,
                    v: 1
                };
                if (CliqzAutocomplete.lastAutocompleteType) {
                  action.autocompleted = CliqzAutocomplete.lastAutocompleteType;
                }
                if(country)
                    action.country = country;

                if (action.result_order.indexOf('C') > -1 && CliqzUtils.getPref('logCluster', false)) {
                    action.Ctype = CliqzUtils.getClusteringDomain(results[0].val);
                }
                // keep a track of if the popup was open for last result
                CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                if (results.length > 0) {
                    CliqzAutocomplete.lastDisplayTime = (new Date()).getTime();
                }
                this.addCalculatorSignal(action);
                CliqzUtils.track(action);
            },
            addCalculatorSignal: function(action) {
                var calcAnswer = null,
                    cResults = this.customResults;

                if(cResults && cResults.length > 0 &&
                        cResults[0].style == Result.CLIQZE &&
                        cResults[0].data.template == 'calculator'){
                    calcAnswer = cResults[0].data.answer;
                }
                if (calcAnswer == null && this.suggestedCalcResult == null){
                    return;
                }
                action.suggestions_recived =  this.suggestionsRecieved;
                action.same_results = CliqzCalculator.isSame(calcAnswer, this.suggestedCalcResult);
                action.suggested = this.suggestedCalcResult != null;
                action.calculator = calcAnswer != null;
                this.suggestionsRecieved = false;
                this.suggestedCalcResult = null;
            }
        }
    }
}
