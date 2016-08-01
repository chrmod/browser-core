var __CliqzUtils = function() { // (_export) {
    "use strict";

    return {
        setters: [],
        execute: function () {
            CliqzUtils = {
                VERSION: '0.1',
                log: function(msg, key) {
                    console.log(msg, key);
                },
                getPref: function(label, defaultValue) {
                    //  CliqzUtils.getPref('config_ts', null);
                    //  CliqzUtils.getPref('config_location', null);
                    //  CliqzUtils.getPref('config_activeUsage', null);
                    switch (label)
                    {
                        case "config_ts":
                            defaultValue = "20160727";
                            break;
                        default:
                            defaultValue;
                            break;
                    }
                    return defaultValue;
                },
                setPref: function(label, value) {

                },
                httpGet: function() {

                },
                setTimeout: function(callback, time, args) {

                },
                clearTimeout: function(id) {

                },
                setInterval: function(callback, time) {

                },
                getWindow: function() {
                    // perhaps not needed, see the use-cases,


                },
                promiseHttpHandler: function() {
                    //('POST', CliqzUtils.SAFE_BROWSING, data, 60000, true);
                },
                cloneObject: function(obj) {
                    if (obj === null || typeof obj !== 'object') return obj;
                    var temp = obj.constructor();
                    for (var key in obj) {
                        temp[key] = CliqzUtils.cloneObject(obj[key]);
                    }
                    return temp;
                },

            }

            return CliqzUtils;
        }
    }
};