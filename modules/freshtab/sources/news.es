Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzLanguage.jsm');

var ONE_MINUTE = 60 * 1000,
    ONE_DAY = 24 * 60 * ONE_MINUTE,
    ONE_MONTH = 30 * ONE_DAY,
    SEND_INTERVAL = 20 * ONE_MINUTE,
    CACHE_INTERVAL = 30 * ONE_MINUTE,
    t0, // timers
    news_domains = {},
    hBasedNews = false,
    hBasedNewsNumber = 5;

function log(s){
	CliqzUtils.log(s, 'CliqzFreshTabNews');
}

var CliqzFreshTabNews = {
  _isStale: function() {
    var now = Date.now();
    return parseInt(CliqzUtils.getPref('freshTabNewsTime', '0')) + CACHE_INTERVAL < now;
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
    if (CliqzFreshTabNews._isStale() || CliqzUtils.getPref('freshTabByPassCache') || !getNewsFromLS()){
      var bBasedNewsRequirement = [];
      if (bypassCache) {
        log("Bypassing cache");
      }

      if (hBasedNews) {
        getHbasedNewsList().then(function(bBasedNewsRequirement){
          createNewsList(bBasedNewsRequirement, hBasedNewsNumber, callback);
        });
      } else {
        createNewsList([], 0, callback);
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
        resolve(cache);
      } else {
        log("Reading live data")
        CliqzFreshTabNews.updateNews(function(){
          //log("Update news Done", getNewsFromLS())
          resolve(getNewsFromLS());
        })
      }
    });
  }
};

function getNewsFromLS(){
  var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
  var cache = ls.getItem('freshTab-news');
  if(cache){
    return JSON.parse(cache);
  } else {
    return false
  }
}

//personalized news
function getHbasedNewsList(){
  return new Promise(function (resolve, reject)  {
    var topic_db_path = {};
    var news_results;

    CliqzHistoryManager.PlacesInterestsStorage._execute(
      'SELECT * FROM moz_places WHERE last_visit_date>:date',
        ['url', 'last_visit_date', 'visit_count'],
      function(result){
        var url_desc = CliqzUtils.getDetailsFromUrl(result.url);
        var domain = url_desc.domain;
        //check if domain is in the list of news domains
        var c = news_domains[domain];
        if (c){
          getTopicBasedOnUrl(url_desc, result, topic_db_path);
        }
      },
      {
        date: (Date.now() - ONE_MONTH) * 1000
      }).then(
        function() {
          topic_db_path = normalizeUrlBasedCount(topic_db_path);
          news_results = getNewsDistributionUrlBased(topic_db_path, 5);

          resolve(news_results);
        }
      );
  });
}

