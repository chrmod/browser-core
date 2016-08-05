import {
  utils as coreUtils,
  language as coreLanguage,
  historyManager as coreHistoryManager,
} from 'core/cliqz';

import NewsCache from 'freshtab/news-cache';

const ONE_MINUTE = 60 * 1000;
const ONE_DAY = 24 * 60 * ONE_MINUTE;
const ONE_MONTH = 30 * ONE_DAY;
const NEWS_DOMAINS_LIST = { 143209350: true, 178958752: true, 240417088: true, 34265112: true, 108380849: true, 169904261: true, 14839075: true, 70195478: true, 71051945: true, 135964756: true, 5357951: true, 146672137: true, 71790765: true, 6124559: true, 36104430: true, 147530643: true, 2511443: true, 136594333: true, 80384420: true, 5982326: true, 102857348: true, 184420634: true, 43614181: true, 148890453: true, 74231485: true, 141454235: true, 245292361: true, 147724433: true, 10929352: true, 75216604: true, 73453305: true, 148999872: true, 180898825: true, 140232211: true, 184542214: true, 83508049: true, 209425120: true, 76821306: true, 114075108: true, 137825482: true, 113436635: true, 113762528: true, 169382283: true, 175784971: true, 70630552: true, 139156437: true, 106463557: true, 248962108: true, 77474825: true, 16295799: true, 2997498: true, 108598008: true, 82809060: true, 209792714: true, 37794597: true, 15870603: true, 242777366: true, 48888990: true, 75759830: true, 72712697: true, 112934951: true, 83668076: true, 15923252: true, 82052855: true, 136713798: true, 144696931: true, 107727411: true, 40762155: true, 74516787: true, 172455381: true, 101023053: true, 45585948: true, 11737641: true, 68773555: true, 134355940: true, 12929557: true, 150613827: true, 140838989: true, 106867254: true, 74963860: true, 78966730: true, 36616645: true, 138634750: true, 107003152: true, 43523480: true, 174373373: true, 37350675: true, 112927802: true, 215164206: true, 5921576: true, 181374631: true, 71156889: true, 147460736: true, 37775008: true, 45490817: true, 39404899: true, 105504157: true, 4157585: true, 143002826: true, 76064334: true, 43103236: true, 136180937: true, 111313536: true, 40196024: true, 180198292: true, 248734759: true, 8639085: true, 138715048: true, 5891625: true, 42307527: true, 4454032: true, 109605547: true, 247233032: true, 178958795: true, 144944349: true, 37848620: true, 44614606: true, 69266294: true, 14210958: true, 149187007: true, 142675546: true, 113298437: true, 68531186: true, 201774982: true, 243041052: true, 75099086: true, 246602533: true, 104614242: true, 102881421: true, 113652989: true, 5759018: true, 179468108: true, 40815482: true, 72270683: true, 16553575: true, 2487332: true, 108090229: true, 76965235: true, 115271636: true, 243832777: true, 145526129: true, 248906303: true, 243524240: true, 145917300: true, 45285918: true, 13995383: true, 136808501: true, 251470487: true, 73353973: true, 183218837: true, 140810706: true, 81471951: true, 236458718: true, 82065538: true, 141793488: true, 2306320: true, 137667936: true, 108843334: true, 205558795: true, 80443423: true, 182967959: true, 171949145: true, 13956180: true, 145735407: true, 71039905: true, 6296201: true, 15363587: true, 104780054: true, 38607057: true, 10922616: true, 69472735: true, 238098952: true, 106180769: true, 175305615: true, 174752059: true, 6407576: true, 203545094: true, 789884: true, 209713987: true, 105365837: true, 81150235: true, 216243619: true, 140910568: true, 106652389: true, 79676979: true, 33736488: true, 6161388: true, 247014589: true, 243466225: true, 68105860: true, 37181072: true, 12722702: true, 168156548: true, 108523534: true, 117319634: true, 74661948: true, 76644610: true, 113095973: true, 13942670: true, 82442170: true, 251365296: true, 71632735: true, 6525262: true, 49548588: true, 10398446: true, 9892497: true, 77870507: true, 104278336: true, 173863644: true, 44768277: true, 79047610: true, 16063865: true, 115867194: true, 182341254: true, 37933409: true, 215753401: true, 215753398: true, 38686913: true, 234985930: true, 80093344: true, 248077469: true, 143998729: true, 113796197: true, 241173928: true, 115978914: true, 215437472: true, 112979754: true, 79476327: true, 108585199: true, 796680: true, 44175368: true, 211123764: true, 79743113: true, 245440575: true, 247103814: true, 243466268: true, 134230232: true, 37827792: true, 179374898: true, 6529331: true, 241863379: true, 82141174: true, 67904957: true, 239942081: true, 171233903: true, 4574823: true, 2189348: true, 465620: true, 4592036: true, 148532105: true, 150066519: true, 143689046: true, 111257651: true, 79660549: true, 201572094: true, 39527122: true, 111149262: true, 101198513: true, 6397677: true, 44437765: true, 170749808: true, 250561709: true, 202902407: true, 136954268: true, 206470712: true, 242422332: true, 34378709: true, 205726722: true, 71950061: true, 149024640: true, 73348137: true, 67532110: true, 76948360: true, 106494023: true, 149652911: true, 168693251: true, 207458364: true, 247500342: true, 44296786: true, 236142977: true, 9179572: true, 101941303: true, 206528356: true, 4384695: true, 8996919: true, 71759466: true, 112434967: true, 49945901: true, 40389129: true, 5807052: true, 245704031: true, 180095924: true, 45794709: true, 213331124: true, 1355159: true, 210459977: true, 3483613: true, 109662177: true, 216514350: true, 80690384: true, 138139369: true, 144770664: true, 214714184: true, 80717687: true, 33802677: true, 143261715: true, 141526403: true, 4504905: true, 182872720: true, 77071: true, 15971319: true, 114467095: true, 243466254: true, 241730435: true, 5972966: true, 170940909: true, 108568271: true, 81969172: true, 9583554: true, 242204751: true, 69620493: true, 109152934: true, 76484655: true, 143166170: true, 103752472: true, 81658130: true, 139923274: true, 68485914: true, 211939645: true, 135719188: true, 74755100: true, 137978005: true, 180948925: true, 3977446: true, 170718023: true, 2718777: true, 217706451: true, 140391363: true, 41314131: true, 113800544: true, 105372134: true, 4021948: true, 79513675: true, 42041884: true, 182576755: true, 105880115: true, 184043374: true, 216124125: true, 245082466: true, 145858766: true, 150359424: true, 145555265: true, 14345939: true, 173065324: true, 148531919: true, 112652137: true, 101314158: true, 106647141: true, 239119048: true, 135951735: true, 205798148: true, 44971794: true, 207641190: true, 210161238: true, 172336998: true, 102430744: true, 169904458: true, 167796712: true, 237422416: true, 15299156: true, 212983134: true, 42941135: true, 78449258: true, 136269672: true, 168119182: true, 110038646: true, 1857910: true, 36909212: true, 110344242: true, 77515611: true, 111033825: true, 116229637: true, 244002985: true, 1794758: true, 213411883: true, 34606719: true, 1271721: true, 139715282: true, 238595002: true, 181502899: true, 217546276: true, 77781318: true, 75180473: true, 207882325: true, 177387947: true, 75446711: true, 134453699: true, 243466315: true, 108671135: true, 168879163: true, 216598077: true, 170628400: true, 241982610: true, 106030056: true, 174171886: true, 183456569: true, 4771222: true, 72797110: true, 75387708: true, 243084430: true, 67320133: true, 134687466: true, 48573962: true, 248724254: true, 39472004: true, 147148965: true, 44025793: true, 247738870: true, 83094546: true, 80961546: true, 76971985: true, 6355568: true, 72264310: true, 34623041: true, 78462725: true, 139925606: true, 79317962: true, 46500457: true };
const PRESS_CLIPPING_MAPPING = { 218038589: 'xing-pressespiegel_burda' };

