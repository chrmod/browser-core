'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzUCrawl'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var CliqzUCrawl = {
    DOMAIN_THRESHOLD: 3,
    READING_THRESHOLD: 10000,
    LOG_KEY: 'CliqzUCrawl',
    currentState: {},
    // we keep a different namespace than cliqz so that it does not get
    // removed after a re-install or sent during a logging signal
    sendCompSignal: function(message) {
        /*
        var action = {
            message: message
        };
        CliqzUtils.track(action)
        */
    },
    scrape: {

    }
    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {

            CliqzUtils.log('location change!', CliqzUCrawl.LOG_KEY);


            if (aURI.spec == this.currentURL) return;
            this.currentURL = aURI.spec;

            // here we check if user ignored our results and went to google and landed on the same url
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
            var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
            var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

            CliqzUtils.log("???" + this.currentURL, CliqzUCrawl.LOG_KEY);

            if (requery.test(this.currentURL) && !reref.test(this.currentURL)) {
              CliqzUtils.log(">>>>>>> It's a query: " + this.currentURL, CliqzUCrawl.LOG_KEY);


            }


            /*

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
                            CliqzUtils.log("Person has been long enough at: " + currURLAtTime, CliqzLanguage.LOG_KEY);
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
            */

        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },

    // load from the about:config settings
    init: function(window) {
        CliqzUCrawl.window = window;
        CliqzUtils.log('HELLO!!!!', CliqzUCrawl.LOG_KEY);

    },
    // add locale, this is the function hook that will be called for every page load that
    // stays more than 5 seconds active
    addLocale: function(url, localeStr) {
        /*
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
        */

    },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // removes the country from the locale, for instance, de-de => de, en-US => en
    normalizeLocale: function(str) {
        if (str) return str.split(/-|_/)[0].toLowerCase();
        else return srt;
    },
};
