import config from "core/config";

Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

var ONE_MINUTE = 60 * 1000,
    ONE_DAY = 24 * 60 * ONE_MINUTE,
    ONE_MONTH = 30 * ONE_DAY,
    SEND_INTERVAL = 20 * ONE_MINUTE,
    NEWS_CACHE_INTERVAL = 30 * ONE_MINUTE,
    DATA_CACHE_INTERVAL = ONE_DAY,
    t0, // timers
    news_domains = {238777345: true, 205726722: true, 168693251: true, 116229637: true, 796680: true, 146672137: true, 150921227: true, 108523534: true, 6124559: true, 143261715: true, 12929557: true, 100682630: true, 69293591: true, 143002826: true, 205798148: true, 177381402: true, 45585948: true, 248842781: true, 42941135: true, 113298437: true, 74275360: true, 68212258: true, 217546276: true, 113393926: true, 184245020: true, 11737641: true, 5759018: true, 240903211: true, 38094382: true, 77319610: true, 45291057: true, 107727411: true, 211123764: true, 136808501: true, 106867254: true, 101941303: true, 206470712: true, 9179572: true, 115867194: true, 245704031: true, 74661948: true, 245440575: true, 34623041: true, 239814667: true, 138353806: true, 15713350: true, 16120391: true, 71113800: true, 101589065: true, 77201485: true, 12235342: true, 83345677: true, 80880326: true, 44296786: true, 2511443: true, 135964756: true, 12722702: true, 138610627: true, 247843929: true, 141036122: true, 242153487: true, 79047610: true, 114601207: true, 2306320: true, 3780195: true, 113796197: true, 207641190: true, 4574823: true, 46500457: true, 78449258: true, 79476327: true, 83668076: true, 8639085: true, 101314158: true, 115675761: true, 239942081: true, 182576755: true, 77474825: true, 5982326: true, 10922616: true, 102241915: true, 169723599: true, 34606719: true, 111313536: true, 45490817: true, 82065538: true, 68105860: true, 70195478: true, 244682053: true, 173483201: true, 6296201: true, 15870603: true, 102881421: true, 243084430: true, 182872720: true, 147724433: true, 5891625: true, 183218837: true, 251470487: true, 70630552: true, 4454032: true, 9136283: true, 184420634: true, 182419617: true, 115978914: true, 147148965: true, 109152934: true, 181374631: true, 244002985: true, 71790765: true, 240115886: true, 146427852: true, 108380849: true, 172655282: true, 47479667: true, 213331124: true, 145917300: true, 145307935: true, 100667580: true, 74231485: true, 148999872: true, 38686913: true, 242132674: true, 109253315: true, 237890166: true, 1794758: true, 136180937: true, 73809610: true, 79569783: true, 145858766: true, 148531919: true, 80690384: true, 77777528: true, 14345939: true, 465620: true, 75759830: true, 69361267: true, 5320408: true, 2189348: true, 143166170: true, 108568271: true, 44469468: true, 216124125: true, 236458718: true, 235505375: true, 209425120: true, 141793488: true, 3439569: true, 208318327: true, 134687466: true, 76735094: true, 36104430: true, 181700849: true, 80218356: true, 73353973: true, 73348137: true, 108598008: true, 73453305: true, 6427775: true, 113652989: true, 201572094: true, 149024640: true, 76644610: true, 213411883: true, 13675268: true, 43951400: true, 9792262: true, 250929793: true, 77984132: true, 137528788: true, 69620493: true, 107003152: true, 44971794: true, 37350675: true, 251443988: true, 171558165: true, 104780054: true, 103752472: true, 102857348: true, 106180769: true, 81150235: true, 239458076: true, 248724254: true, 210663045: true, 102999840: true, 208083746: true, 113095973: true, 45315878: true, 5921576: true, 10276572: true, 112979754: true, 40762155: true, 207521902: true, 207458364: true, 75783985: true, 72713242: true, 6529331: true, 181698195: true, 79743113: true, 15923252: true, 76821306: true, 75387708: true, 117337888: true, 104278336: true, 145555265: true, 141155138: true, 150613827: true, 14817092: true, 67320133: true, 170718023: true, 214714184: true, 245292361: true, 242422332: true, 6525262: true, 240417088: true, 83508049: true, 201557843: true, 13942670: true, 142977877: true, 183456569: true, 171598683: true, 212983134: true, 71632735: true, 80485432: true, 243524240: true, 245082466: true, 39404899: true, 112652137: true, 106215399: true, 184043374: true, 72277360: true, 167796712: true, 143968607: true, 76965235: true, 180898825: true, 108090229: true, 1857910: true, 16295799: true, 16063865: true, 79320954: true, 789884: true, 249189098: true, 5357951: true, 150359424: true, 236142977: true, 141526403: true, 39472004: true, 201774982: true, 202902407: true, 76948360: true, 9392012: true, 175540202: true, 168119182: true, 175305615: true, 208726208: true, 3462868: true, 45794709: true, 6407576: true, 137825482: true, 136594333: true, 244434847: true, 178958752: true, 71039905: true, 74071458: true, 143121315: true, 4592036: true, 170085797: true, 241173928: true, 1271721: true, 77870507: true, 68737437: true, 244009288: true, 181502899: true, 180095924: true, 33802677: true, 72797110: true, 238595002: true, 76471229: true, 72705985: true, 140391363: true, 36616645: true, 141856929: true, 246096328: true, 46924745: true, 150613963: true, 6448076: true, 44614606: true, 81471951: true, 76971985: true, 78534610: true, 177036313: true, 67532110: true, 43531093: true, 177387947: true, 242783198: true, 69472735: true, 216355379: true, 111033825: true, 134355940: true, 140081125: true, 105372134: true, 47271399: true, 140910568: true, 70748137: true, 171773418: true, 173399207: true, 108705261: true, 243466225: true, 40583031: true, 82141174: true, 76431864: true, 237976063: true, 171363: true, 174373373: true, 148890453: true},
    hBasedNews = config.freshTabHistoryNews,
    hBasedNewsNumber = 3,
    topNewsMaxNumber = 30;

