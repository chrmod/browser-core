'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzHistoryPattern = {
    data: null,
    pattern: null,
    detectPattern: function(query, callback) {
        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        CliqzHistoryPattern.data = new Array();
        CliqzHistoryPattern.pattern = new Array();
        this.SQL
            ._execute(
                Services.storage.openDatabase(file),
                // This statement checks for a pattern match in the first and last query of a session and returns the whole session
                "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits "+
                
                "inner join ( "+
                // Last visits of session
                "select visits.last_query_date as last_query_date, max(visit_date) from visits inner join urltitles on visits.url = urltitles.url "+
                "where visits.url like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or visits.last_query like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or urltitles.title like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' "+
                "group by last_query_date having count(*)>1 "+
                "UNION all "+
                // First visits of session
                "select visits.last_query_date as last_query_date, min(visit_date) from visits inner join urltitles on visits.url = urltitles.url "+
                "where visits.url like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or visits.last_query like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or urltitles.title like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' "+
                "group by last_query_date having count(*)>1 "+
                ") as minmax on visits.last_query_date = minmax.last_query_date "+

                "inner join urltitles on urltitles.url = visits.url "+
                "order by visits.visit_date",
                ["sdate","query","url","vdate","title"],
                function(result) {
                    try {
                        if (!CliqzHistoryPattern.data[result.sdate]) {
                            CliqzHistoryPattern.data[result.sdate] = new Array();
                        };
                        CliqzHistoryPattern.data[result.sdate].push(result);
                    }
                    catch(ex) {}
                }
            )
            .then(function() {
                // Detect patterns
                for (var key in CliqzHistoryPattern.data) {
                    CliqzHistoryPattern.mutateSession(CliqzHistoryPattern.data[key]);
                }
                // Return
                var result = new Array();
                for (key in CliqzHistoryPattern.pattern) {
                    if (processed[CliqzHistoryPattern.pattern[key]['url']]) {

                    } else if (CliqzHistoryPattern.pattern[key]["cnt"] > 1) {
                        result[CliqzHistoryPattern.pattern[key]['url']] = CliqzHistoryPattern.pattern[key];
                    };
                }
                callback( result.sort(CliqzHistoryPattern.sortPatterns(true,'cnt')) );
            });
    },
    sortPatterns: function (desc,key) {
         return function(a,b){
           return desc ? ~~(key ? a[key]<b[key] : a < b) 
                       : ~~(key ? a[key] > b[key] : a > b);
          };
    },
    mutateSession: function (session) {
        for (var i=0; i<session.length; i++) {
            var start = CliqzHistoryPattern.simplifyUrl(session[i].url);
            if (!start) continue;
            var str = start;

            for (var j=i+1; j<session.length; j++) {
                var end = CliqzHistoryPattern.simplifyUrl(session[j].url);
                if (!end) continue;
                str += " -> " + end; 

                if (!(str in CliqzHistoryPattern.pattern) && start != end) {
                    CliqzHistoryPattern.pattern[str] = new Array();
                    CliqzHistoryPattern.pattern[str]["url"] = session[j].url;
                    CliqzHistoryPattern.pattern[str]["title"] = session[j].title;
                    CliqzHistoryPattern.pattern[str]["path"] = str;
                    CliqzHistoryPattern.pattern[str]["cnt"] = 1;
                } else if (start != end) {
                    CliqzHistoryPattern.pattern[str]["cnt"] += 1;
                }
            }
        }
        return session;
    },
    simplifyUrl: function(url) {
        // Ignore Google redirect urls
        if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) == 0) {
            return null;

        // Remove clutter from Google searches
        } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) == 0) {
            var q = url.substring(url.indexOf("q=")).split("&")[0];
            if (q != "q=") {
                return "https://www.google.com/search?" + q;
            } else {
                return url;
            }

        // Do Nothing if no patterns matched
        } else {
            return url;
        }
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
    },
    escapeSQL: function(str) {
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "'": 
                return "''";
            default:
                return char;
            /*case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; */
            }
        });
    }
}