'use strict';
/*
 * This module handles Bundesliga results
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzBundesliga'];

var CliqzBundesliga = {
    unixTimeToLocal: function (unix_time) {
      var time = new Date(unix_time * 1000);
      return time.toLocaleTimeString().substring(0,5);
    },
    groupMatchesByTime: function (matches) {
      var results = {};
      for(var i=0; i < matches.length; i++) {
        var match = matches[i],
            time = CliqzBundesliga.unixTimeToLocal(match.kickoff);

        results[time] = results[time] ? [match].concat(results[time]) : [match];
      }
      return results;
    },
    generateResults: function (json_response) {
      var results = json_response.results;
      return Result.generic(Result.CLIQZB, "", null, "", "", null,
          {
              hide_results_1st: results.gbl1.length ? false : true,
              results_1st: CliqzBundesliga.groupMatchesByTime(results.gbl1),
              hide_results_2nd: results.gbl2.length ? false : true,
              results_2nd: CliqzBundesliga.groupMatchesByTime(results.gbl2)
          });
    },
    get: function(q, callback){
        var BUNDESLIGA_API =  'http://cliqz-sports-machine-694310630.us-east-1.elb.amazonaws.com/api/v1/results';
        CliqzUtils.httpHandler('GET', BUNDESLIGA_API, function (res) {
            var json_response = JSON.parse(res.response);
            var result = CliqzBundesliga.generateResults(json_response);
            callback([result], q);

            CliqzUtils.log(JSON.stringify(json_response), 'BUNDESLIGA');
        });
    },
    isBundesligaSearch: function(q){
        return /liveticker|bundesliga|ergebnis|fu\u00DFball|fussball|liga|topspiel|spieltag|kellerduell|ergebnisse/i.test(q)
    }
}
