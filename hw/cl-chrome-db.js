var __CliqzChromeDB = function() { // (_export) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            CliqzChromeDB = {
                VERSION: '0.1',
                set: function(db, key, obj, callback) {
                    var dbKey = db+':'+key;
                    chrome.storage.local.set({dbKey : obj}, callback);
                },
                get: function(db, keyValueOrFunction, callback) {

                    if (typeof keyValueOrFunction === 'function') {

                        chrome.storage.local.get(null, function(items) {
                            var results = [];
                            Object.keys(items).forEach( function(lab) {
                                if (lab.startswith(db)) {
                                    if (keyValueOrFunction(items[lab])) results.push(items[lab]);
                                }
                            });
                            callback(results);
                        });

                    }
                    else {
                        var dbKey = db+':'+keyValueOrFunction;
                        chrome.storage.local.get(dbKey, function(items) {
                            callback(items[keyValueOrFunction]);
                        });
                    }
                },
                remove: function(db, keyValueOrFunction, callback) {

                    if (typeof keyValueOrFunction === 'function') {

                        chrome.storage.local.get(null, function(items) {
                            var resultsToBeRemoved = [];
                            Object.keys(items).forEach( function(lab) {
                                if (lab.startswith(db)) {
                                    if (keyValueOrFunction(items[lab])) {
                                        var dbKey = db+':'+lab;
                                        resultsToBeRemoved.push(dbKey);
                                    }
                                }
                            });

                            chrome.storage.local.remove(resultsToBeRemoved, callback)
                        });

                    }
                    else {
                        var dbKey = db+':'+keyValueOrFunction;
                        chrome.storage.local.remove(dbKey, callback);
                    }
                },
                __test: function() {



                }


            }

            return CliqzChromeDB;
        }
    }
};