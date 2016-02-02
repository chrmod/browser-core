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
            "id": 12,
            "title": "Plemben und Bemben im blah Speckmantle -  breznsoiza mock",
            "url": "http://www.breznsoiza.de/gp/B00HNGG?ref_=gb1h_tit_m-7_2787_1168f9e3&smid=A3JWKAKR8XB7XF",
            "timestamp": Date.now() - 80000
        },{
            "id": 11,
            "title": "Plemben und Bemben im blah Speckmantle -  breznsoiza mock",
            "url": "http://www.breznsoiza.de/product/?ref_=gb1h_tit_m-7_2787_1168f9e3&smid=A3JWKAKR8XB7XF",
            "timestamp": Date.now() - 50000
        },{
            "id": 10,
            "title": "Plemeben und Bemben im Speckmantle -breznsoiza.de mock",
            "url": "http://www.breznsoiza.de/gp/product/?ref_=gb1h__m-7_2787_1168f9e3&smid=A3JWKAKR8XB7XF",
            "timestamp": Date.now() - 40000
        },{
            "id": 9,
            "title": "Plemeben und Bemben im Speckmantle -  ebay mock",
            "url": "http://www.ebay.de/gp/product/B006J8HNGG?=gb1h_tit_m-7_2787_1168f9e3&smid=A3JWKAKR8XB7XF",
            "timestamp": Date.now() - 30000
        },{
            "id": 8,
            "title": "TensCare selbsthaftende Elektroden (E-CM5050) 50mm x 50mm (12 Stück)  ebay mock",
            "url": "http://www.ebay.de/4",
            "timestamp": Date.now() - 30003
        },{
            "id": 7,
            "title": "Amazon mock 1 ",
            "url": "http://www.amazon.de/gp/product/B0196HHHK8?redirect=true&ref_=br_asw_pdt-3",
            "timestamp": Date.now()
        }, {
            "id": 6,
            "title": "TensCare selbsthaftende Elektroden (E-CM5050) 50mm x 50mm (12 Stück) - Amazon mock",
            "url": "http://www.amazon.de/gp/product/B006J8HNGG?ref_=gb1h_tit_m-7_2787_1168f9e3&smid=A3JWKAKR8XB7XF",
            "timestamp": Date.now()
        }, {
            "id": 5,
            "title": "Amazon mock sdfsefwfesfe ",
            "url": "http://www.amazon.de/3",
            "timestamp": Date.now() - 10000
        }, {
            "id": 4,
            "title": "TensCare selbsthaftende ebay mock",
            "url": "http://www.ebay.de/4",
            "timestamp": Date.now() - 20000
        }, {
            "id": 3,
            "title": "TensCare selbsthaftende ebay mock",
            "url": "http://www.ebay.de/4",
            "timestamp": Date.now() - 30090
        },  {
            "id": 2,
            "title": "Amazon mock sefsefsfsef ",
            "url": "http://www.amazon.de/546451",
            "timestamp": Date.now() - 121240000
        }, {
            "id": 1,
            "title": "Amazon mock fesfse fsef sfs efs fs sf sefsefs se ",
            "url": "http://www.amazon.de/14245542",
            "timestamp": Date.now() - 1222250000
        }];