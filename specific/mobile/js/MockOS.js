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
            "url": "http://www.facebook.de",
            "timestamp": Date.now() - 10000
        }, {
            "id": 4,
            "title": "Bild",
            "url": "http://www.bild.de",
            "timestamp": Date.now() - 20000
        }, {
            "id": 6,
            "title": "Bild",
            "url": "http://www.bild.de/duplicate",
            "timestamp": Date.now() - 20600
        }, {
            "id": 3,
            "title": "Focus",
            "url": "http://www.focus.de",
            "timestamp": Date.now() - 30090
        },  {
            "id": 2,
            "title": "Amazon",
            "url": "http://www.amazon.de",
            "timestamp": Date.now() - 121240000
        }, {
            "id": 1,
            "title": "Youtube",
            "url": "http://www.youtube.de",
            "timestamp": Date.now() - 1222250000
        }];