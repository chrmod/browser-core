'use strict';
var EXPORTED_SYMBOLS = ['CliqzABTests'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqz/content/utils.js?r=' + Math.random());

var CliqzABTests = CliqzABTests || {
    PREF: 'ABTests',
	check: function() {
        var logname = "CliqzABTests.check"

        CLIQZ.Utils.log("checking", logname);
        
        CLIQZ.Utils.getABTests(
            function(response){
                var prevABtests = [];
                if(CLIQZ.Utils.cliqzPrefs.prefHasUserValue(CliqzABTests.PREF))
                    prevABtests = JSON.parse(CLIQZ.Utils.getPref(CliqzABTests.PREF));

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
                CLIQZ.Utils.setPref(CliqzABTests.PREF, JSON.stringify(respABtests))

                if(changes)
                    CLIQZ.Utils.extensionRestart();
            });
    },
    enter: function(abtest, payload) {
        var logname = "CliqzABTests.enter"
        if(payload.msg)
            CLIQZ.Utils.log(abtest + ": " + payload.msg, logname);
        else
           CLIQZ.Utils.log(abtest, logname);

        // Add new AB tests here. 
        // It is safe to remove them as soon as the test is over.
        switch(abtest) {
            case "1000_A":
                CLIQZ.Utils.setPref("logTiming", true);
                break;
        }
    },
    leave: function(abtest) {
        var logname = "CliqzABTests.leave"
        CLIQZ.Utils.log(abtest, logname);

        // Restore defaults after an AB test is finished.
        // DO NOT remove test cleanup code too quickly, a user 
        // might not start the browser for a long time and 
        // get stuck in a test if we remove cases too early.
        switch(abtest) {
            case "1000_A":
                CLIQZ.Utils.setPref("logTiming", false);
                break;
        }
    },

}
