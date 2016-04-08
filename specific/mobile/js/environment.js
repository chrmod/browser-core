var isRequestFailed = false;

function resendRequest(forceResend) {
  CliqzUtils.log("incoming, isRequestFailed="+isRequestFailed,"resendRequest");
  var shouldResend = forceResend || isRequestFailed;
  if(shouldResend) {
    CliqzUtils.log("RESENDING","resendRequest");
    setTimeout(search_mobile, 500, CliqzAutocomplete.lastSearch, CLIQZEnvironment.location_enabled, CLIQZEnvironment.latitude, CLIQZEnvironment.longitude);
    isRequestFailed = false;
  }
}
///////////////

var lastSucceededUrl;
var latestUrl;

////


//Lucian: temp hopefully
CliqzLanguage = {
  stateToQueryString: function(){ return '&lang=de,en'; }
}
CliqzHistory = {
  updateQuery: function(){},
  setTabData: function(){}
}
XPCOMUtils = {
  defineLazyModuleGetter: function(){},
  generateQI: function(){},
}
Services = {
  scriptloader: {
    loadSubScript: function(){
            // lucian / tomas / anyone else
          }
        }
      }

      Components = {
        interfaces: {
          nsIAutoCompleteResult: {}
        },
        utils: {
          import: function(){}
        },
        ID: function(){}
      }

      XULBrowserWindow = {
        updateStatusField: function(){},
        setOverLink: function(){}
      };

      (function () {
        var listener
        , doc = document
        , hack = doc.documentElement.doScroll
        , domContentLoaded = 'DOMContentLoaded'
        , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


        if (!loaded) {
          doc.addEventListener(domContentLoaded, listener = function () {
            doc.removeEventListener(domContentLoaded, listener)
            loaded = 1
          });
        }
      }());


      /** Converts numeric degrees to radians */
      if (typeof(Number.prototype.toRad) === "undefined") {
        Number.prototype.toRad = function() {
          return this * Math.PI / 180;
        }
      }
