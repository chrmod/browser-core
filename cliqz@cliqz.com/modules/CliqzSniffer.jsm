'use strict';
/*
 * This module listens to the http traffic
 */

Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
                                  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var EXPORTED_SYMBOLS = ['CliqzSniffer'];

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;

var CliqzSniffer = {
    activityDistributor: Components.classes["@mozilla.org/network/http-activity-distributor;1"]
        .getService(Components.interfaces.nsIHttpActivityDistributor),

    httpObserver: {
        // check the non 2xx page and report if this is one of the cliqz result
        observeActivity: function(aHttpChannel, aActivityType, aActivitySubtype, aTimestamp, aExtraSizeData, aExtraStringData) {
            if (aActivityType == nsIAO.ACTIVITY_TYPE_HTTP_TRANSACTION && aActivitySubtype == nsIAO.ACTIVITY_SUBTYPE_RESPONSE_HEADER) {
                var aChannel = aHttpChannel.QueryInterface(nsIHttpChannel);
                var res = {url: aChannel.URI.spec,
                           status: aExtraStringData.split(" ")[1]}
                if (Math.floor(res.status / 100) !=  2) {
                    // CliqzUtils.log(JSON.stringify(res), "httpData")
                    // Now that we see a 404, let's compare to the cliqz results we provided
                    for (var i=0;
                        CliqzAutocomplete.lastResult &&
                        i < CliqzAutocomplete.lastResult._results.length;
                        i++) {
                        var r = CliqzAutocomplete.lastResult._results[i];
                        if (res.url == r.val) {
                            var action = {
                                type: "performance",
                                action: "response",
                                response_code: res.status,
                                result_type: CliqzUtils.encodeResultType(r.style || r.type),
                                version: 1
                            }
                            CliqzUtils.track(action);
                        }
                    }
                }
            }
        }
    },
    addHttpObserver: function() {
        CliqzSniffer.activityDistributor.addObserver(CliqzSniffer.httpObserver);
    },
    removeHttpObserver: function() {
        CliqzSniffer.activityDistributor.removeObserver(CliqzSniffer.httpObserver);
    },
    destroy: function() {
        CliqzSniffer.removeHttpObserver();
    }
}
