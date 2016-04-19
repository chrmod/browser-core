var MockOS = {
  postMessage: function(message) {
    CliqzUtils.log(message, 'Mock');
    var dataBack;
    switch (message.action) {
      case "searchHistory":
        dataBack = searchHistory(message.data);
        break;
      case "isReady":
        dataBack = isReady();
        break;
      case "openLink":
        openLink(message.data);
        break;
      case "browserAction":
        browserAction(message.data);
        break;
      case "getTopSites":
        dataBack = getTopSites(message.data);
        break;
      case "autocomplete":
        autocomplete(message.data);
        break;
      case "notifyQuery":
        notifyQuery(message.data);
        break;
      case "pushTelemetry":
        pushTelemetry(message.data);
        break;
      case "copyResult":
        copyResult(message.data);
        break;
      case "removeHistory":
        removeHistory(message.data);
        break;
      case "setHistoryFavorite":
        setHistoryFavorite(message.data);
        break;
      case "shareCard":
        shareCard(message.data);
        break;

    }
    message.callback && eval(message.callback + "(" + JSON.stringify(dataBack) + ")");
  }
}

var mockedHistory =
  [{
      "id": 5,
      "title": "Facebook",
      "mainDomain": "Facebook",
      "url": "http://www.facebook.de",
      "timestamp": Date.now() - 30090,
      "favorite": true
  }, {
      "id": 4,
      "title": "Youtube",
      "mainDomain": "Youtube",
      "url": "http://www.youtube.de",
      "timestamp": Date.now() - 130090,
      "favorite": true
  }, {
      "id": 3,
      "title": "Focus",
      "mainDomain": "Focus",
      "url": "http://www.focus.de",
      "timestamp": Date.now() - 1130090,
      "favorite": false
  }, {
      "id": 2,
      "title": "Bild",
      "mainDomain": "Bild",
      "url": "http://www.bild.de",
      "timestamp": Date.now() - 11130090,
      "favorite": false
  },  {
      "id": 1,
      "title": "Amazon",
      "mainDomain": "Amazon",
      "url": "http://www.amazon.de",
      "timestamp": Date.now() - 111130090,
      "favorite": true
  }];

function searchHistory(q) {
  return {results:mockedHistory, query:q};

};
function isReady() {
  CLIQZEnvironment.setDefaultSearchEngine({name: "google", url: "http://www.google.com/search?q="});
  CLIQZEnvironment.setClientPreferences({
    incognito: false,
    showConsoleLogs: true
  });
  return -1;
};
function openLink(url) {
  var id = parseInt(6 + 100 * Math.random());
  mockedHistory.unshift({
          "id": id,
          "title": "History item " + id,
          "mainDomain": url,
          "url": url,
          "timestamp": Date.now(),
          "favorite": false
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
function removeHistory(data) {
  if(data.length == 0 || mockedHistory.length === 0) {
    return;
  }

  var index = 0;
  mockedHistory = mockedHistory.filter(function(record) {
    return index >= data.length || data[index] !== record.id || (index++ && false);
  });
};
function setHistoryFavorite(data) {

  var index = 0;
  mockedHistory.forEach(function(record) {
    if(index >= data.ids) {
      return;
    } else if(data.ids[index] === record.id) {
      record.favorite = data.value;
      index++;
    }
  });
};
function shareCard(data) {
}

export default MockOS;
