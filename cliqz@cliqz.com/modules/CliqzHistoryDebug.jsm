'use strict';

var EXPORTED_SYMBOLS = ['CliqzHistoryDebug'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/PlacesUtils.jsm')
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

var CliqzHistoryDebug = {
    getHistoryFirefox: function(searchTerm, callback){
        let history = new Array();
        this.SQL
            ._execute(
                PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
                "SELECT url, title, visit_count, typed, frecency, last_visit_date " +
                "FROM moz_places " +
                "WHERE url LIKE \"%"+searchTerm+"%\" OR title LIKE \"%"+searchTerm+"%\"",
                ["url", "title", "visit_count", "typed", "frecency", "last_visit_date"],
                function(result) {
                    try {
                        history.push(result);
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                callback(history);
            });
    },
    getHistoryCliqz: function(searchTerm, callback){
        let history = new Array();
        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        CliqzUtils.log("SELECT visits.url, title, sum(typed) as typed, " +
                "sum(link) as link, sum(result) as result, " +
                "sum(autocomplete) as autocomplete, sum(google) as google " +
                "FROM visits left join urltitles on visits.url=urltitles.url WHERE visits.url=urltitles.url " +
                "AND (visits.url LIKE \"%"+searchTerm+"%\" OR urltitles.title LIKE '%"+searchTerm+"%')" +
                "group by visits.url", "DEBUG");
        this.SQL
            ._execute(
                Services.storage.openDatabase(file),
                "SELECT visits.url, title, sum(typed) as typed, " +
                "sum(link) as link, sum(result) as result, " +
                "sum(autocomplete) as autocomplete, sum(google) as google, last_query " +
                "FROM visits left join urltitles on visits.url=urltitles.url " +
                "WHERE visits.url LIKE \"%"+searchTerm+"%\" OR urltitles.title LIKE '%"+searchTerm+"%' " +
                "group by visits.url",
                ["url", "title", "link", "typed", "result", "autocomplete", "google", "last_query"],
                function(result) {
                    try {
                        CliqzUtils.log(result.url, "DEBUG");
                        history.push(result);
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                callback(history);
            });
    },
    SQL: {
        _execute: function PIS__execute(conn, sql, columns, onRow) {
                var statement = conn.createAsyncStatement(sql),
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