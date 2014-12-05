'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzLanguage'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var CliqzLanguage = {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'CliqzLanguage',
    currentState: {},
    // we keep a different namespace than cliqz so that it does not get
    // removed after a re-install or sent during a logging signal
    cliqzLangPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz-lang.'),

    useragentPrefs: Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefService).getBranch('general.useragent.'),

    sendCompSignal: function(actionName, redirect, same_result, result_type, result_position) {
        var action = {
            type: 'performance',
            redirect: redirect,
            action: actionName,
            query_made: CliqzAutocomplete.afterQueryCount,
            popup: CliqzAutocomplete.lastPopupOpen,
            same_result: same_result,
            result_type: result_type,
            result_position: result_position
        };
        CliqzUtils.track(action)
    },

    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {

            if (aURI.spec == this.currentURL) return;
            this.currentURL = aURI.spec;

            // here we check if user ignored our results and went to google and landed on the same url
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
            var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
            var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

            if (requery.test(this.currentURL) && !reref.test(this.currentURL)) {
                CliqzAutocomplete.afterQueryCount += 1;
            }

            if (reref.test(this.currentURL)) { // this is a google ref
                // action.redirect = true;
                var m = this.currentURL.match(rerefurl);
                if (m) {
                    var dest_url = decodeURIComponent(m[1]);
                    dest_url = dest_url.replace('http://', '').replace('https://', '').replace('www.', '');
                    var found = false;
                    for (var i=0; i < CliqzAutocomplete.lastResult['_results'].length; i++) {
                        var comp_url = CliqzAutocomplete.lastResult['_results'][i]['val'].replace('http://', '').replace('https://', '').replace('www.', '');
                        if (dest_url == comp_url) {
                            // now we have the same result
                            var resType = CliqzUtils.encodeResultType(CliqzAutocomplete.lastResult['_results'][i]['style']);
                            CliqzLanguage.sendCompSignal('result_compare', true, true, resType, i);
                            CliqzAutocomplete.afterQueryCount = 0;
                            found = true;
                        }
                    }
                    if (!found) {
                        // we don't have the same result
                        CliqzLanguage.sendCompSignal('result_compare', true, false, null, null);
                    }
                }
            } else if (CliqzAutocomplete.afterQueryCount == 1) {
                // some times the redict was not captured so if only one query was make, we still compare to cliqz result
                // but we don't send anything if we can't find a match
                for (var i=0;
                    CliqzAutocomplete.lastResult &&
                    i < CliqzAutocomplete.lastResult['_results'].length;
                    i++) {
                    var dest_url = this.currentURL.replace('http://', '').replace('https://', '').replace('www.', '');
                    var comp_url = CliqzAutocomplete.lastResult['_results'][i]['val'].replace('http://', '').replace('https://', '').replace('www.', '')
                    if (dest_url == comp_url) {
                        var resType = CliqzUtils.encodeResultType(CliqzAutocomplete.lastResult['_results'][i]['style']);
                        CliqzLanguage.sendCompSignal('result_compare', false, true, resType, i);
                    }
                }
            }

            // now the language detection
            CliqzLanguage.window.setTimeout(function(currURLAtTime) {
                try {
                    if(CliqzLanguage){ //might be called after the extension is disabled
                        var currURL = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument.location;
                        if (''+currURLAtTime == ''+currURL) {
                            // the person has stayed at least READING_THRESHOLD at the URL, now let's try
                            // to fetch the locale
                            // CliqzUtils.log("Person has been long enough at: " + currURLAtTime, CliqzLanguage.LOG_KEY);
                            var locale = CliqzLanguage.window.gBrowser.selectedBrowser.contentDocument
                                .getElementsByTagName('html').item(0).getAttribute('lang');
                            if (locale) CliqzLanguage.addLocale(''+currURL,locale);
                        }
                    }
               }
               catch(ee) {
                // silent fail
                //CliqzUtils.log('Exception: ' + ee, CliqzLanguage.LOG_KEY);
               }

            }, CliqzLanguage.READING_THRESHOLD, this.currentURL);
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
        return '&lang=' + encodeURIComponent(CliqzLanguage.state().join(','));
    },
    // Save the current state to preferences,
    saveCurrentState: function() {
        CliqzUtils.log("Going to save languages: " + JSON.stringify(CliqzLanguage.currentState), CliqzLanguage.LOG_KEY);
        CliqzLanguage.cliqzLangPrefs.setCharPref('data', JSON.stringify(CliqzLanguage.currentState || {}));
    },
};
