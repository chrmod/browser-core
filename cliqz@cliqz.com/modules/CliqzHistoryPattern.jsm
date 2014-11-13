'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

var CliqzHistoryPattern = {
    data: null,
    pattern: null,
    detectPattern: function(query, callback) {
        // Ignore one character queries
        if (query.length < 2 || query.indexOf("://") != -1 || ("www.").indexOf(query) != -1) {
            return
        };


        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        this.data = new Array();
        this.pattern = new Array();
        this.SQL
            ._execute(
                Services.storage.openDatabase(file),
                /*
                // This statement checks for a pattern match in the first and last query of a session and returns the whole session
                "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits "+
                
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
                    ") as tmp where tmp.url like '%"+this.escapeSQL(query)+"%' or tmp.last_query like '%"+this.escapeSQL(query)+"%' or tmp.title like '%"+this.escapeSQL(query)+"%' " +
                ") as minmax on visits.last_query_date = minmax.last_query_date "+

                "left outer join urltitles on urltitles.url = visits.url "+
                "order by visits.visit_date",*/
                "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits "+ 
                "inner join ( "+
                    "select visits.last_query_date from visits, urltitles where visits.url = urltitles.url and "+
                    "(visits.url like '%"+this.escapeSQL(query)+"%' or visits.last_query like '%"+this.escapeSQL(query)+"%' or urltitles.title like '%"+this.escapeSQL(query)+"%') "+
                    "group by visits.last_query_date "+
                ") as matches  "+
                "on visits.last_query_date = matches.last_query_date "+
                "left outer join urltitles on urltitles.url = visits.url order by visits.visit_date",

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

                // Group patterns with same end url
                var groupedPatterns = new Array();
                for (key in CliqzHistoryPattern.pattern) {
                    var cur = CliqzHistoryPattern.pattern[key];
                    var url = cur['url'].replace("https://", "http://");
                    var pat = groupedPatterns[url];
                    if (pat && cur["cnt"] > 1) {
                        pat['cnt'] += cur['cnt'];
                        pat['query'] = pat['query'].concat(cur['query']);
                    } else if (cur["cnt"] > 1) {
                        groupedPatterns[url] = cur;
                    };
                }

                // Filter patterns with end url that doesn't match query
                var filteredPatterns = CliqzHistoryPattern.filterPatterns(groupedPatterns,query).sort(CliqzHistoryPattern.sortPatterns(true,'cnt'));

                // Apply user preferences (ignored suggestions)
                var userPref = CliqzHistoryPattern.applyUserPref(filteredPatterns[0], query);
                if (userPref) {
                    // Remove userpref from other results
                    filteredPatterns = CliqzHistoryPattern.removeUserPrefDuplicates(filteredPatterns, userPref);
                    filteredPatterns.unshift(userPref);
                };

                // Return results
                var res = {
                    query: query,
                    top_domain: CliqzHistoryPattern.maxDomainShare(filteredPatterns)[0],
                    top_domain_share: CliqzHistoryPattern.maxDomainShare(filteredPatterns)[1],
                    results: filteredPatterns,
                    filteredResults: function() {
                        var tmp = new Array();
                        for (var key in this.results) {
                            if (CliqzHistoryPattern.domainFromUrl(this.results[key]['url']) == this.top_domain) {
                                tmp.push(this.results[key]);
                            };
                        }
                        return tmp;
                    }
                };
                callback( res ); 
            });
    },
    domainFromUrl: function(url, subdomain) {
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
        if (!subdomain) return (parseUri(url).host.match(/([^.]+)\.\w{2,3}(?:\.\w{2})?$/) || [])[1];
        else return parseUri(url).host;
    },
    maxDomainShare: function(patterns) {
        var domains = new Array();
        for(var key in patterns) {
            var url = patterns[key]['url'];
            var domain = this.domainFromUrl(url);
            if (!domains[domain]) {
                domains[domain] = 1;
            } else {
                domains[domain] += 1;
            }
        }
        var max = 0.0;
        var cnt = 0.0;
        var domain = null;
        for (key in domains) {
            cnt += domains[key];
            if (domains[key] > max) {
                max = domains[key];
                domain = key;
            };
        }
        return [domain, max/cnt];
    },
    sortPatterns: function (desc,key) {
         return function(a,b){
           return desc ? ~~(key ? a[key]<b[key] : a < b) 
                       : ~~(key ? a[key] > b[key] : a > b);
          };
    },
    filterPatterns: function(patterns, query) {
        var newPatterns = new Array();
        for(var key in patterns) {
            if (patterns[key]['url'].indexOf(query) != -1 ||
                (patterns[key]['title'] && patterns[key]['title'].indexOf(query) != -1)) {
                newPatterns.push(patterns[key]);
                continue;
            }
            for(var qkey in patterns[key]['query']) {
                var q = patterns[key]['query'][qkey];
                if (q.indexOf(query) != -1) {
                    newPatterns.push(patterns[key]);
                    break;
                };
            }
        }
        return newPatterns;
    },
    removeUserPrefDuplicates: function(patterns, userPref) {
        var refUrl = userPref['url'];
        refUrl = refUrl.replace("http://", "").replace("https://", "").replace("www.", "");
        refUrl = (refUrl[refUrl.length-1] == '/') ? refUrl.substring(0,refUrl.length-1) : refUrl;

        var newPatterns = new Array();
        for(var i=0; i<patterns.length; i++) {
            var pUrl = patterns[i]['url'].replace("http://", "").replace("https://", "").replace("www.", "");
            pUrl = (pUrl[pUrl.length-1] == '/') ? pUrl.substring(0,pUrl.length-1) : pUrl;
            CliqzUtils.log(refUrl + " = " + pUrl, "PAT");
            if (refUrl != pUrl) {
                newPatterns.push(patterns[i]);
            };
        }
        return newPatterns;
    },
    applyUserPref: function(pattern, query) {
        var replacement = CliqzHistory.urlReplacement(query, pattern['url']);
        var dup = null;
        if (replacement && replacement['url'] && replacement['title']) {
            dup = new Array();
            dup["url"] = replacement['url'];
            dup["ignored_url"] = pattern['url'];
            dup["query"] = pattern['query'];
            dup["title"] = replacement['title'];
            dup["path"] = pattern['path'];
            dup["cnt"] = pattern['cnt'];
            dup["debug"] = "User pref: " + replacement['autocomplete'] + " -> " + replacement['url'];
        }
        return dup;
    },
    mutateSession: function (session) {
        for (var i=0; i<session.length; i++) {
            var start = this.simplifyUrl(session[i].url);
            if (!start) continue;
            var str = start;

            if (session.length == 1) {
                this.updatePattern(session[i], str);
            };

            for (var j=i+1; j<session.length; j++) {
                var end = this.simplifyUrl(session[j].url);
                if (!end) continue;
                str += " -> " + end; 

                if (start != end) {
                    this.updatePattern(session[j], str);
                }
            }
        }
        return session;
    },
    updatePattern: function(session, path) {
        if (!(path in this.pattern)) {
            this.pattern[path] = new Array();
            this.pattern[path]["url"] = session.url;
            this.pattern[path]["query"] = [session.query.replace("http://","").replace("https://","")];
            this.pattern[path]["title"] = session.title;
            this.pattern[path]["path"] = path;
            this.pattern[path]["cnt"] = 1;
        } else {
            this.pattern[path]["cnt"] += 1;
            this.pattern[path]["query"].push(session.query.replace("http://","").replace("https://",""));
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