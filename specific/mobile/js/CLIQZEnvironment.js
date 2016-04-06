CLIQZEnvironment = {
  BRANDS_DATA_URL: 'js/brands_database.json',
  TEMPLATES_PATH: 'templates/',
  LOCALE_PATH: 'modules/static/locale/',
  RESULTS_LIMIT: 3,
  RICH_HEADER_CACHE_TIMEOUT: 15000,
  PEEK: 20,
  PADDING: 16,
  BRANDS_DATABASE_VERSION: 1452759183853,

  storeQueryTimeout: null,

  log: Logger.log,
  logCounter: Logger.logCounter,

  callRichHeader: function(searchString, url, callback) {
    var richHeaderUrl = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map';
    richHeaderUrl += '&q=' + searchString;
    richHeaderUrl += '&bmresult=' + url;
    if(CLIQZEnvironment.location_enabled) {
      richHeaderUrl += '&loc=' + CLIQZEnvironment.USER_LAT + ',' + CLIQZEnvironment.USER_LNG + ',U';
    }
    var request = new XMLHttpRequest();
    request.open('GET', encodeURI(richHeaderUrl), true);
    request.onreadystatechange = function () {
      if(request.status === 200 && request.readyState === 4) {
        callback(JSON.parse(request.response));
      }
    };
    request.send();
  },

  enrichResults: function(r, startIndex, historyCount) {
    r._results.forEach( function (result, index) {
      // if(index < startIndex) {
      if(index > historyCount || index < historyCount + startIndex) { // kicking out enriching cards after the first 1
        return;
      }
      CLIQZEnvironment.callRichHeader(r._searchString, result.val, function(r) {
        if(r.results && r.results[0] && r.results[0].data) {
          localStorage.updateRichHeaderData(r.results[0], index);
          var template = r.results[0].data.superTemplate;
          if(!CliqzHandlebars.tplCache[template]) {
            template = r.results[0].data.template;
          }
          if( CliqzHandlebars.tplCache[template] ) {
            CLIQZ.UI.enhanceResults(r);

            if(document.getElementById('cqz-result-box-' + index) && r.results[0] && r.results[0].data.template !== 'noResult') {
              document.getElementById('cqz-result-box-' + index).innerHTML = CliqzHandlebars.tplCache[template]({data: r.results[0].data});
            }
          }
        }
      });
    }
    );
  },

  autoComplete: function (val,searchString) {

    if( val && val.length > 0){
      val = val.replace(/http([s]?):\/\/(www.)?/,'');
      val = val.toLowerCase();
      var urlbarValue = CLIQZEnvironment.lastSearch.toLowerCase();

      if( val.indexOf(urlbarValue) === 0 ) {
        // Logger.log('jsBridge autocomplete value:'+val,'osBridge1');
        osBridge.autocomplete(val);
      } else {
        var ls = JSON.parse(localStorage.recentQueries || '[]');
        for( var i in ls ) {
          if( ls[i].query.toLowerCase().indexOf(searchString.toLowerCase()) === 0 ) {
            osBridge.autocomplete(ls[i].query.toLowerCase());
            break;
          }
        }
      }
    }
  },

  crossTransform: function(element, x) {
    var platforms = ['', '-webkit-', '-ms-'];
    platforms.forEach(function(platform) {
      element.style[platform + 'transform'] = 'translate3d('+ x +'px, 0px, 0px)';
    });
  },

  setDimensions: function() {
    CLIQZEnvironment.CARD_WIDTH = window.innerWidth - CLIQZEnvironment.PADDING - 2 * CLIQZEnvironment.PEEK;
  },
  shiftResults: function() {
    var frames = document.getElementsByClassName('frame');
    for (var i = 0; i < frames.length; i++) {
      var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
      left = parseInt(left);
      left -= (left / (i + 1));
      CLIQZEnvironment.lastResults[i] && (CLIQZEnvironment.lastResults[i].left = left);
      frames[i].style.left = left + 'px';
    }
    CLIQZEnvironment.setResultNavigation(CLIQZEnvironment.lastResults);
  },

  setCardsHeight: function() {
    var ezs = document.getElementsByClassName('cqz-result-box');

    var body = document.body,
        documentElement = document.documentElement,
        height;

    if (typeof document.height !== 'undefined') {
      height = document.height; // For webkit browsers
    } else {
      height = Math.max( body.scrollHeight, body.offsetHeight,documentElement.clientHeight, documentElement.scrollHeight, documentElement.offsetHeight );
    }

    for(var i=0; i < ezs.length; i++) {
      ezs[i].style.height = null;
      if(ezs[i].clientHeight+40 < height) {
        ezs[i].style.height = height-40 + 'px';
      }
    }
  },
  renderResults: function(r) {

    var validCount = 0;

    r.encodedSearchString = encodeURIComponent(r._searchString);
    var engine = CLIQZEnvironment.getDefaultSearchEngine();
    var details = CliqzUtils.getDetailsFromUrl(engine.url);
    var logo = CliqzUtils.getLogoDetails(details);

    CLIQZEnvironment.setDimensions();

    if (CLIQZEnvironment.imgLoader) { CLIQZEnvironment.imgLoader.stop(); }
    CLIQZ.UI.main(resultsBox);

    var renderedResults = CLIQZ.UI.results({
      searchString: r._searchString,
      frameWidth: CLIQZEnvironment.CARD_WIDTH,
      results: r._results.map(function(r){
        r.type = r.style;
        r.left = (CLIQZEnvironment.CARD_WIDTH * validCount);
        r.url = r.val || '';
        r.title = r.comment || '';

        if (!r.invalid) {
          validCount++;
              //console.log('validCount', validCount);
            }
            return r;
          }),
      isInstant: false,
      isMixed: true,
      googleThis: {
        title: CliqzUtils.getLocalizedString('mobile_more_results_title'),
        action: CliqzUtils.getLocalizedString('mobile_more_results_action', engine.name),
        left: (CLIQZEnvironment.CARD_WIDTH * validCount),
        frameWidth: CLIQZEnvironment.CARD_WIDTH,
        searchString: r.encodedSearchString,
        searchEngineUrl: engine.url,
        logo: logo
      }
    });

    var showGooglethis = 1;
    if(!renderedResults.results[0] || renderedResults.results[0].data.template === 'noResult') {
      showGooglethis = 0;
    }

    CLIQZEnvironment.crossTransform(resultsBox, 0);

    resultsBox.style.width = (window.innerWidth * (renderedResults.results.length + showGooglethis)) + 'px';
    resultsBox.style.marginLeft = CLIQZEnvironment.PEEK + 'px';
    item_container.style.width = resultsBox.style.width;

    CLIQZEnvironment.stopProgressBar();
    CLIQZEnvironment.openLinksAllowed = true;

    CLIQZEnvironment.imgLoader = new CliqzDelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
    CLIQZEnvironment.imgLoader.start();

    return renderedResults;

  },

  setResultNavigation: function(results) {


    var showGooglethis = 1;
    if(!results[0] || results[0].data.template === 'noResult') {
      showGooglethis = 0;
    }


    var lastResultOffset = results.length ? results[results.length - 1].left || 0 : 0;
    var currentResultsCount = CLIQZEnvironment.currentResultsCount =  lastResultOffset / CLIQZEnvironment.CARD_WIDTH + showGooglethis + 1;

    if(running) {
      setTimeout(nextTest,2000);
    }

    var offset = 0;
    var w = window.innerWidth;

    CLIQZEnvironment.crossTransform(resultsBox, Math.min((offset * w), (w * currentResultsCount)));

    CLIQZEnvironment.numberPages = currentResultsCount;
    (function () {

      if( typeof CLIQZEnvironment.vp !== 'undefined' ) {
        CLIQZEnvironment.vp.destroy();
      }
      CLIQZEnvironment.currentPage = 0;
      CLIQZEnvironment.vp = CLIQZEnvironment.initViewpager();
    })();

    // CLIQZEnvironment.vp.goToIndex(1,0);

    if(document.getElementById('currency-tpl')) {
      document.getElementById('currency-tpl').parentNode.removeAttribute('url');
    }

  },
  cacheResults: function(req) {
    var response = JSON.parse(req.response);

    if(response.result && response.result.length > 0) {
      localStorage.cacheResult(response.q, {response: req.response});
    } else {
      console.log('results not cached !!!');
    }
  },
  putHistoryFirst: function(r) {
    for(var i = 0; i < r._results.length; i++) {
      if(r._results[i].style === 'cliqz-pattern' || r._results[i].style === 'favicon') {
        r._results.unshift(r._results.splice(i, 1)[0]);
        return 1;
      }
    }
    return 0;
  },
  resultsHandler: function (r) {
    
    if( CLIQZEnvironment.lastSearch !== r._searchString  ){
      CliqzUtils.log("u='"+CLIQZEnvironment.lastSearch+"'' s='"+r._searchString+"', returning","urlbar!=search");
      return;
    }

    var historyCount = CLIQZEnvironment.putHistoryFirst(r);

    r._results.splice(CLIQZEnvironment.RESULTS_LIMIT + historyCount);

    var cacheTS = localStorage.getCacheTS(r._searchString);
    if(cacheTS && Date.now() - cacheTS > CLIQZEnvironment.RICH_HEADER_CACHE_TIMEOUT) {
      CLIQZEnvironment.enrichResults(r, 0, historyCount);
    } else {
      CLIQZEnvironment.enrichResults(r, 1, historyCount);
    }

    CLIQZEnvironment.setCurrentQuery(r._searchString);

    renderedResults = CLIQZEnvironment.renderResults(r, historyCount);

    CLIQZEnvironment.lastResults = renderedResults.results;

    if(renderedResults.results.length > historyCount) {
      CLIQZEnvironment.autoComplete(renderedResults.results[historyCount].val,r._searchString);
    }

    CLIQZEnvironment.setCardsHeight();

    CLIQZEnvironment.setResultNavigation(renderedResults.results);

  },
  search: function(e, location_enabled, latitude, longitude) {
    if(!e || e === '') {
      resultsBox.style.display = 'none';
      window.document.getElementById('startingpoint').style.display = 'block';
      CLIQZ.UI.main(resultsBox);
      CLIQZEnvironment.initHomepage(true);
      CLIQZEnvironment.stopProgressBar();
      CLIQZEnvironment.lastResults = null;
      return;
    }
    e = e.toLowerCase().trim();

    localStorage.clearCache();
    CLIQZEnvironment.lastSearch = e;
    CLIQZEnvironment.location_enabled = location_enabled;
    if(location_enabled) {
      CLIQZEnvironment.USER_LAT = latitude;
      CLIQZEnvironment.USER_LNG = longitude;
    } else {
      CLIQZEnvironment.USER_LAT = undefined;
      CLIQZEnvironment.USER_LNG = undefined;
    }

    if(document.getElementById('recentitems')) {
      // document.getElementById('recentitems').style.display = 'none';
    }

    item_container = document.getElementById('cliqz-results');

    //TODO: work around for now
    urlbar.value = e;

    resultsBox.style.display = 'block';
    window.document.getElementById('startingpoint').style.display = 'none';

    if(e === 'testme') {
      initTest();
    }

    CLIQZEnvironment.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    //CliqzUtils.log(e,'XHR');
    (new CliqzAutocomplete.CliqzResults()).search(e, CLIQZEnvironment.resultsHandler);
  },

  initViewpager: function() {
    CLIQZEnvironment.initViewpager.views = {};
    CLIQZEnvironment.initViewpager.pageShowTs = Date.now();

    
    return new ViewPager(resultsBox, {
      pages: CLIQZEnvironment.numberPages,
      dragSize: window.innerWidth,
      prevent_all_native_scrolling: false,
      vertical: false,
      anim_duration:400,
      onPageScroll : function (scrollInfo) {
        currentScrollInfo = scrollInfo;
        offset = -scrollInfo.totalOffset;
        CLIQZEnvironment.crossTransform(resultsBox, (offset * CLIQZEnvironment.CARD_WIDTH));
        CLIQZEnvironment.openLinksAllowed = false;
      },

      onPageChange : function (page) {

        page = Math.abs(page);

        CLIQZEnvironment.initViewpager.views[page] =
          (CLIQZEnvironment.initViewpager.views[page] || 0) + 1;

        if(page && page !== CLIQZEnvironment.currentPage) {
          CliqzUtils.telemetry({
            type: 'activity',
            action: 'swipe',
            swipe_direction:
              page > CLIQZEnvironment.currentPage ? 'right' : 'left',
            current_position: page,
            views: CLIQZEnvironment.initViewpager.views[page],
            prev_position: CLIQZEnvironment.currentPage,
            prev_display_time: Date.now() - CLIQZEnvironment.initViewpager.pageShowTs
          });
        }

        CLIQZEnvironment.initViewpager.pageShowTs = Date.now();

        CLIQZEnvironment.openLinksAllowed = true;
        CLIQZEnvironment.currentPage = page;
      }
    });
  },

  startProgressBar: function() {
    if(CLIQZEnvironment.interval) {
      clearInterval(CLIQZEnvironment.interval);
    }
    var multiplier = parseInt(Math.ceil(window.innerWidth/100)),
    progress = document.getElementById('progress'),
    i = 0;
    CLIQZEnvironment.interval = setInterval(function() {
      i++;
      progress.style.width = (i*multiplier)+'px';
    },20);

    setTimeout(CLIQZEnvironment.stopProgressBar,4000);
  },

  stopProgressBar: function() {
    if(CLIQZEnvironment.interval) {
      clearInterval(CLIQZEnvironment.interval);
    }
    document.getElementById('progress').style.width = '0px';
  },
  getPref: function(pref, notFound){
    var mypref;
    if(mypref = localStorage.getItem(pref)) {
      return mypref;
    } else {
      return notFound;
    }
  },
  setPref: function(pref, val){
    //Logger.log('setPrefs',arguments);
    localStorage.setItem(pref,val);
  },
  setInterval: function(){ return setInterval.apply(null, arguments); },
  setTimeout: function(){ return setTimeout.apply(null, arguments); },
  clearTimeout: function(){ clearTimeout.apply(null, arguments); },
  tldExtractor: function(host){
    //lucian: temp - FIX IT
    return host.split('.').splice(-1)[0];
  },
  OS: 'android',
  isPrivate: function(){ return false; },
  isScrolling: false,
  getWindow: function(){ return window; },
  getDomNodeContent: function(el) {
    return el.outerHTML;
  },
  httpHandler: function(method, url, callback, onerror, timeout, data, asynchronous) {
    latestUrl = url;

    if(isMixerUrl(url)) {
      var cache = localStorage.getCachedResult && localStorage.getCachedResult(CLIQZEnvironment.lastSearch);
      if(cache) {
        callback(cache, CLIQZEnvironment.lastSearch);
        return;
      }
      if(!window.navigator.onLine) {
        if(typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'browser is offline' }));
        }
        isRequestFailed = true;
        Logger.log( 'request ' + url + ' will be deferred until the browser is online');
        return;
      }
    }
    var req = new XMLHttpRequest();
    if (asynchronous === undefined) {
      req.open(method, url, true);
    } else {
      req.open(method, url, asynchronous);
    }
    req.overrideMimeType && req.overrideMimeType('application/json');
    req.onload = function(){
      if(!parseInt) {
        return;
      } //parseInt is not a function after extension disable/uninstall

      var statusClass = parseInt(req.status / 100);
      if(statusClass === 2 || statusClass === 3 || statusClass === 0 /* local files */){

        if(isMixerUrl(url)){
          if(typeof CustomEvent !== 'undefined') {
            window.dispatchEvent(new CustomEvent('connected'));
          }
          CLIQZEnvironment.cacheResults(req);
          lastSucceededUrl = url;
          CliqzUtils.log('status '+req.status,'onload');
        }

        callback && callback(req);
      } else {
        Logger.log( 'loaded with non-200 ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler');
        if(isMixerUrl(url)){
          CliqzUtils.log('status '+re.status,'calling onerror');
        }
        onerror && onerror();
      }
    };
    req.onerror = function(){
      if(latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
        onerror && onerror();
        return;
      }
      if(typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of request error' }));
      }

      if(CLIQZEnvironment){
        if(isMixerUrl(url)){
          CliqzUtils.log('resendRequest(true)','onerror');
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, asynchronous);
        }
        Logger.log( 'error loading ' + url + ' (status=' + req.status + ' ' + req.statusText + ')', 'CLIQZEnvironment.httpHandler');
        onerror && onerror();
      }
    };
    req.ontimeout = function(){
      CliqzUtils.log('BEFORE','ONTIMEOUT');
      if(latestUrl !== url || url === lastSucceededUrl || !isMixerUrl(url)) {
        return;
      }
      if(typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('disconnected', { 'detail': 'This could be caused because of timed out request' }));
      }

      if(CLIQZEnvironment){ //might happen after disabling the extension
        CliqzUtils.log('RESENDING','ONTIMEOUT');
        if(isMixerUrl(url)){
          setTimeout(CLIQZEnvironment.httpHandler, 500, method, url, callback, onerror, timeout, data, asynchronous);
        }
        Logger.log( 'resending: timeout for ' + url, 'CLIQZEnvironment.httpHandler');
        onerror && onerror();
      }
    };

    if(callback){
      if(timeout){
        req.timeout = parseInt(timeout);
      } else {
        req.timeout = (method === 'POST'? 10000 : 1000);
      }
    }

    req.send(data);
    return req;
  },
  openLink: function(window, url){
    //Logger.log(CLIQZEnvironment.openLinksAllowed,'CLIQZEnvironment');
    if(/*CLIQZEnvironment.openLinksAllowed &&*/ url !== '#')  {
      if( url.indexOf('http') === -1 ) {
        url = 'http://' + url;
      }
      osBridge.openLink(url);
    }

    return false;
  },
  processHistory: function(data) {
    try {
      var items = data.results;
      var res = [];
      for (var i in items) {
        var item = items[i];
        res.push({
          style:   'favicon',
          value:   item.url,
          image:   '',
          comment: (typeof(item.title) !== 'undefined' ? item.title : 'no comment'),
          label:   ''
        });
      }
      return {results: res, query:data.query, ready:true};
    } catch (e) {
      Logger.log( 'historySearch', 'Error: ' + e);
    }
  },
  displayHistory: function(data){
    this.searchHistoryCallback(CLIQZEnvironment.processHistory(data));
  },
  historySearch: function(q, callback){
    this.searchHistoryCallback = callback;
    window.osBridge.searchHistory(q, 'CLIQZEnvironment.displayHistory');
  },
  getSearchEngines: function(){
    return ENGINES.map(function(e){
      e.getSubmissionForQuery = function(){
          //TODO: create the correct search URL
          return e.searchForm;
        };

        return e;
      });
  },
  distance: function(lon1, lat1, lon2, lat2) {
    var R = 6371; // Radius of the earth in km
    if(!lon2 || !lon1 || !lat2 || !lat1) { return 0; }
    var dLat = (lat2-lat1).toRad();  // Javascript functions in radians
    var dLon = (lon2-lon1).toRad();
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1.toRad()) * Math.cos(lat2.toRad()) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c; // Distance in km
    return d;
  },
  // mocked functions
  getEngineByName: function () {
    return ENGINES[0];
  },
  getEngineByAlias: function () {
    return ENGINES[0];
  },
  copyResult: function(val) {
    osBridge.copyResult(val);
  },
  addEventListenerToElements: function (elementSelector, eventType, listener) {
    Array.prototype.slice.call(document.querySelectorAll(elementSelector)).forEach(function (element) {
      element.addEventListener(eventType, listener);
    });
  },

  initHomepage: function(hideLastState) {
    if(hideLastState) {
      var start = document.getElementById('resetState');
      start && (start.style.display = 'none');
    }
    osBridge.getTopSites('News.displayTopSites', 20);
  },

  setDefaultSearchEngine: function(engine) {
    localStorage.setObject('defaultSearchEngine', engine);
    var engineDiv = document.getElementById('defaultEngine');
    if(engineDiv && CliqzAutocomplete.lastSearch) {
      engineDiv.setAttribute('url', engine.url + encodeURIComponent(CliqzAutocomplete.lastSearch));
      var moreResults = document.getElementById('moreResults');
      moreResults && (moreResults.innerHTML = CliqzUtils.getLocalizedString('mobile_more_results_action', engine.name));
      var noResults = document.getElementById('noResults');
      noResults && (noResults.innerHTML = CliqzUtils.getLocalizedString('mobile_no_result_action', engine.name));
    }
  },
  getDefaultSearchEngine: function() {
    return localStorage.getObject('defaultSearchEngine') || {name:'Google', url: 'http://www.google.com/search?q='};
  },
  getNoResults: function() {
    var engine = CLIQZEnvironment.getDefaultSearchEngine();
    var details = CliqzUtils.getDetailsFromUrl(engine.url);
    var logo = CliqzUtils.getLogoDetails(details);

    var result =  Result.cliqzExtra(
      {
        data:
          {
            template:'noResult',
            title: CliqzUtils.getLocalizedString('mobile_no_result_title'),
            action: CliqzUtils.getLocalizedString('mobile_no_result_action', engine.name),
            searchString: encodeURIComponent(CliqzAutocomplete.lastSearch),
            searchEngineUrl: engine.url,
            logo: logo
          },
        subType: JSON.stringify({empty:true})
      }
    );
    result.data.kind = ["CL"];
    return result;
  },
  setClientPreferences: function(prefs) {
    for (var key in prefs) {
      if (prefs.hasOwnProperty(key)) {
        CLIQZEnvironment.setPref(key, prefs[key]);
      }
    }
  }

};

