window.addEventListener('disconnected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.style.display = "block");
});
window.addEventListener('connected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.style.display = "none");
});

var isRequestFailed = false;

var lastSucceededUrl;
var latestUrl;

function resendRequest(forceResend) {
  CliqzUtils.log("incoming, isRequestFailed="+isRequestFailed,"resendRequest");
  var shouldResend = forceResend || isRequestFailed;
  if(shouldResend) {
    CliqzUtils.log("RESENDING","resendRequest");
    setTimeout(search_mobile, 500, CliqzAutocomplete.lastSearch, CLIQZEnvironment.location_enabled, CLIQZEnvironment.latitude, CLIQZEnvironment.longitude);
    isRequestFailed = false;
  }
}

function isMixerUrl(url) {
  if(url.indexOf(CliqzUtils.RESULTS_PROVIDER) == 0) {
    return true;
  }
  return url.indexOf(CliqzUtils.RICH_HEADER) == 0;
}

window.addEventListener('load', function() {
  CliqzUtils.pingCliqzResults();
});

var db = {
  showConsoleLogs: true
};

var onAndroid = false;



if(typeof jsBridge == "undefined") {
  jsBridge = {
    openLink:function(url) {
      console.log("arguments", arguments);
      console.log("%c jsBridge calling openLink " + url,"background-color:#00ff00");
      if(window.webkit) {
        window.webkit.messageHandlers.linkSelected.postMessage(url);
      }
    },
    searchHistory:function(q) {
            // mock history
            if( q=="h" || q=="H" ) {
             return '[{"title":"HISTORY MOCK Geschäftsführung (Deutschland) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Gesch%C3%A4ftsf%C3%BChrung_(Deutschland)#Gesch.C3.A4ftsf.C3.BChrer", "score": 0},{"title":"Chief Executive Officer – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Chief_Executive_Officer", "score": 0},{"title":"CEO (Begriffsklärung) – Wikipedia","url":"https://de.m.wikipedia.org/wiki/CEO_(Begriffskl%C3%A4rung)", "score": 0},{"title":"WebSockets over a 3G connection - Stack Overflow","url":"http://stackoverflow.com/questions/5557776/websockets-over-a-3g-connection", "score": 0},{"title":"Dein idealer Smartphone-Tarif von netzclub","url":"https://www.netzclub.net/", "score": 0}]';
           }
           return '[]';
         },
         isReady: function() {console.log("%c jsBridge calling isReady","background-color:#00ff00")},
         autocomplete: function() {console.log("%c jsBridge calling autocomplete","background-color:#00ff00")},
         notifyQuery: function(val) {
          console.log("%c jsBridge calling notifyQuery with "+val,"background-color:#00ff00");
          if(window.webkit) {
            window.webkit.messageHandlers.changeUrlVal.postMessage(val);
          }            
        },
        getTopSites: function() {
          return JSON.stringify([{"title":"BILD.DE AfD-Führung: \"Von Neonazis nicht zu unterscheiden\"","url":"http://www.bild.de/politik/deutschland/afd-spd-vize-ralf-stegner-fordert-beobachtung-der-parteifuehrung-a-1059564.html","timestamp":1445862077384, "score": 0},{"title":"Gewalt gegen Flüchtlinge: Der Faschismus lebt - SPIEGEL ONLINE - Nachrichten - Politik","url":"http://m.spiegel.de/politik/deutschland/a-1059574.html#spRedirectedFrom=www&referrrer=","timestamp":1445880101453, "score": 0},{"title":"Asiatisch - Kostenlose Porno von Asiatisch - Einfachporno.com","url":"http://www.einfachporno.com/pornofilme/asiatisch/","timestamp":1445859482383, "score": 0},{"title":"Türkei: Europa verrät seine Werte - SPIEGEL ONLINE","url":"http://www.spiegel.de/politik/ausland/tuerkei-europa-verraet-seine-werte-a-1059540.html","timestamp":1445862076516, "score": 0},{"title":"Kostenlos Pornos von mehrere Kategorien auf einfachporno: junge Mädchen, Arschficken, Orgien, Lesben","url":"http://www.einfachporno.com/kategorien/","timestamp":1445858997336, "score": 0},{"title":"Nachrichten - SPIEGEL ONLINE","url":"http://www.spiegel.de/","timestamp":1445866453249, "score": 0},{"title":"Trotz Absage: Viele helfen mit: Ai Weiwei kann Lego-Projekt umsetzen - Kunst - FOCUS Online Mobile - Nachrichten","url":"http://m.focus.de/kultur/kunst/trotz-absage-viele-helfen-mit-ai-weiwei-kann-lego-projekt-umsetzen_id_5040511.html","timestamp":1445880102614, "score": 0},{"title":"Amazon.de: Spiegel-Bestseller: Bücher: Jahresbestseller 2013, Hardcover Belletristik, Hardcover Sachbuch und mehr","url":"http://www.amazon.de/b/ref=amb_link_51544565_1?ie=UTF8&node=4206085031&pf_r…ZFBX&pf_rd_t=1401&pf_rd_p=515157807&pf_rd_i=1000127753&tag=wwwspiegelde-21","timestamp":1445878091575, "score": 0},{"title":"„ARD-aktuell\"-Chefredakteur gibt zu: „Versäumnis bedauern wir\": ARD verfälschte Bericht über Flüchtlings-Lichterkette - Medien - FOCUS Online - Nachrichten","url":"http://www.focus.de/kultur/medien/ard-aktuell-chefredakteur-gibt-zu-versaeu…s-bedauern-wir-ard-verfaelschte-bericht-ueber-fluechtlinge_id_5029327.html","timestamp":1445862112719, "score": 0},{"title":"Fefes Blog","url":"http://blog.fefe.de/","timestamp":1445859446110, "score": 0},{"title":"Armand Zipfel – Wikipedia","url":"https://de.m.wikipedia.org/wiki/Armand_Zipfel","timestamp":1445880102950, "score": 0},{"title":"National Hockey League – Wikipedia","url":"https://de.m.wikipedia.org/wiki/National_Hockey_League","timestamp":1445878305256, "score": 0},{"title":"Gewalt gegen Flüchtlinge: Der Faschismus lebt - Kolumne - SPIEGEL ONLINE","url":"http://www.spiegel.de/politik/deutschland/gewalt-gegen-fluechtlinge-der-faschismus-lebt-kolumne-a-1059574.html","timestamp":1445877854997, "score": 0},{"title":"FOCUS Online - Nachrichten","url":"http://www.focus.de/","timestamp":1445862077474, "score": 0},{"title":"Leiden und Hoffen im Ballettinternat: Auf der Spitze - SPIEGEL ONLINE - Nachrichten - SchulSPIEGEL","url":"http://m.spiegel.de/schulspiegel/a-1057589.html","timestamp":1445862078146, "score": 0},{"title":"Zwillinge in der Pubertät: Best Friends Forever - SPIEGEL ONLINE - Nachrichten - SchulSPIEGEL","url":"http://m.spiegel.de/schulspiegel/a-1058561.html","timestamp":1445862077998, "score": 0},{"title":"SchulSPIEGEL - SPIEGEL ONLINE","url":"http://m.spiegel.de/schulspiegel/","timestamp":1445862078029, "score": 0},{"title":"Japanische Mutter vergnügt sich mit ihrem Sohn - Einfachporno.com","url":"http://www.einfachporno.com/filme/japanische-mutter-vergnugt-sich-mit-ihrem-sohn/","timestamp":1445859039584, "score": 0},{"title":"Zusammenarbeit in der Flüchtlingskrise: EU hält offenbar kritischen Bericht zur Türkei zurück - SPIEGEL ONLINE - Nachrichten - Politik","url":"http://m.spiegel.de/politik/ausland/a-1059486.html","timestamp":1445858972663, "score": 0},{"title":"Politik - SPIEGEL ONLINE","url":"http://www.spiegel.de/politik/","timestamp":1445859092519, "score": 0}]);
        }
      }
    } else {
      onAndroid = true;
    }

    if( !jsBridge.hasOwnProperty("browseraction") ) {
      jsBridge.browserAction = function(string,action) {
        console.log("%c jsBridge calling browseraction with '"+string+"', action "+action,"background-color:#00ff00")
      }
    }

    var ENGINES = [{name:""}];




    if (typeof KeyEvent == "undefined") {
      var KeyEvent = {
        DOM_VK_CANCEL: 3,
        DOM_VK_HELP: 6,
        DOM_VK_BACK_SPACE: 8,
        DOM_VK_TAB: 9,
        DOM_VK_CLEAR: 12,
        DOM_VK_RETURN: 13,
        DOM_VK_ENTER: 14,
        DOM_VK_SHIFT: 16,
        DOM_VK_CONTROL: 17,
        DOM_VK_ALT: 18,
        DOM_VK_PAUSE: 19,
        DOM_VK_CAPS_LOCK: 20,
        DOM_VK_ESCAPE: 27,
        DOM_VK_SPACE: 32,
        DOM_VK_PAGE_UP: 33,
        DOM_VK_PAGE_DOWN: 34,
        DOM_VK_END: 35,
        DOM_VK_HOME: 36,
        DOM_VK_LEFT: 37,
        DOM_VK_UP: 38,
        DOM_VK_RIGHT: 39,
        DOM_VK_DOWN: 40,
        DOM_VK_PRINTSCREEN: 44,
        DOM_VK_INSERT: 45,
        DOM_VK_DELETE: 46,
        DOM_VK_0: 48,
        DOM_VK_1: 49,
        DOM_VK_2: 50,
        DOM_VK_3: 51,
        DOM_VK_4: 52,
        DOM_VK_5: 53,
        DOM_VK_6: 54,
        DOM_VK_7: 55,
        DOM_VK_8: 56,
        DOM_VK_9: 57,
        DOM_VK_SEMICOLON: 59,
        DOM_VK_EQUALS: 61,
        DOM_VK_A: 65,
        DOM_VK_B: 66,
        DOM_VK_C: 67,
        DOM_VK_D: 68,
        DOM_VK_E: 69,
        DOM_VK_F: 70,
        DOM_VK_G: 71,
        DOM_VK_H: 72,
        DOM_VK_I: 73,
        DOM_VK_J: 74,
        DOM_VK_K: 75,
        DOM_VK_L: 76,
        DOM_VK_M: 77,
        DOM_VK_N: 78,
        DOM_VK_O: 79,
        DOM_VK_P: 80,
        DOM_VK_Q: 81,
        DOM_VK_R: 82,
        DOM_VK_S: 83,
        DOM_VK_T: 84,
        DOM_VK_U: 85,
        DOM_VK_V: 86,
        DOM_VK_W: 87,
        DOM_VK_X: 88,
        DOM_VK_Y: 89,
        DOM_VK_Z: 90,
        DOM_VK_CONTEXT_MENU: 93,
        DOM_VK_NUMPAD0: 96,
        DOM_VK_NUMPAD1: 97,
        DOM_VK_NUMPAD2: 98,
        DOM_VK_NUMPAD3: 99,
        DOM_VK_NUMPAD4: 100,
        DOM_VK_NUMPAD5: 101,
        DOM_VK_NUMPAD6: 102,
        DOM_VK_NUMPAD7: 103,
        DOM_VK_NUMPAD8: 104,
        DOM_VK_NUMPAD9: 105,
        DOM_VK_MULTIPLY: 106,
        DOM_VK_ADD: 107,
        DOM_VK_SEPARATOR: 108,
        DOM_VK_SUBTRACT: 109,
        DOM_VK_DECIMAL: 110,
        DOM_VK_DIVIDE: 111,
        DOM_VK_F1: 112,
        DOM_VK_F2: 113,
        DOM_VK_F3: 114,
        DOM_VK_F4: 115,
        DOM_VK_F5: 116,
        DOM_VK_F6: 117,
        DOM_VK_F7: 118,
        DOM_VK_F8: 119,
        DOM_VK_F9: 120,
        DOM_VK_F10: 121,
        DOM_VK_F11: 122,
        DOM_VK_F12: 123,
        DOM_VK_F13: 124,
        DOM_VK_F14: 125,
        DOM_VK_F15: 126,
        DOM_VK_F16: 127,
        DOM_VK_F17: 128,
        DOM_VK_F18: 129,
        DOM_VK_F19: 130,
        DOM_VK_F20: 131,
        DOM_VK_F21: 132,
        DOM_VK_F22: 133,
        DOM_VK_F23: 134,
        DOM_VK_F24: 135,
        DOM_VK_NUM_LOCK: 144,
        DOM_VK_SCROLL_LOCK: 145,
        DOM_VK_COMMA: 188,
        DOM_VK_PERIOD: 190,
        DOM_VK_SLASH: 191,
        DOM_VK_BACK_QUOTE: 192,
        DOM_VK_OPEN_BRACKET: 219,
        DOM_VK_BACK_SLASH: 220,
        DOM_VK_CLOSE_BRACKET: 221,
        DOM_VK_QUOTE: 222,
        DOM_VK_META: 224
      };
    }


//Lucian: temp hopefully
CliqzLanguage = {
  stateToQueryString: function(){ return ''; }
}

CliqzHumanWeb = {
  addURLtoDB: function () {
    console.log("CHW addURLtoDB", arguments);
  },
  state: {},
  notification: function (notification) {
    console.log("CHW notification", arguments);
  },
  getCDByURL: function () {
    console.log("CHW notification", arguments);
  }

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

            if(typeof(jsBridge) != "undefined") {
              osBridge.isReady();
            }
            console.log("isReady");
          });
        } else {
          if(typeof(jsBridge) != "undefined") {
            osBridge.isReady();
          }
          console.log("isReady");
        }
      }());


      /** Converts numeric degrees to radians */
      if (typeof(Number.prototype.toRad) === "undefined") {
        Number.prototype.toRad = function() {
          return this * Math.PI / 180;
        }
      }
