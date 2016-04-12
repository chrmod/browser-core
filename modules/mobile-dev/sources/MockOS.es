var MockOS = {
  postMessage: function(message) {
    console.log("--MOCK: message Received", message);
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
  console.log("--MOCK: action searchHistory is called with data", q);
  return {results:mockedHistory, query:q};

};
function isReady() {
  console.log("--MOCK: action isReady is called");
  setDefaultSearchEngine({name: "google", url: "http://www.google.com/search?q="});
  CLIQZEnvironment.setClientPreferences({
    incognito: false
  });
  return -1;
};
function openLink(url) {
  console.log("--MOCK: action openLink is called with data", url);
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
  console.log("--MOCK: action getTopSites is called");
  return mockedHistory;
};
function browserAction(data) {
  console.log("--MOCK: action browserAction is called with data", data);
};
function autocomplete(data) {
  console.log("--MOCK: action autocomplete is called with data", data);
};
function notifyQuery(data) {
  console.log("--MOCK: action notifyQuery is called with data", data);
};
function pushTelemetry(data) {
  console.log("--MOCK: action pushTelemetry is called with data", data);
};
function copyResult(data) {
  console.log("--MOCK: action copyResult is called with data", data);
};
function removeHistory(data) {
  console.log("--MOCK: action removeHistory is called with data", data);
  if(data.length == 0 || mockedHistory.length === 0) {
    return;
  }

  var index = 0;
  mockedHistory = mockedHistory.filter(function(record) {
    return index >= data.length || data[index] !== record.id || (index++ && false);
  });
};
function setHistoryFavorite(data) {
  console.log("--MOCK: action setHistoryFavorite is called with data", data);

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
  console.log("--MOCK: action shareCard is called with data", data);
}

export default MockOS;