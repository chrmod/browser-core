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
                /* Select First and last url of Session
                'select max.last_query_date, max.url, titles_max.title, min.url, titles_min.title, max.last_query, max.cnt '+ 
                'from (select last_query, last_query_date, url, count(*) as cnt, min(visit_date) from visits group by last_query_date having count(*)>1) as max '+
                'inner join (select last_query_date, url,  max(visit_date) from visits group by last_query_date having count(*)>1) as min '+ 
                'on max.last_query_date = min.last_query_date '+ 
                'inner join urltitles as titles_max on max.url == titles_max.url inner join urltitles as titles_min '+ 
                'on min.url == titles_min.url '+
                'where (min.url like "%QUERY%" or max.url like "%QUERY%" or titles_max.title like "%QUERY%" or titles_min.title like "%QUERY%" or max.last_query like "%QUERY%") '+
                'and min.url != max.url;',*/
                "select max.last_query_date as sdate, max.last_query as query, max.cnt as cnt, rest.url as url, rest.visit_date as vdate, titles.title as title from "+ 
                "(select last_query, last_query_date, url, count(*) as cnt, max(visit_date) from visits "+  
                "group by last_query_date having count(*)>1) as max "+ 
                "inner join (select url,last_query_date,visit_date from visits order by visit_date) as rest on max.last_query_date = rest.last_query_date "+ 
                "inner join urltitles as titles on rest.url = titles.url ", 
                //"where (rest.url like '%"+query+"%' or titles.title like '%"+query+"%' or max.last_query like '%"+query+"%')",
                ["sdate","query","cnt","url","vdate","title"],
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
                var filteredResults = new Array();
                for (var key in CliqzHistoryPattern.data) {
                    if(CliqzHistoryPattern.queryMatch(CliqzHistoryPattern.data[key], query)) {
                        filteredResults[key] = CliqzHistoryPattern.data[key];
                        CliqzHistoryPattern.mutateSession(filteredResults[key]);
                    }
                };
                CliqzHistoryPattern.data = filteredResults;
                // Return
                var result = new Array();
                for (key in CliqzHistoryPattern.pattern) {
                    if (CliqzHistoryPattern.pattern[key]["cnt"] > 1) {
                        //CliqzUtils.log(key + ": " + CliqzHistoryPattern.pattern[key]["cnt"], "DEBUG");
                        result.push(CliqzHistoryPattern.pattern[key]);
                    };
                }
                callback( result.sort(CliqzHistoryPattern.sortPatterns(null,'cnt')).reverse() );
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
            var str = session[i].url;
            for (var j=i+1; j<session.length; j++) {
                str += " -> " + session[j].url;
                if (!(str in CliqzHistoryPattern.pattern)) {
                    CliqzHistoryPattern.pattern[str] = new Array();
                    CliqzHistoryPattern.pattern[str]["url"] = session[j].url;
                    CliqzHistoryPattern.pattern[str]["title"] = session[j].title;
                    CliqzHistoryPattern.pattern[str]["path"] = str;
                    CliqzHistoryPattern.pattern[str]["cnt"] = 1;
                } else {
                    CliqzHistoryPattern.pattern[str]["cnt"] += 1;
                }
            }
        }
        return session;
    },
    shrinkUrl: function(url) {
        if (url.indexOf('#') != -1) {
            url = url.substring(0, url.indexOf('#'));
        };
        if (url.indexOf('?') != -1) {
            url = url.substring(0, url.indexOf('?'));
        };
        return url;
    },
    queryMatch: function (session,query) {
        var first, last;
        for (var key in session) {
            if(!first) {
                first = session[key];
            }
            last = session[key];
        }

        if (first.query.indexOf(query)==-1 && first.url.indexOf(query)==-1 && first.title.indexOf(query)==-1 &&
            last.query.indexOf(query)==-1 && last.url.indexOf(query)==-1 && last.title.indexOf(query)==-1) {
            return false;
        };
        return true;
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