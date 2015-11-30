var MockOS = {
  postMessage: function(message) {
    console.log("--MOCK: message Received", message);
    var dataBack;
    switch (message.action) {
      case "searchHistory":
      dataBack = MockOS.searchHistory(message.data);
      break;
      case "isReady":
      MockOS.isReady();
      break;
      case "openLink":
      MockOS.openLink(message.data);
      break;
      case "browserAction":
      MockOS.browserAction(message.data);
      break;
      case "getTopSites":
      MockOS.getTopSites();
      break;
      case "autocomplete":
      MockOS.autocomplete(message.data);
      break;
      case "notifyQuery":
      MockOS.notifyQuery(message.data);
      break;
    }
    message.callBack && eval(message.callBack + "(" + JSON.stringify(dataBack) + ")");
  },
  searchHistory: function(q) {
    console.log("--MOCK: action searchHistory is called with data", q);
    var mockedHistory = [{"title":"HISTORY MOCK Geschäftsführung (Deutschland) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Gesch%C3%A4ftsf%C3%BChrung_(Deutschland)#Gesch.C3.A4ftsf.C3.BChrer", "score": 0},{"title":"Chief Executive Officer – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Chief_Executive_Officer", "score": 0},{"title":"CEO (Begriffsklärung) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/CEO_(Begriffskl%C3%A4rung)", "score": 0},{"title":"WebSockets over a 3G connection - Stack Overflow","url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection", "score": 0},{"title":"Dein idealer Smartphone-Tarif von netzclub","url":"https://www.netzclub.net/", "score": 0}];
    return {results:mockedHistory, query:q};

  },
  isReady: function() {
    console.log("--MOCK: action isReady is called");
  },
  openLink: function(id) {
    console.log("--MOCK: action openLink is called with data", id);
  },
  getTopSites: function() {
    console.log("--MOCK: action getTopSites is called");
  },
  browserAction: function(data) {
    console.log("--MOCK: action browserAction is called with data", data);
  },
  autocomplete: function(data) {
    console.log("--MOCK: action autocomplete is called with data", data);
  },
  notifyQuery: function(data) {
    console.log("--MOCK: action notifyQuery is called with data", data);
  }
}