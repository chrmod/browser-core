'use strict';
var EXPORTED_SYMBOLS = ['CliqzStats'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var STATS_KEY = 'stats',
    QUERIES = 'q',
    CLIQZ = 'c';

var db_wrapper = function(func) {
    return function(){
        var db = getPersistent(),
        day = CliqzUtils.getDay();

        // call the original method
        var args = Array.prototype.slice.call(arguments)[0];
        var ret = func(db, day, args);

        setPersistent(db);

        return ret;
    }
};

var CliqzStats = {
    get: db_wrapper(function(db){
        return db;
    }),
    //add a query
    query: db_wrapper(function(db, day){
        db[day] = db[day] || {};
        db[day][QUERIES] = (db[day][QUERIES] || 0) + 1;
    }),
    //add a cliqz landing
    cliqz: db_wrapper(function(db, day){
        db[day] = db[day] || {};
        db[day][CLIQZ] = (db[day][CLIQZ] || 0) + 1;
    }),
    cliqzResultsNum: db_wrapper(function(db, day, n){
        //TODO
    })
}


function getPersistent(){
    return JSON.parse(CliqzUtils.getPref(STATS_KEY, '{}'));
}

function setPersistent(val){
    CliqzUtils.setPref(STATS_KEY, JSON.stringify(val));
}