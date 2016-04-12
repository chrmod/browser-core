/* UGLY TEST SYSTEM */
/* UGLY TEST SYSTEM */

function slowType(query) {
  var urlbarvalue = "";
  for(var i in query) {
    (function(q,i) {
      setTimeout(function(){
        urlbarvalue = urlbarvalue + q;
        if(query.length == parseInt(i)+1) {
          CLIQZEnvironment.search(urlbarvalue, CLIQZEnvironment.location_enabled, 48.1517832, 11.6200855);
        }
      },i*15);
    })(query[i],i)
  }
}

var iterator = 0;
var startEl, backEl, nextEl;
function initTest() {
  startEl = document.createElement("div")
  startEl.style.position = "absolute";
  startEl.style.zIndex = "10000";
  startEl.style.display = "block";
  startEl.style.left = "58px";
  startEl.style.border = "1px solid #555";
  startEl.style.padding = "10px";
  startEl.style.color = "#fff";
  startEl.style.backgroundColor = "#000";
  startEl.style.opacity = "0.2";
  startEl.innerHTML = "PLAY";

  startEl.addEventListener( 'click', function() {
        //nextTest();
        if(Test.running) {
          stopAutoTest();
        } else {
          startAutoTest();
        }
      });
  document.body.appendChild(startEl)

  nextEl = document.createElement("div")
  nextEl.style.position = "absolute";
  nextEl.style.zIndex = "10000";
  nextEl.style.display = "block";
  nextEl.style.left = "120px";
  nextEl.style.border = "1px solid #555";
  nextEl.style.padding = "10px";
  nextEl.style.color = "#fff";
  nextEl.style.opacity = "0.2";
  nextEl.style.backgroundColor = "#000";
  nextEl.innerHTML = ">";
  nextEl.addEventListener( 'click', function() {
    nextTest();
  });
  document.body.appendChild(nextEl)



  backEl = document.createElement("div")
  backEl.style.position = "absolute";
  backEl.style.zIndex = "10000";
  backEl.style.display = "block";
  backEl.style.left = "25px";
  backEl.style.border = "1px solid #555";
  backEl.style.padding = "10px";
  backEl.style.color = "#fff";
  backEl.style.opacity = "0.2";
  backEl.style.backgroundColor = "#000";
  backEl.innerHTML = "<";
  backEl.addEventListener( 'click', function() {
    lastTest();
  });
  document.body.appendChild(backEl)
}

function nextTest() {
  iterator++;
  if(typeof testArray[iterator] == "undefined") {
    iterator = 0;
  }
  slowType(testArray[iterator]);
}

function lastTest() {
  iterator--;
  if(typeof testArray[iterator] == "undefined") {
    iterator = testArray.length-1;
  }
  slowType(testArray[iterator]);
  
}

var testArray = [
"deviantart.com",
"photobucket.com",
"linkedin.com",
"holidaycheck.de",
"immobilienscout24.de",
"wikia.com",
"vk.com",
"vimeo.com",
"tripadvisor.de",
"dailymotion.com",
"immowelt.de",
"yelp.de",
"stackoverflow.com",
"soundcloud.com",
"dailymail.co.uk",
"wikipedia.org",
"gofeminin.de",
"autoscout24.de",
"xing.com",
"ink361.com",
"abdgames.com",
"myspace.com",
"calbears.com",
"vevo.com",
"filmstarts.de",
"google.de",
"imdb.com",
"gozags.com",
"moviepilot.de",
"weheartit.com",
"amazon.de",
"uclabruins.com",
"imgur.com",
"indeed.com",
"tumblr.com",
"stepstone.de",
"onmeda.de",
"tagesspiegel.de",
"fupa.net",
"wattpad.com",
"tinypic.com",
"badische-zeitung.de",
"popsugar.com",
"gamefaqs.com",
"msn.com",
"yahoo.com",
"yelp.com",
"ebay.de",
"merkur.de",
"rp-online.de",
"fansshare.com",
"bloomberg.com",
"marc al hames",
"britney spears",
"filmstars casablanca",
"youtube",
"flüchtlinge",
"spiegel.de",
"aapl stock",
"Fack ju göhte 2",
"Pixels",
"cinemaxx",
"deutsche bank",
"hypo vereinsbank",
"2*4",
"bayern fc",
"sex",
"wetter münchen",
"240000 PLN in EUR",
"spiegel news",
"burger king", // local-data-sc.tpl
"angela merkel",
"pol pot",
"flug DLH 2475",
];

var autoTestInterval;
function startAutoTest() {
  nextTest();
  //autoTestInterval = setInterval(nextTest,1500);
  startEl.innerHTML = "STOP"
  Test.running = true;
}

function stopAutoTest() {
  autoTestInterval && clearInterval(autoTestInterval);
  startEl.innerHTML = "PLAY"
  Test.running = false;
}


var Test = {
  initTest: initTest,
  running: false,
  nextTest: nextTest
}

export default Test;