var DEPENDENCY_STATUS = {
  NOT_LOADED: 'NOT_LOADED',
  LOADED: 'LOADED',
  GIVE_UP: 'GIVE_UP',
  RETRY_LIMIT: 20,
  retryCount: {}
}

var News = {
  
  _recentHistory: {},
  getNews: function(newsDomains) {
    console.log("%cloading news","background:blue;color:white");
    var cachedNews = localStorage.getObject('freshTab-news');
    if(cachedNews && cachedNews["top_h_news"]) {
      localStorage.setObject('freshTab-news',cachedNews.top_h_news);
      cachedNews = cachedNews.top_h_news;
    }
    if(cachedNews) {
      News.displayTopNews(cachedNews);
    }


    if(newsDomains) {

        var seen = {};
        newsDomains = newsDomains.filter(function(item) {
            return seen.hasOwnProperty(item) ? false : (seen[item] = true);
        });

        var hashedDomains = [];
        for(var i in newsDomains) {
            hashedDomains.push(CliqzUtils.hash(newsDomains[i]));
        }

        // history based news
        var method = "GET", 
        url = "https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com&lang=en%2Cde&locale=en-GB&q="
                + JSON.stringify(hashedDomains),
        callback = function(data) {
            try {
                var sResponse = JSON.parse(data.responseText);
                var news = sResponse.results[0].news;
                var myNews = [], domain;
                for(var i in newsDomains) {
                    domain = newsDomains[i];
                    if(news[domain]) {
                      for(var j in news[domain]) {
                        if(!News._recentHistory[news[domain][j].url]) {
                          news[domain][j].type = "history";  
                          myNews.push(news[domain][j]);
                          break;
                        }
                      }
                    }
                }
                News.collectNews('history',myNews);
            } catch(e) {
                console.error(e);
            }
        },
        onerror = function() {
          console.error("news error",arguments);
          setTimeout(News.getNews,1500);
        },
        timeout = function() {
          console.error("timeout error",arguments);
          News.getNews(newsDomains);
        },
        data = null, 
        asynchronous = true;
        CLIQZEnvironment.httpHandler(method, url, callback, onerror, timeout, data, asynchronous);     
    }

    // temporary freshtab replacement for mobile
    var method = "GET", 
    url = "https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de",
    callback = function(data) { 
        try {
            var sResponse = JSON.parse(data.responseText);
            News.collectNews('standard',sResponse.results[0].articles);
        } catch(e) {
            console.error(e);
        }
    },
    onerror = function() {
      console.error("news error",arguments);
      setTimeout(News.getNews,1500);
    },
    timeout = function() {
      console.error("timeout error",arguments);
      News.getNews();
    },
    data = null, 
    asynchronous = true;
    CLIQZEnvironment.httpHandler(method, url, callback, onerror, timeout, data, asynchronous);

  },

  collectNews: function(type,news) {
    if(type=="history") {
        News.newsHistory = news;
    }
    if(type=="standard") {
        News.newsStandard = news;
    }
    if(News.newsHistory !== null && News.newsStandard) {
       if(News.newsHistory) {
          News.displayTopNews(News.newsHistory.concat(News.newsStandard));
       } else {
         News.displayTopNews(News.newsStandard);
       }
    }
  },
  displayTopNews: function(top_news) {

    News.newsHistory = News.newsStandard = null;
    if(!top_news) {
      return;
    }

    //console.log('%crendering top news', 'color:green', top_news)
    top_news = top_news.map(function(r){
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        description: r.description,
        short_title: r.short_title || r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        type: r.type,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style
      };
    });
    var dependencyStatus = News.getDependencyStatus('topnews');
    if(dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
      return setTimeout(News.displayTopNews, 100, top_news);
    } else if(dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
      return;
    }
    var topNews = CliqzHandlebars.tplCache['topnews'];
    var div = window.document.getElementById('topNews');
    div.innerHTML = topNews(top_news);
    CLIQZEnvironment.addEventListenerToElements('.topNewsLink', 'click', function () {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topnews',
        target_index: this.dataset.index
      });
    });
    window.dispatchEvent(new CustomEvent("newsLoadingDone"));
  },

  getRecentHistory: function(history) {
    for(var i in history.results) {
         News._recentHistory[history.results[i].url] = true;
    }
  },


  displayTopSites: function (list) {
    var dependencyStatus = News.getDependencyStatus('topsites');
    if(dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
      return setTimeout(News.displayTopSites, 100, list);
    } else if(dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
      return;
    }

    if(!list.length) {
      list = mockedHistory;
    }

    osBridge.searchHistory("","News.getRecentHistory");

    var indexList = {}, myList = [], domain, domainArr, mainDomain, newsDomainList = [];
    for(var i=0; i<list.length; i++) {
      domain = list[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
      domainArr = domain.split('.');
      newsDomainList.push(domainArr[domainArr.length-2] + '.' + domainArr[domainArr.length-1]);
      mainDomain = domainArr[domainArr.length-2].substr(0,10);
      mainDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
      list[i].mainDomain = mainDomain;
      indexList[mainDomain] = list[i];
    }

    News.getNews(newsDomainList);

    for(i in indexList) {
      myList.push(indexList[i]);
    }
    list = myList;

    if(list.length < 4) {
      list = list.concat(mockedHistory);
    }

    list = list.splice(0,4);

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
        style: logo.style,
        mainDomain: r.mainDomain,
        baseDomain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[0],
        domain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1]
      };
    });
    var topSites = CliqzHandlebars.tplCache['topsites'];
    var div = window.document.getElementById('topSites');
    div.innerHTML = topSites(list);
    CLIQZEnvironment.addEventListenerToElements('.topSitesLink', 'click', function () {
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topsites',
        target_index: this.dataset.index
      });
    });
  },
  // wait for logos, templates, and locale to be loaded
  getDependencyStatus: function(template) {
    if(DEPENDENCY_STATUS.retryCount[template] === undefined) {
      DEPENDENCY_STATUS.retryCount[template] = 0;
    }
    if(!CliqzUtils.BRANDS_DATABASE.buttons || !CliqzHandlebars.tplCache[template] || CliqzUtils.getLocalizedString('freshtab_top_sites') === 'freshtab_top_sites') {
      return DEPENDENCY_STATUS.retryCount[template]++ < DEPENDENCY_STATUS.RETRY_LIMIT ? DEPENDENCY_STATUS.NOT_LOADED : DEPENDENCY_STATUS.GIVE_UP;
    }
    DEPENDENCY_STATUS.retryCount[template] = 0;
    return DEPENDENCY_STATUS.LOADED;
  }
}