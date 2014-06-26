'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzLanguage'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.15');

var CliqzLanguage = CliqzLanguage || {
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

            CliqzLanguage.window.setTimeout((function(a) { var currURLAtTime=a; return function() {

                try {
                    var currURL = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument.location;
                    if (''+currURLAtTime == ''+currURL) {
                        // the person has stayed at least READING_THRESHOLD at the URL, now let's try
                        // to fetch the locale
                        CliqzUtils.log("Person has been long enough at: " + currURLAtTime, CliqzLanguage.LOG_KEY);
                        var locale = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument
                            .getElementsByTagName('html').item(0).getAttribute('lang');
                        if (locale) CliqzLanguage.addLocale(''+currURL,locale);
                    }

               }
               catch(ee) {
                // silent fail
                CliqzUtils.log('Exception: ' + ee, CliqzLanguage.LOG_KEY);

               }

            };})(this.currentURL), CliqzLanguage.READING_THRESHOLD);

        },

        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    // load from the about:config settings
    init: function(window) {

        CliqzLanguage.window = window;

        if(CliqzLanguage.cliqzLangPrefs.prefHasUserValue('data')) {
            CliqzLanguage.currentState = JSON.parse(CliqzLanguage.cliqzLangPrefs.getCharPref('data'));

            // for the case that the user changes his userAgent.locale
            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.useragentPrefs.getCharPref('locale'));
            if (ll) {
                if (CliqzLanguage.currentState[ll]!='locale') {
                    CliqzLanguage.currentState[ll] = 'locale';
                    CliqzLanguage.saveCurrentState();
                }
            }
        }
        else {
            // it has nothing, new or removed,

            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.useragentPrefs.getCharPref('locale'));
            if (ll) {
                CliqzLanguage.currentState = {};
                CliqzLanguage.currentState[ll] = 'locale';
                CliqzLanguage.saveCurrentState();
            }
        }

        CliqzLanguage.cleanCurrentState();
        CliqzUtils.log(CliqzLanguage.stateToQueryString(), CliqzLanguage.LOG_KEY);

    },
    // add locale, this is the function hook that will be called for every page load that
    // stays more than 5 seconds active
    addLocale: function(url, localeStr) {

        var locale = CliqzLanguage.normalizeLocale(localeStr);

        if (locale=='' || locale==undefined || locale==null) return;
        if (url=='' || url==undefined || url==null) return;

        if (CliqzLanguage.currentState[locale] != 'locale') {
            // if it's the locale there is not need to do anything, we already have it

            // extract domain from url, hash it and update the value
            var url_hash = CliqzLanguage.hashCode(url.replace('http://','').replace('https://','').replace('://','').split('/')[0]) % 256;

            CliqzUtils.log('Saving: ' + locale + ' ' + url_hash, CliqzLanguage.LOG_KEY);

            if (CliqzLanguage.currentState[locale]==null || CliqzLanguage.currentState[locale].indexOf(url_hash)==-1) {
                if (CliqzLanguage.currentState[locale]==null) CliqzLanguage.currentState[locale] = [];
                // does not exist
                CliqzLanguage.currentState[locale].push(url_hash);
                CliqzLanguage.saveCurrentState();
            }
        }

    },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // removes the country from the locale, for instance, de-de => de, en-US => en
    normalizeLocale: function(str) {
        if (str) return str.split(/-|_/)[0].toLowerCase();
        else return srt;
    },
    // the function that decided which languages the person understands
    state: function() {

        var lang_vec = [];
        for (var lang in CliqzLanguage.currentState) {
            if (CliqzLanguage.currentState[lang]=='locale') {
                lang_vec.push([lang, 0.0]);
            }
            else {
                var val = Object.keys(CliqzLanguage.currentState[lang]).length;
                if (val > CliqzLanguage.DOMAIN_THRESHOLD) {
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
    cleanCurrentState: function() {
        var keys = Object.keys(CliqzLanguage.currentState);
        var count = 0;
        for(let i=0;i<keys.length;i++) if (keys[i]!=CliqzLanguage.normalizeLocale(keys[i])) count+=1;

        if (count>0) {
            var cleanState = {};
            for(let i=0;i<keys.length;i++) {
                var nkey = CliqzLanguage.normalizeLocale(keys[i]);
                if (CliqzLanguage.currentState[keys[i]]!='locale') {
                    cleanState[nkey] = (cleanState[nkey] || []);

                    for(let j=0;j<CliqzLanguage.currentState[keys[i]].length;j++) {
                        var value = CliqzLanguage.currentState[keys[i]][j];
                        if (cleanState[nkey].indexOf(value)==-1) cleanState[nkey].push(value);
                    }
                }
            }

            CliqzLanguage.currentState = cleanState;
            var ll = CliqzLanguage.normalizeLocale(CliqzLanguage.cliqzPrefs.getCharPref('locale'));
            if (ll && CliqzLanguage.currentState[ll]!='locale') CliqzLanguage.currentState[ll] = 'locale';

            CliqzLanguage.saveCurrentState();
        }
    },
    stateToQueryString: function() {
        return '&lang=' + CliqzLanguage.state().join(',');
    },
    // Save the current state to preferences,
    saveCurrentState: function() {
        CliqzUtils.log("Going to save languages: " + JSON.stringify(CliqzLanguage.currentState), CliqzLanguage.LOG_KEY);
        CliqzLanguage.cliqzLangPrefs.setCharPref('data', JSON.stringify(CliqzLanguage.currentState || {}));
    },
};