const HBASED_RECOM_CACHE_UPDATE_INTERVAL = ONE_DAY;
const HABASED_NEWS_CACHE_UPDATE_INTERVAL = 30 * ONE_MINUTE;
const TOP_NEWS_CACHE_UPDATE_INTERVAL = 30;

const topNewsTypeKey = 'topnews';
const hbasedNewsTypeKey = 'yournews';
const prClBurdaNewsTypeKey = 'pr-cl-burda-news';
const breakingNewsTypeKey = 'breaking-news';


function log(s) {
  coreUtils.log(s, 'CliqzFreshTabNews');
}

const hbasedRecommendCacheObject = new NewsCache('freshTab-recommend-cache',
                                              HBASED_RECOM_CACHE_UPDATE_INTERVAL,
                                              getHistoryBasedRecommendations,
                                              true);
const topNewsCacheObject = new NewsCache('freshTab-topnews-cache',
                                        TOP_NEWS_CACHE_UPDATE_INTERVAL,
                                        getTopNewsList,
                                        false);
const hbasedNewsCacheObject = new NewsCache('freshTab-hbased-cache',
                                          HABASED_NEWS_CACHE_UPDATE_INTERVAL,
                                          getHbasedNewsObject,
                                          true);

function requestBackend(url) {
  log(`Request url: ${url}`);
  return coreUtils.promiseHttpHandler('GET', url)
    .then((response) => {
      const resData = JSON.parse(response.response);
      if (!resData.results || resData.results.length === 0){
        throw(`Backend response from ${url} is not valid "${JSON.stringify(resData)}."`);
      }
      return resData
    });
}