CLIQZEnvironment.setCurrentQuery = function(query) {
  
  if(CLIQZEnvironment.getPref('incognito') === "true" || query.match(/http[s]{0,1}:/)) {
    return;
  }

  var recentItems = CLIQZEnvironment.getRecentQueries();
  
  if(!recentItems[0]) {
    recentItems = [{id: 1, query:query, timestamp:Date.now()}];
    localStorage.setItem('recentQueries',JSON.stringify(recentItems));
  }
  else if(recentItems[0].query.indexOf(query) + query.indexOf(recentItems[0].query) > -2 &&
          Date.now() - recentItems[0].timestamp < 5 * 1000) {
    recentItems[0] = {id: recentItems[0].id, query:query, timestamp:Date.now()};
    localStorage.setItem('recentQueries',JSON.stringify(recentItems));
  }
  else {
    recentItems.unshift({id: recentItems[0].id + 1, query:query,timestamp:Date.now()});
    recentItems = recentItems.slice(0,60);
    localStorage.setItem('recentQueries',JSON.stringify(recentItems));
  }
};


CLIQZEnvironment.getRecentQueries = function() {
  if(localStorage.getItem('recentQueries') == null) {
    localStorage.setItem('recentQueries','[]');
  }
  return JSON.parse(localStorage.getItem('recentQueries'));
};

CLIQZEnvironment.renderRecentQueries = function(scroll) {
  if(location.hash !== '#renderRecentQueries') {
    return;
  }
  var conversationsEl = document.getElementById('conversations');

  if( !document.getElementById('conversations') || !CliqzHandlebars.tplCache['conversations'] ) {
    setTimeout('CLIQZEnvironment.renderRecentQueries(true)',500);
    console.log('trying');
    return;
  }

  var myQueries = CLIQZEnvironment.getRecentQueries();
  // myQueries = myQueries.concat(JSON.parse(jsBridge.getTopSites()));

  myQueries.sort(function(a, b) {
    return a.timestamp - b.timestamp;
  });

  //myQueries.reverse();
  //myQueries = myQueries.splice(0,20);
  //myQueries.reverse();

  conversationsEl.innerHTML = CliqzHandlebars.tplCache.conversations({data:myQueries} );
  conversationsEl.style.width = window.innerWidth -20  + 'px';

  if(scroll) {
    document.getElementById('conversations').scrollTop = 5000;
  }

};