function log(s){
  CliqzUtils.log(s, 'CliqzFreshTabNews');
}

var CliqzFreshTabNews = {
  _isStale: function() {
    var now = Date.now();
    return parseInt(CliqzUtils.getPref('freshTabNewsTime', '0')) + NEWS_CACHE_INTERVAL < now;
  },
    _isHdataStale: function() {
    var now = Date.now();
    return parseInt(CliqzUtils.getPref('freshTabDTime', '0')) + DATA_CACHE_INTERVAL < now;
  },
  init: function(){
    CliqzUtils.clearTimeout(t0);

    t0 = CliqzUtils.setTimeout(CliqzFreshTabNews.updateNews, ONE_MINUTE);

    log('init');
  },
  unload: function(){
    CliqzUtils.clearTimeout(t0);

    log('unloaded');
  },

  updateNews: function(callback){
    CliqzUtils.clearTimeout(t0);
    var bypassCache = CliqzUtils.getPref('freshTabByPassCache');
    if (CliqzFreshTabNews._isStale() || bypassCache || !getNewsFromLS()){
      var bBasedNewsRequirement = [];
      if (bypassCache) {
        log("Bypassing cache");
      }

      if (hBasedNews) {
        getHbasedNewsList(hBasedNewsNumber).then(function(bBasedNewsRequirement){
          log(bBasedNewsRequirement);
          createNewsList(bBasedNewsRequirement, callback);
        });
      } else {
        createNewsList([], callback);
      }
    }
    log('update tick')
    t0 = CliqzUtils.setTimeout(CliqzFreshTabNews.updateNews, 1 * ONE_MINUTE);
  },
  getNews: function (){
    return new Promise(function (resolve, reject)  {
      var cache = getNewsFromLS();

      if (cache && !CliqzFreshTabNews._isStale() && CliqzUtils.getPref('freshTabByPassCache', false) === false) {
        log("Reading from Local Storage", cache)
        log(cache);
        resolve(cache);
      } else {
        log("Reading live data");
        CliqzFreshTabNews.updateNews(function(){
          //log("Update news Done", getNewsFromLS())
          resolve(getNewsFromLS());
        });
      }
    });
  }
};

