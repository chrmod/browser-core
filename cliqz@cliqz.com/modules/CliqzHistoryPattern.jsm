'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

var CliqzHistoryPattern = {
    timeFrame: (new Date).getTime() - 60*60*24*7*1000, // one week
    data: null,
    pattern: null,
    colors: null,
    detectPattern: function(query, callback) {
        var orig_query = query;
        query = CliqzHistoryPattern.generalizeUrl(query);
        // Ignore one character queries
        if (CliqzHistoryPattern.generalizeUrl(query).length < 2) {
            return
        };

        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        this.data = new Array();
        this.pattern = new Array();
        this.SQL
            ._execute(
                Services.storage.openDatabase(file),
                "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits "+ 
                "inner join ( "+
                    "select visits.last_query_date from visits, urltitles where visits.url = urltitles.url and visits.last_query_date > "+CliqzHistoryPattern.timeFrame+" and "+
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

                // Group patterns with same end urls
                var groupedPatterns = new Array();
                for (key in CliqzHistoryPattern.pattern) {
                    var cur = CliqzHistoryPattern.pattern[key];
                    var url = CliqzHistoryPattern.generalizeUrl(cur['url'],true);
                    var pat = groupedPatterns[url];
                    if (pat && cur["cnt"] > 1) {
                        pat['cnt'] += cur['cnt'];
                        pat['query'] = pat['query'].concat(cur['query']);
                    } else if (cur["cnt"] > 1) {
                        groupedPatterns[url] = cur;
                    };
                }

                // Filter patterns with end urls that don't match query
                var filteredPatterns = CliqzHistoryPattern.filterPatterns(groupedPatterns,query).sort(CliqzHistoryPattern.sortPatterns(true,'cnt'));

                // Set autocomplete to base domain (if in found patterns)
                if (filteredPatterns.length > 0) {
                    filteredPatterns = CliqzHistoryPattern.adjustBaseDomain(filteredPatterns);
                };

                // Return results
                var res = {
                    query: orig_query,
                    top_domain: filteredPatterns[0] ? CliqzHistoryPattern.domainFromUrl(filteredPatterns[0]['url'], false) : null,
                    //top_domain: CliqzHistoryPattern.maxDomainShare(filteredPatterns)[0],
                    //top_domain_share: CliqzHistoryPattern.maxDomainShare(filteredPatterns)[1],
                    results: filteredPatterns,
                    filteredResults: function() {
                        var tmp = new Array();
                        for (var key in this.results) {
                            if (CliqzHistoryPattern.domainFromUrl(this.results[key]['url'], false) == this.top_domain) {
                                tmp.push(this.results[key]);
                            };
                        }
                        return tmp;
                    }
                };
                callback( res );
            });
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
                (patterns[key]['title'] && patterns[key]['title'].split(" ").indexOf(query) != -1)) {
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
    adjustBaseDomain: function(patterns, query) {
        var basePattern = null;
        var baseUrl = patterns[0]['url'];
        baseUrl = CliqzHistoryPattern.generalizeUrl(baseUrl,true);
        if (baseUrl.indexOf('/') != -1) baseUrl = baseUrl.split('/')[0];
        baseUrl = baseUrl.substr(baseUrl.indexOf(CliqzHistoryPattern.domainFromUrl(baseUrl,false)));   

        for (var i = 0; i < patterns.length; i++) {
            var pUrl = CliqzHistoryPattern.generalizeUrl(patterns[i]['url'],true);
            CliqzUtils.log(baseUrl+"="+pUrl);
            if (baseUrl == pUrl ||
                baseUrl.indexOf(pUrl) != -1) {
                basePattern = patterns[i];
                if (i != 0) break;
            };
        };
        var newPatterns = [];
        if (basePattern) {
            CliqzUtils.log("base" + basePattern['url']);
            basePattern['base'] = true;
            patterns[0]['debug'] = 'Replaced by base domain';
            newPatterns.push(basePattern);
        };
        
        for(var key in patterns) {
            if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
        }
        return newPatterns;
    },
    mutateSession: function (session) {
        for (var i=0; i<session.length; i++) {
            var start = this.simplifyUrl(session[i].url);
            if (!start) continue;
            var str = start;

            // This also adds single urls as patterns (huge impact)
            if (/*session.length == 1*/session[i].title) {
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
            this.pattern[path]["query"] = [CliqzHistoryPattern.generalizeUrl(session.query,true)];
            this.pattern[path]["title"] = session.title;
            this.pattern[path]["path"] = path;
            this.pattern[path]["cnt"] = 1;
        } else {
            this.pattern[path]["cnt"] += 1;
            this.pattern[path]["query"].push(CliqzHistoryPattern.generalizeUrl(session.query,true));
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
        // Yahoo redirect
        } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) == 0) {
            return null;
        // Yahoo
        } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) == 0) {
            var p = url.substring(url.indexOf("p=")).split("&")[0];
            if (p != "p=") {
                return "https://search.yahoo.com/search?" + p;
            } else {
                return url;
            }
        } else {
            return url;
        }
    },
    autocompleteTerm: function(urlbar, pattern) {
        function matchQuery(queries) {
            var query = "";
            for(var key in queries) {
                var q = queries[key].toLowerCase();
                if (q.indexOf(input) == 0 && q.length > query.length) {
                    query = q;
                };
            }
            return query;
        }

        var url = CliqzHistoryPattern.generalizeUrl(CliqzHistoryPattern.generalizeUrl(pattern['url'], true));
        var input = CliqzHistoryPattern.generalizeUrl(urlbar);
        var shortTitle = "";
        if (pattern['title']) {
            shortTitle = pattern['title'].split(' ')[0];
        }
        var shortUrl = pattern['url'].length > 80 ? (pattern['url'].substring(0,80)+"...") : pattern['url']
        var autocomplete = false, highlight = false, selectionStart = 0, urlbarCompleted = "";
        var queryMatch = matchQuery(pattern['query']);
        

        // Url
        if (url.indexOf(input) == 0 && url != input) {
            autocomplete = true;
            highlight = true;
            urlbarCompleted = urlbar + url.substring(url.indexOf(input)+input.length);
        }
        // Query
        else if (queryMatch.length > 0 && queryMatch != input) {
            autocomplete = true;
            highlight = true;
            urlbarCompleted = urlbar + queryMatch.substring(queryMatch.toLowerCase().indexOf(input)+input.length) + " - " + shortUrl;
        }
        // Title
        else if (shortTitle.toLowerCase().indexOf(input) == 0 && shortTitle != input) {
            autocomplete = true;
            highlight = true;
            urlbarCompleted = urlbar + shortTitle.substring(shortTitle.toLowerCase().indexOf(input)+input.length) + " - " + shortUrl;
        }
        if (autocomplete) {
            selectionStart = urlbar.toLowerCase().indexOf(input) + input.length;
        };

       return {
            autocomplete: autocomplete,
            urlbar: urlbarCompleted,
            selectionStart: selectionStart,
            highlight: highlight
        };
    },
    stripTitle: function(pattern) {
        if (pattern.length < 3) return "";
        var title1 = pattern[1].title.split(" ").reverse();
        var title2 = pattern[2].title.split(" ").reverse();
        var wordCount = 0;
        for(; wordCount<title1.length && wordCount<title2.length && 
            title1[wordCount] == title2[wordCount]; wordCount++);
        CliqzUtils.log(title1.slice(0, wordCount));
        for(var i=3; i < pattern.length && i < 5; i++) {
            var refTitle = pattern[i].title.split(" ").reverse();
            CliqzUtils.log(refTitle.join());
            for(var w=0; w<refTitle.length && w < wordCount; w++) {
                if (refTitle[w] != title1[w]) {
                    return "";
                };
            }
        }
        var found = title1.slice(0, wordCount);
        if (found.length < 2) {
            return "";
        } else {
            return found.reverse().join(" ");
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
    generalizeUrl: function(url, skipCorrection) {
        if (!url) {return ""};
        var val = url.toLowerCase();
        var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
            host = cleanParts[0],
            pathLength = 0,
            SYMBOLS = /,|-|\./g;
        if (!skipCorrection) {
            if(cleanParts.length > 1){
                pathLength = ('/' + cleanParts.slice(1).join('/')).length;
            }
            if(host.indexOf('www') == 0 && host.length > 4){
                // only fix symbols in host
                if(SYMBOLS.test(host[3]) && host[4] != ' ')
                    // replace only issues in the host name, not ever in the path
                    val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                           (pathLength? val.substr(-pathLength): '');
            }
        };
        
        url = CliqzUtils.cleanUrlProtocol(val, true);
        if (url[url.length-1] == '/') {
            url = url.substring(0, url.length-1);
        };
        return url;
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
        if (!subdomain) return (parseUri(url).host.match(/([^.]+)\.\w{2,4}(?:\.\w{2})?$/) || [])[1];
        else return parseUri(url).host;
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
    },
    preloadColors: function() {
        if (!CliqzHistoryPattern.colors) {
            CliqzUtils.httpGet('chrome://cliqz/content/colors.json',
                function success(req){
                    var source = JSON.parse(req.response);
                    CliqzHistoryPattern.colors = source;
                },
                function error(){}
            );
        }
    },
    darkenColor: function(col) {
        if (!col) col="#BFBFBF";
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(col);
        var r = parseInt(result[1], 16),
        g = parseInt(result[2], 16),
        b = parseInt(result[3], 16);
        r = r > 50 ? r - 50 : 0;
        g = g > 50 ? g - 50 : 0;
        b = b > 50 ? b - 50 : 0;
        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }
}