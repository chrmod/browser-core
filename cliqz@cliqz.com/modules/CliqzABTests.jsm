'use strict';
var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
    URL: 'https://logging.cliqz.com/abtests/check?session=',
    check: function() {
        CliqzABTests.retrieve(
            function(response){
                try{
                    var prevABtests = {};
                    if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
                        prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                    var respABtests = JSON.parse(response.responseText);
                    var newABtests = {};

                    var changes = false; // any changes?

                    // find old AB tests to leave
                    for(let o in prevABtests) {
                        if(!respABtests[o]) {
                            if(CliqzABTests.leave(o))
                                changes = true;
                        }
                        else {
                            // keep this old test in the list of current tests
                            newABtests[o] = prevABtests[o]
                        }
                    }

                    // find new AB tests to enter
                    for(let n in respABtests) {
                        if(!(prevABtests[n])) {
                            if(CliqzABTests.enter(n, respABtests[n])) {
                                changes = true;
                                newABtests[n] = respABtests[n];
                            }
                        }
                    }

                    if(changes) {
                        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(newABtests))
                    }
                } catch(e){
                    //CliqzUtils.log(e, "CliqzABTests.check Error");
                }
            });
    },
    retrieve: function(callback) {
        var url = CliqzABTests.URL + encodeURIComponent(
                CliqzUtils.cliqzPrefs.getCharPref('session'));
        //req.overrideMimeType('application/json');
        var onerror = function(){ CliqzUtils.log("failed to get AB test data",
                                                 "CliqzABTests.retrieve") }

        CliqzUtils.httpGet(url, callback, onerror, 15000);
    },
    enter: function(abtest, payload) {
        var logname = "CliqzABTests.enter"

        // Add new AB tests here.
        // It is safe to remove them as soon as the test is over.
        var rule_executed = true
        switch(abtest) {
            /* 1000: enable timing log signal */
            case "1000_A":
                CliqzUtils.setPref("logTimings", true);
                break;

            case "1004_A":
                // enable clustering + series
                // History length: 12
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                CliqzUtils.setPref("old_maxRichResults", urlbarPrefs.getIntPref("maxRichResults"));
                urlbarPrefs.setIntPref("maxRichResults", 12)

                CliqzUtils.setPref("abCluster", true);
                break;

            case "1004_B":
                // enable clustering + series
                // History length: 20
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                CliqzUtils.setPref("old_maxRichResults", urlbarPrefs.getIntPref("maxRichResults"));
                urlbarPrefs.setIntPref("maxRichResults", 30)

                CliqzUtils.setPref("abCluster", true);
                break;
            case "1005_B":
                // log clustering site
                CliqzUtils.setPref("logCluster", true);
                break;
            case "1006_A":
                // abort http connections if a new one appears
                CliqzUtils.setPref("abortConnections", false);
                break;
            case "1007_A":
                // run history-based suggester experiment
                CliqzUtils.cliqzPrefs.setPref("historyExperiment", true);
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            if(payload.msg)
                CliqzUtils.log(abtest + ": " + payload.msg, logname);
            else
               CliqzUtils.log(abtest, logname);
            return true;
       } else {
            return false;
       }
    },
    leave: function(abtest) {
        var logname = "CliqzABTests.leave"

        // Restore defaults after an AB test is finished.
        // DO NOT remove test cleanup code too quickly, a user
        // might not start the browser for a long time and
        // get stuck in a test if we remove cases too early.
        var rule_executed = true;
        switch(abtest) {
            case "1000_A":
                CliqzUtils.cliqzPrefs.clearUserPref("logTimings");
                break;
            case "1001_A":
            case "1001_B":
            case "1001_C":
                CliqzUtils.cliqzPrefs.clearUserPref("changelogURL");
                CliqzUtils.cliqzPrefs.clearUserPref("showChangelog");
                break;
            case "1002_A":
            case "1003_A":
            case "1003_B":
            case "1004_A":
            case "1004_B":
                // disable clustering + series
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                if(CliqzUtils.cliqzPrefs.prefHasUserValue("old_maxRichResults")){
                    urlbarPrefs.setIntPref("maxRichResults", CliqzUtils.getPref("old_maxRichResults"));
                    CliqzUtils.cliqzPrefs.clearUserPref("old_maxRichResults");
                }

                CliqzUtils.cliqzPrefs.clearUserPref("abCluster");
                break;
            case "1005_B":
                // remove log clustering
                CliqzUtils.cliqzPrefs.clearUserPref('logCluster');
                break;
            case "1006_A":
                // abort http connections if a new one appears
                CliqzUtils.cliqzPrefs.clearUserPref("abortConnections");
                break;
            case "1007_A":
                // run history-based suggester experiment
                CliqzUtils.cliqzPrefs.clearUserPref("historyExperiment");
                break;
            default:
                rule_executed = false;
        }

        if(rule_executed) {
            CliqzUtils.log(abtest, logname);
            return true;
       } else {
            return false;
       }
    },
}
