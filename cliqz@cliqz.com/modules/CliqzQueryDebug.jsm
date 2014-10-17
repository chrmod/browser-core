'use strict';
var EXPORTED_SYMBOLS = ['CliqzQueryDebug'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzQueryDebug = CliqzQueryDebug || {
    
    cliqzResults: null,
    historyResults: null,
    mixedResults: null,

    counts: function() {
        return ("cliqz: " + CliqzQueryDebug.cliqzResults.length + 
               " history: " + CliqzQueryDebug.historyResults.matchCount + 
               " mixed: " + CliqzQueryDebug.mixedResults.matchCount)
    },
}
