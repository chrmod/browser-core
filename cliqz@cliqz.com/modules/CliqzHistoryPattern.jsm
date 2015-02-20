'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import("resource://gre/modules/NetUtil.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

var DATA_SOURCE = "firefox_cluster";

var CliqzHistoryPattern = {
  PATTERN_DETECTION_ENABLED: true,
  timeFrame: (new Date).getTime() - 60 * 60 * 24 * 7 * 1000, // Go back one week in cliqz history
  data: null,
  pattern: null,
  firefoxHistory: null,
  noResultQuery: null,
  colors: null,
  historyCallback: null,
  latencies: [],
  // This method uses the cliqz history to detect patterns
  detectPattern: function(query, callback) {
    if (query.length <= 2) {
      CliqzHistoryPattern.noResultQuery = query;
      return;
    }
    if (DATA_SOURCE != "cliqz") {
      return;
    }
    var orig_query = query;
    CliqzHistoryPattern.latencies[orig_query] = (new Date).getTime();
    query = CliqzHistoryPattern.generalizeUrl(query);
    query = query.split(" ")[0];
    let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
    this.data = [];
    this.pattern = [];
    this.SQL
      ._execute(
        Services.storage.openDatabase(file),
        "select distinct visits.last_query_date as sdate, visits.last_query as query, visits.url as url, visits.visit_date as vdate, urltitles.title as title from visits " +
        "inner join ( " +
        "select visits.last_query_date from visits, urltitles where visits.url = urltitles.url and visits.last_query_date > " + CliqzHistoryPattern.timeFrame + " and " +
        "(visits.url like :param or visits.last_query like :param or urltitles.title like :param ) " +
        "group by visits.last_query_date " +
        ") as matches  " +
        "on visits.last_query_date = matches.last_query_date " +
        "left outer join urltitles on urltitles.url = visits.url order by visits.visit_date",
        "%" + this.escapeSQL(query) + "%",
        ["sdate", "query", "url", "vdate", "title"],
        function(result) {
          try {
            if (!CliqzHistoryPattern.data[result.sdate]) {
              CliqzHistoryPattern.data[result.sdate] = [];
            }
            CliqzHistoryPattern.data[result.sdate].push(result);
          } catch (ex) {}
        }
      )
      .then(function() {
        // Detect patterns
        for (var key in CliqzHistoryPattern.data) {
          CliqzHistoryPattern.mutateSession(CliqzHistoryPattern.data[key]);
        }

        // Group patterns with same end urls
        var groupedPatterns = [];
        for (key in CliqzHistoryPattern.pattern) {
          var cur = CliqzHistoryPattern.pattern[key];
          var url = CliqzHistoryPattern.generalizeUrl(cur.url, true);
          var pat = groupedPatterns[url];
          if (pat) {
            pat.cnt += cur.cnt;
            pat.query = pat.query.concat(cur.query);
            if (cur.date > pat.date) {
              pat.date = cur.date;
            }
            if (cur.cnt > 1 && cur.pathLength > 1) {
              pat.isPattern = true;
            }
          } else {
            // Only add patterns with length > 1
            if (cur.cnt > 1 && cur.pathLength > 1) groupedPatterns[url] = cur;
            if (cur.cnt > 1 && cur.pathLength > 1) groupedPatterns[url].isPattern = true;
            //else groupedPatterns[url].isPattern = false;
          }
        }
        // Move patterns in front (force higher priority than single urls)
        //groupedPatterns = CliqzHistoryPattern.pushPatternsToFront(groupedPatterns)
        //                    .sort(CliqzHistoryPattern.sortPatterns(true, 'cnt'));

        // Remove everything without a title
        var finalPatterns = [];
        for (var key in groupedPatterns) {
          if (groupedPatterns[key].title) {
            finalPatterns.push(groupedPatterns[key]);
          }
        }
        finalPatterns = finalPatterns.sort(CliqzHistoryPattern.sortPatterns(true, 'cnt'));
        var res = CliqzHistoryPattern.preparePatterns(finalPatterns, orig_query);

        // Use Firefox history as fallback
        if (res.filteredResults().length === 0 && CliqzHistoryPattern.firefoxHistory.query == orig_query) {
          res = CliqzHistoryPattern.firefoxHistory.res;
          CliqzHistoryPattern.noResultQuery = null;
        } else if (res.filteredResults().length === 0) {
          CliqzHistoryPattern.noResultQuery = orig_query;
        } else {
          CliqzHistoryPattern.noResultQuery = null;
        }

        CliqzHistoryPattern.historyCallback(res);
      });
  },
  // Generate result json from patterns
  generateResult: function(patterns, query, cluster) {
    if (!patterns) {
      patterns = [];
    }
    return {
      query: query,
      cluster: cluster,
      top_domain: CliqzHistoryPattern.maxDomainShare(patterns)[0],
      //top_domain: patterns[0] ? CliqzHistoryPattern.domainFromUrl(patterns[0].url, false) : null,
      results: patterns,
      filteredResults: function() {
        var tmp = [];

        for (var key in this.results) {
          var domain = CliqzHistoryPattern.domainFromUrl(this.results[key].url, false).split(".")[0];
          if (domain == this.top_domain.split(".")[0] &&
            this.results[key].title) {
            tmp.push(this.results[key]);
          }
        }
        return tmp;
      }
    };
  },
  // This method is triggered when the Firefox history has finished loading
  addFirefoxHistory: function(history) {
    var query = history.searchString;

    // attempt rule-based clustering first
    var [history_left, cluster_data] = CliqzClusterHistory.cluster(history);

    if(cluster_data) {
      CliqzHistoryPattern.firefoxHistory = [];
      CliqzHistoryPattern.firefoxHistory.res = cluster_data;
      CliqzHistoryPattern.firefoxHistory.query = query;

      var res = cluster_data;
      res.query = query;

      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };

    } else {

      // Extract results
      var patterns = [];
      for (var i = 0; i < history.matchCount; i++) {
        var pattern = {};
        pattern.url = history.getValueAt(i);
        pattern.url = CliqzUtils.cleanMozillaActions(pattern.url);
        pattern.title = history.getCommentAt(i);
        if (pattern.title.length == 0) {
          pattern.title = CliqzHistoryPattern.domainFromUrl(pattern.url, false);
          pattern.title = pattern.title.indexOf(".") ? pattern.title.split(".")[0] : pattern.title;
          if(pattern.title.length != 0)
            pattern.title = pattern.title[0].toUpperCase() + pattern.title.substr(1);
        }

        if (pattern.title.length > 0 && pattern.url.length > 0 &&
            CliqzHistoryPattern.simplifyUrl(pattern.url) != null &&
            Result.isValid(pattern.url, CliqzUtils.getDetailsFromUrl(pattern.url))) {
          patterns.push(pattern);
        }
      }
      // Process patterns
      var res = CliqzHistoryPattern.preparePatterns(patterns, query);
      CliqzHistoryPattern.firefoxHistory = [];
      CliqzHistoryPattern.firefoxHistory.res = res;
      CliqzHistoryPattern.firefoxHistory.query = query;
    }


    // Callback when firefox is enabled or cliqz history found no results
    if (query.length == 0 ||
      DATA_SOURCE == "firefox_cluster" || DATA_SOURCE == "firefox_no_cluster" ||
      (DATA_SOURCE == "cliqz" && CliqzHistoryPattern.noResultQuery == query)) {
      CliqzHistoryPattern.historyCallback(res);
    }
  },
  // Process patterns
  preparePatterns: function(patterns, query) {
    var baseUrl, orig_query = query;
    if (query.indexOf("://") != -1) query = query.substr(query.indexOf("://")+3);
    query = query.toLowerCase().replace("www.", "");
    // Filter patterns that don't match search
    patterns = CliqzHistoryPattern.filterPatterns(patterns, query);
    var share = CliqzHistoryPattern.maxDomainShare(patterns);
    // Remove patterns with same title
    patterns = CliqzHistoryPattern.removeDuplicates(patterns);
    // Move base domain to top
    [patterns, baseUrl] = CliqzHistoryPattern.adjustBaseDomain(patterns, query);
    var res = CliqzHistoryPattern.generateResult(patterns, orig_query, false);

    // Add base domain if above threshold
    if ((DATA_SOURCE == "firefox_cluster" || DATA_SOURCE == "cliqz") && share[1] > 0.5 && res.filteredResults().length > 2) {
      // Check if base domain changed due to filtering
      var [tmpResults, tmpBaseUrl] = CliqzHistoryPattern.adjustBaseDomain(res.filteredResults(), query);
      if(tmpBaseUrl != baseUrl) {
        baseUrl = tmpBaseUrl;
      }
      CliqzHistoryPattern.addBaseDomain(patterns, baseUrl);
      res.cluster = true;
    // Threshold not reached or clustering not enabled -> no domain clustering
    } else {
      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };
    }

    // Add base domain if not clustered
    if (patterns && !res.cluster && baseUrl && baseUrl.indexOf(query) === 0) {
      CliqzHistoryPattern.addBaseDomain(patterns, baseUrl);
    }
    res.results = CliqzHistoryPattern.removeDuplicates(res.results);
    return res;
  },

  // Calculates the share of the most common domain in given patterns
  maxDomainShare: function(patterns) {
    var domains = [];
    for (var key in patterns) {
      var url = patterns[key].url;
      var domain = this.domainFromUrl(url, false);
      if (!domains[domain]) {
        domains[domain] = 1;
      } else {
        var cnt = 1;
        if(patterns[key].cnt) cnt = patterns[key].cnt;
        domains[domain] += cnt;
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
      }
    }
    return [domain, max / cnt];
  },
  sortPatterns: function(desc, key) {
    return function(a, b) {
      return desc ? ~~(key ? a[key] < b[key] : a < b) : ~~(key ? a[key] > b[key] : a > b);
    };
  },
  filterPatterns: function(patterns, full_query) {
    var queries = full_query.trim().split(" ");
    var newPatterns = [];
    for (var key in patterns) {
      var match = true;
      // Check all queries for matches
      for (var wordKey in queries) {
        var titleUrlMatch = false;
        if (patterns[key].url.indexOf(queries[wordKey]) != -1 ||
          (patterns[key].title && patterns[key].title.toLowerCase() /*.split(" ")*/ .indexOf(queries[wordKey]) != -1)) {
          titleUrlMatch = true;
        }
        var queryMatch = false;
        for (var qkey in patterns[key].query) {
          var q = patterns[key].query[qkey];
          if (q.indexOf(queries[wordKey]) != -1) {
            queryMatch = true;
            break;
          }
        }
        if (!queryMatch && !titleUrlMatch) {
          match = false;
        }
      }
      if (match) {
        newPatterns.push(patterns[key]);
      }
    }
    return newPatterns;
  },
  // Moves N patterns in front of single urls, even if score is lower
  pushPatternsToFront: function(patterns, query) {
    var newPatterns = [];
    var max = 2,
      cnt = 0;

    for (var key in patterns) {
      var pattern = patterns[key];
      if (pattern.isPattern && cnt < max) {
        newPatterns.push(pattern);
        cnt += 1;
      }
    }
    for (var key in patterns) {
      var pattern = patterns[key];
      if (!pattern.isPattern) {
        newPatterns.push(pattern);
      }
    }
    return newPatterns;
  },
  removeDuplicates: function(patterns) {
    var newPatterns = [];
    var titles = [];
    var urls = [];
    for (var key in patterns) {
      var pattern = patterns[key];
      var title = pattern.title;
      var url = CliqzHistoryPattern.generalizeUrl(pattern.url, true);
      if (titles[title] !== true && urls[url] !== true) {
        newPatterns.push(pattern);
        titles[title] = true;
        urls[url] = true;
      }
    }
    return newPatterns;
  },
  // Search all patterns for matching substring (should be domain)
  findCommonDomain: function(patterns) {
    if (patterns.length < 2) {
      return null;
    }
    var scores = [];

    for (var key in patterns) {
      var url1 = CliqzHistoryPattern.generalizeUrl(patterns[key].url, true);
      scores[url1] = true;
      for (var key2 in patterns) {
        var url2 = CliqzHistoryPattern.generalizeUrl(patterns[key2].url, true);
        if (key != key2 && url2.indexOf(url1) == -1) {
          scores[url1] = false;
        }
      }
    }
    // Return match with most occurences
    for (var key in scores) {
      if (scores[key] === true) {
        return key;
      }
    }
    return null;
  },
  // Move base domain to top
  adjustBaseDomain: function(patterns, query) {
    if (patterns.length === 0) {
      return [];
    }
    var basePattern = null;
    var baseUrl = null;
    var commonDomain = CliqzHistoryPattern.findCommonDomain(patterns);

    query = CliqzHistoryPattern.generalizeUrl(query, true);
    for (var key in patterns) {
      var url = CliqzHistoryPattern.generalizeUrl(patterns[key].url, true);
      if (url.indexOf(query) === 0) {
        baseUrl = url;
        break;
      }
    }

    if (!baseUrl) {
      baseUrl = CliqzHistoryPattern.generalizeUrl(patterns[0].url, true);
    }

    if (commonDomain) {
      baseUrl = commonDomain;
    } else if  (baseUrl.indexOf('/') != -1) {
      baseUrl = baseUrl.split('/')[0];
    }

    for (var i = 0; i < patterns.length; i++) {
      var pUrl = CliqzHistoryPattern.generalizeUrl(patterns[i].url, true);
      if (baseUrl == pUrl ||
        baseUrl.indexOf(pUrl) != -1) {
        basePattern = patterns[i];
        if (i !== 0) break;
      }
    }
    var newPatterns = [];

    if (basePattern) {
      basePattern.base = true;
      patterns[0].debug = 'Replaced by base domain';
      newPatterns.push(basePattern);
    }

    for (var key in patterns) {
      if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
    }
    return [newPatterns, baseUrl];
  },
  // Add base domain of given result to top of patterns
  addBaseDomain: function(patterns, baseUrl) {
    baseUrl = CliqzHistoryPattern.generalizeUrl(baseUrl, true);
    if (baseUrl.indexOf('/') != -1) baseUrl = baseUrl.split('/')[0];
    // Add base domain if not in list
    if (patterns[0].base !== true) {
      var title = CliqzHistoryPattern.domainFromUrl(baseUrl, false);
      if (!title) return;
      patterns.unshift({
        title: title.charAt(0).toUpperCase() + title.split(".")[0].slice(1),
        url: baseUrl
      });
    }
    return baseUrl;
  },
  // Extract all possible paths in sessions and count their frequencies
  mutateSession: function(session) {
    for (var i = 0; i < session.length; i++) {
      var start = this.simplifyUrl(session[i].url);
      if (!start) continue;
      var str = start;

      // This also adds single urls as patterns (huge impact)
      //if ( /*session.length == 1*/ session[i].title) {
      //  this.updatePattern(session[i], str, 1);
      //}

      for (var j = i + 1; j < session.length; j++) {
        var end = this.simplifyUrl(session[j].url);
        if (!end) continue;
        str += " -> " + end;

        if (start != end) {
          this.updatePattern(session[j], str, str.split("->").length);
        }
      }
    }
    return session;
  },
  updatePattern: function(session, path, pathLength) {
    if (!(path in this.pattern)) {
      this.pattern[path] = [];
      this.pattern[path].url = session.url;
      this.pattern[path].query = [CliqzHistoryPattern.generalizeUrl(session.query, true)];
      this.pattern[path].title = session.title;
      this.pattern[path].path = path;
      this.pattern[path].cnt = 1;
      this.pattern[path].date = session.vdate;
      this.pattern[path].pathLength = pathLength;
    } else {
      this.pattern[path].cnt += 1;
      this.pattern[path].query.push(CliqzHistoryPattern.generalizeUrl(session.query, true));
      if (session.vdate > this.pattern[path].date) {
        this.pattern[path].date = session.vdate;
      }
    }
  },
  // Remove clutter from urls that prevents pattern detection, e.g. checksum
  simplifyUrl: function(url) {
    // Ignore Google redirect urls
    if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
      return null;

      // Remove clutter from Google searches
    } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      var q = url.substring(url.lastIndexOf("q=")).split("&")[0];
      if (q != "q=") {
        return "https://www.google.com/search?" + q;
      } else {
        return url;
      }
      // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      var q = url.substring(url.indexOf("q=")).split("&")[0];
      if (q != "q=") {
        return "https://www.bing.com/search?" + q;
      } else {
        return url;
      }
      // Yahoo redirect
    } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
      return null;
      // Yahoo
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
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
  // Autocomplete an urlbar value with the given patterns
  autocompleteTerm: function(urlbar, pattern, loose) {
    function matchQuery(queries) {
      var query = "";
      for (var key in queries) {
        var q = queries[key].toLowerCase();
        if (q.indexOf(input) === 0 && q.length > query.length) {
          query = q;
        }
      }
      return query;
    }
    if (urlbar == "www." || urlbar == "http://" || urlbar.substr(urlbar.indexOf("://")+3) == "www." || urlbar == '')
      return {};

    var type = null;
    var url = CliqzHistoryPattern.simplifyUrl(pattern.url);
    url = CliqzHistoryPattern.generalizeUrl(CliqzHistoryPattern.generalizeUrl(url, true));
    var input = CliqzHistoryPattern.generalizeUrl(urlbar);
    if(urlbar[urlbar.length-1] == '/') input += '/';
    var shortTitle = "";
    if (pattern.title) {
      shortTitle = pattern.title.split(' ')[0];
    }
    var autocomplete = false,
      highlight = false,
      selectionStart = 0,
      urlbarCompleted = "";
    var queryMatch = matchQuery(pattern.query);

    // Url
    if (url.indexOf(input) === 0 && url != input) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
      type = 'url';
    }
    // Query
    else if (queryMatch.length > 0 && queryMatch != input && urlbar.indexOf("www.") != 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + queryMatch.substring(queryMatch.toLowerCase().indexOf(input) + input.length) + " - " + url;
      type = 'query';
    }
    // Title
    else if (shortTitle.toLowerCase().indexOf(input) === 0 && shortTitle.length >= input.length && urlbar.indexOf("www.") != 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + shortTitle.substring(shortTitle.toLowerCase().indexOf(input) + input.length) + " - " + url;
      type = 'title';
    // Word autocompletion when filtering
    } else if (input.trim().indexOf(" ") != -1 &&
      input[input.length - 1] != " " && loose && urlbar.indexOf("www.") != 0) {
      var queryEnd = input.split(" ")[input.split(" ").length - 1].toLowerCase();
      if (pattern.title && pattern.title.toLowerCase().indexOf(queryEnd) != -1) {
        var words = pattern.title.split(" ");

        for (var key in words) {
          if (words[key].toLowerCase().indexOf(queryEnd) === 0) {
            var word = words[key];
            break;
          }
        }
      }
      if (word) {
        urlbarCompleted = urlbar + word.substr(word.toLowerCase().indexOf(queryEnd) + queryEnd.length) + " - " + url;
        autocomplete = true;
        highlight = true;
        type = 'word';
      } else {
        autocomplete = false;
        highlight = false;
      }
    }
    if (autocomplete) {
      selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
    }

    // Adjust url to user protocol
    if(urlbar.indexOf("://") != -1) {
      var prot_user = urlbar.substr(0, urlbar.indexOf("://")+3);
      var prot_auto = pattern.url.substr(0, pattern.url.indexOf("://")+3);
      pattern.url = pattern.url.replace(prot_auto, prot_user);
    }

    return {
      url: url,
      full_url: pattern.url,
      autocomplete: autocomplete,
      urlbar: urlbarCompleted,
      selectionStart: selectionStart,
      highlight: highlight,
      type: type
    };
  },
  // Remove redundant information from titles, e.g. website titles
  stripTitle: function(pattern) {
    if (pattern.length < 3) return "";
    var title1 = pattern[1].title.split(" ").reverse();
    var title2 = pattern[2].title.split(" ").reverse();
    var wordCount = 0;
    for (; wordCount < title1.length && wordCount < title2.length &&
      title1[wordCount] == title2[wordCount]; wordCount++);
    for (var i = 3; i < pattern.length && i < 5; i++) {
      var refTitle = pattern[i].title.split(" ").reverse();
      for (var w = 0; w < refTitle.length && w < wordCount; w++) {
        if (refTitle[w] != title1[w]) {
          if (wordCount == 2) {
            return "";
          } else {
            wordCount -= 1;
            i = 2;
            continue;
          }
        }
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
    _execute: function PIS__execute(conn, sql, param, columns, onRow) {
      var sqlStatement = conn.createAsyncStatement(sql);
      if(param) {
        sqlStatement.params.param = param;
      }
      var statement = sqlStatement,
        onThen, //called after the async operation is finalized
        promiseMock = {
          then: function(func) {
            onThen = func;
          }
        };
        if(param) {
          statement.params.param = param;
        }

      statement.executeAsync({
        handleCompletion: function(reason) {
          onThen();
        },

        handleError: function(error) {},

        handleResult: function(resultSet) {
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
                for (var i = 0; i < columns.length; i++) {
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
  // Remove clutter (http, www) from urls
  generalizeUrl: function(url, skipCorrection) {
    if (!url) {
      return "";
    }
    var val = url.toLowerCase();
    var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
      host = cleanParts[0],
      pathLength = 0,
      SYMBOLS = /,|\./g;
    if (!skipCorrection) {
      if (cleanParts.length > 1) {
        pathLength = ('/' + cleanParts.slice(1).join('/')).length;
      }
      if (host.indexOf('www') === 0 && host.length > 4) {
        // only fix symbols in host
        if (SYMBOLS.test(host[3]) && host[4] != ' ')
        // replace only issues in the host name, not ever in the path
          val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
          (pathLength ? val.substr(-pathLength) : '');
      }
    }
    url = CliqzUtils.cleanUrlProtocol(val, true);
    if (url[url.length - 1] == '/') {
      url = url.substring(0, url.length - 1);
    }
    return url;
  },
  formatDate: function(date) {
    if (!date) {
      return "";
    }
    var now = (new Date).getTime();
    var diff = parseInt((now - date) / 1000);
    if (diff === 0) {
      return CliqzUtils.getLocalizedString("ago1Minute");
    }
    if (diff < 60) {
      return CliqzUtils.getLocalizedString("ago1Minute");
    }
    if (diff < 3600) {
      return CliqzUtils.getLocalizedString("agoXMinutes").replace('{}', parseInt(diff / 60));
    }
    if (diff < 3600 * 24) {
      return CliqzUtils.getLocalizedString("agoXHours").replace('{}', parseInt(diff / 3600));
    }
    return CliqzUtils.getLocalizedString("agoXDays").replace('{}', parseInt(diff / (3600 * 24)));
  },
  createInstantResult: function(res, searchString) {
    // if url set has already been prepared (e.g., in the case of rule-based clustering)
    if(res.urls) {
      var instant = Result.generic('cliqz-pattern', res.url, null, res.title, null, searchString);
      instant.data = res;
      instant.comment += " (history rules cluster!)"
      instant.data.template = "pattern-h2";

    } else {
      var results = res.filteredResults();
      var logExtra = '';

      if(results.length == 0)
        return null; // no results

      if (searchString.length == 0) {
        // special case for user request of top sites from history
        var instant = Result.generic('cliqz-pattern', ""/*results[0].url*/, null, results[0].title, null, searchString);
        instant.data.title = CliqzUtils.getLocalizedString("history_results_cluster")
        instant.data.url = results[0].url;
        instant.comment += " (history top sites)!";
        instant.data.template = "pattern-h1";
        instant.data.generic = true;
        logExtra = 'h1-';
      } else if (results.length == 1) {
        var instant = Result.generic('favicon', results[0].url, null, results[0].title, null, searchString);
        instant.comment += " (history single)!"
        instant.data.kind = "H";
      } else if (res.cluster) {
        var domain = res.top_domain.indexOf(".") ? res.top_domain.split(".")[0] : res.top_domain;
        var instant = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
        instant.data.title = domain[0].toUpperCase() + domain.substr(1) + " \u2014 " + CliqzUtils.getLocalizedString("history_results_cluster");
        instant.data.url = results[0].url;
        instant.comment += " (history domain cluster)!";
        instant.data.template = "pattern-h2";
        logExtra = 'h2-';
      } else {
        var instant = Result.generic('cliqz-pattern', ""/*results[0].url*/, null, results[0].title, null, searchString);
        instant.data.title = CliqzUtils.getLocalizedString("history_results")
        instant.data.url = instant.val;
        instant.comment += " (history)!";
        instant.data.template = "pattern-h3";
        instant.data.generic = true;
        logExtra = 'h3-';
      }

      instant.data.urls = [];
      for (var i = 0; i < results.length; i++) {
        var domain = CliqzHistoryPattern.generalizeUrl(results[i].url, true);
        if (domain.indexOf("/") != -1) {
          domain = domain.split('/')[0];
        }
        var url = results[i].url;
        if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);
        var favicon = res.cluster ? "" : "http://ux2.fbt.co/brand/favicon?fallback=true&q=" + domain;

        instant.data.urls.push({
          href: results[i].url,
          link: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true),
          domain: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true).split("/")[0],
          vdate: CliqzHistoryPattern.formatDate(results[i].date),
          title: results[i].title,
          extra: "history-"+ logExtra + i,
          favicon: favicon,
        });
        if ((instant.data.urls.length > 9 && instant.data.template == "pattern-h1") ||
            (instant.data.urls.length > 5  && instant.data.template == "pattern-h2") ||
            (instant.data.urls.length > 1  && instant.data.template == "pattern-h3")) {
          break;
        }
      }
    }

    res.shown = instant.data.urls.length;
    return instant;
  },
  // Removes a given url from the instant.data.url list
  removeUrlFromResult: function(urlList, url) {
    var url = CliqzHistoryPattern.generalizeUrl(url);
    for(var key in urlList) {
      var r_url = CliqzHistoryPattern.generalizeUrl(urlList[key].href);
      if (r_url == url) {
        urlList.splice(key, 1);
        return;
      }
    }
  },
  // Create a full-sized unfiltered history entry for use as second-page backfill results
  createBackfillResult: function(res, searchString) {
    if(res.results.length == 0)
      return [];

    var results = res.results;
    if(!results[0]) return null;
    var backfill = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
    backfill.data.title = CliqzUtils.getLocalizedString("history_results")
    backfill.data.url = backfill.val;
    backfill.comment += " (history)!";
    backfill.data.template = "pattern-h1";
    backfill.data.generic = true;

    backfill.data.urls = [];
    for (var i = 0; i < results.length; i++) {
      var domain = CliqzHistoryPattern.generalizeUrl(results[i].url, true);
      if (domain.indexOf("/") != -1) {
        domain = domain.split('/')[0];
      }
      var url = results[i].url;
      if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);
      var favicon = res.cluster ? "" : "http://ux2.fbt.co/brand/favicon?fallback=true&q=" + domain;

      backfill.data.urls.push({
        href: results[i].url,
        link: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true),
        domain: CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true).split("/")[0],
        vdate: CliqzHistoryPattern.formatDate(results[i].date),
        title: results[i].title,
        favicon: favicon,
      });
      if(backfill.data.urls.length > 10)
        break;
      }
      return backfill;
  },
  // Extract earliest and latest entry of Firefox history
  historyTimeFrame: function(callback) {
    Cu.import('resource://gre/modules/PlacesUtils.jsm');
    let history = [];
    var min, max;
    this.SQL
      ._execute(
        PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection,
        "SELECT min(last_visit_date) as min_date, max(last_visit_date) as max_date FROM moz_places", ["min_date", "max_date"],
        null,
        function(result) {
          try {
            min = parseInt(result.min_date / 1000);
            max = parseInt(result.max_date / 1000);
          } catch (ex) {}
        }
      )
      .then(function() {
        callback(min, max);
      });
  },
  // Extract base domain from url
  domainFromUrl: function(url, subdomain) {
    var urlparts = CliqzUtils.getDetailsFromUrl(url);
    if(subdomain)
      return urlparts.host;
    else
      return urlparts.domain;
  },
  // Escape strings for SQL statements
  escapeSQL: function(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
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
  // Cache json that contains domain colors
  preloadColors: function() {
    if (!CliqzHistoryPattern.colors) {
      CliqzUtils.httpGet('chrome://cliqz/content/colors.json',
        function success(req) {
          var source = JSON.parse(req.response);
          CliqzHistoryPattern.colors = source;
        },
        function error() {}
      );
    }
  },
  // Make a specific color darker (used for logo shadow)
  darkenColor: function(col) {
    if (!col) col = "#BFBFBF";
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
