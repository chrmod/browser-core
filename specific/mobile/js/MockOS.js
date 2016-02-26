var MockOS = {
  postMessage: function(message) {
    console.log("--MOCK: message Received", message);
    var dataBack;
    switch (message.action) {
      case "searchHistory":
        dataBack = MockOS.searchHistory(message.data);
        break;
      case "isReady":
        dataBack = MockOS.isReady();
        break;
      case "openLink":
        MockOS.openLink(message.data);
        break;
      case "browserAction":
        MockOS.browserAction(message.data);
        break;
      case "getTopSites":
        dataBack = MockOS.getTopSites(message.data);
        break;
      case "autocomplete":
        MockOS.autocomplete(message.data);
        break;
      case "notifyQuery":
        MockOS.notifyQuery(message.data);
        break;
      case "pushTelemetry":
        MockOS.pushTelemetry(message.data);
        break;
      case "copyResult":
        MockOS.copyResult(message.data);
        break;
      case "removeHistory":
        MockOS.removeHistory(message.data);
        break;
      case "setHistoryFavorite":
        MockOS.setHistoryFavorite(message.data);
        break;
      case "cleanHistory":
        MockOS.cleanHistory(message.data);
        break;
      case "shareCard":
        MockOS.shareCard(message.data);
        break;

    }
    message.callback && eval(message.callback + "(" + JSON.stringify(dataBack) + ")");
  },
  searchHistory: function(q) {
    console.log("--MOCK: action searchHistory is called with data", q);
    return {results:mockedHistory, query:q};

  },
  isReady: function() {
    console.log("--MOCK: action isReady is called");
    setDefaultSearchEngine({name: "google", url: "http://www.google.com/search?q="});
    return -1;
  },
  openLink: function(id) {
    console.log("--MOCK: action openLink is called with data", id);
  },
  getTopSites: function(limit) {
    console.log("--MOCK: action getTopSites is called");
    return mockedHistory;
  },
  browserAction: function(data) {
    console.log("--MOCK: action browserAction is called with data", data);
  },
  autocomplete: function(data) {
    console.log("--MOCK: action autocomplete is called with data", data);
  },
  notifyQuery: function(data) {
    console.log("--MOCK: action notifyQuery is called with data", data);
  },
  pushTelemetry: function(data) {
    console.log("--MOCK: action pushTelemetry is called with data", data);
  },
  copyResult: function(data) {
    console.log("--MOCK: action copyResult is called with data", data);
  },
  removeHistory: function(data) {
    console.log("--MOCK: action removeHistory is called with data", data);
    if(data.length == 0 || mockedHistory.length === 0) {
      return;
    }

    var index = 0;
    mockedHistory = mockedHistory.filter(function(record) {
      return index >= data.length || data[index] !== record.id || (index++ && false);
    });
  },
  setHistoryFavorite: function(data) {
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
  },
  cleanHistory: function(data) {
    console.log("--MOCK: action cleanHistory is called with data", data);
    if(data.length == 0 || mockedHistory.length === 0) {
      mockHistory = [];
      return;
    }

    var index = 0;
    mockedHistory = mockedHistory.filter(function(record) {
      return index < data.length && data[index] === record.id && (index++ || true);
    });
    getHistory();
  },
  shareCard: function(data) {
    console.log("--MOCK: action shareCard is called with data", data);
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