function getTopNewsList() {
  function getTopNewsUrl() {
    return [
      coreUtils.RICH_HEADER,
      '&bmresult=rotated-top-news.cliqz.com',
      coreLanguage.stateToQueryString(),
      coreUtils.encodeLocale(),
    ].join('');
  }

  return requestBackend(getTopNewsUrl());
}

function getHbasedNewsObject() {
  function getHbasedNewsUrl(hashList) {
    return [
      coreUtils.RICH_HEADER,
      '&bmresult=hb-news.cliqz.com',
      coreLanguage.stateToQueryString(),
      coreUtils.encodeLocale(),
      '&q=' + JSON.stringify(hashList),
      ].join('');
  }

  function requestHbasedNewsList(hbasedRecom) {
    let requestPromise;

    if (hbasedRecom.hashList.length === 0) {
      requestPromise = Promise.resolve(() => {});
    } else {
      requestPromise = requestBackend(getHbasedNewsUrl(hbasedRecom.hashList));
    }

    return requestPromise;
  }

  return hbasedRecommendCacheObject.getData().then(requestHbasedNewsList);
}

/**
* Process history to get recommendations for history based news
* @method getHistoryBasedRecommendations
*/
export function getHistoryBasedRecommendations(oldCacheData) {
  function getGlobalVisitCountFromPref() {
    try {
      const globalVisitCount = coreUtils.getPref('globalVisitCount', false);
      if (globalVisitCount) {
        log('Global visit count is taken from the preference.');
      }
      return JSON.parse(globalVisitCount);
    } catch (err) {
      log(`Error parsing global visit count: ${err}`);
      return false;
    }
  }

  function checkIfDomainForCounting(domain) {
    const hash = parseInt(coreUtils.hash(domain), 10);
    return NEWS_DOMAINS_LIST[hash] || PRESS_CLIPPING_MAPPING[hash];
  }

  // take history visit count only for the exact domain and sub domains, not for articles' url
  function pathHasIndex(path) {
    const pathArray = path.split('/');
    const lastPathElement = pathArray[pathArray.length - 1];
    return !lastPathElement
      || pathArray.length === 1
      || lastPathElement.indexOf('index') === 0;
  }

  function addHRecordToGlobalVisitCount(record, globalVisitCount) {
    const urlData = coreUtils.getDetailsFromUrl(record.url);
    if (checkIfDomainForCounting(urlData.cleanHost)) {
      let domainVisitCount;
      if (pathHasIndex(urlData.path)) {
        domainVisitCount = record.visit_count;
      } else {
        domainVisitCount = 1;
      }
      mergeToGlobalVisitCount(urlData, domainVisitCount, globalVisitCount);
    }
  }

  const sqlStatement = 'SELECT * FROM moz_places WHERE last_visit_date>:date';
  const sqlOutputParameters = ['url', 'last_visit_date', 'visit_count'];
  const sqlInputParameters = { date: (Date.now() - ONE_MONTH) * 1000 };

  let globalVisitCount = {};

  return new Promise((resolve) => {
    coreHistoryManager.PlacesInterestsStorage._execute(
      sqlStatement,
      sqlOutputParameters,
      (record) => {
        addHRecordToGlobalVisitCount(record, globalVisitCount);
      },
      sqlInputParameters
    ).then(() => {
      globalVisitCount = normalizeGlobalVisitCount(globalVisitCount);
      log(globalVisitCount);

      globalVisitCount = getGlobalVisitCountFromPref() || globalVisitCount;

      const newsPlacing = composeHistoryBasedRecommendations(globalVisitCount);
      const historyBasedRecommendations = {
        newsPlacing,
        hashList: composeDomainHasheList(newsPlacing, oldCacheData),
      };

      log(historyBasedRecommendations);

      resolve(historyBasedRecommendations);
    });
  });
}

