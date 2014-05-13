'use strict';

var EXPORTED_SYMBOLS = ['HistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/PlacesUtils.jsm")
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZ',
  'chrome://cliqz/content/utils.js');


XPCOMUtils.defineLazyModuleGetter(this, 'Promise',
  'chrome://cliqzmodules/content/extern/Promise.jsm');

var HistoryManager = {
	_db: null,
    getStats: function(callback){
        let historysize = 0;
        let daysVisited = {};
        let visitedDomainOn = {};
        let visitedSubDomain = {};
        let today = CLIQZ.Utils.getDay();
        let history = today;

        this.PlacesInterestsStorage
            ._execute(
                //"SELECT rev_host, v.visit_date / 86400000000 day, url " +
                "SELECT count(*) cnt, MIN(v.visit_date) first " +
                "FROM moz_historyvisits v " +
                "JOIN moz_places h " +
                "ON h.id = v.place_id " +
                "WHERE h.hidden = 0 AND h.visit_count > 0 ",
                {
                    //columns: ["rev_host", "day", "url"],
                    //onRow: function({rev_host, day, url}) {
                    columns: ["cnt", "first"],
                    onRow: function({cnt, first}) {
                    try {
                        history = Math.floor(first / 86400000000);
                        historysize = cnt;
                        /*
                        let host = rev_host.slice(0, -1).split("").reverse().join("");
                        let base = host;
                        historysize = historysize + 1;
                        if (day < history) {
                            history= day;
                        }

                        base = base.replace("www.", "");
                        //let base = Services.eTLD.getBaseDomainFromHost(host);
                        var m = url.split("/");
                        let m2 = "";
                        if (m.length > 4) {
                          m2 = m[3];
                        }
                        visitedDomainOn[base] = visitedDomainOn[base] || {};
                        visitedDomainOn[base][day] = true;
                        if (m2 != "") {
                            visitedSubDomain[base+"/"+m2+"/"] = visitedSubDomain[base+"/"+m2+"/"] || {};
                            visitedSubDomain[base+"/"+m2+"/"][day] = true;
                        }
                        */
                      }
                      catch(ex) {}
                    }
                }
            )
            .then(function() {
                Object.keys(visitedDomainOn).forEach(function(key){
                    //daysVisited[key] = Object.keys(visitedDomainOn[key]).length;
                });
                Object.keys(visitedSubDomain).forEach(function(key) {
                    //daysVisited[key] = Object.keys(visitedSubDomain[key]).length;
                });
            })
            .then(function() {
                callback({
                    size: historysize,
                    //daysVisited: daysVisited,
                    //visitedDomainOn: visitedDomainOn,
                    //visitedSubDomain: visitedSubDomain,
                    days: CLIQZ.Utils.getDay() - history
                });
            });
    },
	PlacesInterestsStorage: {
        _execute: function PIS__execute(sql, optional={}) {
            let {columns, key, listParams, onRow, params} = optional;

            // Convert listParams into params and the desired number of identifiers
            if (listParams != null) {
                params = params || {};
                Object.keys(listParams).forEach(function(listName) {
                  let listIdentifiers = [];
                  for (let i = 0; i < listParams[listName].length; i++) {
                    let paramName = listName + i;
                    params[paramName] = listParams[listName][i];
                    listIdentifiers.push(":" + paramName);
                  }

                  // Replace the list placeholders with comma-separated identifiers
                  sql = sql.replace(":" + listName, listIdentifiers, "g");
                });
            }

            // Initialize the statement cache and the callback to clean it up
            if (this._cachedStatements == null) {
                this._cachedStatements = {};
                PlacesUtils.registerShutdownFunction(function() {
                  Object.keys(this._cachedStatements).forEach(function(key)  {
                    this._cachedStatements[key].finalize();
                  });
                });
            }

            // Use a cached version of the statement if handy; otherwise created it
            let statement = this._cachedStatements[sql];
            if (statement == null) {
                this._db = this._db || PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
                statement = this._db.createAsyncStatement(sql);
                this._cachedStatements[sql] = statement;
            }

            // Bind params if we have any
            if (params != null) {
                Object.keys(params).forEach(function(param)  {
                  statement.bindByName(param, params[param]);
                });
            }

            // Determine the type of result as nothing, a keyed object or array of columns
            let results;
            if (onRow != null) {}
            else if (key != null) {
                results = {};
            }
            else if (columns != null) {
                results = [];
            }

            // Execute the statement and update the promise accordingly
            let deferred = Promise.defer();
            statement.executeAsync({
                handleCompletion: function(reason)  {
                  deferred.resolve(results);
                },

                handleError: function(error)  {
                  deferred.reject(new Error(error.message));
                },

                handleResult: function(resultSet)  {
                  let row;
                  while (row = resultSet.getNextRow()) {
                    // Read out the desired columns from the row into an object
                    let result;
                    if (columns != null) {
                      // For just a single column, make the result that column
                      if (columns.length == 1) {
                        result = row.getResultByName(columns[0]);
                      }
                      // For multiple columns, put as valyes on an object
                      else {
                        result = {};
                        columns.forEach(function(column) {
                          result[column] = row.getResultByName(column);
                        });
                      }
                    }

                    // Give the packaged result to the handler
                    if (onRow != null) {
                      onRow(result);
                    }
                    // Store the result keyed on the result key
                    else if (key != null) {
                      results[row.getResultByName(key)] = result;
                    }
                    // Append the result in order
                    else if (columns != null) {
                      results.push(result);
                    }
                  }
                }
            });

            return deferred.promise;
        }
    }
};
