'use strict';
var EXPORTED_SYMBOLS = ['CliqzStats'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var STATS_KEY = 'stats',
    QUERIES = 'q',
    SELECTED = 'c',
    R_TOT = 'rTot',
    G_TOT = 'gTot',
    R_NUM = 'rSamples';

var db_wrapper = function(func) {
    return function(){
        var db = getPersistent(),
        day = CliqzUtils.getDay();

        // call the original method
        var args = [db, day].concat(Array.prototype.slice.call(arguments));
        var ret = func.apply(null, args);

        setPersistent(db);

        return ret;
    }
};

var CliqzStats = {
    get: db_wrapper(function(db, day){
        return {
            stats: computeLastWeek(db, day),
            db: db
        }
    }),
    //add a query
    query: db_wrapper(function(db, day){
        db[day] = db[day] || {};
        db[day][QUERIES] = (db[day][QUERIES] || 0) + 1;
    }),
    //click or enter on an actual result
    resultSelected: db_wrapper(function(db, day){
        db[day] = db[day] || {};
        db[day][SELECTED] = (db[day][SELECTED] || 0) + 1;
    }),
    resultsNum: db_wrapper(function(db, day, n, qLen){
        db[day] = db[day] || {};
        db[day][R_TOT] = (db[day][R_TOT] || 0) + n;
        db[day][R_NUM] = (db[day][R_NUM] || 0) + 1;
        db[day][G_TOT] = (db[day][G_TOT] || 0) + aproximateResultNum(qLen);
    })
}

function computeLastWeek(db, day){
    var summary = {
        searches     : 0,
        results      : 0,
        results_TOT  : 0,
        resultsNUM   : 0,
        resultsG_TOT : 0,
        resultsAvg   : 0,
        aproxAvg     : 0,
        adsTot       : 0,
        timeTot      : 0
    }
    for(var i=day; i>day-7; i--){
        var d = db[i];
        if(!d)continue;
        summary.searches += db[i][QUERIES] || 0;
        summary.results  += db[i][SELECTED] || 0;
        summary.results_TOT += db[i][R_TOT] || 0;
        summary.resultsNUM += db[i][R_NUM] || 0;
        summary.resultsG_TOT += db[i][G_TOT] || 0;
    }

    summary.resultsNUM = summary.resultsNUM || 1;
    summary.resultsAvg = parseInt(summary.results_TOT / summary.resultsNUM);
    summary.aproxAvg   = parseInt(summary.resultsG_TOT / summary.resultsNUM);
    summary.adsTot   = parseInt(summary.searches * 7);
    summary.timeTot   = (summary.searches * 3.5 / 60).toFixed(2);

    return summary;
}

function aproximateResultNum(len){
    return parseInt(Math.random() * 1e8 / Math.pow(len,3)) + parseInt(Math.random()*1e6);
}

function getPersistent(){
    return JSON.parse(CliqzUtils.getPref(STATS_KEY, '{}'));
}

function setPersistent(val){
    CliqzUtils.setPref(STATS_KEY, JSON.stringify(val));
}