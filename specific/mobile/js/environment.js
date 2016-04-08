window.addEventListener('disconnected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.innerHTML = '<h3>'+CliqzUtils.getLocalizedString('mobile_reconnecting_msg')+'</h3>');
});
window.addEventListener('connected', function() {
  var elem = document.getElementById("reconnecting");
  elem && (elem.innerHTML = '');
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
