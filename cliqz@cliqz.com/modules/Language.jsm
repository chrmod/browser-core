'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['Language'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js?r=' + Math.random());


var Language = Language || {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'cliqz language: ',
    currentState: {},
    // we keep a different namespace than cliqz so that it does not get
    // removed after a re-install or sent during a logging signal
    cliqzLangPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz-lang.'),

    useragentPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('general.useragent.'),

    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {

            if (aURI.spec == this.currentURL) return;
            this.currentURL = aURI.spec;

            Language.window.setTimeout((function(a) { var currURLAtTime=a; return function() {

                try {
                    var currURL = Language.window.gBrowser.selectedBrowser.contentDocument.location;
                    if (''+currURLAtTime == ''+currURL) {
                        // the person has stayed at least READING_THRESHOLD at the URL, now let's try
                        // to fetch the locale
                        CLIQZ.Utils.log("Person has been long enough at: " + currURLAtTime, Language.LOG_KEY);
                        var locale = Language.window.gBrowser.selectedBrowser.contentDocument
                            .getElementsByTagName('html').item(0).getAttribute('lang');
                        if (locale) Language.addLocale(''+currURL,locale);
                    }

               }
               catch(ee) {
                // silent fail
                CLIQZ.Utils.log('Exception: ' + ee, Language.LOG_KEY);

               }

            };})(this.currentURL), Language.READING_THRESHOLD);

        },

        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    // load from the about:config settings
    init: function(window) {

        Language.window = window;

        if(Language.cliqzLangPrefs.prefHasUserValue('data')) {
            Language.currentState = JSON.parse(Language.cliqzLangPrefs.getCharPref('data'));

            // for the case that the user changes his userAgent.locale
            var ll = Language.normalizeLocale(Language.useragentPrefs.getCharPref('locale'));
            if (ll) {
                if (Language.currentState[ll]!='locale') {
                    Language.currentState[ll] = 'locale';
                    Language.saveCurrentState();
                }
            }
        }
        else {
            // it has nothing, new or removed,

            var ll = Language.normalizeLocale(Language.useragentPrefs.getCharPref('locale'));
            if (ll) {
                Language.currentState = {};
                Language.currentState[ll] = 'locale';
                Language.saveCurrentState();
            }
        }

        CLIQZ.Utils.log(Language.stateToQueryString(), Language.LOG_KEY);

    },
    // add locale, this is the function hook that will be called for every page load that
    // stays more than 5 seconds active
    addLocale: function(url, localeStr) {

        var locale = Language.normalizeLocale(localeStr);

        if (locale=='' || locale==undefined || locale==null) return;
        if (url=='' || url==undefined || url==null) return;

        if (Language.currentState[locale] != 'locale') {
            // if it's the locale there is not need to do anything, we already have it

            // extract domain from url, hash it and update the value
            var url_hash = Language.hashCode(url.replace('http://','').replace('https://','').replace('://','').split('/')[0]) % 256;

            CLIQZ.Utils.log('Saving: ' + locale + ' ' + url_hash, Language.LOG_KEY);

            if (Language.currentState[locale]==null || Language.currentState[locale].indexOf(url_hash)==-1) {
                if (Language.currentState[locale]==null) Language.currentState[locale] = [];
                // does not exist
                Language.currentState[locale].push(url_hash);
                Language.saveCurrentState();
            }
        }

    },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // removes the country from the locale, for instance, de-de => de, en-US => en
    normalizeLocale: function(str) {
        if (str) return str.split('-')[0].toLowerCase();
        else return srt;
    },
    // the function that decided which languages the person understands
    state: function() {

        var lang_vec = [];
        for (var lang in Language.currentState) {
            if (Language.currentState[lang]=='locale') {
                lang_vec.push([lang, 0.0]);
            }
            else {
                var val = Object.keys(Language.currentState[lang]).length;
                if (val > Language.DOMAIN_THRESHOLD) {
                    lang_vec.push([lang, 1.0/val]);
                }
            }
        }

        lang_vec = lang_vec.sort(function(a, b){
            return a[1]-b[1];
        });

        var lang_vec_clean = [];
        for (var index in lang_vec) {
            lang_vec_clean.push(lang_vec[index][0]);
        }

        return lang_vec_clean;
    },
    stateToQueryString: function() {
        return '&lang=' + Language.state().join(',');
    },
    // Save the current state to preferences,
    saveCurrentState: function() {
        CLIQZ.Utils.log("Going to save languages: " + JSON.stringify(Language.currentState), Language.LOG_KEY);
        Language.cliqzLangPrefs.setCharPref('data', JSON.stringify(Language.currentState || {}));
    },
};
