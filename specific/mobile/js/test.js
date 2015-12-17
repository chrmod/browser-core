/* UGLY TEST SYSTEM */

function slowType(query) {
  urlbar.value = "";
  for(var i in query) {
    (function(q,i) {
      setTimeout(function(){
        urlbar.value = urlbar.value + q;
        if(query.length == parseInt(i)+1) {
          CLIQZEnvironment.search(urlbar.value, CLIQZEnvironment.location_enabled, 48.1517832, 11.6200855);
        }
      },i*15);
    })(query[i],i)
  }
}

var iterator = 0;
var startEl, backEl, nextEl;
initTest = function () {
  document.getElementById("urlbar").style.display = "block";
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
        if(running) {
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
"marc al hames",
"jean paul schmetz",
"youtube",
"flüchtlinge",
"spiegel.de",
"aapl stock",
"Fack ju göhte 2",
"Pixels",
"cinemaxx",
"deutsche bank",
"hypo",
"hypo vereinsbank",
"2*4",
"bayern fc",
"sex",
"wetter münchen",
"wetter bangkok",
"wetter tirana",
"wetter b",
"240000 PLN in EUR",
"10000 Naira in Dollar",
"spiegel",
"spiegel news",
"focus",
"zeit",
"deutsche bank",
"burger king",
"mcdonalds",
"michelle obama",
"angela merkel",
"pol pot",
"weather Tokyo",
"weather Jakarta",
"weather Seoul",
"weather Delhi",
"weather Shanghai",
"weather Manila",
"weather Karachi",
"weather New York",
"weather Sao Paulo",
"weather Mexico City",
"weather Cairo",
"weather Beijing",
"weather Osaka",
"weather Mumbai",
"weather Guangzhou",
"weather Moscow",
"weather Los Angeles",
"weather Calcutta",
"weather Dhaka"
];

var autoTestInterval, running = false;
function startAutoTest() {
  nextTest();
    //autoTestInterval = setInterval(nextTest,1500);
    startEl.innerHTML = "STOP"
    running = true;
  }

  function stopAutoTest() {
    autoTestInterval && clearInterval(autoTestInterval);
    startEl.innerHTML = "PLAY"
    running = false;
  }