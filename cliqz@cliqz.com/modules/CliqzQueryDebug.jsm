'use strict';
var EXPORTED_SYMBOLS = ['CliqzQueryDebug'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzQueryDebug = CliqzQueryDebug || {
    
    results: [],
    MAX_PREV: 20,

    recordResults: function(query, cliqz, history, mixed) {
        CliqzUtils.log("xxxxx");
        var r = {
            'query': query,
            'cliqz': cliqz,
            'history': history,
            'mixed': mixed
        };

        CliqzQueryDebug.results.unshift(r);
        CliqzQueryDebug.results = CliqzQueryDebug.results.slice(0, CliqzQueryDebug.MAX_PREV);
    },
}