export function mergeToGlobalVisitCount(urlDesc, visitCount, globalVisitCount) {
  function subUrlCheck(subUrl) {
    return subUrl
      && subUrl.indexOf('index') !== 0
      && subUrl.length > 2
      && subUrl.length < 15;
  }

  function ifCountSubLevel(urlPathList, recursionLevel) {
    return recursionLevel < 4
      && recursionLevel < urlPathList.length
      && !((urlPathList.length !== 1) && (recursionLevel >= (urlPathList.length - 1)))
      && subUrlCheck(urlPathList[recursionLevel]);
  }

  function countSubCategories(subVisitCount, urlPathList, vCount, recursionLevel) {
    if (ifCountSubLevel(urlPathList, recursionLevel)) {
      const subDomain = urlPathList[recursionLevel];

      subVisitCount[subDomain] = subVisitCount[subDomain] || { count: 0, sub: {} };
      subVisitCount[subDomain].count += vCount;

      recursionLevel += 1;
      subVisitCount[subDomain].sub = countSubCategories(subVisitCount[subDomain].sub,
                                                        urlPathList,
                                                        vCount,
                                                        recursionLevel);
    }
    return subVisitCount;
  }

  let urlPathList = urlDesc.path.split('/');
  const domain = urlDesc.cleanHost;

  globalVisitCount[domain] = globalVisitCount[domain] || { count: 0, sub: {} };
  globalVisitCount[domain].count += visitCount;


  // cut the first empty part
  if (!(urlPathList[0])) { urlPathList = urlPathList.slice(1); }

  globalVisitCount[domain].sub = countSubCategories(globalVisitCount[domain].sub,
                                                    urlPathList,
                                                    visitCount,
                                                    0);
}

