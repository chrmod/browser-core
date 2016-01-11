'use strict';

var osBridge = {

  /**
    function: searchHistory
    description: requests search history from OS
    params: query as string
    message data: query as string
    message callback data: {results: [{url: as string, title: as string}], query: as string}
  */
  searchHistory: function(query, callback) {
    var message = {
      action: "searchHistory",
      data: query,
      callback: callback
    }
    OS.postMessage(message);
  },
  /**
    function: isReady
    description: informs OS that everything is loaded
  */
  isReady: function() {
    var message = {
      action: "isReady"
    }
    OS.postMessage(message);
  },
  /**
    function: openLink
    description: requests the OS to open the url
    params: url as string
    message data: url as string
  */
  openLink: function(url) {
    var message = {
      action: "openLink",
      data: url
    }
    OS.postMessage(message);
  },
  /**
    function: browserAction
    description: requests the OS to perform a custom action (call number, send e-mail, or etc..)
    params: data as string (phone number, e-mail, etc..)
    params: type as string (the type of the data)
    message data: {data: as string, type: as string}
  */
  browserAction: function(data, type) {
    var message = {
      action: "browserAction",
      data: {
        data: data,
        type: type
      }
    }
    OS.postMessage(message);
  },
  /**
    function: getTopSites
    description: requests the top sites from the OS
    params: callback as string (name of the callback)
    params: limit as integer (max number of results)
    message data: limit as integer
  */
  getTopSites: function(callback, limit) {
    var message = {
      action: "getTopSites",
      data: limit,
      callback: callback
    }
    OS.postMessage(message);
  },
  /**
    function: autocomplete
    description: requests the OS to autocomplete a query
    params: query as string
    message data: query as string
  */
  autocomplete: function(query) {
    var message = {
      action: "autocomplete",
      data: query
    }
    OS.postMessage(message);
  },
  /**
    function: notifyQuery
    description: requests the OS to change the url to a query
    params: query as string
    message data: query as string
  */
  notifyQuery: function(query, locationEnabled, lat, lon) {
    var message = {
      action: "notifyQuery",
      data: { 
        "q": query,
      }
    }
    OS.postMessage(message);
  },
  /**
    function: pushTelemetry
    description: pushes telemetry to the OS
    params: msg as object
    message data: msg as object
  */
  pushTelemetry: function(msg) {
    var message = {
      action: "pushTelemetry",
      data: msg
    }
    OS.postMessage(message);
  },
  /**
    function: copyResult
    description: sends a result for the OS to be copied to clipboard
    params: value as string
    message data: msg as object
  */
  copyResult: function(val) {
    var message = {
      action: "copyResult",
      data: val
    }
    OS.postMessage(message);
  }
};

var OS = {}
if(window.webkit) {
  OS.postMessage = window.webkit.messageHandlers.jsBridge.postMessage.bind(window.webkit.messageHandlers.jsBridge);
} else if(window.jsBridge) {
    var nativePostMessage = jsBridge.postMessage.bind(jsBridge);
    OS.postMessage = function(message) {
      nativePostMessage(JSON.stringify(message));
    }
} else {
  OS.postMessage = MockOS.postMessage;
}

// spread the code to the generic and environment parts
// check with krzyadadjkjtof about this proxy for the bridge
