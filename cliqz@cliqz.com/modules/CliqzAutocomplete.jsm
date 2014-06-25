'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzAutocomplete'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Mixer.jsm?v=0.4.15');
Cu.import('chrome://cliqzmodules/content/Result.jsm?v=0.4.15');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.15');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.4.15');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm?v=0.4.15');


var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CliqzAutocomplete = CliqzAutocomplete || {
    LOG_KEY: 'cliqz results: ',
    TIMEOUT: 1000,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
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

        CliqzUtils.log('initialized', 'RESULTS');
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
            return CliqzUtils.encodeResultType(r.style);
        }).join('|');
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
            getCommentAt: function(index) { return this._results[index].comment; },
            getStyleAt: function(index) { return this._results[index].style; },
            getImageAt: function (index) { return undefined; },
            getLabelAt: function(index) { return this._results[index].label; },
            getDataAt: function(index) { return this._results[index].data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            addResults: function(results){
                this._results = this._results.concat(results);
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

            // history sink, could be called multiple times per query
            onSearchResult: function(search, result) {
                this.historyResults = result;

                // Push a history result as fast as we have it:
                //   Pick the url that is the shortest subset of the first entry
                if( this.mixedResults.matchCount == 0) {

                    // candidate for instant history
                    var candidate_idx = -1;
                    var candidate_url = '';

                    if(this.startTime)
                        CliqzTimings.add("search_history", ((new Date()).getTime() - this.startTime));

                    for (let i = 0; this.historyResults && i < this.historyResults.matchCount; i++) {

                        let label = this.historyResults.getLabelAt(i);
                        let urlparts = CliqzUtils.getDetailsFromUrl(label);

                        // check if it should not be filtered, and matches only the domain
                        if(Result.isValid(label, urlparts) &&
                           urlparts.host.toLowerCase().indexOf(this.searchString) != -1) {

                            CliqzUtils.log(label)

                            if(candidate_idx == -1) {
                                // first entry
                                CliqzUtils.log("first candidate: " + label)
                                candidate_idx = i;
                                candidate_url = label;
                            } else if(candidate_url.indexOf(label) != -1) {
                                // this url is a substring of the previously candidate
                                CliqzUtils.log("found shorter candidate: " + label)
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

                        CliqzUtils.log("instant:" + label)
                        var instant = Result.generic(style, value, image, comment, label, this.searchString);
                        if(CliqzUtils.cliqzPrefs.getBoolPref('showQueryDebug'))
                            instant.comment += " (instant History Domain)!";

                        this.historyResults.removeValueAt(candidate_idx, false);
                        this.mixedResults.addResults([instant]);
                        this.pushResults(result.searchString);
                    }
                }
            },
            sendResultsSignal: function(results) {
                var action = {
                    type: 'activity',
                    action: 'results',
                    result_order:  CliqzAutocomplete.getResultsOrder(results)
                };
                CliqzUtils.track(action);
            },
            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
                    CliqzUtils.clearTimeout(this.resultsTimer);
                    var now = (new Date()).getTime();

                    if((now > this.startTime + CliqzAutocomplete.TIMEOUT) ||
                        this.historyResults && this.cliqzResults && this.cliqzSuggestions &&
                        this.cliqzWeather && this.cliqzWorldCup) {

                        //this.listener.onSearchResult(this, this.mixResults());
                        this.mixedResults.addResults(this.mixResults());
                        CliqzAutocomplete.lastResult = this.mixedResults;
                        CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;

                        this.listener.onSearchResult(this, this.mixedResults);
                        this.sendResultsSignal(this.mixedResults._results);

                        if(this.startTime)
                            CliqzTimings.add("result", (now - this.startTime));
                        this.startTime = null;
                        this.resultsTimer = null;
                        this.cliqzResults = null;
                        this.cliqzCache = null;
                        this.cliqzSuggestions = null;
                        this.historyResults = null;
                        this.cliqzWeather= null;
                        this.cliqzWorldCup = null;
                        return;
                    } else {
                        let timeout = this.startTime + CliqzAutocomplete.TIMEOUT - now + 1;
                        this.resultsTimer = CliqzUtils.setTimeout(this.pushResults, timeout, this.searchString);

                        // force update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.listener.onSearchResult(this, this.mixedResults);
                    }
                }
            },
            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var results = [];

                    if(this.startTime)
                        CliqzTimings.add("search_cliqz", ((new Date()).getTime() - this.startTime));

                    if(req.status == 200){
                        var json = JSON.parse(req.response);
                        results = json.result;
                    }
                    this.cliqzResults = results;
                }
                this.pushResults(q);
            },
            // handles suggested queries
            cliqzSuggestionFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var response = [];

                    if(this.startTime)
                        CliqzTimings.add("search_suggest", ((new Date()).getTime() - this.startTime));

                    if(req.status == 200){
                        response = JSON.parse(req.response);
                    }
                    this.cliqzSuggestions = response[1];
                }
                this.pushResults(q);
            },
            // handles weather queries
            cliqzWeatherFetcher: function(req, q, locName) {
                var weekday= ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
                var monthNames= ["Januar", "Februar", "März", "April", "Mai", "Juni", "July", "August", "September", "Oktober", "November", "Dezember"];
                //var WEATHER_ICON_BASE_URL= "http://openweathermap.org/img/w/";
                var WEATHER_ICON_BASE_URL= "chrome://cliqzres/content/skin/weather/";

                // helper for determing current tempperature by current hour
                function getTempByDayhour(temp, hour){
                    var currTemp= null;
                    switch (true) {
                        case (hour >= 0 && hour <= 5):
                            currTemp= temp.night;
                            break;
                        case (hour >= 6 && hour <= 11):
                            currTemp= temp.morn;
                            break;
                        case (hour >= 12 && hour <= 17):
                            currTemp= temp.day;
                            break;
                        case (hour >= 18 && hour <= 23):
                            currTemp= temp.eve;
                            break;
                        default:
                            currTemp= "";
                            break;
                    }

                    return currTemp;
                }

                var old_q= this.searchString.replace(/^(wetter|weather|meteo|temps) /gi, "");
                if(q == old_q){ // be sure this is not a delayed result
                    var response = [],
                        DEGREE = "\u00B0";

                    if(this.startTime)
                        CliqzTimings.add("search_weather", ((new Date()).getTime() - this.startTime));

                    if(req.status == 200){
                        response = JSON.parse(req.response);


                        var days = response.list,
                            today = new Date(days[0].dt * 1000),
                            tomorrow = new Date(today.getTime() + 24*60*60*1000),
                            aTomorrow = new Date(tomorrow.getTime() + 24*60*60*1000);

                        this.cliqzWeather = [
                            Result.generic(
                                Result.CLIQZW,
                                "",
                                null,
                                locName,
                                "",
                                null,
                                {
                                    city: locName,
                                    todayTemp: Math.round(getTempByDayhour(days[0].temp, today.getHours())) + DEGREE,
                                    todayMin: Math.round(days[0].temp.min) + DEGREE,
                                    todayMax: Math.round(days[0].temp.max) + DEGREE,
                                    todayDate: weekday[today.getDay()] + " " + today.getDate() + ". " + monthNames[today.getMonth()],
                                    todayIcon: WEATHER_ICON_BASE_URL + days[0].weather[0].icon + ".png",
                                    tomorrowDay: weekday[tomorrow.getDay()],
                                    tomorrowDate: tomorrow.getDate()+ '. ' + monthNames[tomorrow.getMonth()],
                                    tomorrowMin: Math.round(days[1].temp.min) + DEGREE,
                                    tomorrowMax: Math.round(days[1].temp.max) + DEGREE,
                                    tomorrowDesc: days[1].weather[0].description,
                                    tomorrowIcon: WEATHER_ICON_BASE_URL + days[1].weather[0].icon + ".png",
                                    aTomorrowDay: weekday[aTomorrow.getDay()],
                                    aTomorrowDate: aTomorrow.getDate()+ '. ' + monthNames[aTomorrow.getMonth()],
                                    aTomorrowMin: Math.round(days[2].temp.min) + DEGREE,
                                    aTomorrowMax: Math.round(days[2].temp.max) + DEGREE,
                                    aTomorrowDesc: days[2].weather[0].description,
                                    aTomorrowIcon: WEATHER_ICON_BASE_URL + days[2].weather[0].icon + ".png",
                                }
                            )
                        ];

                        CliqzUtils.log(JSON.stringify(this.cliqzWeather), 'WEATHER');
                    } else {
                        this.cliqzWeather = [];
                    }

                }
                this.pushResults(q);
            },
            // handles world cup queries
            cliqzWorldCupFetcher: function(req, q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    var response = [];

                    if(this.startTime)
                        CliqzTimings.add("search_worldcup", ((new Date()).getTime() - this.startTime));

                    if(req.status == 200){
                        response = JSON.parse(req.response);
                        this.cliqzWorldCup = [
                            Result.generic(
                                Result.CLIQZWC,
                                "",
                                null,
                                null,
                                "",
                                null,
                                {
                                    matches: response
                                }
                            )
                        ];
                    } else {
                        this.cliqzWorldCup = [];
                    }
                }
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
                            this.mixedResults,
                            //this.cliqzSuggestions,
                            this.cliqzWeather,
                            this.cliqzWorldCup,
                            maxResults
                    );


                CliqzUtils.log('Results for ' + this.searchString + ' : ' + results.length
                  + ' (results:' + (this.cliqzResults || []).length
                  + ', suggestions: ' + (this.cliqzSuggestions || []).length
                  + ')' );

                return results;
            },
            analyzeQuery: function(q){
                var customQuery = ResultProviders.isCustomQuery(q);
                if(customQuery){
                    this.customResults = [
                        Result.generic(
                            Result.CLIQZC + ' sources-' + customQuery.engineCode,
                            customQuery.queryURI,
                            null,
                            CliqzUtils.createSuggestionTitle(q, customQuery.engineName),
                            customQuery.updatedQ
                        )
                    ];
                }

                return q
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CliqzUtils.log('search: ' + searchString);

                CliqzAutocomplete.lastSearch = searchString;
                CliqzAutocomplete.lastResult = null;
                CliqzAutocomplete.lastSuggestions = null;
                this.oldPushLength = 0;
                this.customResults = null;

                var action = {
                    type: 'activity',
                    action: 'key_stroke',
                    current_length: searchString.length
                };
                CliqzUtils.track(action);

                // custom results
                searchString = this.analyzeQuery(searchString);

                this.cliqzResults = null;
                this.cliqzCache = null;
                this.historyResults = null;
                this.cliqzSuggestions = null;
                this.cliqzWeather = null;
                this.cliqzWorldCup = null;

                this.startTime = (new Date()).getTime();
                this.listener = listener;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
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
                this.cliqzWeatherFetcher = this.cliqzWeatherFetcher.bind(this);
                this.cliqzWorldCupFetcher = this.cliqzWorldCupFetcher.bind(this);

                if(searchString.trim().length){
                    // start fetching results and suggestions
                    CliqzUtils.getCliqzResults(searchString, this.cliqzResultFetcher);
                    CliqzUtils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                    // Fetch weather and worldcup only if search matches regex
                    const weatherRegex = /^(wetter|weather|meteo|temps) /i;
                    if(weatherRegex.test(searchString)){
                        CliqzUtils.getWeather(searchString, this.cliqzWeatherFetcher);
                    } else {
                        this.cliqzWeather = [];
                    }
                    const worldCupRegex = /(wm|fu[\u00DF]b|fussb|soccer|footb|weltme|fifa|worldcup)/i;
                    if(worldCupRegex.test(searchString)){
                        CliqzUtils.getWorldCup(searchString, this.cliqzWorldCupFetcher);
                    } else {
                        this.cliqzWorldCup = [];
                    }
                } else {
                    this.cliqzResults = [];
                    this.cliqzSuggestions = [];
                    this.customResults = [];
                    this.cliqzWeather = [];
                    this.cliqzWorldCup = [];
                }

                // trigger history search
                this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
            },

            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                CliqzUtils.clearTimeout(this.resultsTimer);
            }
        }
    }
}