function composeDomainHasheList(newsPlacing, historyBasedRecommendationsCache) {
  function randomValueOf(obj) {
    const keys = Object.keys(obj);
    const rnd = Math.floor(Math.random() * keys.length);
    return parseInt(keys[rnd], 10);
  }

  function sortFunct(i, j) {
    return i < j;
  }

  function getDomainHash(record) {
    return parseInt(coreUtils.hash(record.domain.split('/')[0]), 10);
  }

  function subsRandomElement(cachedHashList, domainHashList, elementToAdd) {
    // filter out elements which should be in the hash list
    const randomHashes = cachedHashList.filter(i => domainHashList.indexOf(i) === -1);
    const randomeHashToReplace = randomHashes[randomValueOf(randomHashes)];

    cachedHashList[cachedHashList.indexOf(randomeHashToReplace)] = elementToAdd;
  }


  // extract domains' hashes for history based news
  const domainHashList = newsPlacing.filter(r => r.type === hbasedNewsTypeKey).map(getDomainHash);
  const cachedHashList = (historyBasedRecommendationsCache && historyBasedRecommendationsCache.hashList) || [];

  if (domainHashList.length !== 0) {
    const randomisedArraySize = 10;
    let numberOfAdditionalElementsToChange = 0;

    // fill array up to necessary number of hashes
    while (cachedHashList.length < randomisedArraySize) {
      cachedHashList.push(randomValueOf(NEWS_DOMAINS_LIST));
    }

    // fill array with necessary domain hashes
    domainHashList.forEach((domainHash) => {
      if (cachedHashList.indexOf(domainHash) === -1) {
        // substitute the necessary element
        subsRandomElement(cachedHashList, domainHashList, domainHash);
        numberOfAdditionalElementsToChange += 1;
      }
    });

    // substitute additional rand. elements
    while (numberOfAdditionalElementsToChange > 0) {
      subsRandomElement(cachedHashList, domainHashList, randomValueOf(NEWS_DOMAINS_LIST));
      numberOfAdditionalElementsToChange -= 1;
    }

    cachedHashList.sort(sortFunct);
  }

  return cachedHashList;
}


function normalizeGlobalVisitCount(globalVisitCount) {
  function normalizeRecursion(subUrlCount, sum) {
    Object.keys(subUrlCount).forEach((k) => {
      subUrlCount[k].ratio = subUrlCount[k].count / sum;
      subUrlCount[k].sub = normalizeRecursion(subUrlCount[k].sub, subUrlCount[k].count);
    });
    return subUrlCount;
  }

  const glVisit = globalVisitCount;
  let domainsSum = 0;

  Object.keys(glVisit).forEach((k) => {
    domainsSum += glVisit[k].count;
  });

  Object.keys(glVisit).forEach((k) => {
    glVisit[k].ratio = glVisit[k].count / domainsSum;
    glVisit[k].sub = normalizeRecursion(glVisit[k].sub, glVisit[k].count);
  });
  return glVisit;
}

