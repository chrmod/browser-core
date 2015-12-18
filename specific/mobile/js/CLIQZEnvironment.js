CLIQZEnvironment = {
  TEMPLATES_PATH: 'templates/',
  LOCALE_PATH: 'locale/',
  RESULTS_LIMIT: 3,
  RICH_HEADER_CACHE_TIMEOUT: 15000,

  storeQueryTimeout: null,

  log: Logger.log,
  logCounter: Logger.logCounter,

  callRichHeader: function(searchString, url, callback) {
    var richHeaderUrl = "https://newbeta.cliqz.com/api/v1/rich-header?path=/map";
    richHeaderUrl += "&q=" + searchString;
    richHeaderUrl += "&bmresult=" + url;
    if(CLIQZEnvironment.location_enabled) {
      richHeaderUrl += "&loc=" + CLIQZEnvironment.USER_LAT + "," + CLIQZEnvironment.USER_LNG + ",U";
    }
    var request = new XMLHttpRequest();
    request.open('GET', encodeURI(richHeaderUrl), true);
    request.onreadystatechange = function () {
      if(request.status == 200 && request.readyState == 4) {
        callback(JSON.parse(request.response));
      }
    }
    request.send();
  },

  enrichResults: function(r, startIndex) {
    r._results.forEach( function (result, index) {
      // if(index < startIndex) {
      if(index > 0 || index < startIndex) { // kicking out enriching cards after the first 1
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
            if(document.getElementById("ez-" + index)) {
              document.getElementById("ez-" + index).innerHTML = CliqzHandlebars.tplCache[template]({data: r.results[0].data});
            }
          }
        }
      });
    }
    );
  },

  autoComplete: function (val) {
    if( val && val.length > 0){
      val = val.replace(/http([s]?):\/\/(www.)?/,"");
      val = val.toLowerCase();
      var urlbarValue = CLIQZEnvironment.lastSearch.toLowerCase();

      if( val.indexOf(urlbarValue) == 0 ) {
        // Logger.log("jsBridge autocomplete value:"+val,"osBridge1");
        osBridge.autocomplete(val);
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
    CLIQZEnvironment.PEEK = 20,
    CLIQZEnvironment.PADDING = 16,
    CLIQZEnvironment.CARD_WIDTH = window.innerWidth - CLIQZEnvironment.PADDING - 2 * CLIQZEnvironment.PEEK;
  },

  renderResults: function(r, showGooglethis, validCount, historyCount) {

    r.encodedSearchString = encodeURIComponent(r._searchString);

    CLIQZEnvironment.setDimensions();

    if (CLIQZEnvironment.imgLoader) { CLIQZEnvironment.imgLoader.stop(); }
    CLIQZ.UI.main(resultsBox);

    CLIQZEnvironment.crossTransform(resultsBox, 0);


    resultsBox.style.width = (window.innerWidth * (r._results.length + showGooglethis)) + 'px';
    resultsBox.style.marginLeft = CLIQZEnvironment.PEEK + 'px';
    item_container.style.width = resultsBox.style.width;

    CLIQZEnvironment.stopProgressBar();
    CLIQZEnvironment.openLinksAllowed = true;

    CLIQZEnvironment.imgLoader = new CliqzDelayedImageLoader('#cliqz-results img[data-src]');
    CLIQZEnvironment.imgLoader.start();

    return CLIQZ.UI.results({
      searchString: r._searchString,
      frameWidth: CLIQZEnvironment.CARD_WIDTH,
      results: r._results.map(function(r, idx){
        r.type = r.style;
        r.left = (CLIQZEnvironment.CARD_WIDTH * validCount);
        r.frameWidth = CLIQZEnvironment.CARD_WIDTH;
        r.url = r.val || '';
        r.title = r.comment || '';

        if (!r.invalid) {
          validCount++;
              //console.log("validCount", validCount);
            }
            return r;
          }),
      isInstant: false,
      googleThis: {
        left: (CLIQZEnvironment.CARD_WIDTH * validCount),
        show: showGooglethis,
        frameWidth: CLIQZEnvironment.CARD_WIDTH,
        searchString: r.encodedSearchString
      }
    });
  },

  setResultNavigation: function(results, showGooglethis, validCount) {
    var dots = document.getElementById("cliqz-swiping-dots-new-inside");
    var currentResultsCount = CLIQZEnvironment.currentResultsCount =  results.length+showGooglethis;
    if(dots) {
      dots.innerHTML = "";
      var myEl;
      // myEl.innerText = "H";
      // myEl.id = "dots-page-"+0;
      // dots.appendChild(myEl);

      for(var i=0;i<currentResultsCount;i++) {
        myEl = document.createElement("span");
        myEl.innerText = ".";
        myEl.id = "dots-page-"+(i);
        if( i==0 ){
          myEl.className = "active";
        }

        dots.appendChild(myEl);
      }
    }
    //<span class="active">·</span>

    if(running) {
      setTimeout(nextTest,2000);
    }

    validCount += showGooglethis;
    var offset = 0;
    var w = window.innerWidth;

    CLIQZEnvironment.crossTransform(resultsBox, Math.min((offset * w), (w * validCount)));

    var googleAnim = document.getElementById("googleThisAnim");
    CLIQZEnvironment.numberPages = validCount;
    (function (numberPages) {

      if( typeof CLIQZEnvironment.vp !== "undefined" ) {
        CLIQZEnvironment.vp.destroy();
      }
      CLIQZEnvironment.currentPage = 0;
      CLIQZEnvironment.vp = CLIQZEnvironment.initViewpager();
    })(validCount);

    // CLIQZEnvironment.vp.goToIndex(1,0); 

    if(document.getElementById("currency-tpl")) {
      document.getElementById("currency-tpl").parentNode.removeAttribute("url");
    }
  },
  cacheResults: function(req) {
    var response = JSON.parse(req.response);

    if(response.result && response.result.length > 0) {
      localStorage.cacheResult(response.q, {response: req.response});
    } else {
      console.log("results not cached !!!");
    }
  },
  resultsHandler: function (r, requestHolder) {

    if( CLIQZEnvironment.lastSearch != r._searchString  ){
      CliqzUtils.log("u='"+CLIQZEnvironment.lastSearch+"'' s='"+r._searchString+"', returning","urlbar!=search");
      return;
    }

    var historyCount = 0;
    for(var i = 0; i < r._results.length; i++) {
      if(r._results[i].style === "cliqz-pattern" || r._results[i].style === "favicon") {
        historyCount++;
      }
    }

    r._results.splice(CLIQZEnvironment.RESULTS_LIMIT + historyCount);

    CLIQZEnvironment.autoComplete(r._results[0].val);
    
    var cacheTS = localStorage.getCacheTS(r._searchString);
    if(cacheTS && Date.now() - cacheTS > CLIQZEnvironment.RICH_HEADER_CACHE_TIMEOUT) {
      CLIQZEnvironment.enrichResults(r, 0);
    } else {
      CLIQZEnvironment.enrichResults(r, 1);
    }

    clearTimeout(CLIQZEnvironment.storeQueryTimeout);
    CLIQZEnvironment.storeQueryTimeout = setTimeout(function() { 
      CLIQZEnvironment.setCurrentQuery(r._searchString); 
    },2000);

    CliqzUtils.log("-------------rendering "+r._searchString, "QUERY");
    CliqzUtils.log(arguments,"ARGUMENTS OF REMOTE CALL");


    var showGooglethis = 1;
    var validCount = 0;

    if(r._results[0].data.template == "noResult") { 
      showGooglethis = 0;
    }


    renderedResults = CLIQZEnvironment.renderResults(r, showGooglethis, validCount, historyCount);

    // CLIQZEnvironment.renderRecentQueries(true);

    CLIQZEnvironment.setResultNavigation(r._results, showGooglethis, renderedResults.results.length);
  },
  search: function(e, location_enabled, latitude, longitude) {
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
      // document.getElementById('recentitems').style.display = "none";
    }

    item_container = document.getElementById('cliqz-results');
    var currentScrollInfo = {
      page: 0,
      totalOffset: 0,
      pageOffset: 0
    }; 

    if(!e || e == "") {
      resultsBox.style.display = 'none';
      window.document.getElementById("startingpoint").style.display = 'block';
      CLIQZ.UI.main(resultsBox);
      CLIQZEnvironment.init(-1);
      CLIQZEnvironment.stopProgressBar();
      return;
    }
    resultsBox.style.display = 'block';
    window.document.getElementById("startingpoint").style.display = 'none';

    if(e.toLowerCase() == "testme") {
      initTest();
    }
    CLIQZEnvironment.startProgressBar();


    // start XHR call ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    CliqzUtils.log(e,"XHR");
    (new CliqzAutocomplete.CliqzResults()).search(e, CLIQZEnvironment.resultsHandler);
  },

  initViewpager: function() {
    var dots = document.getElementById("cliqz-swiping-dots-new-inside");
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

        dots.innerHTML = "";
        var myEl;

        for(var i=0;i<CLIQZEnvironment.currentResultsCount;i++) {
          myEl = document.createElement("span");
          myEl.innerText = ".";
          myEl.id = "dots-page-"+(i);
          if( i==page ){
            myEl.className = "active";
          }

          dots.appendChild(myEl);
        }

        CLIQZEnvironment.openLinksAllowed = true;
        CLIQZEnvironment.currentPage = page;
      }
    });
  },

  getScript: function(pathToScript) {
    var request , callback, resp ;

    callback = function (r) {
      return function () {
        if ( this.readyState == 4 ) {
          if (this.status != 200 ) {
            resp="" ;
          } 
          else {
            resp= this.responseText ;
          }
          //console.log(resp);
          eval("myVal = {"+ resp + "}" ) ;
        }
      }
    }

      request = new XMLHttpRequest() ;
      request.open('GET', req, false);
      request.onreadystatechange = callback(request) ;
      request.send(null);

      while(myVal === null){}
        return myVal;
    },

    setRecent: function(msg, key){ 
      console.log(msg,"[["+key+"]]") ;
    },

    startProgressBar: function() {
      if(CLIQZEnvironment.interval) {
        clearInterval(CLIQZEnvironment.interval);
      }
      var multiplier = parseInt(Math.ceil(window.innerWidth/100)), 
      progress = document.getElementById("progress"),
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
      document.getElementById("progress").style.width = "0px";
    },

    table: function(args){ console.table(arguments) },
    getPref: function(pref, notFound){
    localStorage.setItem("showConsoleLogs", true);
    var mypref;
    if(mypref = localStorage.getItem(pref)) {
      return mypref;
    } else {
      return notFound;
    }
  },
  getPrefs: function(){
    var myPrefs = [], 
    myPref = {};
    for(var i=0, len=localStorage.length; i<len; i++) {
      myPref = {};
      var key = localStorage.key(i);
      var value = localStorage[key];
      myPref[key] = value;
      myPrefs.push(myPref)
    }
    return myPrefs;
  },
  setPref: function(pref, val){
    //Logger.log("setPrefs",arguments);
    localStorage.setItem(pref,val);
  },
  setInterval: function(){ return setInterval.apply(null, arguments) },
  setTimeout: function(){ return setTimeout.apply(null, arguments) },
  clearTimeout: function(){ clearTimeout.apply(null, arguments) },
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
        if(typeof CustomEvent != "undefined") {
          window.dispatchEvent(new CustomEvent("disconnected", { "detail": "browser is offline" }));
        }
        isRequestFailed = true;
        Logger.log( "request " + url + " will be deferred until the browser is online");
        return;
      }
    }
    var req = new XMLHttpRequest();
    if (asynchronous === undefined) {
      req.open(method, url, true);
    } else {
      req.open(method, url, asynchronous);
    }
    req.overrideMimeType('application/json');
    req.onload = function(){
      if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

      var statusClass = parseInt(req.status / 100);
      if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){

        if(isMixerUrl(url)){
          if(typeof CustomEvent != "undefined") {
            window.dispatchEvent(new CustomEvent("connected"));
          }
          CLIQZEnvironment.cacheResults(req);
          lastSucceededUrl = url;
          CliqzUtils.log("status "+req.status,"onload");
        }

        callback && callback(req);
      } else {
        Logger.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
        if(isMixerUrl(url)){
          CliqzUtils.log("status "+re.status,"calling onerror");
        }
        onerror && onerror();
      }
    }
    req.onerror = function(){
      if(latestUrl != url || url == lastSucceededUrl || !isMixerUrl(url)) {
        return;
      }
      if(typeof CustomEvent != "undefined") {
        window.dispatchEvent(new CustomEvent("disconnected", { "detail": "This could be caused because of request error" }));
      }

      if(CLIQZEnvironment){
        if(isMixerUrl(url)){
          CliqzUtils.log("resendRequest(true)","onerror");
        }
        resendRequest(true);
        Logger.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
        onerror && onerror();
      }
    }
    req.ontimeout = function(){
      CliqzUtils.log("BEFORE","ONTIMEOUT");
      if(latestUrl != url || url == lastSucceededUrl || !isMixerUrl(url)) {
        return;
      }
      if(typeof CustomEvent != "undefined") {
        window.dispatchEvent(new CustomEvent("disconnected", { "detail": "This could be caused because of timed out request" }));
      }

      if(CLIQZEnvironment){ //might happen after disabling the extension
        CliqzUtils.log("RESENDING","ONTIMEOUT");
        resendRequest(true);
        Logger.log( "resending: timeout for " + url, "CLIQZEnvironment.httpHandler");
        onerror && onerror();
      }
    }
    
    if(callback){
      if(timeout){
        req.timeout = parseInt(timeout)
      } else {
        req.timeout = (method == 'POST'? 10000 : 4000);
      }
    }

    req.send(data);
    return req;
  },
  openLink: function(window, url, newTab){
    Logger.log(CLIQZEnvironment.openLinksAllowed,"CLIQZEnvironment");
    if(/*CLIQZEnvironment.openLinksAllowed &&*/ url !== "#")  { 
      if( url.indexOf("http") == -1 ) {
        url = "http://" + url;
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
          comment: (typeof(item.title) != "undefined" ? item.title : "no comment"),
          label:   ''
        });
      }
      return {results: res, query:data.query, ready:true}
      // this.searchHistoryCallback({results: [], query:data.query, ready:true}); // history is kicked out
    } catch (e) {
      Logger.log( "historySearch", "Error: " + e);
    }
  },
  displayHistory: function(data){
    this.searchHistoryCallback(CLIQZEnvironment.processHistory(data));
  },
  historySearch: function(q, callback, searchParam, sessionStart){
    this.searchHistoryCallback = callback;
    window.osBridge.searchHistory(q);
  },
  getSearchEngines: function(){
    return ENGINES.map(function(e){
      e.getSubmissionForQuery = function(q){
          //TODO: create the correct search URL
          return e.searchForm;
        }

        return e
      });
  },
  distance: function(lon1, lat1, lon2, lat2) {
    var R = 6371; // Radius of the earth in km
    if(!lon2 || !lon1 || !lat2 || !lat1) { return 0 }
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
  getNews: function() {
    console.log("Start getting news");
    return CliqzFreshTabNews.getNews().then(CLIQZEnvironment.displayTopNews);
  },
  displayTopNews: function(news) {

    var top_news = news.top_h_news;

    console.log('top news', top_news)
    top_news = top_news.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        description: r.description,
        short_title: r.short_title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      }
    });
    if(!CliqzHandlebars.tplCache.topnews) {
      return setTimeout(CLIQZEnvironment.displayTopNews, 100, news);
    }
    var topNews = CliqzHandlebars.tplCache["topnews"];
    var div = window.document.getElementById('topNews');
    div.innerHTML = topNews(top_news);
  },
  displayTopSites: function (list) {
    if(!CliqzHandlebars.tplCache.topsites) {
      return setTimeout(CLIQZEnvironment.displayTopSites, 100, list);
    }
    list = list.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      }
    });
    var topSites = CliqzHandlebars.tplCache["topsites"];
    var div = window.document.getElementById('topSites');
    div.innerHTML = topSites(list);
  }, init: function(state) {
    if(state == -1) {
      CLIQZEnvironment.getNews();
      osBridge.getTopSites("CLIQZEnvironment.displayTopSites", 5);
    }
  }

}

