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
                "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title, visits.result as result from visits "+
                
                "inner join ( " +
                    "select * from ("+
                    // Last visits of session
                        "select visits.last_query_date as last_query_date, max(visit_date), visits.last_query as last_query, urltitles.title as title, visits.url as url from visits "+
                        "inner join urltitles on visits.url = urltitles.url "+
                        "group by last_query_date "+
                    "UNION all "+
                    // First visits of session
                        "select visits.last_query_date as last_query_date, min(visit_date), visits.last_query as last_query, urltitles.title as title, visits.url as url from visits "+
                        "inner join urltitles on visits.url = urltitles.url "+
                        "group by last_query_date "+
                    ") as tmp where tmp.url like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or tmp.last_query like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' or tmp.title like '%"+CliqzHistoryPattern.escapeSQL(query)+"%' " +
                ") as minmax on visits.last_query_date = minmax.last_query_date "+

                "left outer join urltitles on urltitles.url = visits.url "+
                "order by visits.visit_date",

                ["sdate","query","url","vdate","title","result"],
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
                    if (result[CliqzHistoryPattern.pattern[key]['url']]) {
                        result[CliqzHistoryPattern.pattern[key]['url']]['cnt'] += CliqzHistoryPattern.pattern[key]['cnt']
                    } else if (CliqzHistoryPattern.pattern[key]["cnt"] > 1) {
                        result[CliqzHistoryPattern.pattern[key]['url']] = CliqzHistoryPattern.pattern[key];
                    };
                }
                
                if (CliqzHistoryPattern.maxDomainShare() < 0.5) {
                    callback(newResult);
                } else {
                    var newResult = new Array();
                    for (var key in result) {
                        newResult.push(result[key]);
                    }
                    callback( newResult.sort(CliqzHistoryPattern.sortPatterns(true,'cnt')) );
                }   
            });
    },
    maxDomainShare: function() {
        function parseUri (str) {
            var o   = parseUri.options,
                m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
                uri = {},
                i   = 14;

            while (i--) uri[o.key[i]] = m[i] || "";

            uri[o.q.name] = {};
            uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
                if ($1) uri[o.q.name][$1] = $2;
            });

            return uri;
        };

        parseUri.options = {
            strictMode: false,
            key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
            q:   {
                name:   "queryKey",
                parser: /(?:^|&)([^&=]*)=?([^&]*)/g
            },
            parser: {
                strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
                loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
            }
        };
        var domains = new Array();
        for(var key in CliqzHistoryPattern.data) {
            var session = CliqzHistoryPattern.data[key];
            var url = session[session.length - 1].url;
            var domain = (parseUri(url).host.match(/([^.]+)\.\w{2,3}(?:\.\w{2})?$/) || [])[1];
            if (!domains[domain]) {
                domains[domain] = 1;
            } else {
                domains[domain] += 1;
            }
        }
        var max = 0.0;
        var cnt = 0.0;
        for (key in domains) {
            cnt += domains[key];
            if (domains[key] > max) {
                max = domains[key];
            };
        }
        return max/cnt;
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

            if (session.length == 1 && session[i].result == true) {
                CliqzHistoryPattern.updatePattern(session[i], str);
            };

            for (var j=i+1; j<session.length; j++) {
                var end = CliqzHistoryPattern.simplifyUrl(session[j].url);
                if (!end) continue;
                str += " -> " + end; 

                if (start != end) {
                    CliqzHistoryPattern.updatePattern(session[j], str);
                }
            }
        }
        return session;
    },
    updatePattern: function(session, path) {
        if (!(path in CliqzHistoryPattern.pattern)) {
            CliqzHistoryPattern.pattern[path] = new Array();
            CliqzHistoryPattern.pattern[path]["url"] = session.url;
            CliqzHistoryPattern.pattern[path]["title"] = session.title;
            CliqzHistoryPattern.pattern[path]["path"] = path;
            CliqzHistoryPattern.pattern[path]["cnt"] = 1;
        } else {
            CliqzHistoryPattern.pattern[path]["cnt"] += 1;
        }
        
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
        // Bing
        } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) == 0) {
            var q = url.substring(url.indexOf("q=")).split("&")[0];
            if (q != "q=") {
                return "https://www.bing.com/search?" + q;
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