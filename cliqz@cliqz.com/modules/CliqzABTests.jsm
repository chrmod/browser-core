'use strict';
var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.04');

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
    URL: 'https://logging.cliqz.com/abtests/check?session=',
    check: function() {
        CliqzABTests.retrieve(
            function(response){
                try{
                    var prevABtests = [];
                    if(CliqzUtils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
                        prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                    var respABtests = JSON.parse(response.responseText);

                    var changes = false; // any changes?
                    // find new AB tests to enter
                    for(let n in respABtests) {
                        if(!(prevABtests[n])) {
                            changes = true;
                            CliqzABTests.enter(n, respABtests[n]);
                        }
                    }

                    // find old AB tests to leave
                    for(let o in prevABtests) {
                        if(!respABtests[o]) {
                            changes = true;
                            CliqzABTests.leave(o);
                        }
                    }
                    CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(respABtests))

                    if(changes)
                        CliqzUtils.extensionRestart();
                } catch(e){
                    CliqzUtils.log(e, "CliqzABTests.check Error");
                }
            });
    },
    retrieve: function(callback) {
        // Utils.httpGet has a short timeout which is undesired here, so I build the connection myself
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        var url = CliqzABTests.URL + encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session'));

        req.overrideMimeType('application/json');
        req.timeout = 5000;

        req.onload = function(){ callback && callback(req); }
        req.onerror = function(){ CliqzUtils.log("failed to get " + url, "CliqzABTests.retrieve") }
        req.ontimeout = function(){ CliqzUtils.log("timeout for " + url, "CliqzABTests.retrieve")}

        req.open("GET", url, true);
        req.send(null);
    },
    enter: function(abtest, payload) {
        var logname = "CliqzABTests.enter"
        if(payload.msg)
            CliqzUtils.log(abtest + ": " + payload.msg, logname);
        else
           CliqzUtils.log(abtest, logname);

        // Add new AB tests here.
        // It is safe to remove them as soon as the test is over.
        switch(abtest) {
            /* 1000: enable timing log signal */
            case "1000_A":
                CliqzUtils.setPref("logTimings", true);
                break;

            /* 1001: show one of three different changelogs on upgrade, or nothing (default) */
            case "1001_A":
                CliqzUtils.setPref("changelogURL", 'https://beta.cliqz.com/changelog_1001A');
                CliqzUtils.setPref("showChangelog", true);
                break;
            case "1001_B":
                CliqzUtils.setPref("changelogURL", 'https://beta.cliqz.com/changelog_1001B');
                CliqzUtils.setPref("showChangelog", true);
                break;
            case "1001_C":
                // use default changelog URL
                CliqzUtils.setPref("showChangelog", true);
                break;
            case "1002_A":
                // enable clustering + series
                CliqzUtils.setPref("abCluster", true);
                break;
            case "1003_A":
                // enable clustering + series
                // History length: 12
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                CliqzUtils.setPref("old_maxRichResults", urlbarPrefs.getIntPref("maxRichResults"));
                urlbarPrefs.setIntPref("maxRichResults", 12)

                CliqzUtils.setPref("abCluster", true);
                CliqzUtils.setPref("logTimings", true);
                break;
            case "1003_B":
                // enable clustering + series
                // History length: 20
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                CliqzUtils.setPref("old_maxRichResults", urlbarPrefs.getIntPref("maxRichResults"));
                urlbarPrefs.setIntPref("maxRichResults", 20)

                CliqzUtils.setPref("abCluster", true);
                CliqzUtils.setPref("logTimings", true);
                break;

        }
    },
    leave: function(abtest) {
        var logname = "CliqzABTests.leave"
        CliqzUtils.log(abtest, logname);

        // Restore defaults after an AB test is finished.
        // DO NOT remove test cleanup code too quickly, a user
        // might not start the browser for a long time and
        // get stuck in a test if we remove cases too early.
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
                // disable clustering + series
                var urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                                  .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
                if(CliqzUtils.cliqzPrefs.prefHasUserValue("old_maxRichResults")){
                    urlbarPrefs.setIntPref("maxRichResults", CliqzUtils.getPref("old_maxRichResults"));
                    CliqzUtils.cliqzPrefs.clearUserPref("old_maxRichResults");
                }

                CliqzUtils.cliqzPrefs.clearUserPref("logTimings");
                CliqzUtils.cliqzPrefs.clearUserPref("abCluster");
                break;
        }
    },
}
