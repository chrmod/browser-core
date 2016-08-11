
"use strict"

window.XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
};

window.Services = {
  scriptloader: {
    loadSubScript: function(){}
  }
};

window.Components = {
  interfaces: {
    nsIAutoCompleteResult: {}
  },
  utils: {
    import: function(){}
  },
  ID: function(){}
};

window.XULBrowserWindow = {
  updateStatusField: function(){},
  setOverLink: function(){}
}

window.CLIQZ = {};

var currWinId = undefined;
chrome.windows.getCurrent(null, (win) => { currWinId = win.id; });

var urlbar = document.getElementById('urlbar');

CLIQZ.Core = {
  urlbar: urlbar,
  popup: document.getElementById('results'),
  refreshButtons: function(){}
}

System.baseURL = "modules/";

console.log('LOADING ...')

Promise.all([
  System.import("core/utils"),
  System.import("core/templates")
  ])
  .then(function(modules){
    window.CliqzUtils = modules[0].default;
    window.CliqzHandlebars = modules[1].default;
  })
  .then(function(){
    return Promise.all([
      System.import("platform/environment"),
      System.import("autocomplete/mixer"),
      System.import("autocomplete/autocomplete"),
      System.import("ui/background"),
      System.import("core/events")
    ])
  }).then(function (modules) {
    window.CLIQZEnvironment = modules[0].default;
    window.Mixer = modules[1].default;
    window.CliqzAutocomplete = modules[2].default;
    window.CliqzEvents = modules[4].default;

    CliqzUtils.System = System;
    CliqzAutocomplete.Mixer = Mixer;
    CLIQZEnvironment.storage = localStorage;

    return System.import("core/startup")
  }).then(function (startupModule) {
    return startupModule.default(window, [
      "autocomplete"
    ]);
  }).then(function () {
    // Loading UI still breaks but we need to wait for it to break/load before
    // continuing.
    var brokenUIpromise = new Promise(function(resolve, reject){
      System.import("ui/UI").then(resolve).catch(resolve);
    });

    return Promise.all([brokenUIpromise, CliqzUtils.init({
      lang: window.navigator.language || window.navigator.userLanguage
    })]);
  }).then(function () {
    CLIQZ.UI.preinit(CliqzAutocomplete, CliqzHandlebars, CliqzEvents);
    CLIQZ.UI.init(urlbar);
    CLIQZ.UI.main(document.getElementById('results'));
  }).then(function() {
    chrome.cliqzSearchPrivate.onInputChanged.addListener(
        (winId, query) => {
          if (winId === currWinId)
            startAutocomplete(query);
        });
    chrome.cliqzSearchPrivate.onAutocompleteStopped.addListener(
        (winId) => {
          if (winId === currWinId) {
            // TODO: Stop any ongoing queries.
          }
        });
    chrome.cliqzSearchPrivate.onSelectionMoved.addListener(
        (winId, toIndex) => {
          if (winId === currWinId)
            CLIQZ.UI.selectResultByIndex(toIndex);
        });
  });

function startAutocomplete(query) {
  urlbar.value = query;
  (new CliqzAutocomplete.CliqzResults()).search(query, function(r) {
    var currentResults = CLIQZ.UI.results({
      q: r._searchString,
      results: r._results.map(function(r) {
        r.type = r.style;
        r.url = r.val || '';
        r.title = r.comment || '';
        return r;
      }),
      isInstant: false,
      isMixed: true
    });
  });
}

// For debugging only
urlbar.addEventListener('keyup', function(ev){
  setTimeout(startAutocomplete, 0, ev.target.value);
});

// Debugging stubs for running outside of chromium extension context.
function declareStubs(props, context) {
  function makePrintCall(pn) {
    return function() {
      console.log(pn + ": " + Array.prototype.slice.call(arguments));
    }
  }

  for (var propName in props) {
    var prop = props[propName];
    if (typeof prop === "object") {
      var stub = {}
      declareStubs(prop, context[propName] || stub);
      if (!(propName in context))
        context[propName] = stub;
    }
    else if (!(propName in context)) {
      context[propName] = makePrintCall(propName);
    }
  }
}

var stubs = {
  chrome: {
    windows: {
      getCurrent: 0
    },
    cliqzSearchPrivate: {
      queryHistory: 0,
      processResults: 0,
      onInputChanged: {
        addListener: 0
      },
      onAutocompleteStopped: {
        addListener: 0
      },
      onSelectionMoved: {
        addListener: 0
      }
    }
  }
};
declareStubs(stubs, this);

function showPosition(position) {
  CLIQZEnvironment.USER_LAT = position.coords.latitude;
  CLIQZEnvironment.USER_LNG = position.coords.longitude;
}
navigator.geolocation.getCurrentPosition(showPosition);