function composeHistoryBasedRecommendations(globalVisitCount) {
  function sortFunct(i, j) {
    return i.ratio < j.ratio;
  }


  function getPressClipping(glVisitCount) {
    function getPressClipMapping(domain) {
      return PRESS_CLIPPING_MAPPING[parseInt(coreUtils.hash(domain), 10)] || false;
    }
    const glVisit = glVisitCount;
    const pressClipList = [];

    let pressClipMapping;
    Object.keys(glVisit).forEach((domain) => {
      pressClipMapping = getPressClipMapping(domain);
      if (typeof pressClipMapping === 'string') {
        glVisit[domain].key = pressClipMapping;
        pressClipList.push(glVisit[domain]);
      }
    });
    return pressClipList;
  }

  function getThreeTopNewsDomains(glVisitCount) {
    function checkIfNewsDomain(domain) {
      return NEWS_DOMAINS_LIST[parseInt(coreUtils.hash(domain), 10)] || false;
    }

    const domainCountThreshold = 20;
    const glVisit = glVisitCount;
    const topDomainsList = [];

    Object.keys(glVisit).forEach((domain) => {
      if ((glVisit.hasOwnProperty(domain)) &&
          (glVisit[domain].count > domainCountThreshold) &&
          (checkIfNewsDomain(domain))) {
        glVisit[domain].key = domain;
        topDomainsList.push(glVisit[domain]);
      }
    });

    topDomainsList.sort(sortFunct);
    return topDomainsList.slice(0, 3);
  }

  function addDomainBasedNews(domainCount, articlesToAdd) {
    const subDomainRatioThreshold = 0.6;
    const newsPlacing = [];
    let addedOnSubdomainLevel = 0;

    let numArtToAdd = articlesToAdd;

    // add news placement on sub domain level
    Object.keys(domainCount.sub).forEach((subDomain) => {
      if (domainCount.sub[subDomain].ratio > subDomainRatioThreshold) {
        addedOnSubdomainLevel = Math.max(
                                  Math.floor(numArtToAdd * domainCount.sub[subDomain].ratio),
                                  1);
        newsPlacing.push({ type: hbasedNewsTypeKey,
                           domain: [domainCount.key, subDomain].join('/'),
                           number: addedOnSubdomainLevel });
        numArtToAdd -= addedOnSubdomainLevel;
      }
    });

    // add placement for domain level
    if (numArtToAdd > 0) {
      newsPlacing.push({ type: hbasedNewsTypeKey,
                        domain: domainCount.key,
                        number: numArtToAdd });
    }

    return newsPlacing;
  }

  let newsPlacing = [];

  const pressCliping = getPressClipping(globalVisitCount);
  const topDomainsList = getThreeTopNewsDomains(globalVisitCount);

  // always add 3 general top news
  newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 3 });

  // in case of press clipping add one article instead of one of top news articles
  if (pressCliping.length > 0) {
    newsPlacing[0].number = 2;
    newsPlacing.push({ type: prClBurdaNewsTypeKey, domain: pressCliping[0].key, number: 1 });
  }

  // add history based news depend from number of history based domains
  switch (topDomainsList.length) {
    // only top news
    case 0:
      newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 9 });
      break;

    // 6 top news, 3 from history based domain
    case 1:
      newsPlacing.push({ type: topNewsTypeKey, domain: topNewsTypeKey, number: 3 });
      newsPlacing = newsPlacing.concat(addDomainBasedNews(topDomainsList[0], 3));
      break;

    // 3 top news, 3 from each of 2 history based domains
    case 2:
      topDomainsList.forEach((domainCount) => {
        newsPlacing = newsPlacing.concat(addDomainBasedNews(domainCount, 3));
      });
      break;

    // 3 top news, 2 from each of 3 history based domains
    case 3:
      topDomainsList.forEach((domainCount) => {
        newsPlacing = newsPlacing.concat(addDomainBasedNews(domainCount, 2));
      });
      break;
    default:
      log('Wrong number top domains:${topDomainsList.length}.');
  }

  log(newsPlacing);
  return newsPlacing;
}

