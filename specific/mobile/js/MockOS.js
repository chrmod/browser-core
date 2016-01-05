var MockOS = {
  postMessage: function(message) {
    //console.log("--MOCK: message Received", message);
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

    }
    message.callback && eval(message.callback + "(" + JSON.stringify(dataBack) + ")");
  },
  searchHistory: function(q) {
    console.log("--MOCK: action searchHistory is called with data", q);
    var mockedHistory = [{"title":"Spiegel Online (mocked)","url":"http://www.spiegel.de/", "timestamp": Date.now()},{"title":"HISTORY MOCK ","url":"https://de.m.wikipedia.org/wiki/Gesch%C3%A4ftsf%C3%BChrung_(Deutschland)#Gesch.C3.A4ftsf.C3.BChrer", "timestamp": Date.now() - 10000},{"title":"Chief Executive Officer – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Chief_Executive_Officer", "timestamp": Date.now() - 20000},{"title":"CEO (Begriffsklärung) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/CEO_(Begriffskl%C3%A4rung)", "timestamp": Date.now() - 30000},{"title":"WebSockets over a 3G connection - Stack Overflow","url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection", "timestamp": Date.now() - 40000},{"title":"Dein idealer Smartphone-Tarif von netzclub","url":"https://www.netzclub.net/", "timestamp": Date.now() - 50000}];
    return {results:mockedHistory, query:q};

  },
  isReady: function() {
    //console.log("--MOCK: action isReady is called");
    return -1;
  },
  openLink: function(id) {
    console.log("--MOCK: action openLink is called with data", id);
  },
  getTopSites: function(limit) {
    console.log("--MOCK: action getTopSites is called");
    return [ {  "title":"stackoverflow (mocked)",
                "url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection"},

             {"title":"Spiegel",
              "url":"http://www.spiegel.de/", 
              "timestamp": Date.now()},

             {  "title":"Erste Sichtung: Erpressungstrojaner Ransom32 aufgrund JavaScript noch bedrohlicher",
              "url":"http://www.heise.de/newsticker/meldung/Erste-Sichtung-Erpressungstrojaner-Ransom32-aufgrund-JavaScript-noch-bedrohlicher-3060409.html", 
              "timestamp": Date.now() - 10000},

            { "title":"Apple-Rechner eignen sich nicht für vertrauliche Arbeiten",
              "url":"http://www.golem.de/news/matthew-garrett-apple-rechner-eignen-sich-nicht-fuer-vertrauliche-arbeiten-1601-118332.html", 
              "timestamp": Date.now() - 20000},

            { "title":"Apple TV",
              "url":"http://www.apple.com/tv/", 
              "timestamp": Date.now() - 30000},

            { "title":"Heroes Reborn (TV Mini-Series 2015) - IMD",
              "url":"http://www.imdb.com/title/tt3556944/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=2377628202&pf_rd_r=1ETY6Z87ZV0RBT6DAJ7P&pf_rd_s=hero&pf_rd_t=15061&pf_rd_i=homepage&ref_=hm_hp_cap_pri_1&pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=2377628202&pf_rd_r=1ETY6Z87ZV0RBT6DAJ7P&pf_rd_s=hero&pf_rd_t=15061&pf_rd_i=homepage",
              "timestamp": Date.now() - 40000},
          ];
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
  }
}