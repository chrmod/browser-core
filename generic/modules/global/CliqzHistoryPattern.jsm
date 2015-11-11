'use strict';

var EXPORTED_SYMBOLS = ['CliqzHistoryPattern'];

var Cc = Components.classes,
    Ci = Components.interfaces,
    Cu = Components.utils;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/NetUtil.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzClusterHistory',
  'chrome://cliqzmodules/content/CliqzClusterHistory.jsm');

var FF_DEF_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon.png',
    Q_DEF_FAVICON = 'chrome://cliqzres/content/skin/defaultFavicon.png';

var CliqzHistoryPattern = {
  historyCallback: null,
  latencies: [],

  // Generate result json from patterns
  _generateResult: function(patterns, query, cluster, baseUrl) {
    if (!patterns) {
      patterns = [];
    }
    return {
      query: query,
      cluster: cluster,
      top_domain: baseUrl || CliqzHistoryPattern._maxDomainShare(patterns)[0],
      results: patterns,
      filteredResults: function() {
        var self = this;
        return this.results.filter(function(r) {
          return r.title && CliqzUtils.getDetailsFromUrl(r.url).name == CliqzUtils.getDetailsFromUrl(self.top_domain).name;
        });
      }
    };
  },
  // This method is triggered when the Firefox history has finished loading
  addFirefoxHistory: function(history) {
    var query = history.query;
    // attempt rule-based clustering first
    var clustered_result = CliqzClusterHistory.cluster(history.results);
    //var history_left = clustered_result[0]
    var cluster_data = clustered_result[1];

    var res;
    if (cluster_data) { // cluster from rule-based clustering
      CliqzUtils.log('Using rule-based cluster for ' + cluster_data.url +
                     ' autoAdd: ' + cluster_data.autoAdd,
                     'CliqzHistoryPattern');
      res = cluster_data;
      res.query = query;

      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };
    } else {
      // Extract results
      var patterns = [];
      for (var i = 0; i < history.results.length; i++) {
        var url = CliqzUtils.cleanMozillaActions(history.results[i].value),
            title = history.results[i].comment;

        if (!title) {
          title = CliqzHistoryPattern.generalizeUrl(url);
        }

        if (title.length > 0 && url.length > 0 &&
            Result.isValid(url, CliqzUtils.getDetailsFromUrl(url))) {

          patterns.push({
            url: url,
            title: title,
            favicon: history.results[i].image,
            _genUrl: CliqzHistoryPattern.generalizeUrl(url, true)
          });
        }
      }
      // Process patterns
      res = CliqzHistoryPattern._preparePatterns(patterns, query);
      CliqzHistoryPattern.firefoxHistory = [];
      CliqzHistoryPattern.firefoxHistory.res = res;
      CliqzHistoryPattern.firefoxHistory.query = query;
    }

    CliqzHistoryPattern.historyCallback(res);
  },
  // Process patterns
  _preparePatterns: function(patterns, query) {
    var baseUrl, favicon, orig_query = query;

    query = CliqzUtils.cleanUrlProtocol(query, true).trim();

    // Filter patterns that don't match search
    patterns = CliqzHistoryPattern._filterPatterns(patterns, query.toLowerCase());
    var share = CliqzHistoryPattern._maxDomainShare(patterns);

    // Remove patterns with same url or title
    patterns = CliqzHistoryPattern._removeDuplicates(patterns);

    // Move base domain to top
    var adjustedResults = CliqzHistoryPattern._adjustBaseDomain(patterns, query);
    patterns = adjustedResults[0];
    baseUrl = adjustedResults[1];
    favicon = adjustedResults[2];
    var https = adjustedResults[3];
    var res = CliqzHistoryPattern._generateResult(patterns, orig_query, false, baseUrl);

    // Add base domain if above threshold
    var fRes = res.filteredResults();
    var genQ = CliqzHistoryPattern.generalizeUrl(query);
    if (share[1] > 0.5 && fRes.length > 2 &&
       !(CliqzHistoryPattern.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0 && share[1] < 0.8)) {
      // Check if base domain changed due to filtering
      var tmpBaseUrl = CliqzHistoryPattern._adjustBaseDomain(fRes, query)[1];
      baseUrl = tmpBaseUrl;
      CliqzHistoryPattern._addBaseDomain(patterns, baseUrl, favicon, https);
      res.cluster = true;
    // Threshold not reached or clustering not enabled -> no domain clustering
    } else {
      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };
    }

    // Remove automatically added patterns if they don't match query
    if (patterns && patterns.length > 0 &&
       patterns[0].autoAdd &&
       CliqzHistoryPattern.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0) {
      patterns.shift();
      res.cluster = false;
    }

    res.results = CliqzHistoryPattern._removeDuplicates(res.results);
    return res;
  },

  // Calculates the _weighted_ share of the most common domain in given patterns
  _maxDomainShare: function(patterns) {
    var patternCount = patterns.length;
    // boost the first X domain entries (i.e., within boostRange)
    var boostRange = 3;
    // weight for the first X entries, all other entries have weight of 1;
    // this makes the first X entries as important as the remaining (N - X) entries
    var boostFactor = (patternCount - boostRange) / (1 * boostRange);

    // make sure the first results do not become less important, which happens if
    // if there are only very few patterns (i.e, patternCount < boostRange * 2)
    boostFactor = Math.max(1, boostFactor);

    var domains = [];
    var index = 0;
    var cnt = 0;

    for (var key in patterns) {
      var url = patterns[key].url;
      var domaintmp = CliqzUtils.getDetailsFromUrl(url).domain;
      // assign a higher weight to this domain entry if it is one of the first N entries
      var weightedCount = index < boostRange ? boostFactor : 1;
      if (!domains[domaintmp]) {
        domains[domaintmp] = weightedCount;
      } else {
        cnt = 1;
        if (patterns[key].cnt) cnt = patterns[key].cnt;
        domains[domaintmp] += weightedCount;
      }
      index++;
    }
    var max = 0.0;
    cnt = 0.0;
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
  _filterPatterns: function(patterns, full_query) {
    var queries = full_query.trim().split(' ');
    var newPatterns = [];
    for (var key in patterns) {
      var match = true;
      // Check all queries for matches
      for (var wordKey in queries) {
        var titleUrlMatch = false;
        if (patterns[key].url.indexOf(queries[wordKey]) != -1 ||
          ((patterns[key].title || '').toLowerCase().indexOf(queries[wordKey]) != -1)) {
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
          break;
        }
      }
      if (match) newPatterns.push(patterns[key]);
    }
    return newPatterns;
  },
  // Deduplicate URLs and titles
  _removeDuplicates: function(patterns) {
    var newPatterns;
    newPatterns = CliqzHistoryPattern._removeDuplicatesByKey(patterns, '_genUrl');
    newPatterns = CliqzHistoryPattern._removeDuplicatesByKey(newPatterns, 'title');
    return newPatterns;
  },
  // Deduplicate entries by value of key, with a preference for https and proper titles
  _removeDuplicatesByKey: function(patterns, key) {
    var reorg = {};
    var order = [];

    var value;

    // Pass 1: group similar entries by key
    for (var i = 0; i < patterns.length; i++) {
      value = patterns[i][key];
      if (!reorg.hasOwnProperty(value)) {
        order.push(value);
        reorg[value] = [];
      }
      reorg[value].push(patterns[i]);
    }

    // Pass 2: take the best entry from each group
    // and add to newPatterns in original order.
    var newPatterns = [];
    for (i = 0; i < order.length; i++) {
      value = order[i];

      if (reorg[value].length == 1) {
        newPatterns.push(reorg[value][0]);
        continue;
      }

      // Separate http and https links
      var https = [],
          http = [];
      for (var j = 0; j < reorg[value].length; j++) {
        if (reorg[value][j].url.indexOf('https://') === 0) {
          https.push(reorg[value][j]);
        } else {
          http.push(reorg[value][j]);
        }
      }

      // if any https links, proceed with them only
      var candidates;
      if (https.length > 0)
        candidates = https;
      else
        candidates = http;

      // Pick the one with a "real" title.
      // Some history entries will have a title the same as the URL,
      // don't use these if possible.
      var found = false;
      for (var x = 0; x < candidates.length; x++) {
        if (!(candidates[x].title == candidates[x]._genUrl ||
             candidates[x].title == 'www.' + candidates[x]._genUrl ||
             candidates[x].title == candidates[x].url)) {
          newPatterns.push(candidates[x]);
          found = true;
          break;
        }
      }
      if (!found)
        newPatterns.push(candidates[0]);
    }

    return newPatterns;
  },
  // Search all patterns for matching substring (should be domain)
  _findCommonDomain: function(patterns) {
    if (patterns.length < 2) {
      return null;
    }
    var scores = {};

    for (var key in patterns) {
      var url1 = patterns[key]._genUrl;
      scores[url1] = true;
      for (var key2 in patterns) {
        var url2 = patterns[key2]._genUrl;
        if (key != key2 && url2.indexOf(url1) == -1) {
          scores[url1] = false;
        }
      }
    }

    // Return match with most occurences
    for (var scorekey in scores) {
      if (scores[scorekey] === true) {
        return scorekey;
      }
    }
    return null;
  },
  // Move base domain to top
  _adjustBaseDomain: function(patterns, query) {
    if (patterns.length === 0) {
      return [];
    }
    var basePattern = null, baseUrl = null, favicon = null,
        commonDomain = CliqzHistoryPattern._findCommonDomain(patterns);

    // Check for url matching query
    query = CliqzHistoryPattern.generalizeUrl(query, true);
    var key;
    for (key in patterns) {
      var url = patterns[key].url;
      if (url.indexOf(query) === 0) {
        baseUrl = url;
        favicon = patterns[key].favicon;
        break;
      }
    }

    // if none found, use the first entry
    if (!baseUrl) {
      baseUrl = patterns[0]._genUrl;
      favicon = patterns[0].favicon;
    }

    baseUrl = commonDomain || baseUrl.split('/')[0];

    // find if there is an entry matching the base URL.
    var pUrl;
    for (var i = 0; i < patterns.length; i++) {
      pUrl = patterns[i]._genUrl;
      if (baseUrl == pUrl) {
        basePattern = patterns[i];
        break;
      }
    }
    var https = false;
    var newPatterns = [];
    if (basePattern) {
      // found a history entry representing the base pattern,
      // use at the first entry in newPatterns
      basePattern.base = true;
      patterns[0].debug = 'Replaced by base domain';
      newPatterns.push(basePattern);

    } else {
      CliqzUtils.log('Using a base url that did not exist in history list.', 'CliqzHistoryPattern');

      for (key in patterns) {
        // if any pattern uses an https domain, try to use that for
        // base domain too.
        pUrl = patterns[key].url;
        if (pUrl.indexOf('https://') === 0) {
          https = true;
          break;
        }

        // Add https if required
        if (https) {
          // ...but only if there is a history entry with title
          if (CliqzHistoryManager.getPageTitle('https://' + baseUrl)) {
            CliqzUtils.log('found https base URL with title', 'CliqzHistoryPattern');
            // keep https as true
          } else {
            CliqzUtils.log('no https base URL with title, do not change original base URL', 'CliqzHistoryPattern');
            https = false;
          }
        }
      }
    }

    for (key in patterns) {
      // keep everything else except for base, it is already there
      if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
    }
    return [newPatterns, baseUrl, favicon, https];
  },
  // Add base domain of given result to top of patterns, if necessary
  _addBaseDomain: function(patterns, baseUrl, favicon, https) {
    baseUrl = CliqzHistoryPattern.generalizeUrl(baseUrl, true);
    // Add base domain entry if there is not one already
    if (patterns && patterns.length > 0 && !patterns[0].base) {
      var title = CliqzUtils.getDetailsFromUrl(baseUrl).domain;
      if (!title) {
        CliqzUtils.log('Failed to add base domain because there is no title: ' + baseUrl, 'CliqzHistoryPattern');
        return;
      }

      CliqzUtils.log('Adding base domain to history cluster: ' + baseUrl, 'CliqzHistoryPattern');

      // Add trailing slash if not there
      var urldetails = CliqzUtils.getDetailsFromUrl(baseUrl);
      if (urldetails.path === '')
        baseUrl = baseUrl + '/';

      patterns.unshift({
        title: title.charAt(0).toUpperCase() + title.split('.')[0].slice(1),
        url: baseUrl,
        favicon: favicon
      });
      patterns[0].autoAdd = true;
    }
  },
  // Remove clutter from urls that prevents pattern detection, e.g. checksum
  simplifyUrl: function(url) {
    var q;
    // Google redirect urls
    if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
      // Return target URL instead
      url = url.substring(url.lastIndexOf('url=')).split('&')[0];
      url = url.substr(4);
      return decodeURIComponent(url);

      // Remove clutter from Google searches
    } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.lastIndexOf('q=')).split('&')[0];
      if (q != 'q=') {
        // tbm defines category (images/news/...)
        var param = url.indexOf('#') != -1 ? url.substr(url.indexOf('#')) : url.substr(url.indexOf('?'));
        var tbm = param.indexOf('tbm=') != -1 ? ('&' + param.substring(param.lastIndexOf('tbm=')).split('&')[0]) : '';
        var page = param.indexOf('start=') != -1 ? ('&' + param.substring(param.lastIndexOf('start=')).split('&')[0]) : '';
        return 'https://www.google.com/search?' + q + tbm /*+ page*/;
      } else {
        return url;
      }
      // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.indexOf('q=')).split('&')[0];
      if (q != 'q=') {
        if (url.indexOf('search?') != -1)
          return url.substr(0, url.indexOf('search?')) + 'search?' + q;
        else
          return url.substr(0, url.indexOf('/?')) + '/?' + q;
      } else {
        return url;
      }
      // Yahoo redirect
    } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
      url = url.substring(url.lastIndexOf('/RU=')).split('/RK=')[0];
      url = url.substr(4);
      return decodeURIComponent(url);
      // Yahoo
    } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
      var p = url.substring(url.indexOf('p=')).split('&')[0];
      if (p != 'p=' && url.indexOf(';') != -1) {
        return url.substr(0, url.indexOf(';')) + '?' + p;
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
      var query = '';
      for (var key in queries) {
        var q = queries[key].toLowerCase();
        if (q.indexOf(input) === 0 && q.length > query.length) {
          query = q;
        }
      }
      return query;
    }
    if (urlbar == 'www.' || urlbar == 'http://' || urlbar.substr(urlbar.indexOf('://') + 3) == 'www.' || urlbar === '')
      return {};

    var type = null;
    var url = CliqzHistoryPattern.simplifyUrl(pattern.url);
    url = CliqzHistoryPattern.generalizeUrl(url, true);
    var input = CliqzHistoryPattern.generalizeUrl(urlbar);
    if (urlbar[urlbar.length - 1] == '/') input += '/';
    var shortTitle = '';
    if (pattern.title) {
      shortTitle = pattern.title.split(' ')[0];
    }
    var autocomplete = false,
      highlight = false,
      selectionStart = 0,
      urlbarCompleted = '';
    var queryMatch = matchQuery(pattern.query);

    // Url
    if (url.indexOf(input) === 0 && url != input) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
      type = 'url';
    }
    // Query
    else if (queryMatch.length > 0 && queryMatch != input && urlbar.indexOf('www.') !== 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + queryMatch.substring(queryMatch.toLowerCase().indexOf(input) + input.length) + ' - ' + url;
      type = 'query';
    }
    // Title
    else if (shortTitle.toLowerCase().indexOf(input) === 0 && shortTitle.length >= input.length && urlbar.indexOf('www.') !== 0) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + shortTitle.substring(shortTitle.toLowerCase().indexOf(input) + input.length) + ' - ' + url;
      type = 'title';
    // Word autocompletion when filtering
    } else if (input.trim().indexOf(' ') != -1 &&
      input[input.length - 1] != ' ' && loose && urlbar.indexOf('www.') !== 0) {
      var queryEnd = input.split(' ')[input.split(' ').length - 1].toLowerCase();
      if (pattern.title && pattern.title.toLowerCase().indexOf(queryEnd) != -1) {
        var words = pattern.title.split(' ');

        for (var key in words) {
          if (words[key].toLowerCase().indexOf(queryEnd) === 0) {
            var word = words[key];
            break;
          }
        }
      }
      if (word) {
        urlbarCompleted = urlbar + word.substr(word.toLowerCase().indexOf(queryEnd) + queryEnd.length) + ' - ' + url;
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
    if (urlbar.indexOf('://') != -1) {
      var prot_user = urlbar.substr(0, urlbar.indexOf('://') + 3);
      var prot_auto = pattern.url.substr(0, pattern.url.indexOf('://') + 3);
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
  // Remove clutter (http, www) from urls
  generalizeUrl: function(url, skipCorrection) {
    if (!url) {
      return '';
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
    return url[url.length - 1] == '/' ? url.slice(0,-1) : url;
  },
  // Attach a list of URLs to a cluster result
  _attachURLs: function(result, urls, with_favicon) {
    result.data.urls = [];

    for (var i = 0; i < urls.length; i++) {
      var domain = CliqzHistoryPattern.generalizeUrl(urls[i].url, true).split('/')[0],
          url = urls[i].url;

      if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);

      var favicon = with_favicon && (urls[i].favicon == FF_DEF_FAVICON ? Q_DEF_FAVICON : urls[i].favicon),
          cleanUrl = CliqzUtils.cleanUrlProtocol(CliqzHistoryPattern.simplifyUrl(url), true);

      result.data.urls.push({
        href: urls[i].url,
        link: cleanUrl,
        domain: cleanUrl.split('/')[0],
        title: urls[i].title,
        extra: 'history-' + i,
        favicon: favicon,
        // logo is only necessary for 3-up mini-history view, this can be removed if that is retired
        logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(urls[i].url)),
        kind: ['H']
      });
      if ((result.data.urls.length > 9 && result.data.template == 'pattern-h1') ||
          (result.data.urls.length > 5 && result.data.template == 'pattern-h2') ||
          (result.data.urls.length > 2 && result.data.template == 'pattern-h3')) {
        break;
      }
    }
  },
  // Creates one (or potentially more) instant results based on history
  createInstantResult: function(res, searchString, callback) {
    var instant_results = [];
    var results = res.filteredResults();
    var promises = [];

    if (results.length === 0 && !res.urls) {
      // no results, so do nothing

    } else if (res.urls) {
      // Rule-based clustering has already been performed, just take the entry as it is
      var instant = Result.generic('cliqz-pattern', res.url, null, res.title, null, searchString, res);
      instant.comment += ' (history rules cluster)';
      // override with any titles we have saved
      promises.push(CliqzHistoryPattern._getTitle(instant));

      instant.data.template = 'pattern-h2';
      instant.data.cluster = true; // a history cluster based on a destination bet
      instant_results.push(instant);

    } else if (searchString.length === 0) {
      // special case for user request of top sites from history
      var instant = Result.generic('cliqz-pattern', ', null, ', null, searchString);
      instant.data.title = CliqzUtils.getLocalizedString('history_results_cluster');
      instant.data.url = results[0].url;
      instant.comment += ' (history top sites)!';
      instant.data.template = 'pattern-h1';
      instant.data.generic = true;

      this._attachURLs(instant, results);

      instant_results.push(instant);

    } else if (res.cluster) {
      // domain-based cluster
      var instant = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
      var title = results[0].title;
      if (!title) {
        title = results[0].url;
        CliqzUtils.log('No title, assigning ' + title, 'CliqzHistoryPattern');
      }
      instant.data.title = title;
      // override with any titles we have saved
      promises.push(CliqzHistoryPattern._getTitle(instant));

      instant.data.url = results[0].url;
      instant.comment += ' (history domain cluster)!';
      instant.data.template = 'pattern-h2';
      instant.data.autoAdd = results[0].autoAdd;
      instant.data.cluster = true; // a history cluster based on a destination bet

      // first entry is used as the main URL of this cluster, remove from remaining result list
      results.shift();

      CliqzHistoryPattern._attachURLs(instant, results);

      instant_results.push(instant);

    } else {
      // generic history
      var simple_generic = CliqzUtils.getPref('simpleHistory', false);

      if (simple_generic) {
        var maxHistoryResults = 2;
        for (var i = 0; i < maxHistoryResults; i++) {
          if (i < results.length) {
            var instant = Result.generic('favicon', results[i].url, null, results[i].title, null, searchString);
            instant.comment += ' (history generic)!';
            instant.data.kind = ['H'];
            promises.push(CliqzHistoryPattern._getDescription(instant));
            instant_results.push(instant);
          } else {
            break;
          }
        }
      } else {
        // 3-up combined generic history entry
        var instant = Result.generic('cliqz-pattern', ', null, ', null, searchString);
        instant.data.title = '';
        instant.comment += ' (history generic)!';
        instant.data.template = 'pattern-h3';
        instant.data.generic = true;

        this._attachURLs(instant, results, true);

        instant_results.push(instant);
      }
    }

    if (typeof(Promise) === 'undefined') {
      // Firefox versions < 29
      callback(instant_results);
    } else {
      Promise.all(promises).then(function(data) {
        callback(instant_results);
      });
    }
  },
  // Retrieve description and save in instant results
  _getDescription: function(instant) {
    var instant_data = instant.data;
    var promise = CliqzHistory.getDescription(instant.val);
    if (promise) {
      return promise.then(function(desc) {
        instant_data.description = desc;
      });
    }
  },
  // Retrieve title and save in instant reuslt
  _getTitle: function(instant) {
    var instant_data = instant.data;
    var promise = CliqzHistory.getTitle(instant.val);
    if (promise) {
      return promise.then(function(title) {
        if (title)
          instant_data.title = title;
      });
    }
  },
  // Removes a given url from the instant.data.url list
  removeUrlFromResult: function(urlList, _url) {
    var url = CliqzHistoryPattern.generalizeUrl(_url);
    for (var key in urlList) {
      var r_url = CliqzHistoryPattern.generalizeUrl(urlList[key].href);
      if (r_url == url) {
        urlList.splice(key, 1);
        return;
      }
    }
  }
};