export function composeNewsList(historyObject, topNewsCache, hbasedResults) {
  function notInHistory(url) {
    const query = coreHistoryManager.getHistoryService().getNewQuery();
    query.beginTimeReference = query.TIME_RELATIVE_NOW;
    query.beginTime = -365 * 24 * 60 * 60 * 1000000; // 30 days ago
    query.endTimeReference = query.TIME_RELATIVE_NOW;
    query.endTime = 0; // now
    query.uri = coreHistoryManager.makeURI(url);

    const options = coreHistoryManager.getHistoryService().getNewQueryOptions();
    const result = coreHistoryManager.getHistoryService().executeQuery(query, options);

    const cont = result.root;
    cont.containerOpen = true;

    if (cont.childCount === 0) {
      cont.containerOpen = false;
      return true;
    }
    log(`Url is already in history: ${url}.`);
    cont.containerOpen = false;
    return false;
  }

  function getTopNewsArticles(topNCache) {
    return (topNCache
          && topNCache.results
          && topNCache.results[0]
          && topNCache.results[0].articles)
          || [];
  }

  function getHbasedNewsDict(hbasedResults) {
    return (hbasedResults
          && hbasedResults.results
          && hbasedResults.results[0]
          && hbasedResults.results[0].news)
          || [];
  }

  function getTopNewsVersion(topNCache) {
    return (topNCache.results
          && topNCache.results[0]
          && topNCache.results[0].news_version)
          || [];
  }

  function notAlreadyInList(url, freshtabArticlesList) {
    function urlCheck(art) {
      return (url !== art.url);
    }
    return freshtabArticlesList.every(urlCheck);
  }

  function mergeToList(articlesToMerge, freshtabArticlesList, numberOfNewsToMerge, sourceArticleType, checkIfAlreadyInHistory, urlPatern) {

    function mergeCheck(article, checkHist, urlDomainPatern) {
      return ((!checkHist || notInHistory(article.url)) &&
            (notAlreadyInList(article.url, freshtabArticlesList)) &&
            (article.url.indexOf(urlDomainPatern) !== -1));
    }
    function mergeArticle(article, returnList) {
      const artAdd = article;
      if (artAdd.breaking === true) {
        artAdd.type = breakingNewsTypeKey;
      } else {
        artAdd.type = sourceArticleType;
      }

      returnList.push(artAdd);
    }

    let numToMerge = numberOfNewsToMerge;
    const urlDomainPatern = urlPatern || '';

    articlesToMerge.some((article) => {
      if (numToMerge !== 0) {
        if (mergeCheck(article, checkIfAlreadyInHistory, urlDomainPatern)) {
          mergeArticle(article, freshtabArticlesList);
          numToMerge -= 1;
        }
        return false;
      }
      // exit loop if all articles are added
      return true;
    });

    return numToMerge;
  }

  function mergeTopNews(topNewList, freshtabArticlesList, numberOfNewsToMerge) {
    let checkIfInHistory = true;

    const notMergedNewsNumber = mergeToList(topNewList,
                                            freshtabArticlesList,
                                            numberOfNewsToMerge,
                                            topNewsTypeKey,
                                            checkIfInHistory);

    // fill empty slots with articles without check with history
    checkIfInHistory = false;
    mergeToList(topNewList,
                freshtabArticlesList,
                notMergedNewsNumber,
                topNewsTypeKey,
                checkIfInHistory);

    return freshtabArticlesList;
  }

  function mergePressClippingNews(hbasedNewsDict, topNewList, freshtabArticlesList, newsPlacementRecord) {
    const pressClippingName = newsPlacementRecord.domain || '';
    const numberOfNewsToMerge = newsPlacementRecord.number || 0;
    const sourceArticleType = prClBurdaNewsTypeKey;
    const checkIfInHistory = true;

    const hbasedNewsList = hbasedNewsDict[pressClippingName] || [];

    let returnNewsList = freshtabArticlesList;

    const notMergedNewsNumber = mergeToList(hbasedNewsList,
                                            returnNewsList,
                                            numberOfNewsToMerge,
                                            sourceArticleType,
                                            checkIfInHistory);

    // if no press cliping can be merged, merge top news instead
    returnNewsList = mergeTopNews(topNewList, returnNewsList, notMergedNewsNumber);

    return returnNewsList;
  }

  function mergeHbasedNews(hbasedNewsDict, topNewList, freshtabArticlesList, newsPlacementRecord) {
    const domainUrlPath = newsPlacementRecord.domain || '';
    const numberOfNewsToMerge = newsPlacementRecord.number || 0;
    const checkIfInHistory = true;

    const domain = domainUrlPath.split('/')[0];
    const hbasedNewsList = hbasedNewsDict[domain] || [];

    let returnNewsList = freshtabArticlesList;
    // merge news according to url path
    let notMergedNewsNumber = mergeToList(hbasedNewsList,
                                          returnNewsList,
                                          numberOfNewsToMerge,
                                          hbasedNewsTypeKey,
                                          checkIfInHistory,
                                          domainUrlPath);

    // if not all news were mergen according to url path, merge news only from domain
    notMergedNewsNumber = mergeToList(hbasedNewsList,
                                      returnNewsList,
                                      notMergedNewsNumber,
                                      hbasedNewsTypeKey,
                                      checkIfInHistory);

    // if no hbased news can be merged, merge top news
    returnNewsList = mergeTopNews(topNewList, returnNewsList, notMergedNewsNumber);

    return returnNewsList;
  }

  function forceDividableByThreeFormat(list) {
    return list.slice(0, 3).concat(list.slice(3, list.length - (list.length % 3)));
  }

  function extendListIfOnlyTopNews(freshtabNewsList, topNewList) {
    function recordTypeCheck(record) {
      return record.type !== hbasedNewsTypeKey;
    }

    const notMergetTopNewsNumber = topNewList.length - freshtabNewsList.length;

    let returnNewsList = freshtabNewsList;
    if ((notMergetTopNewsNumber > 0) && freshtabNewsList.every(recordTypeCheck)) {
      returnNewsList = mergeTopNews(topNewList, freshtabNewsList, notMergetTopNewsNumber);
    }
    return returnNewsList;
  }

  function sortByScore(list) {
    function sortFunct(i, j) {
      // if score is not presented put record on top
      return (i.score || Math.pow(10, 6)) < (j.score || Math.pow(10, 6));
    }
    // sort all news apart from first 3
    return list.slice(0, 3).concat(list.slice(3, 15).sort(sortFunct));
  }

  return new Promise((resolve) => {
    let freshtabArticlesList = [];
    let newsPlacement = historyObject.newsPlacing ||
      [{ type: topNewsTypeKey, domain: topNewsTypeKey, number: 9 }];

    const topNewsList = getTopNewsArticles(topNewsCache);
    const hbasedNewsDict = getHbasedNewsDict(hbasedResults);

    // merge news according to news placing
    newsPlacement.forEach((record) => {
      switch (record.type) {
        case topNewsTypeKey:
          freshtabArticlesList = mergeTopNews(topNewsList, freshtabArticlesList, record.number);
          break;
        case hbasedNewsTypeKey:
          freshtabArticlesList = mergeHbasedNews(hbasedNewsDict,
                                                topNewsList,
                                                freshtabArticlesList,
                                                record);
          break;
        case prClBurdaNewsTypeKey:
          freshtabArticlesList = mergePressClippingNews(hbasedNewsDict,
                                                        topNewsList,
                                                        freshtabArticlesList,
                                                        record);
          break;
        default:
          log(`Not handled news type in news placing ${record.type}`);
      }
    });

    freshtabArticlesList = sortByScore(freshtabArticlesList);
    freshtabArticlesList = forceDividableByThreeFormat(freshtabArticlesList);
    freshtabArticlesList = extendListIfOnlyTopNews(freshtabArticlesList, topNewsList);

    log(freshtabArticlesList);
    resolve({
      newsList: freshtabArticlesList,
      topNewsVersion: getTopNewsVersion(topNewsCache),
    });
  });
}


const CliqzFreshTabNews = {
  /**
  * @method init
  */
  init: () => {
    log('init');
  },
  /**
  * @method unload
  */
  unload: () => {
    log('unloaded');
  },
  getNews: () => {
    let topNewsL,
        hbObject;

    return Promise.all([
      topNewsCacheObject.getData(),
      hbasedNewsCacheObject.getData(),
    ]).then(([topNewsList, hbasedObject]) => {
      topNewsL = topNewsList;
      hbObject = hbasedObject;
      return hbasedRecommendCacheObject.getData();
    }).then((historyObject) => composeNewsList(historyObject, topNewsL, hbObject));
  },
};

export default CliqzFreshTabNews;
