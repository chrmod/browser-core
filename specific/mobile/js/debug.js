var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
var resultsBox = document.getElementById('results');
var progressIndicator = document.getElementById('progress');

var logscreen = document.getElementById("logscreen"); 

document.getElementById("reconnecting").style.display = "none"; 

CLIQZ.UI.init(urlbar);
var item_container, currentQuery;

CLIQZ.Core = {
  urlbar: urlbar,
  popup: resultsBox,
  refreshButtons: function(){}
}


Handlebars.registerHelper("debug", function(optionalValue) {
  console.log("Current Context");
  console.log("====================");
  console.log(this);
 
  if (optionalValue) {
    console.log("Value"); 
    console.log("====================");
    console.log(optionalValue);
  }
});

Handlebars.registerHelper('conversationsTime', function(time) {
    var d = new Date(time);
    var hours = d.getHours();
    hours = hours > 9 ? hours : '0' + hours
    var minutes = d.getMinutes();
    minutes = minutes > 9 ? minutes : '0' + minutes
    var formatedDate = hours + ':' + minutes;
    return formatedDate;
});


function trace() {
  try {
    throw new Error('myError');
  }
  catch(e) {
    Logger.logScreen(JSON.stringify(e.stack),"TRACE");
  }
}


// overriding things
CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}

CliqzSmartCliqzCache._prepareCustomData = function () {}

// end of overriding things

CLIQZ.Core.popup.hidePopup = function() {}

CLIQZ.UI.init(urlbar);

CLIQZ.UI.main(resultsBox);

CLIQZ.Core.popup.cliqzBox = resultsBox;

CLIQZEnvironment.updateGeoLocation();

setInterval("CLIQZEnvironment.updateGeoLocation();",5000);

CliqzUtils.setBackendToBeta = function() {
  CliqzUtils.RESULTS_PROVIDER = "http://mixer-beta.clyqz.com/api/v1/results?q=";
  CliqzUtils.RICH_HEADER = "http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map";
}

CliqzUtils.setBackendToLive = function() {
  CliqzUtils.RESULTS_PROVIDER = "https://newbeta.cliqz.com/api/v1/results?q=";
  CliqzUtils.RICH_HEADER = "https://newbeta.cliqz.com/api/v1/rich-header?path=/map"
}

//CliqzUtils.RESULTS_PROVIDER = "http://mixer-beta.clyqz.com/api/v1/results?q=";
//CliqzUtils.RICH_HEADER = "http://mixer-beta.clyqz.com/api/v1/rich-header?path=/map";

if(onAndroid || location.port == 3001 || window.webkit) {
  document.getElementById("urlbar").style.display = "none";
} else {
  
}

var debugcss = "background-color:#00aa00;display:block;"

CLIQZEnvironment.openLinksAllowed = true;

CliqzUtils.setPref("share_location","yes");
CliqzUtils.setPref("adultContentFilter","liberal");


CliqzUtils.requestMonitor.inHealth = function() { return true; }


CLIQZEnvironment.renderRecentQueries();
 


CLIQZEnvironment.delayTimer = null;
function doSearch(text) {
//     clearTimeout(CLIQZEnvironment.delayTimer);
//     CLIQZEnvironment.delayTimer = setTimeout(function() {
//         CLIQZEnvironment.search(text);
//     }, 200);
  CLIQZEnvironment.search(text);
}

urlbar.addEventListener('keydown', function(e){
  doSearch(urlbar.value);
});

//TODO: Should be refactored!!!!

function search_mobile(e) {
  urlbar.value = e;
  doSearch(e);
}

window.addEventListener('resize', function () {
  setTimeout(function () {
    var w = window.innerWidth;
    var frames = document.getElementsByClassName("frame");
    var i;
    for(i=0;i<frames.length;i++) {
      frames[i].style.left = (w*i) +"px";
      frames[i].style.width = w+"px";
    }
    
    if(CLIQZEnvironment.vp) {
      CLIQZEnvironment.vp.destroy();
    }
    
    document.getElementById("results").style.transform ="translate3d(0px, 0px, 0px)"
    CLIQZEnvironment.vp = CLIQZEnvironment.initViewpager();
    CLIQZEnvironment.vp.goToIndex(CLIQZEnvironment.currentPage,0); 
    }, 50);
});