function getNewsDistributionUrlBased(topic_db, records_number){
  var results_list = [];

  function sortFunct(i, j){
    return i.ratio < j.ratio;
  }

  function subDomainCount(subDomain, rn, pathList){

    var subDomainCountThreshold = 20,
        subDomainRatioThreshold = 0.4,
        subDomainList = [];

    var added_at_level = 0;

    for (var k in subDomain) {
      subDomain[k]['key'] = k;
      subDomainList.push(subDomain[k]);
    }

    subDomainList.sort(sortFunct);
    var sumDomainRatio = 0;

    for (var i in subDomainList){
      if ((subDomainList[i].count > subDomainCountThreshold)||
        (subDomainList[i].ratio > subDomainRatioThreshold)){

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

  var path_list = [];

  subDomainCount(topic_db, records_number, path_list);
  log(results_list);

  return results_list;
}

function getTopicBasedOnUrl(url_desc, result, topic_dict){

  function countSubCategories(urlSplit, urlSet, result, i){
    var subDomain = '';

    //max level of sub domain is 5, for case of special urls
    if ((i < urlSet.length)&&(i < 4)){
      var subDomain = urlSet[i];
      //if number of sublevels is bigger than one and it is the last level
      //or sub domain contains only one letter, do not count
      if (!(subDomain)||(subDomain.length < 2)||((urlSet.length != 1)&&(i >= (urlSet.length-1)))){
          subDomain = '';
      }
    }

    if (subDomain){
      urlSplit[subDomain] = urlSplit[subDomain] || {count: 0, sub:{}};
      urlSplit[subDomain].count += result.visit_count;

      i += 1;
      urlSplit[subDomain].sub = countSubCategories(urlSplit[subDomain].sub, urlSet, result, i);
      return urlSplit;
    } else {
      return {};
    }
  }

  //parse topics based on mapping
  var domain = url_desc.domain;

  //add count on domain level
  topic_dict[domain] = topic_dict[domain] || {count: 0, sub: {}};
  topic_dict[domain].count += result.visit_count;

  //split url by "/"
  var keys_set = url_desc.path.split(/[\/\#\?]/);

  //cut the first empty part
  if (!(keys_set[0])) keys_set = keys_set.slice(1);

  topic_dict[domain].sub = countSubCategories(topic_dict[domain].sub, keys_set, result, 0);
}

function createNewsList(history_data, number_to_get, callback){

  function checkDuplicates(url, res_list){
    for (var k in res_list){
      for (var e in res_list[k]){
        if (res_list[k][e]['url'] == url){
          return false;
        }
      }
    }
    return true;
  }

  function mergeNews(input_list, results, news_type, domain, number_to_add){

    var i = 0;
    while ((number_to_add > 0)&&(i < input_list.length)){
      //check duplication in results
      if ((checkDuplicates(input_list[i]['url'], results))
        //check if article already been read, not for humanly made news
        &&((news_type == 'top_h_news')||checkIfInHistory(input_list[i]['url']))){
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
    return i;
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
      return true
    }else{
      cont.containerOpen = false;
      return false;
    }
  }

  var NEWS_PROVIDER = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com', //url humanly made list of top news
      top_news_url = NEWS_PROVIDER + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale(),
      general_news_url = '' + number_to_get, // url best of twitter
      topic_news_url = '', // news by domain and topik
      news_urls = [],
      news_results = {};

  for (var i in history_data){
    var domain = history_data[i][0][0],
        url = topic_news_url + domain;
    //add subdomain level
    if (history_data[i][0].length > 1){
      url += ' ' + history_data[i][0][history_data[i][0].length - 1];
    }
    news_urls.push([url, history_data[i][1], 'hb_news', domain]);
  }

  news_urls.push([top_news_url, 99, 'top_h_news', '']);
  if (number_to_get > 0) { news_urls.push([general_news_url, number_to_get, 'top_gen_news', '']); }
  log(news_urls);
  //call news backend
  var promises = news_urls.map(function(parameters){
    return new Promise(function(resolve, reject){
      CliqzUtils.httpGet(
        parameters[0],
        function(res){
          resolve({'res': JSON.parse(res.response),
            'limit':parameters[1],
            'news_type':parameters[2],
            'news_domain':parameters[3]});
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
    var added = 0;
    var list_to_merge = [];
    //iterate over results
    vals.forEach(function(val){
      if (isNotEmpty(val)){

        if (val.news_type == 'hb_news'){
          list_to_merge = val.res.data.news;
        }else if (val.news_type == 'top_gen_news'){
          list_to_merge = val.res.docs;
        }else{
          list_to_merge = val.res.results[0].articles;
        }
        mergeNews(list_to_merge, news_results, val.news_type, val.news_domain, val.limit);

      }
    });
    updateFreshTabNewsCache(news_results);
    if(callback) callback();
  });
}

function isNotEmpty(ob){
  for(var i in ob){ return true;}
  return false;
}

function updateFreshTabNewsCache(news_results) {
  if (isNotEmpty(news_results)) {
    var ls = CliqzUtils.getLocalStorage('chrome://cliqz/content/freshtab/freshtab.html');
    if (ls) ls.setItem("freshTab-news", JSON.stringify(news_results));

    CliqzUtils.setPref('freshTabNewsTime', '' + Date.now());
    log("FreshTab news cache is updated");
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
