'use strict';
var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.13');

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
    URL: 'https://logging.cliqz.com/abtests/check?session=',
    check: function() {
        CliqzABTests.retrieve(
            function(response){
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
            });
    },
    retrieve: function(callback) {
        // Utils.httpGet has a short timeout which is undesired here, so I build the connection myself
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        var url = CliqzABTests.URL + CliqzUtils.cliqzPrefs.getCharPref('session');

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
            case "1000_A":
                CliqzUtils.setPref("logTiming", true);
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
                CliqzUtils.setPref("logTiming", false);
                break;
        }
    },
}
