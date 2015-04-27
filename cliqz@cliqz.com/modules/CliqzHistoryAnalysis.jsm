'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryAnalysis'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

var CliqzHistoryAnalysis = {
  sessions: null,
  tmp: null,
  initData: function(callback) {
    CliqzHistoryAnalysis.sessions = [];
    CliqzHistory.SQL("select * from visits", function(r) {
      var visit = {
        url: r[2],
        query: r[4],
        visitDate: r[3],
      };
      var session = r[5];
      if(!CliqzHistoryAnalysis.sessions[session])
        CliqzHistoryAnalysis.sessions[session] = [];
      CliqzHistoryAnalysis.sessions[session].push(visit);
    }, function() {
      if(callback) callback();
    });
  },
  getRevisits: function() {
    var result = [];
    for(var sessionId in CliqzHistoryAnalysis.sessions) {
      var session = CliqzHistoryAnalysis.sessions[sessionId];
      var sessionUrls = [];
      for(var i=0; i<session.length; i++) {
        sessionUrls[session[i].url] = session[i].visitDate;
      }
      // Add to result
      for(var url in sessionUrls) {
        if(!result[url]) result[url] = [];
        result[url].push(sessionUrls[url]);
      }
    }
    return result;
  },
  analyseRevisits: function(uniqueUrls) {
    var data = CliqzHistoryAnalysis.getRevisits();
    var filtered = [];
    var urlCount = Object.keys(data).length;
    var sum = 0;
    for(var url in data) {
      if(data[url].length == uniqueUrls) {
        filtered[url] = data[url].sort();
        filtered[url].avgRevisit = CliqzHistoryAnalysis
          .getAvgRevisit(filtered[url]);
        sum += filtered[url].avgRevisit;
      }
    }
    var filteredUrlCount = Object.keys(filtered).length;
    var avg = sum/filteredUrlCount;
    CliqzUtils.log("Website visited exactly " + uniqueUrls + " times: " +
                    (filteredUrlCount / urlCount) * 100 + " %");
    CliqzUtils.log("Average time between visits: " +
                    avg/1000/60/60/24 + " days");

    // Standard Deviation
    sum = 0;
    for(var url in filtered) {
      sum += (avg-filtered[url].avgRevisit)*(avg-filtered[url].avgRevisit);
    }
    var dev = Math.sqrt(sum/filteredUrlCount);
    CliqzUtils.log("Standard deviation: " + dev/1000/60/60/24 + " days");

  },
  getAvgRevisit: function(urlData) {
    var lastVisit = urlData[0];
    var sum = 0;
    for(var i=1; i<urlData.length; i++) {
      var visitDate = urlData[i];
      sum += visitDate - lastVisit;
      lastVisit = visitDate;
    }
    if(sum) return sum / (urlData.length - 1);
    else    return 0;
  }
};
