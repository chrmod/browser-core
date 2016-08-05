import UI from "mobile-ui/UI";
import { utils } from "core/cliqz";

var MockOS = {
  postMessage: function(message) {
    utils.log(message, 'Mock');
    var dataBack;
    switch (message.action) {
      case 'searchHistory':
        dataBack = searchHistory(message.data);
        break;
      case 'getHistoryItems':
        dataBack = getHistoryItems(message.data);
        break;
      case 'getFavorites':
        dataBack = getFavorites(message.data);
        break;
      case 'isReady':
        dataBack = isReady();
        break;
      case 'openLink':
        openLink(message.data);
        break;
      case 'browserAction':
        browserAction(message.data);
        break;
      case 'getTopSites':
        dataBack = getTopSites(message.data);
        break;
      case 'autocomplete':
        autocomplete(message.data);
        break;
      case 'notifyQuery':
        notifyQuery(message.data);
        break;
      case 'pushTelemetry':
        pushTelemetry(message.data);
        break;
      case 'copyResult':
        copyResult(message.data);
        break;
      case 'removeHistoryItems':
        removeHistoryItems(message.data);
        break;
      case 'setFavorites':
        setFavorites(message.data);
        break;
      case 'shareCard':
        shareCard(message.data);
        break;

    }
    clbk(message.callback, dataBack, window.self !== window.top);
  }
};

var mockedFavorites = []; // JSON.parse('[{\"title\":\"T-Online Navigationshilfe\",\"timestamp\":1465203184868,\"url\":\"http://navigationshilfe1.t-online.de/dnserror?url=http://goo.om/\"},{\"title\":\"HELLO! Online: celebrity & royal news, magazine, babies, weddings, style\",\"timestamp\":1465203192872,\"url\":\"http://www.hellomagazine.com/\"}]').reverse();
var mockedHistory = []; // JSON.parse('[{\"title\":\"HELLO! Online: celebrity & royal news, magazine, babies, weddings, style\",\"timestamp\":1465203194431.158,\"id\":3,\"favorite\":false,\"url\":\"http://www.hellomagazine.com/\"},{\"title\":\"T-Online Navigationshilfe\",\"timestamp\":1465203182810.896,\"id\":2,\"favorite\":false,\"url\":\"http://navigationshilfe1.t-online.de/dnserror?url=http://goo.om/\"},{\"title\":\"Spekulationen um Rückzug: Gauck kündigt Erklärung für 12 Uhr an - SPIEGEL ONLINE - Nachrichten - Politik\",\"timestamp\":1465203157183.131,\"id\":1,\"favorite\":false,\"url\":\"http://m.spiegel.de/politik/deutschland/a-1096014.html#spRedirectedFrom=www&referrrer=\"}]').reverse();

function clbk(f, args, test){
  if(test && !window.sinonLoaded){
    console.log('in test');
    setTimeout(clbk, 100, f, args, test);
  } else {
    f && eval(f + '(' + JSON.stringify(args) + ')');
  }
};
function searchHistory(q) {
  return {results:mockedHistory, query:q};
};
function getHistoryItems() {
  return mockedHistory;
};
function getFavorites() {
  return mockedFavorites;
};
function isReady() {
  UI && jsAPI.setDefaultSearchEngine({name: 'google', url: 'http://www.google.com/search?q='});
  jsAPI.setClientPreferences({
    incognito: false,
    showConsoleLogs: true
  });
  jsAPI.restoreBlockedTopSites();
  return -1;
};
function openLink(url) {
  var id = parseInt(6 + 100 * Math.random());
  mockedHistory.unshift({
          'id': id,
          'title': 'History item ' + id,
          'mainDomain': url,
          'url': url,
          'timestamp': Date.now()
      })
};
function getTopSites(limit) {
  return mockedHistory;
};
function browserAction(data) {};
function autocomplete(data) {};
function notifyQuery(data) {};
function pushTelemetry(data) {};
function copyResult(data) {};
function removeHistoryItems(data) {
  if(!data.length || mockedHistory.length === 0) {
    return;
  }
  mockedHistory = mockedHistory.filter(record => data.indexOf(record.id) === -1);
};
function setFavorites(data) {
  data.favorites.forEach((item) => {
    for (let i = 0; i < mockedFavorites.length; i++) {
      if (item.url === mockedFavorites[i].url) {
        mockedFavorites.splice(i, 1);
        break;
      }
    }
    if (data.value) {
      mockedFavorites.push({url: item.url, timestamp: item.timestamp, title: item.title});
    }
  });
};
function shareCard(data) {
}

export default MockOS;