function getNewsFromLS(){
  var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
  var cache = ls.getItem('freshTab-news');
  if(cache){
    log(cache);
    return JSON.parse(cache);
  } else {
    return false;
  }
}

//personalized news
function getHbasedNewsList(hBasedNewsNumber){
  return new Promise(function (resolve, reject)  {
    var bypassCache = CliqzUtils.getPref('freshTabByPassCache');
    var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
    var cache = ls.getItem("freshTab-data");

    if (CliqzFreshTabNews._isHdataStale()||(!(cache))||(bypassCache)){
      log('Compose hbased recommendations.');
      var topic_db_path = {},
        news_results = [],
        path_array = [],
        news_dcache = {},
        hash_list = [];

      CliqzHistoryManager.PlacesInterestsStorage._execute(
        'SELECT * FROM moz_places WHERE last_visit_date>:date',
          ['url', 'last_visit_date', 'visit_count'],
        function(result){
          var url_desc = CliqzUtils.getDetailsFromUrl(result.url);
          //check if domain is in the list of news domains
          var c = news_domains[parseInt(CliqzUtils.hash(url_desc.domain))];
          if (c){
            // take visit count only for the exact domain and sub domains, not for articles' url
            path_array = url_desc.path.split('/');
            var last_path_element  = path_array[path_array.length - 1];
            if (!(last_path_element)||(path_array.length === 1) || (last_path_element === '')||(last_path_element.indexOf('index') === 0)){
              getTopicBasedOnUrl(url_desc, result.visit_count, topic_db_path);
            }else{
              getTopicBasedOnUrl(url_desc, 1, topic_db_path);
            }
          }
        },
        {
          date: (Date.now() - ONE_MONTH) * 1000
        }).then(
          function() {
            topic_db_path = normalizeUrlBasedCount(topic_db_path);
            log(topic_db_path);
            if (isNotEmpty(topic_db_path)){
              news_results = getNewsDistributionUrlBased(topic_db_path, hBasedNewsNumber);
            }else{
              news_results = [];
            }

            news_dcache['domain_list'] = news_results;

            if ((cache)&&(JSON.parse(cache))&&JSON.parse(cache).hash_list){
              hash_list = JSON.parse(cache).hash_list;
            }else{
              hash_list = [];
            }

            if (news_results.length !== 0){
              news_dcache['hash_list'] = randomizRequest(hash_list, news_results);
            }else{
              news_dcache['hash_list'] = [];
            }

            log(news_dcache);
            var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
            if (ls) ls.setItem("freshTab-data", JSON.stringify(news_dcache));

            CliqzUtils.setPref('freshTabDTime', '' + Date.now());
            resolve(news_dcache);
          }
        );
    }else{
      log('Get hbased recommendations from cache.');
      resolve(JSON.parse(cache));
    }
  });
}

function randomizRequest(request_list, history_data){
  function randomValueOf(obj) {
    var keys = Object.keys(obj);
    var len = keys.length;
    var rnd = Math.floor(Math.random()*len);
    return parseInt(keys[rnd]);
  }

  function sortFunct(i, j){
    return i < j;
  }

  function subsRandomElement(request_list, history_hash_data, element_to_add){
    var random_hashes = request_list.filter(function(i){ return history_hash_data.indexOf(i) < 0;});

    var rn = random_hashes[randomValueOf(random_hashes)];
    if (element_to_add){
      request_list[request_list.indexOf(rn)] = element_to_add;
    }else{
      request_list[request_list.indexOf(rn)] = randomValueOf(news_domains);
    }
  }

  if (history_data.length !== 0){
    var randomised_array_size = 10,
      buffer_value = 0,
      number_of_elements_to_change = 0,
      history_hash_data = [];

    // fill array with up to necessary number
    while (request_list.length < randomised_array_size){
      request_list.push(randomValueOf(news_domains));
    }

    // transform domains to hash form
    history_data.forEach(function(val){
        buffer_value = parseInt(CliqzUtils.hash(val[0].split('/')[0]));
        history_hash_data.push(buffer_value);
      });

    // fill array with necessary domain hashes
    history_hash_data.forEach(function(val){
      if (request_list.indexOf(val) === -1){
        //substitute the necessary element
        subsRandomElement(request_list, history_hash_data, val);
        number_of_elements_to_change += 1
      }
    });

    while (number_of_elements_to_change > 0){
      //substitute additional rand. elements
      subsRandomElement(request_list, history_hash_data, false);
      number_of_elements_to_change -= 1
    }

    request_list.sort(sortFunct);

    return request_list;
  }else{
    return [];
  }
}

