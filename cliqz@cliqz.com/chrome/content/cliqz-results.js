'use strict';

var Ci = Components.interfaces;
var Cu = Components.utils;
var Cc = Components.classes;
var EXPORTED_SYMBOLS = ['CLIQZResults'];

// TLD list extracted from http://www.iana.org/domains/root/db,
// cc stands fro country code, the other are generic
var TLDs = {"gw": "cc", "gu": "cc", "gt": "cc", "gs": "cc", "gr": "cc", "gq": "cc", "gp": "cc", "dance": "na", "tienda": "na", "gy": "cc", "gg": "cc", "gf": "cc", "ge": "cc", "gd": "cc", "gb": "cc", "ga": "cc", "edu": "na", "gn": "cc", "gm": "cc", "gl": "cc", "\u516c\u53f8": "na", "gi": "cc", "gh": "cc", "tz": "cc", "zone": "na", "tv": "cc", "tw": "cc", "tt": "cc", "immobilien": "na", "tr": "cc", "tp": "cc", "tn": "cc", "to": "cc", "tl": "cc", "bike": "na", "tj": "cc", "tk": "cc", "th": "cc", "tf": "cc", "tg": "cc", "td": "cc", "tc": "cc", "coop": "na", "\u043e\u043d\u043b\u0430\u0439\u043d": "na", "cool": "na", "ro": "cc", "vu": "cc", "democrat": "na", "guitars": "na", "qpon": "na", "\u0441\u0440\u0431": "cc", "zm": "cc", "tel": "na", "futbol": "na", "za": "cc", "\u0628\u0627\u0632\u0627\u0631": "na", "\u0440\u0444": "cc", "zw": "cc", "blue": "na", "mu": "cc", "\u0e44\u0e17\u0e22": "cc", "asia": "na", "marketing": "na", "\u6d4b\u8bd5": "na", "international": "na", "net": "na", "\u65b0\u52a0\u5761": "cc", "okinawa": "na", "\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8": "na", "\u05d8\u05e2\u05e1\u05d8": "na", "\uc0bc\uc131": "na", "sexy": "na", "institute": "na", "\u53f0\u7063": "cc", "pics": "na", "\u516c\u76ca": "na", "\u673a\u6784": "na", "social": "na", "domains": "na", "\u9999\u6e2f": "cc", "\u96c6\u56e2": "na", "limo": "na", "\u043c\u043e\u043d": "cc", "tools": "na", "nagoya": "na", "properties": "na", "camera": "na", "today": "na", "club": "na", "company": "na", "glass": "na", "berlin": "na", "me": "cc", "md": "cc", "mg": "cc", "mf": "cc", "ma": "cc", "mc": "cc", "tokyo": "na", "mm": "cc", "ml": "cc", "mo": "cc", "mn": "cc", "mh": "cc", "mk": "cc", "cat": "na", "reviews": "na", "mt": "cc", "mw": "cc", "mv": "cc", "mq": "cc", "mp": "cc", "ms": "cc", "mr": "cc", "cab": "na", "my": "cc", "mx": "cc", "mz": "cc", "\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8": "cc", "wang": "na", "estate": "na", "clothing": "na", "monash": "na", "guru": "na", "technology": "na", "travel": "na", "\u30c6\u30b9\u30c8": "na", "pink": "na", "fr": "cc", "\ud14c\uc2a4\ud2b8": "na", "farm": "na", "lighting": "na", "fi": "cc", "fj": "cc", "fk": "cc", "fm": "cc", "fo": "cc", "sz": "cc", "kaufen": "na", "sx": "cc", "ss": "cc", "sr": "cc", "sv": "cc", "su": "cc", "st": "cc", "sk": "cc", "sj": "cc", "si": "cc", "sh": "cc", "so": "cc", "sn": "cc", "sm": "cc", "sl": "cc", "sc": "cc", "sb": "cc", "rentals": "na", "sg": "cc", "se": "cc", "sd": "cc", "\u7ec4\u7ec7\u673a\u6784": "na", "shoes": "na", "\u4e2d\u570b": "cc", "industries": "na", "lb": "cc", "lc": "cc", "la": "cc", "lk": "cc", "li": "cc", "lv": "cc", "lt": "cc", "lu": "cc", "lr": "cc", "ls": "cc", "holiday": "na", "ly": "cc", "coffee": "na", "ceo": "na", "\u5728\u7ebf": "na", "ye": "cc", "\u0625\u062e\u062a\u0628\u0627\u0631": "na", "ninja": "na", "yt": "cc", "name": "na", "moda": "na", "eh": "cc", "\u0628\u06be\u0627\u0631\u062a": "cc", "ee": "cc", "house": "na", "eg": "cc", "ec": "cc", "vote": "na", "eu": "cc", "et": "cc", "es": "cc", "er": "cc", "ru": "cc", "rw": "cc", "\u0aad\u0abe\u0ab0\u0aa4": "cc", "rs": "cc", "boutique": "na", "re": "cc", "\u0633\u0648\u0631\u064a\u0629": "cc", "gov": "na", "\u043e\u0440\u0433": "na", "red": "na", "foundation": "na", "pub": "na", "vacations": "na", "org": "na", "training": "na", "recipes": "na", "\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435": "na", "\u4e2d\u6587\u7f51": "na", "support": "na", "onl": "na", "\u4e2d\u4fe1": "na", "voto": "na", "florist": "na", "\u0dbd\u0d82\u0d9a\u0dcf": "cc", "\u049b\u0430\u0437": "cc", "management": "na", "\u0645\u0635\u0631": "cc", "\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc": "na", "kiwi": "na", "academy": "na", "sy": "cc", "cards": "na", "\u0938\u0902\u0917\u0920\u0928": "na", "pro": "na", "kred": "na", "sa": "cc", "mil": "na", "\u6211\u7231\u4f60": "na", "agency": "na", "\u307f\u3093\u306a": "na", "equipment": "na", "mango": "na", "luxury": "na", "villas": "na", "\u653f\u52a1": "na", "singles": "na", "systems": "na", "plumbing": "na", "\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae": "na", "\u062a\u0648\u0646\u0633": "cc", "\u067e\u0627\u06a9\u0633\u062a\u0627\u0646": "cc", "gallery": "na", "kg": "cc", "ke": "cc", "\u09ac\u09be\u0982\u09b2\u09be": "cc", "ki": "cc", "kh": "cc", "kn": "cc", "km": "cc", "kr": "cc", "kp": "cc", "kw": "cc", "link": "na", "ky": "cc", "voting": "na", "cruises": "na", "\u0639\u0645\u0627\u0646": "cc", "cheap": "na", "solutions": "na", "\u6e2c\u8a66": "na", "neustar": "na", "partners": "na", "\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe": "cc", "menu": "na", "arpa": "na", "flights": "na", "rich": "na", "do": "cc", "dm": "cc", "dj": "cc", "dk": "cc", "photography": "na", "de": "cc", "watch": "na", "dz": "cc", "supplies": "na", "report": "na", "tips": "na", "\u10d2\u10d4": "cc", "bar": "na", "qa": "cc", "shiksha": "na", "\u0443\u043a\u0440": "cc", "vision": "na", "wiki": "na", "\u0642\u0637\u0631": "cc", "\ud55c\uad6d": "cc", "computer": "na", "best": "na", "voyage": "na", "expert": "na", "diamonds": "na", "email": "na", "wf": "cc", "jobs": "na", "bargains": "na", "\u79fb\u52a8": "na", "jp": "cc", "jm": "cc", "jo": "cc", "ws": "cc", "je": "cc", "kitchen": "na", "\u0a2d\u0a3e\u0a30\u0a24": "cc", "\u0627\u06cc\u0631\u0627\u0646": "cc", "ua": "cc", "buzz": "na", "com": "na", "uno": "na", "ck": "cc", "ci": "cc", "ch": "cc", "co": "cc", "cn": "cc", "cm": "cc", "cl": "cc", "cc": "cc", "ca": "cc", "cg": "cc", "cf": "cc", "community": "na", "cd": "cc", "cz": "cc", "cy": "cc", "cx": "cc", "cr": "cc", "cw": "cc", "cv": "cc", "cu": "cc", "pr": "cc", "ps": "cc", "pw": "cc", "pt": "cc", "holdings": "na", "wien": "na", "py": "cc", "ai": "cc", "pa": "cc", "pf": "cc", "pg": "cc", "pe": "cc", "pk": "cc", "ph": "cc", "pn": "cc", "pl": "cc", "pm": "cc", "\u53f0\u6e7e": "cc", "aero": "na", "catering": "na", "photos": "na", "\u092a\u0930\u0940\u0915\u094d\u0937\u093e": "na", "graphics": "na", "\u0641\u0644\u0633\u0637\u064a\u0646": "cc", "\u09ad\u09be\u09b0\u09a4": "cc", "ventures": "na", "va": "cc", "vc": "cc", "ve": "cc", "vg": "cc", "iq": "cc", "vi": "cc", "is": "cc", "ir": "cc", "it": "cc", "vn": "cc", "im": "cc", "il": "cc", "io": "cc", "in": "cc", "ie": "cc", "id": "cc", "tattoo": "na", "education": "na", "parts": "na", "events": "na", "\u0c2d\u0c3e\u0c30\u0c24\u0c4d": "cc", "cleaning": "na", "kim": "na", "contractors": "na", "mobi": "na", "center": "na", "photo": "na", "nf": "cc", "\u0645\u0644\u064a\u0633\u064a\u0627": "cc", "wed": "na", "supply": "na", "\u7f51\u7edc": "na", "\u0441\u0430\u0439\u0442": "na", "careers": "na", "build": "na", "\u0627\u0644\u0627\u0631\u062f\u0646": "cc", "bid": "na", "biz": "na", "\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629": "cc", "gift": "na", "\u0434\u0435\u0442\u0438": "na", "works": "na", "\u6e38\u620f": "na", "tm": "cc", "exposed": "na", "productions": "na", "koeln": "na", "dating": "na", "christmas": "na", "bd": "cc", "be": "cc", "bf": "cc", "bg": "cc", "ba": "cc", "bb": "cc", "bl": "cc", "bm": "cc", "bn": "cc", "bo": "cc", "bh": "cc", "bi": "cc", "bj": "cc", "bt": "cc", "bv": "cc", "bw": "cc", "bq": "cc", "br": "cc", "bs": "cc", "post": "na", "by": "cc", "bz": "cc", "om": "cc", "ruhr": "na", "\u0627\u0645\u0627\u0631\u0627\u062a": "cc", "repair": "na", "xyz": "na", "\u0634\u0628\u0643\u0629": "na", "viajes": "na", "museum": "na", "fish": "na", "\u0627\u0644\u062c\u0632\u0627\u0626\u0631": "cc", "hr": "cc", "ht": "cc", "hu": "cc", "hk": "cc", "construction": "na", "hn": "cc", "solar": "na", "hm": "cc", "info": "na", "\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd": "cc", "uy": "cc", "uz": "cc", "us": "cc", "um": "cc", "uk": "cc", "ug": "cc", "builders": "na", "ac": "cc", "camp": "na", "ae": "cc", "ad": "cc", "ag": "cc", "af": "cc", "int": "na", "am": "cc", "al": "cc", "ao": "cc", "an": "cc", "aq": "cc", "as": "cc", "ar": "cc", "au": "cc", "at": "cc", "aw": "cc", "ax": "cc", "az": "cc", "ni": "cc", "codes": "na", "nl": "cc", "no": "cc", "na": "cc", "nc": "cc", "ne": "cc", "actor": "na", "ng": "cc", "\u092d\u093e\u0930\u0924": "cc", "nz": "cc", "\u0633\u0648\u062f\u0627\u0646": "cc", "np": "cc", "nr": "cc", "nu": "cc", "xxx": "na", "\u4e16\u754c": "na", "kz": "cc", "enterprises": "na", "land": "na", "\u0627\u0644\u0645\u063a\u0631\u0628": "cc", "\u4e2d\u56fd": "cc", "directory": "na"};

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js?r=' + Math.random());

var prefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService)
                    .getBranch('browser.urlbar.');

var CLIQZResults = CLIQZResults || {
    LOG_KEY: 'cliqz results: ',
    TIMEOUT: 500,
    CLIQZR: 'cliqz-results',
    CLIQZS: 'cliqz-suggestions',
    CLIQZICON: 'http://beta.cliqz.com/favicon.ico',
    TYPE_VIDEO: ['video', 'tv_show', 'youtube'],
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
            QueryInterface: XPCOMUtils.generateQI([  ])
        };
    },
    initResults: function(){
        CLIQZResults.CliqzResults.prototype = {
            classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
            classDescription : 'Cliqz',
            contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
            QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
            resultsTimer: null,

            // history sink
            onSearchResult: function(search, result) {
                this.historyResults = result;
                this.pushResults(result.searchString);
            },

            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                if(q == this.searchString){ // be sure this is not a delayed result
                    CLIQZ.Utils.clearTimeout(this.resultsTimer);
                    var now = (new Date()).getTime();
                    if((now > this.startTime + CLIQZResults.TIMEOUT) ||
                        this.historyResults && this.cliqzResults  && this.cliqzSuggestions ){

                        this.listener.onSearchResult(this, this.mixResults());
                        this.resultsTimer = null;
                        this.startTime = null;
                        this.cliqzResults = null;
                        this.cliqzCache = null;
                        this.cliqzSuggestions = null;
                        this.historyResults = null;
                    } else {
                        let timeout = this.startTime + CLIQZResults.TIMEOUT - now + 1;
                        this.resultsTimer = CLIQZ.Utils.setTimeout(this.pushResults, timeout, this.searchString);
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
                        result.snippet.snippet, //comment
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

                    if(style === 'bookmark')bookmarkResults++;
                    if(style.indexOf('action') !== -1)tabResults++;
                    else histResults++;
                }

                for(let i in this.cliqzResults || []) {
                    let r = this.cliqzResults[i];
                    if(r.snippet){
                        if(r.snippet.snippet){
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
                    tab_results: tabResults
                };

                return action;
            },
            // removes duplicates from the results list. Returns the list with the elements
            // removed. 
            // max_by_domain is the maximum number of urls with the same domain (after
            // normalization).
            // max_by_domain_and_path, the maximum number of urls with the same domain+path
            // max_by_domain_title, the maximum number of urls with the same domain and the same title
            // put -1 to leave them unbounded. 
            // they all work as a logical AND
            // typical use case, only check by path: removeDuplicates(results, -1, 1, 1)
            // if you want to not have more than 2 wikipedias: removeDuplicates(results, 2, 1, 1)
            removeDuplicates: function(results, max_by_domain, max_by_domain_path, max_by_domain_title) {
                
                var filterTLDs = function(domain) {
                    var v = domain.toLowerCase().split('.');
                    
                    // remove the first level yes or yes
                    var first_level = TLDs[v[v.length-1]];
                    v[v.length-1]=null;
                    
                    if ((v.length > 2) && (first_level=='cc')) {
                        // check if we also have to remove the second level, only if 3 or more levels
                        // and the first_level was a country code
                        if (TLDs[v[v.length-2]]) {
                            v[v.length-2] = null;
                        }
                    } 
                    
                    // remove the nulls
                    v = v.filter(function(n){ return n != null });
                    
                    // let's go to remove locales from the beginning, only if at least 2 or more
                    // levels remaining and if the first_level was not a country code
                    if ((v.length > 1) && (first_level!='cc')) {
                        
                        // cover the case de.wikipedia.org
                        if (TLDs[v[0]]=='cc' || v[0]=='en') {
                            v[0] = null;
                        }
                        else {
                            // cover the case de-de.facebook.com
                            var w = v[0].split("-");
                            if ((w.length == 2) && (TLDs[w[0]]=='cc' || TLDs[w[0]]=='en') && (TLDs[w[1]]=='cc' || TLDs[w[1]]=='en')) {
                                v[0] = null;
                            }    
                        }   
                    }
                    
                    // remove the nulls and join
                    return v.filter(function(n){ return n != null }).join('.');
                }
                
                var extractKeys = function(url, title) {
                    var domain = null;
                    var path = null;
                    var clean_url = url.toLowerCase().replace(/^http[s]*:\/\//,'').replace(/^www\./,'');
                    var v = clean_url.split('/');
                    var domain = v[0];
                    var path = '/';
                    
                    if (v.length > 1) {
                        // remove the query string
                        v[v.length-1] = v[v.length-1].split('?')[0];
                        path = '/' + v.splice(1, v.length-1).join('/');
                    }
                    
                    domain = filterTLDs(domain);
                    
                    // if no title or empty, generate a random key. This is a fail-safe mechanism
                    if ((title==undefined) || (title==null) || (title.trim()=='')) {
                        title = '' + Math.random();
                    }
                    
                    return [domain, domain + path, domain + title];
                }
                
                var deduplicated_results = [];
                var memo_domain = {};
                var memo_domain_path = {};
                var memo_domain_title = {};
                
                if (max_by_domain_path==-1) max_by_domain_path = results.length;
                if (max_by_domain==-1) max_by_domain = results.length;
                if (max_by_domain_title==-1) max_by_domain_title = results.length;
                
                for (let i = 0; i<results.length; i++) {
                    //CLIQZ.Utils.log("TITLE: "+ JSON.stringify(results[i]));
                    //the title is in results[i].comment) but it also contains debug information, i.e. (Cache: hell), be careful
                    var w = extractKeys(CLIQZ.Utils.cleanMozillaGarbage(results[i].val), results[i].comment);
                    var by_domain = w[0];
                    var by_domain_path = w[1];
                    var by_domain_title = w[2];
                    
                    (memo_domain[by_domain]==null) ? memo_domain[by_domain]=1 : memo_domain[by_domain]+=1;
                    (memo_domain_path[by_domain_path]==null) ? memo_domain_path[by_domain_path]=1 : memo_domain_path[by_domain_path]+=1;
                    (memo_domain_title[by_domain_title]==null) ? memo_domain_title[by_domain_title]=1 : memo_domain_title[by_domain_title]+=1;
                    
                    
                    if ((memo_domain[by_domain] <= max_by_domain) && (memo_domain_path[by_domain_path] <= max_by_domain_path) && (memo_domain_title[by_domain_title] <= max_by_domain_title)) {
                        deduplicated_results.push(results[i]);
                        // CLIQZ.Utils.log('NOT  duplicate: ' + results[i].val);
                    }
                    else {
                        // CLIQZ.Utils.log('duplicate: ' + results[i].val);
                    }
                    
                }
                return deduplicated_results;
            },
            // mixes history, results and suggestions
            mixResults: function() {
                var results = [], histResults = 0, bookmarkResults = 0,
                    maxResults = prefs.getIntPref('maxRichResults'),
                    temp_log = this.logResults();
                
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

                        // Ignore result if is this a google search result from history
                        if(urlparts.name == "google" && urlparts.subdomains[0] == "www" && 
                           (urlparts.path.indexOf("/search?") == 0 || urlparts.path.indexOf("/url?") == 0)) {
                            CLIQZ.Utils.log("Discarding google result page from history: " + label)
                        } else {
                            // Assign to different buckets if the search string occurs in hostname
                            if(urlparts.host.indexOf(this.searchString) !=-1)
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
                
                // all bucketHistoryCache
                for(let i = 0; i < bucketHistoryCache.length; i++) {
                    if(showQueryDebug)
                        bucketHistoryCache[i].comment += " (History and Cache: " + bucketHistoryCache[i].query + ")";
                    results.push(bucketHistoryCache[i]);
                }

                // top 1 of bucketHistoryDomain
                if(bucketHistoryDomain.length > 0) {
                    if(showQueryDebug)
                        bucketHistoryDomain[0].comment += " (top History Domain)";
                    results.push(bucketHistoryDomain[0]);
                }

                // top 1 of bucketCache
                if(bucketCache.length > 0) {
                    if(showQueryDebug)
                        bucketCache[0].comment += " (top Cache: " + bucketCache[0].query + ")";
                    results.push(bucketCache[0]);
                }

                // rest of bucketHistoryDomain 
                for(let i = 1; i < bucketHistoryDomain.length; i++) {
                    if(showQueryDebug)
                        bucketHistoryDomain[i].comment += " (History Domain)";
                    results.push(bucketHistoryDomain[i]);
                }

                // rest of bucketCache
                for(let i = 1; i < bucketCache.length && i < 4; i++) {
                    if(showQueryDebug)
                        bucketCache[i].comment += " (Cache: " + bucketCache[i].query + ")";
                    results.push(bucketCache[i]);
                }

                // all bucketHistoryOther
                for(let i = 0; i < bucketHistoryOther.length; i++) {
                    if(showQueryDebug)
                        bucketHistoryOther[i].comment += " (History Other)";
                    results.push(bucketHistoryOther[i]);
                }

                results = this.removeDuplicates(results, -1, 1, 1);

                /// 4) Show suggests if not enough results
                if(this.searchString && results.length > 0 && results.length < maxResults){
                    results.push(
                            this.resultFactory(
                                CLIQZResults.CLIQZS,
                                this.searchString,
                                CLIQZResults.CLIQZICON,
                                CLIQZ.Utils.getLocalizedString('searchFor')
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
                                CLIQZ.Utils.getLocalizedString('searchFor')
                            )
                        );
                    }
                }
                

                results = results.slice(0, maxResults);

                var order = '';
                for (let r of results){
                    if(r.style.indexOf('action') !== -1)order+='T';
                    else if(r.style === 'bookmark')order+='B';
                    else if(r.style === 'favicon')order+='H';
                    else if(r.style === 'cliqz-results')order+='R';
                    else if(r.style === 'cliqz-suggestions')order+='S';
                    else order+=r.style; //fallback to style - it should never happen
                }
                temp_log.result_order = order;
                CLIQZ.Utils.track(temp_log);

                var mergedResult = new CLIQZResults.ProviderAutoCompleteResultCliqz(
                    this.searchString,
                    Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 
                    -2, // blocks autocomplete
                    '', 
                    results);

                CLIQZ.Utils.log('Results for ' + this.searchString + ' : ' + results.length
                  + ' (results:' + (this.cliqzResults || []).length
                  + ', suggestions: ' + (this.cliqzSuggestions || []).length 
                  + ')' );

                return mergedResult;
            },
            startSearch: function(searchString, searchParam, previousResult, listener) {
                CLIQZ.Utils.log('search: ' + searchString);
                
                var action = {
                    type: 'activity',
                    action: 'key_stroke',
                    current_length: searchString.length
                };
                CLIQZ.Utils.track(action);

                this.cliqzResults = null;
                this.cliqzCache = null;
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

                if(searchString.trim().length){
                    // start fetching results and suggestions
                    CLIQZ.Utils.getCachedResults(searchString, this.cliqzResultFetcher);
                    CLIQZ.Utils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                } else {
                    this.cliqzResults = [];
                    this.cliqzCache = [];
                    this.cliqzSuggestions = [];
                }

                // trigger history search
                this.historyAutoCompleteProvider.startSearch(searchString, searchParam, null, this);
            },

            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                this.searchString = '';
                CLIQZ.Utils.clearTimeout(this.resultsTimer);
            }
        }
    }
}