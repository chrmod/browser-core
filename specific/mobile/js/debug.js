var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
var resultsBox = document.getElementById('results');
var progressIndicator = document.getElementById('progress');

var item_container, currentQuery;

CLIQZ.Core = {
  popup: resultsBox,
  refreshButtons: function(){}
}

// overriding things
CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}
// end of overriding things



// end of currency converter code

function setDefaultSearchEngine(engine) {
  CLIQZEnvironment.setDefaultSearchEngine(engine);
}

function compareTimestamps(a, b) {
  return a.timestamp - b.timestamp;
}

function showPast() {
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