function getNewsDistributionUrlBased(topic_db, records_number){

  function sortFunct(i, j){
    return i.ratio < j.ratio;
  }

  function subDomainCount(subDomain, rn, pathList){

    var subDomainRatioThreshold = 0.6,
      subDomainList = [],
      added_at_level = 0;

    for (var k in subDomain) {
      subDomain[k]['key'] = k;
      subDomainList.push(subDomain[k]);
    }

    subDomainList.sort(sortFunct);
    var sumDomainRatio = 0;

    for (var i in subDomainList){
      if (subDomainList[i].ratio > subDomainRatioThreshold){

        sumDomainRatio += subDomainList[i].ratio;

        //records to add according to proportion of domian in general results
        var records_to_add = Math.min(Math.ceil(subDomainList[i].ratio*rn), rn - added_at_level);

        var cur_path_list = pathList.slice();
        cur_path_list.push(subDomainList[i].key);

        var res = subDomainCount(subDomainList[i].sub, records_to_add, cur_path_list);

        var added_at_sub_level = res[0];
        var addedRatio = res[1];

        added_at_level += added_at_sub_level;
        var r = records_to_add - added_at_sub_level;
        if (((1 - addedRatio) > subDomainRatioThreshold)&&(r > 0)){
          results_list.push([cur_path_list, r]);
          added_at_level += r;
        }
      }
    }

    return [added_at_level, sumDomainRatio];
  }

  var results_list = [],
    path_list = [],
    topDomainsList = [],
    domainCountThreshold = 20,
    newsDistribution = [],
    addedRecords = 0;

  //take the first three most frequent domains
  for (var k in topic_db) {
    if (topic_db[k].count > domainCountThreshold){
      topic_db[k]['key'] = k;
      topDomainsList.push(topic_db[k]);
    }
  }

  if (isNotEmpty(topDomainsList)){
    topDomainsList.sort(sortFunct);
    topDomainsList = topDomainsList.slice(0,3);

    switch (topDomainsList.length){
      case 1:
        newsDistribution = [3];
        break;
      case 2:
        newsDistribution = [2, 1];
        break;
      case 3:
        newsDistribution = [1,1,1];
        break;
    }

    for (var i in newsDistribution){
      // add path for subdomains
      addedRecords = subDomainCount(topDomainsList[i].sub, newsDistribution[i], [topDomainsList[i].key])[0];
      // if not all records were added on subdomain level, add on domain level
      if ((newsDistribution[i] - addedRecords) > 0){
        results_list.push([[topDomainsList[i].key], newsDistribution[i] - addedRecords]);
      }
    };

    // add the most friquent domain for the fallback
    results_list.push([[topDomainsList[0].key], 0]);

    // reconstract the urls
    for (var i in results_list){
      results_list[i][0] = results_list[i][0].join('/');
    }
  }
  return results_list;
}