CLIQZ.UI.VIEWS["local-data-sc"] = {
  enhanceResults: function(data) {

    function parseTime(timeStr) {  // e.g. timeStr: 10.30
      var time = timeStr.split(".");
      return {
        hours: parseInt(time[0]) || 0,
        minutes: parseInt(time[1]) || 0
      };
    }

    function twoDigit(num) {
      return [
        num < 10 ? "0" : "",
        num
      ].join("");
    }

    var isBigSnippet = Boolean(data.phonenumber || data.address || data.opening_hours || data.no_location),
        rating_img = null,
        t = new Date(),
        current_t = [
          twoDigit(t.getHours()),
          twoDigit(t.getMinutes())
        ].join("."),
        open_stt, timeInfos = [],
        openingColors =  {
          open: "#74d463",
          closed: "#E92207",
          open_soon: "#FFC802",
          close_soon: "#FFC802"
        };

    data.phone_address = data.phonenumber || data.address;

    if (data.opening_hours) {

      data.opening_hours.forEach(function (el) {
        if (!el.open || !el.close) { return; }
        timeInfos.push(el.open.time + " - " + el.close.time);
        if(open_stt && open_stt !== "closed") { return; }


        var openTime  = parseTime(el.open.time),
        closeTime = parseTime(el.close.time),
        closesNextDay = el.close.day !== el.open.day,
        /** Difference in minutes from opening/closing times to current time **/
        minutesFrom = {
          opening:  60 * (t.getHours() - openTime.hours) + (t.getMinutes() - openTime.minutes),
          /* If it closes the next day, we need to subtract 24 hours from the hour difference */
          closing: 60 * (t.getHours() - closeTime.hours - ( closesNextDay ? 24 : 0) ) + (t.getMinutes() - closeTime.minutes)
        };

        if (minutesFrom.opening > 0 && minutesFrom.closing < 0) {
          open_stt = "open";
          if (minutesFrom.closing > -60){
            open_stt =  "close_soon";
          }
        } else {
          open_stt = "closed";
          if (minutesFrom.opening > -60 && minutesFrom.opening < 0) {
            open_stt = "open_soon";
          }
        }
      });


      data.opening_status = {
        color: openingColors[open_stt],
        stt_text: CliqzUtils.getLocalizedString(open_stt),
        time_info_til: CliqzUtils.getLocalizedString("open_hour"),
        time_info_str: timeInfos.join(", ")
      };
    }

    if (!data.rating) { data.rating = 0; }

    rating_img = "http://cdn.cliqz.com/extension/EZ/richresult/stars" + Math.max(0, Math.min(Math.round(data.rating), 5)) + ".svg";

    if (!isBigSnippet) {
      data.richData = {
        image: data.image,
        url_ratingimg: rating_img,
        name: data.t,
        des: data.desc
      };
    } else {
      data.url_ratingimg = rating_img;
    }


    data.big_rs_size = isBigSnippet;

    data.distance = CLIQZEnvironment.distance(
                        data.lon,
                        data.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
  }
}







CLIQZ.UI.VIEWS["local-cinema-sc"] = {

  enhanceMovieSC: function (data) {

    var rating = data.ratingStars.rating ? Math.round(data.ratingStars.rating) : 0,
        ratingCss = {
          true: 'on',
          false: 'off'
        };
    data.stars = Array.apply(null,Array(5)).map(function(_, i) {
      return {
        star_class: "cqz-rating-star-" + ratingCss[i<rating]
      };
    });


    //distance

    //
    //

    
    for(var i in data.cinemas) {
      data.cinemas[i].cinema.distance = CLIQZEnvironment.distance(
                        data.cinemas[i].cinema.lon,
                        data.cinemas[i].cinema.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
    }
    //Logger.log(data.cinemas,"DATAAAAAAA");

    if (data.emptyColumns) {
      data.emptyColumns.map(function(x, _) {
        x.num_empty_columns = data.table_size - x.showtimes.length;
      });
    }
  },

  enhanceResults: function(data) {
    data.cinema.distance = CLIQZEnvironment.distance(
                        data.cinema.lon,
                        data.cinema.lat,
                      CLIQZEnvironment.USER_LNG,
                      CLIQZEnvironment.USER_LAT)*1000;
    data.ratingStars = data.cinema;
    data.emptyColumns = data.movies;
    CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC(data);
  }





}


CLIQZ.UI.VIEWS["local-movie-sc"] = {
  
  enhanceMovieSC: CLIQZ.UI.VIEWS["local-cinema-sc"].enhanceMovieSC,

  enhanceResults: function(data) {
    data.ratingStars = data.movie;
    data.emptyColumns = data.cinemas;
    this.enhanceMovieSC(data);
  }
}




CLIQZ.UI.VIEWS["stocks"] = {
  
  enhanceResults: function(data) {
    var myTime = new Date(data.message.last_update * 1000);
      data.message.time_string = myTime.toTimeString().replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1");
  }
}


CLIQZ.UI.VIEWS["weatherEZ"] = { 
  enhanceResults: function(data) {
    if (data.forecast_url) {
      data.btns = [
        {
          'title_key': 'extended_forecast',
          'url': data.forecast_url
        }
      ];
    }
  }
}


CLIQZ.UI.VIEWS["weatherAlert"] = CLIQZ.UI.VIEWS["weatherEZ"];

// currency converter code


CLIQZ.UI.VIEWS["currency"] = {
  
  enhanceResults: function(data) {
      console.log(data);
  }
}


function switchCurrency(data) {
  var fromInput = document.getElementById("fromInput");

  var convRate = 1 / parseFloat(data.mConversionRate);
  data.mConversionRate = convRate + "";
  var fromValue = getNumValue(parseFloat(fromInput.value));
  data.toAmount.main = getNumValue(fromValue * convRate);
  data.fromAmount = fromValue;
  
  var temp = data.fromCurrency;
  data.fromCurrency = data.toCurrency;
  data.toCurrency = temp;
  
  temp = data.formSymbol;
  data.formSymbol = data.toSymbol;
  data.toSymbol = temp;
  
  updateCurrencyTpl(data);
}

function updateFromValue(data) {
  var fromInput = document.getElementById("fromInput");
  var toInput = document.getElementById("toInput");
  var toAmount = document.getElementById("toAmount");
  var toValue = getNumValue(parseFloat(fromInput.value) * parseFloat(data.mConversionRate));
  toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
  toInput.value = toValue;
}

function updateToValue(data) {
  var fromInput = document.getElementById("fromInput");
  var toInput = document.getElementById("toInput");
  var toAmount = document.getElementById("toAmount");
  var toValue = getNumValue(parseFloat(toInput.value));
  var fromValue = getNumValue(toValue / parseFloat(data.mConversionRate));
  toAmount.innerText = toValue.toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
  fromInput.value = fromValue;
}

function getNumValue(value) {
  return (isNaN(value) || value + 0.005 <= 0 ? 0 : value).toFixed(2); // rounding value
}

function updateCurrencyTpl(data) {
  document.getElementById("currency-tpl").innerHTML = CliqzHandlebars.tplCache.currency({data: data});
}

// end of currency converter code




CLIQZ.UI.VIEWS["partials/missing_location_step_1"] = { 
  messages: {
    "movies": {
      'trans_str': {
        'message': 'movies_confirm_no',
        'yes': 'yes',
        'no': 'show_local_movies'
      }
    },
    "cinemas": {
      'trans_str': {
        'message': 'cinemas_confirm_no',
        'yes': 'yes',
        'no': 'show_local_cinemas'
      }
    },
    "default": {
      'trans_str': {
        'message': 'location_confirm_no',
        'yes': 'yes',
        'no': 'show_local_results'
      }
    }
  },
  events: {
    click: {
        "cqz_location_yes": function(ev) {
          ev.preventDefault();
          CLIQZEnvironment.setLocationPermission(window, "yes");
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].loadLocalResults(ev.target);

        },
        "cqz_location_once": function(ev) {
          ev.preventDefault();
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].loadLocalResults(ev.target);
        },
        "cqz_location_no": function(ev) {
          var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container"),
              el = ev.target,
              localType = el.getAttribute("local_sc_type") || "default";

          container.innerHTML = CliqzHandlebars.tplCache["partials/missing_location_step_2"]({
              friendly_url: el.getAttribute("bm_url"),
              trans_str: messages[localType].trans_str
          });
        },
        "cqz_location_never": function(ev) {
          CLIQZEnvironment.setLocationPermission(window, "no");
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].displayMessageForNoPermission();
        },
        "cqz_location_not_now": function(ev) {
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].displayMessageForNoPermission();
        },
        "cqz_location_yes_confirm": function(ev) {
          CLIQZEnvironment.setLocationPermission(window, "yes");
          var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
          if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
            "display_msg": "location-thank-you"
          });
        }
    }
  },
  loadLocalResults:function(el) {
      CLIQZ.Core.popup.cliqzBox.querySelector(".location_permission_prompt").classList.add("loading");
      CLIQZEnvironment.getGeo(true, function (loc) {
          CliqzUtils.httpGet(CliqzUtils.RICH_HEADER +
              "&q=" + CLIQZ.Core.urlbar.value +
              CliqzUtils.encodeLocation(true, loc.lat, loc.lng) +
              "&bmresult=" + el.getAttribute("bm_url"),
              CLIQZ.UI.VIEWS["partials/missing_location_step_1"].handleNewLocalResults(el));
      }, function () {
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].failedToLoadResults(el);
          CliqzUtils.log("Unable to get user's location", "CliqzUtils.getGeo");
      });
  },


  handleNewLocalResults:function(el) {
      return function(req) {
        //CliqzUtils.log(req, "RESPONSE FROM RH");
        var resp,
            container = el,
            r;

        try {
          resp = JSON.parse(req.response);
          CliqzUtils.log(resp, "RH RESPONSE");
        } catch (ex) {
        }
        if (resp && resp.results && resp.results.length > 0) {
          while (container && !CliqzUtils.hasClass(container, "cqz-result-box")) {
            container = container.parentElement;
            if (!container || container.id == "cliqz-results") return;
          }      
          CLIQZ.UI.enhanceResults(resp);
          r = resp.results[0];
          if (container) container.innerHTML = CliqzHandlebars.tplCache[r.data.template](r);
        } else {
          CLIQZ.UI.VIEWS["partials/missing_location_step_1"].failedToLoadResults(el);
        }
      };
    },


  failedToLoadResults:function(el) {
    var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
    if (el.id === "cqz_location_yes") {
        container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
          "display_msg": "location-sorry"
        });
    } else if (el.id == "cqz_location_once") {
        container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
          "display_msg": "location-permission-ask"
        });
    }
  },

  displayMessageForNoPermission:function() {
    var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
    if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
      "display_msg": "location-no"
    });
  }

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
