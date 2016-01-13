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

    }
    message.callback && eval(message.callback + "(" + JSON.stringify(dataBack) + ")");
  },
  searchHistory: function(q) {
    console.log("--MOCK: action searchHistory is called with data", q);
    var mockedHistory = [{"title":"SPIEGEL MOCK","url":"http://www.spiegel.de/", "timestamp": Date.now()},{"title":"HISTORY MOCK KINO CADILLAC","url":"http://cadillac.movieplace.de/", "timestamp": Date.now()},{"title":"HISTORY MOCK Geschäftsführung (Deutschland) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Gesch%C3%A4ftsf%C3%BChrung_(Deutschland)#Gesch.C3.A4ftsf.C3.BChrer", "timestamp": Date.now() - 10000},{"title":"Chief Executive Officer – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Chief_Executive_Officer", "timestamp": Date.now() - 20000},{"title":"CEO (Begriffsklärung) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/CEO_(Begriffskl%C3%A4rung)", "timestamp": Date.now() - 30000},{"title":"WebSockets over a 3G connection - Stack Overflow","url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection", "timestamp": Date.now() - 40000},{"title":"Dein idealer Smartphone-Tarif von netzclub","url":"https://www.netzclub.net/", "timestamp": Date.now() - 50000}];
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
    return [{"title":"HISTORY MOCK KINO CADILLAC","url":"http://cadillac.movieplace.de/", "timestamp": Date.now()},{"title":"HISTORY MOCK Geschäftsführung (Deutschland) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Gesch%C3%A4ftsf%C3%BChrung_(Deutschland)#Gesch.C3.A4ftsf.C3.BChrer", "timestamp": Date.now() - 10000},{"title":"Chief Executive Officer – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Chief_Executive_Officer", "timestamp": Date.now() - 20000},{"title":"CEO (Begriffsklärung) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/CEO_(Begriffskl%C3%A4rung)", "timestamp": Date.now() - 30000},{"title":"WebSockets over a 3G connection - Stack Overflow","url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection", "timestamp": Date.now() - 40000},{"title":"Dein idealer Smartphone-Tarif von netzclub","url":"https://www.netzclub.net/", "timestamp": Date.now() - 50000}];
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
  }
}