function getTopicBasedOnUrl(url_desc, visit_count, topic_dict){

  function countSubCategories(urlSplit, urlSet, visit_count, i){
    var subDomain = '';

    //max level of sub domain is 5, for case of special urls
    if ((i < urlSet.length)&&(i < 4)){
      subDomain = urlSet[i];
      //if number of sublevels is bigger than one and it is the last level
      ///exclude 'index*' as sub domain
      //sub domain contains only one letter or more than 15, do not count
      if (!(subDomain)||(subDomain.indexOf('index') === 0)||(subDomain.length < 2)||(subDomain.length > 15)||((urlSet.length != 1)&&(i >= (urlSet.length-1)))){
          subDomain = '';
      }
    }

    if (subDomain){
      urlSplit[subDomain] = urlSplit[subDomain] || {count: 0, sub:{}};
      urlSplit[subDomain].count += visit_count;

      i += 1;
      urlSplit[subDomain].sub = countSubCategories(urlSplit[subDomain].sub, urlSet, visit_count, i);
    }
    return urlSplit;
  }

  //parse topics based on mapping
  var domain = url_desc.domain;

  //add count on domain level
  topic_dict[domain] = topic_dict[domain] || {count: 0, sub: {}};
  topic_dict[domain].count += visit_count;

  //split url by "/"
  var keys_set = url_desc.path.split(/[\/\#\?]/);
  //cut the first empty part
  if (!(keys_set[0])) keys_set = keys_set.slice(1);

  topic_dict[domain].sub = countSubCategories(topic_dict[domain].sub, keys_set, visit_count, 0);
}

function createNewsList(hcache, callback){

  function checkDuplicates(url, res_list){
    for (var k in res_list){
      for (var e in res_list[k]){
        if (k == "hb_news"){
          for (var i in res_list[k][e]){
            if (res_list[k][e][i]['url'] == url){
              log('Url is already presented in resutls: ' + url);
              return false;
            }
          }
        }else{
          if (res_list[k][e]['url'] == url){
            log('Url is already presented in resutls: ' + url);
            return false;
          }
        }
      }
    }
    return true;
  }

  function mergeNews(input_list, results, news_type, domain, path, number_to_add){

    var i = 0;
    while ((number_to_add > 0)&&(i < input_list.length)){
      //check duplication in results
      //check if article already been read, not for humanly made news
      //url should contain path sub path
      if ((checkDuplicates(input_list[i]['url'], results))&&((news_type == 'top_h_news')||checkIfInHistory(input_list[i]['url']))
          &&((path === '')||(input_list[i]['url'].indexOf(path) !== -1))){

        var article_to_add = input_list[i];
        article_to_add['news_type'] = news_type;
        if (domain != ''){
          results[news_type] = results[news_type] || {};
          results[news_type][domain] = results[news_type][domain] || [];

          results[news_type][domain].push(article_to_add);

        }else{
          results[news_type] = results[news_type] || [];
          results[news_type].push(article_to_add);
        }
        number_to_add -= 1;
      }
      i += 1;
    }
    return number_to_add;
  }

  function checkIfInHistory(url){

    var query = CliqzHistoryManager.getHistoryService().getNewQuery();
    query.beginTimeReference = query.TIME_RELATIVE_NOW;
    query.beginTime = -365 * 24 * 60 * 60 * 1000000; // 30 days ago
    query.endTimeReference = query.TIME_RELATIVE_NOW;
    query.endTime = 0; // now
    query.uri = CliqzHistoryManager.makeURI(url);
    query.uriIsPrefix = true;

    var options = CliqzHistoryManager.getHistoryService().getNewQueryOptions();
    var result = CliqzHistoryManager.getHistoryService().executeQuery(query, options);

    //log(result.root);
    var cont = result.root;
    cont.containerOpen = true;

    if (cont.childCount == 0){
      cont.containerOpen = false;
      return true;
    }else{
      log('Url is already in hisotry: ' + url);
      cont.containerOpen = false;
      return false;
    }
  }

  var NEWS_PROVIDER = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com', //url humanly made list of top news
      top_news_url = NEWS_PROVIDER + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale(),

      RICH_HEADER = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=hb-news.cliqz.com',
      topic_news_url = RICH_HEADER + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale(), // news by domain and topik
      topic_news_url = topic_news_url + '&q=',
      news_urls = [],
      news_results = {},
      news_data_cache = {},
      history_data;

  news_data_cache = hcache;

  // allways add random padding to the expected news
  // domains to avoid privacy leaks
  topic_news_url += JSON.stringify(news_data_cache.hash_list)

  history_data = news_data_cache.domain_list;

  news_urls.push([top_news_url, topNewsMaxNumber, 'top_h_news']);
  if (isNotEmpty(news_data_cache)){
    news_urls.push([topic_news_url, hBasedNewsNumber, 'hb_news']);
  }

  //call news backend
  log(news_urls);
  var promises = news_urls.map(function(parameters){
    return new Promise(function(resolve, reject){
      CliqzUtils.httpGet(
        parameters[0],
        function(res){
          resolve({'res': JSON.parse(res.response || '{}'),
            'limit':parameters[1],
            'news_type':parameters[2]});
        },
        reject,
        5000
      );
    }).catch(function () {
      log('Error fetching news. Check CLIQZEnvironment.httpHandler errors.');
      return {};
    });
  });

  //merge results
  Promise.all(promises).then(function(vals){
    var list_to_merge = [],
      domain = '',
      path = '',
      limit = 0,
      not_added_news = 0,
      cache_full_update_flag = true;

    //iterate over results
    vals.forEach(function(val){
        // merge results depends from type
        if ((val.res)&&(val.res.results)&&val.res.results[0]){
          if (val.news_type == 'hb_news'){
            log(val.res);
            var hbased_dict = val.res.results[0].news;

            history_data.forEach(function(d){
              domain = d[0].split('/')[0];
              path = d[0];
              limit = d[1] + not_added_news;
              list_to_merge = hbased_dict[domain] || [];
              not_added_news =  mergeNews(list_to_merge, news_results, val.news_type, domain, path, limit);
              // if sublevel was not merged try on domain level
              if ((domain != path)&&(not_added_news > 0)){
                not_added_news =  mergeNews(list_to_merge, news_results, val.news_type, domain, domain, not_added_news);
              }
            });
          }else if (val.news_type == 'top_h_news') {
            list_to_merge = val.res.results[0].articles;
            mergeNews(list_to_merge, news_results, val.news_type, '', '', val.limit);
            if (val.res.results[0].news_version){
              news_results['top_news_version'] =  val.res.results[0].news_version;
            }
          }
        }else{
          cache_full_update_flag = false;
          log('FreshTab news of type are failded to retrive: ' + val.news_type);
        }
    });
    if (news_results.hb_news){
      if (Object.keys(news_results.hb_news).reduce(function(prev, i){ return prev + Object.keys(news_results.hb_news[i]).length }, 0) < hBasedNewsNumber){
        delete news_results.hb_news;
        log('Not enough hbased news.');
      }
    }
    updateFreshTabNewsCache(news_results, cache_full_update_flag);
    if(callback) callback();
  });
}

function isNotEmpty(ob){
  for(var i in ob){ return true;}
  return false;
}

function updateFreshTabNewsCache(news_results, cache_full_update_flag) {
  if (isNotEmpty(news_results)) {
    var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
    if (ls) ls.setItem("freshTab-news", JSON.stringify(news_results));
    //if not all news sources were retrieved, try again in a minute
    if (cache_full_update_flag){
      CliqzUtils.setPref('freshTabNewsTime', '' + Date.now());
      log("FreshTab news cache is updated");
    }else {
      log("FreshTab news cache is partially updated, not all sources were retrieved.");
    }
  }else{
    log("Fetched news list is empty, FreshTab news cache is not updated");
  }
}

function normalizeUrlBasedCount(topic_dict){

  function normalizeRecursion(subTopic, sum){
    for (var k in subTopic){
      subTopic[k]['ratio'] = subTopic[k].count/sum;
      subTopic[k].sub = normalizeRecursion(subTopic[k].sub, subTopic[k].count);
    }
    return subTopic;
  }

  var domain_sum = 0;

  for (var k in topic_dict){
    domain_sum += topic_dict[k].count;
  }

  for (var k in topic_dict) {
    topic_dict[k]['ratio'] = topic_dict[k].count/domain_sum;
    topic_dict[k].sub = normalizeRecursion(topic_dict[k].sub, topic_dict[k].count);
  }

  return topic_dict;
}

export default CliqzFreshTabNews;

