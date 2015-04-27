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
  initData: function(callback, useQuery) {
    CliqzHistoryAnalysis.sessions = [];
    CliqzHistory.SQL("select * from visits", function(r) {
      var visit = {
        url: !useQuery ? r[2] : r[4],
        visitDate: r[3]
      };
      var session = r[5];
      if (!CliqzHistoryAnalysis.sessions[session])
        CliqzHistoryAnalysis.sessions[session] = [];
      CliqzHistoryAnalysis.sessions[session].push(visit);
    }, function() {
      if (callback) callback();
    });
  },
  getRevisits: function() {
    var result = [];
    for (var sessionId in CliqzHistoryAnalysis.sessions) {
      var session = CliqzHistoryAnalysis.sessions[sessionId];
      var sessionUrls = [];
      for (var i = 0; i < session.length; i++) {
        if (!sessionUrls[session[i].url]) {
          // Use earliest occurence of url
          sessionUrls[session[i].url] = {};
          sessionUrls[session[i].url].visitDate = session[i].visitDate;
          sessionUrls[session[i].url].sessionStart = sessionId;
          sessionUrls[session[i].url].depth = i;
        }
      }
      // Add to result
      for (var url in sessionUrls) {
        if (!result[url]) result[url] = [];
        result[url].push(sessionUrls[url]);
      }
    }
    return result;
  },
  analyseRevisits: function(uniqueUrls) {
    var result = {};
    var data = CliqzHistoryAnalysis.getRevisits();
    var filtered = [];
    var urlCount = Object.keys(data).length;
    var sum = 0;
    // Filter
    for (var url in data) {
      if (data[url].length == uniqueUrls) {
        filtered[url] = data[url]
          .sort(CliqzHistoryAnalysis.sortVisits(false, "visitDate"));
        filtered[url].avgRevisit = CliqzHistoryAnalysis
          .getAvgRevisit(filtered[url]);
        sum += filtered[url].avgRevisit;
      }
    }
    CliqzHistory.test = filtered;
    // Average
    var filteredUrlCount = Object.keys(filtered).length;
    var avg = sum / filteredUrlCount;
    result.uniqueUrls = uniqueUrls;
    result.sharePercentage = ((filteredUrlCount / urlCount) * 100).toFixed(2);
    result.avgRevisitInDays = (avg / 1000 / 60 / 60 / 24).toFixed(2);

    // Standard Deviation
    sum = 0;
    for (var url in filtered) {
      sum += (avg - filtered[url].avgRevisit) * (avg - filtered[url].avgRevisit);
    }
    var dev = Math.sqrt(sum / filteredUrlCount);
    result.deviationInDays = (dev / 1000 / 60 / 60 / 24).toFixed(2);

    // Mean
    var arr = [];
    for (var key in filtered) arr.push(filtered[key]);
    var sorted = arr.sort(CliqzHistoryAnalysis.sortVisits(false, "avgRevisit"));
    var mean = sorted[parseInt(sorted.length / 2)].avgRevisit;
    result.meanRevisitationInDays = (mean / 1000 / 60 / 60 / 24).toFixed(2);

    // Calculate average time for revisitation
    var tmp = [];
    sum = 0;
    if(uniqueUrls >= 2) {
      for (var url in filtered) {
        var firstVisit = filtered[url][0].visitDate -
          filtered[url][0].sessionStart;
        var lastIndex = filtered[url].length - 1;
        var lastVisit = filtered[url][lastIndex].visitDate -
          filtered[url][lastIndex].sessionStart;
        tmp.push(lastVisit-firstVisit);
        sum += (lastVisit-firstVisit);
      }
    }
    if(tmp.length > 0) {
      tmp = tmp.sort(CliqzHistoryAnalysis.sortNumber);
      result.meanRevisitationDiffInSec = (tmp[parseInt(tmp.length/2)]/1000).toFixed(2);
      result.avgRevisitationDiffInSec = ((sum/filteredUrlCount)/1000).toFixed(2);
    }

    // Depth comparison
    tmp = [];
    sum = 0;
    if(uniqueUrls >= 2) {
      for (var url in filtered) {
        var firstVisit = filtered[url][0].depth;
        var lastIndex = filtered[url].length - 1;
        var lastVisit = filtered[url][lastIndex].depth;
        tmp.push(lastVisit-firstVisit);
        sum += (lastVisit-firstVisit);
      }
    }
    if(tmp.length > 0) {
      tmp = tmp.sort(CliqzHistoryAnalysis.sortNumber);
      result.meanDepthDiff =  tmp[parseInt(tmp.length/2)].toFixed(2);
      result.avgDepthDiff = (sum/filteredUrlCount).toFixed(2);
    }
    CliqzUtils.log(JSON.stringify(result));

  },
  sortVisits: function(desc, key) {
    return function(a, b) {
      return desc ? ~~(key ? a[key] < b[key] : a < b) : ~~(key ? a[key] > b[key] : a > b);
    };
  },
  sortNumber: function(a,b) {
    return a - b;
  },
  getAvgRevisit: function(urlData) {
    var lastVisit = urlData[0].visitDate;
    var sum = 0;
    for (var i = 1; i < urlData.length; i++) {
      var visitDate = urlData[i].visitDate;
      sum += visitDate - lastVisit;
      lastVisit = visitDate;
    }
    if (sum) return sum / (urlData.length - 1);
    else return 0;
  }
};
