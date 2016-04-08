var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
var resultsBox = document.getElementById('results');
var progressIndicator = document.getElementById('progress');

var item_container, currentQuery;

CLIQZ.Core = {
  urlbar: urlbar,
  popup: resultsBox,
  refreshButtons: function(){}
}

function trace() {
  try {
    throw new Error('myError');
  }
  catch(e) {
    CliqzUtils.log(JSON.stringify(e.stack),"TRACE");
  }
}


// overriding things
CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}

// end of overriding things

function initResultBox () {
  if(!CliqzHandlebars.tplCache.main) return setTimeout(initResultBox, 100);
  CLIQZ.UI.main(resultsBox);
  CLIQZ.Core.popup.cliqzBox = resultsBox;
};
initResultBox();

//CliqzUtils.RESULTS_PROVIDER = "http://mixer-beta.clyqz.com/api/v1/results?q=";
//CliqzUtils.RICH_HEADER = "http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map";

if(onAndroid || location.port == 4200 || window.webkit) {
  document.getElementById("urlbar").style.display = "none";
} else {

}

if(location.search.match("urlbar")) {
  document.getElementById("urlbar").style.display = "block";
  document.getElementById("urlbar").addEventListener("keyup",function() {
      search_mobile(this.value, true, 48.155772899999995, 11.615600899999999)
  });
}


var debugcss = "background-color:#00aa00;display:block;"

CLIQZEnvironment.openLinksAllowed = true;


CliqzUtils.requestMonitor.inHealth = function() { return true; }


CLIQZEnvironment.renderRecentQueries();


//TODO: Should be refactored!!!!

function search_mobile(e, location_enabled, latitude, longitude) {
  CLIQZEnvironment.search(e, location_enabled, latitude, longitude);
}

window.addEventListener('resize', function () {
  setTimeout(function () {
    CLIQZEnvironment.setDimensions();
    var w = window.innerWidth;
    var frames = document.getElementsByClassName("frame");
    var i;
    for(i=0;i<frames.length;i++) {
      frames[i].style.left = (CLIQZEnvironment.CARD_WIDTH*i) +"px";
      frames[i].style.width = CLIQZEnvironment.CARD_WIDTH+"px";
    }

    if(CLIQZEnvironment.vp) {
      CLIQZEnvironment.vp.destroy();
    }

    CLIQZEnvironment.crossTransform(document.getElementById("results"), 0);
    CLIQZEnvironment.vp = CLIQZEnvironment.initViewpager();
    CLIQZEnvironment.vp.goToIndex(CLIQZEnvironment.currentPage,0);
    }, 50);

    CLIQZEnvironment.setCardsHeight();

});

actionsExternal = [];

function switchCurrency(data) {
  var fromInput = document.getElementById("fromInput");

  var convRate = 1 / data.mConversionRate;
  data.mConversionRate = convRate + "";
  convRate *= data.multiplyer;
  var fromValue = getNumValue(parseFloat(fromInput.value));
  data.toAmount.main = getNumValue(fromValue * convRate);
  data.fromAmount = fromValue;

  var temp = data.fromCurrency;
  data.fromCurrency = data.toCurrency;
  data.toCurrency = temp;

  temp = data.formSymbol;
  data.formSymbol = data.toSymbol;
  data.toSymbol = temp;

  data.multiplyer = 1 / data.multiplyer;

  updateCurrencyTpl(data);
}

function updateFromValue(data) {
  var fromInput = document.getElementById("fromInput");
  var toInput = document.getElementById("toInput");
  var toAmount = document.getElementById("calc-answer");
  var toValue = getNumValue(fromInput.value / data.multiplyer * data.mConversionRate).toFixed(2) - 0;
  toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
  toInput.value = toValue;
}

function updateToValue(data) {
  var fromInput = document.getElementById("fromInput");
  var toInput = document.getElementById("toInput");
  var toAmount = document.getElementById("calc-answer");
  var toValue = getNumValue(toInput.value);
  var fromValue = getNumValue(toValue * data.multiplyer / data.mConversionRate).toFixed(2);
  toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
  fromInput.value = fromValue;
}

function getNumValue(value) {
  return (isNaN(value) || value <= 0 ? 0 : value - 0); // rounding value
}

function updateCurrencyTpl(data) {
  document.getElementById("currency-tpl").innerHTML = CliqzHandlebars.tplCache.currency({data: data});
}

// end of currency converter code

function setDefaultSearchEngine(engine) {
  CLIQZEnvironment.setDefaultSearchEngine(engine);
}

function compareTimestamps(a, b) {
  return a.timestamp - b.timestamp;
}

function showPast() {
  CLIQZEnvironment.renderRecentQueries(true);
  document.getElementById("conversations").parentElement.scrollTop = 10000
  if( CLIQZEnvironment.vp ) {
    CLIQZEnvironment.vp.goToIndex(0,0)
  }
}

// function showFuture() {
//  CLIQZEnvironment.startProgressBar();
//  var conversationsEl = document.getElementById("conversations");
//    var myTopsites = JSON.parse(jsBridge.getTopSites())
//    var mmatch, tld, collectorFinal = [];
//    var collector = {};
//    for(var i in myTopsites) {
//      mmatch = myTopsites[i].url.match(/http(s?):\/\/(.*?)\.(.*?)\.(.*?)\//);
//      if(mmatch) {
//      tld = mmatch[3] + '.' + mmatch[4];
//      collector[tld] = true;
//      }
//    }

//    for(var i in collector) {
//      collectorFinal.push(i);
//    }

//    var domains = collectorFinal.join("|"),
//      newsDataAll = [];

//    CLIQZEnvironment.httpHandler(
//      "GET",
//      "http://news-test-swimlane.clyqz.com/articles?q=news&extra_domains="+domains+"&num_results_per_domain=3&num_domains=100",
//      function(result) { // success
//      var res = JSON.parse(result.responseText), current;
//      for(var i in res.data.news) {
//         var current = res.data.news[i];
//         for (domain in current) break;
//         newsDataAll.push({domain:domain,news:current[domain]});
//      }

//      console.log("newsData",newsDataAll);

//      conversationsEl.innerHTML = CliqzHandlebars.tplCache.conversations_future({data:newsDataAll});

//      CLIQZEnvironment.stopProgressBar();

//      },
//      function() { // error
//      console.warn(arguments)
//      },
//      5000);

//      if( typeof CLIQZEnvironment.vp !== "undefined" ) {
//        CLIQZEnvironment.vp.goToIndex(0,0);
//      }


// }

var myEl;
function openFuture(el) {
   var allUls = document.getElementById("conversations").getElementsByTagName("ul");

   for(var i=0;i<allUls.length;i++) {
     allUls[i].style.display = "none";
   }

   if( typeof CLIQZEnvironment.vp !== "undefined" ) {
    CLIQZEnvironment.vp.goToIndex(0,0);
  }

   el.getElementsByTagName("ul")[0].style.display = "block";
  //console.log(el)
}

function getCardUrl() {
  var NOT_SHAREABLE_SIGNAL = '-1';
  if(CLIQZEnvironment.lastResults && CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage]) {
    osBridge.shareCard(CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage].url || NOT_SHAREABLE_SIGNAL);
  } else {
    osBridge.shareCard(NOT_SHAREABLE_SIGNAL);
  }
};

