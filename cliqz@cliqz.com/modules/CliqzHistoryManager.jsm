'use strict';
/*
 * This module measures statistical data about users history
 *
 */

var EXPORTED_SYMBOLS = ['CliqzHistoryManager'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/PlacesUtils.jsm')
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzHistoryManager = {
    getStats: function(callback){
        let historysize = 0;
        let daysVisited = {};
        let visitedDomainOn = {};
        let visitedSubDomain = {};
        let today = CliqzUtils.getDay();
        let history = today;

        this.PlacesInterestsStorage
            ._execute(
                "SELECT count(*) cnt, MIN(v.visit_date) first " +
                "FROM moz_historyvisits v " +
                "JOIN moz_places h " +
                "ON h.id = v.place_id " +
                "WHERE h.hidden = 0 AND h.visit_count > 0 ",
                ["cnt", "first"],
                function(result) {
                    try {
                        history = Math.floor(result.first / 86400000000);
                        historysize = result.cnt;
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                if(CliqzUtils){
                    callback({
                        size: historysize,
                        days: CliqzUtils.getDay() - history
                    });
                }
            });
    },
	PlacesInterestsStorage: {
        _execute: function PIS__execute(sql, columns, onRow) {
            var conn = PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
                statement = conn.createAsyncStatement(sql),
                onThen, //called after the async operation is finalized
                promiseMock = {
                    then: function(func){
                        onThen = func;
                    }
                };

            statement.executeAsync({
                handleCompletion: function(reason)  {
                  onThen();
                },

                handleError: function(error)  {
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
                      // For multiple columns, put as values on an object
                      else {
                        result = {};
                        for(var i=0; i<columns.length; i++){
                            var column = columns[i];
                            result[column] = row.getResultByName(column);
                        }
                      }
                    }
                    //pass the result to the onRow handler
                    onRow(result);
                  }
                }
            });
            return promiseMock;
        }
    }
};