var DEPENDENCY_STATUS = {
  NOT_LOADED: 'NOT_LOADED',
  LOADED: 'LOADED',
  GIVE_UP: 'GIVE_UP',
  RETRY_LIMIT: 20,
  retryCount: {}
}
var NEWS_DOMAINS = {238777345: true, 205726722: true, 168693251: true, 116229637: true, 796680: true, 146672137: true, 150921227: true, 108523534: true, 6124559: true, 143261715: true, 12929557: true, 100682630: true, 69293591: true, 143002826: true, 205798148: true, 177381402: true, 45585948: true, 248842781: true, 42941135: true, 113298437: true, 74275360: true, 68212258: true, 217546276: true, 113393926: true, 184245020: true, 11737641: true, 5759018: true, 240903211: true, 38094382: true, 77319610: true, 45291057: true, 107727411: true, 211123764: true, 136808501: true, 106867254: true, 101941303: true, 206470712: true, 9179572: true, 115867194: true, 245704031: true, 74661948: true, 245440575: true, 34623041: true, 239814667: true, 138353806: true, 15713350: true, 16120391: true, 71113800: true, 101589065: true, 77201485: true, 12235342: true, 83345677: true, 80880326: true, 44296786: true, 2511443: true, 135964756: true, 12722702: true, 138610627: true, 247843929: true, 141036122: true, 242153487: true, 79047610: true, 114601207: true, 2306320: true, 3780195: true, 113796197: true, 207641190: true, 4574823: true, 46500457: true, 78449258: true, 79476327: true, 83668076: true, 8639085: true, 101314158: true, 115675761: true, 239942081: true, 182576755: true, 77474825: true, 5982326: true, 10922616: true, 102241915: true, 169723599: true, 34606719: true, 111313536: true, 45490817: true, 82065538: true, 68105860: true, 70195478: true, 244682053: true, 173483201: true, 6296201: true, 15870603: true, 102881421: true, 243084430: true, 182872720: true, 147724433: true, 5891625: true, 183218837: true, 251470487: true, 70630552: true, 4454032: true, 9136283: true, 184420634: true, 182419617: true, 115978914: true, 147148965: true, 109152934: true, 181374631: true, 244002985: true, 71790765: true, 240115886: true, 146427852: true, 108380849: true, 172655282: true, 47479667: true, 213331124: true, 145917300: true, 145307935: true, 100667580: true, 74231485: true, 148999872: true, 38686913: true, 242132674: true, 109253315: true, 237890166: true, 1794758: true, 136180937: true, 73809610: true, 79569783: true, 145858766: true, 148531919: true, 80690384: true, 77777528: true, 14345939: true, 465620: true, 75759830: true, 69361267: true, 5320408: true, 2189348: true, 143166170: true, 108568271: true, 44469468: true, 216124125: true, 236458718: true, 235505375: true, 209425120: true, 141793488: true, 3439569: true, 208318327: true, 134687466: true, 76735094: true, 36104430: true, 181700849: true, 80218356: true, 73353973: true, 73348137: true, 108598008: true, 73453305: true, 6427775: true, 113652989: true, 201572094: true, 149024640: true, 76644610: true, 213411883: true, 13675268: true, 43951400: true, 9792262: true, 250929793: true, 77984132: true, 137528788: true, 69620493: true, 107003152: true, 44971794: true, 37350675: true, 251443988: true, 171558165: true, 104780054: true, 103752472: true, 102857348: true, 106180769: true, 81150235: true, 239458076: true, 248724254: true, 210663045: true, 102999840: true, 208083746: true, 113095973: true, 45315878: true, 5921576: true, 10276572: true, 112979754: true, 40762155: true, 207521902: true, 207458364: true, 75783985: true, 72713242: true, 6529331: true, 181698195: true, 79743113: true, 15923252: true, 76821306: true, 75387708: true, 117337888: true, 104278336: true, 145555265: true, 141155138: true, 150613827: true, 14817092: true, 67320133: true, 170718023: true, 214714184: true, 245292361: true, 242422332: true, 6525262: true, 240417088: true, 83508049: true, 201557843: true, 13942670: true, 142977877: true, 183456569: true, 171598683: true, 212983134: true, 71632735: true, 80485432: true, 243524240: true, 245082466: true, 39404899: true, 112652137: true, 106215399: true, 184043374: true, 72277360: true, 167796712: true, 143968607: true, 76965235: true, 180898825: true, 108090229: true, 1857910: true, 16295799: true, 16063865: true, 79320954: true, 789884: true, 249189098: true, 5357951: true, 150359424: true, 236142977: true, 141526403: true, 39472004: true, 201774982: true, 202902407: true, 76948360: true, 9392012: true, 175540202: true, 168119182: true, 175305615: true, 208726208: true, 3462868: true, 45794709: true, 6407576: true, 137825482: true, 136594333: true, 244434847: true, 178958752: true, 71039905: true, 74071458: true, 143121315: true, 4592036: true, 170085797: true, 241173928: true, 1271721: true, 77870507: true, 68737437: true, 244009288: true, 181502899: true, 180095924: true, 33802677: true, 72797110: true, 238595002: true, 76471229: true, 72705985: true, 140391363: true, 36616645: true, 141856929: true, 246096328: true, 46924745: true, 150613963: true, 6448076: true, 44614606: true, 81471951: true, 76971985: true, 78534610: true, 177036313: true, 67532110: true, 43531093: true, 177387947: true, 242783198: true, 69472735: true, 216355379: true, 111033825: true, 134355940: true, 140081125: true, 105372134: true, 47271399: true, 140910568: true, 70748137: true, 171773418: true, 173399207: true, 108705261: true, 243466225: true, 40583031: true, 82141174: true, 76431864: true, 237976063: true, 171363: true, 174373373: true, 148890453: true}
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
            var hash = CliqzUtils.hash(newsDomains[i])
            if(NEWS_DOMAINS[hash]) {
              hashedDomains.push(hash);
            }
        }

        // history based news
        var method = "GET", 
        url = "https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com" + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale() + "&q="
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