CLIQZEnvironment.setCurrentQuery = function(query) {
  CLIQZEnvironment._currentQuery = query;
  var recentItems = CLIQZEnvironment.getRecentQueries();
  if(!recentItems[0] || (recentItems[0] && recentItems[0].query != query) )  {
    recentItems.unshift({query:query,timestamp:(new Date()).getTime()});
    recentItems = recentItems.slice(0,60);
    localStorage.setItem("recentQueries",JSON.stringify(recentItems));  
    CLIQZEnvironment.renderRecentQueries(true);
  }

}


CLIQZEnvironment.getRecentQueries = function(query) {
  if(localStorage.getItem("recentQueries") == null) {
    localStorage.setItem("recentQueries","[]");
  }
  return JSON.parse(localStorage.getItem("recentQueries")); 
}

CLIQZEnvironment.renderRecentQueries = function(scroll) {
  if(location.hash != "#renderRecentQueries") {
    return;
  }
  var conversationsEl = document.getElementById("conversations");

  if( !document.getElementById("conversations") || !CliqzHandlebars.tplCache["conversations"] ) {
    setTimeout("CLIQZEnvironment.renderRecentQueries(true)",500);
    console.log("trying");
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

  conversationsEl.innerHTML = CliqzHandlebars.tplCache.conversations({data:myQueries} )
  conversationsEl.style.width = window.innerWidth -20  + 'px';

  if(scroll) {
    document.getElementById("conversations").scrollTop = 5000
  } 

}
