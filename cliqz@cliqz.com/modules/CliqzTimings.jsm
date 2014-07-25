'use strict';
var EXPORTED_SYMBOLS = ['CliqzTimings'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.00');

var CliqzTimings = CliqzTimings || {
    timings: {},
    enabled: false,
    init: function() {
        if(CliqzUtils.cliqzPrefs.prefHasUserValue('logTimings') &&
           CliqzUtils.cliqzPrefs.getBoolPref('logTimings')) {
            CliqzTimings.enabled = true;
            CliqzUtils.log("timings enabled", "CliqzTimings")
        }
    },
	add: function(name, time_ms) {
        if(CliqzTimings.enabled) {
            if(!CliqzTimings.timings[name])
                CliqzTimings.timings[name] = [];
            CliqzTimings.timings[name].push(time_ms);
        }
    },
    reset: function(name) {
        if(CliqzTimings.timings[name])
            CliqzTimings.timings[name] = [];
    },
    get_counts: function(name, max) {
        var num_buckets = 10;
        var bucket_size = max / num_buckets;

        var buckets = {}

        for(var i=0; i<=num_buckets; i++)
            buckets[i*bucket_size] = 0;

        if(CliqzTimings.timings[name]) {
            for(var i in CliqzTimings.timings[name]) {
                var value = CliqzTimings.timings[name][i]
                var b = Math.floor(value / bucket_size) * bucket_size;
                if( value > max )
                    buckets[max]++;
                else
                    buckets[b]++;
            }
        }

        return buckets;
    },
    send_log: function(name, max) {
        if(CliqzTimings.enabled && CliqzTimings.timings[name] && CliqzTimings.timings[name].length) {
            var log = {
                type: 'timing',
                name: name,
                histogram: CliqzTimings.get_counts(name, max)
            };
            CliqzUtils.log((CliqzTimings.timings[name]).join(","), "CliqzTimings " + name)
            CliqzUtils.track(log);

            CliqzTimings.reset(name);
        }
    }
}
