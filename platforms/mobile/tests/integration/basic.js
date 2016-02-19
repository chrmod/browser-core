var expect = chai.expect;

    //<script src="/bower_components/sinonjs/sinon.js"></script>
var contentWindow, fakeServer;

function $(selector) {
	return contentWindow.document.querySelectorAll(selector)
}

function injectSinon(win) {
  var resolver,
      promise = new Promise(function (resolve) {
        resolver = resolve;
      });

  var sinonScript = win.document.createElement("script");
  sinonScript.src = "/bower_components/sinonjs/sinon.js";
  sinonScript.onload = function () {
    window.sinon = contentWindow.sinon;
    resolver();
  };
  win.document.body.appendChild(sinonScript);

  return promise;
}

describe('Search View', function() {
  var testBox,
	    isReady;

  beforeEach(function () {
    // startup can be quite slow for the first time. Maybe there is better way
    // to warm it up.
    this.timeout(5000);
    testBox = document.createElement("iframe");
    testBox.setAttribute("class", "testFrame")
    testBox.src = 	"/build/mobile/search/index.html";
    document.body.appendChild(testBox);


    contentWindow = testBox.contentWindow;

    function waitForWindow(win) {
      return new Promise(function (res) {
        isReady = win.osBridge.isReady;
        win.osBridge.isReady = function () { isReady(); res() };
      })
    }

    return new Promise(function (resolve) {
      contentWindow.onload = resolve;
    }).then(function () {
      return Promise.all([
        injectSinon(contentWindow),
        waitForWindow(contentWindow)
      ])
    }).then(function () {
      fakeServer = sinon.fakeServer.create({
        autoRespond: true,
        respondImmediately: true
      });
    });
  });

  afterEach(function () {
  	contentWindow.osBridge.isReady = isReady;
  	contentWindow.localStorage.clear();
    //fakeServer.restore();
    //document.body.removeChild(testBox);
  });

  function response(options) {
    return JSON.stringify(
{
    "cached": false,
    "choice": "type1",
    "completions": null,
    "country": "de",
    "duration": 52,
    "extra": {
        "durationTotal": 9,
        "vertical_name": "extra",
        "results": [
            {
                "q": "kino cadillac",
                "ts": 1455892138,
                "data": {
                    "__subType__": {
                        "class": "EntityLocal",
                        "id": "3087855600870963194",
                        "name": "cadillac.movieplace.de"
                    },
                    "address": "Rosenkavalierpl. 12, 81925 München, Germany",
                    "desc": "Cadillac Veranda Kino, München, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
                    "description": "Cadillac Veranda Kino, München, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
                    "friendly_url": "cadillac.movieplace.de",
                    "lat": 48.1517753,
                    "lon": 11.6197005,
                    "map_img": "http://maps.google.com/maps/api/staticmap?size=124x124\u0026zoom=16\u0026center=48.1517753,11.6197005\u0026format=png\u0026markers=size:mid|color:red|label:C|48.1517753,11.6197005",
                    "mu": "https://www.google.de/maps/place/cadillac+veranda/data=!4m2!3m1!1s0x0:0xec7891cbdf1a3b49?sa=X\u0026ved=0CFMQrwswAWoVChMI492LqdXuxwIVAtMUCh2-rwzi",
                    "opening_hours": [],
                    "phonenumber": "089 912000",
                    "rating": 4.6,
                    "superTemplate": "local-data-sc",
                    "t": "Cadillac \u0026 Veranda Kino",
                    "template": "generic",
                    "timestamp": 1.443973887175803e+09,
                    "title": "Kino in München: Cadillac Veranda Kino mit Kinoprogramm, Infos rund ums Kino und die Filme, Filmtrailern und vielem mehr.",
                    "u": "cadillac.movieplace.de"
                },
                "url": "http://cadillac.movieplace.de/",
                "subType": "{\"class\": \"EntityLocal\", \"ez\": \"deprecated\"}"
            }
        ]
    },
    "navigational": false,
    "q": "kino cadillac",
    "result": [
          {
            "q": "kino cadillac",
            "url": "http://cadillac.movieplace.de/",
            "score": 28.517757,
            "source": "bm",
            "snippet": {
                "alternatives": [],
                "desc": "Cadillac Veranda Kino, München, Aktuelles Kinoprogramm, Kino, Film- und Kino-Infos, Online-Tickets, News, Events und vieles mehr...",
                "language": {
                    "de": 1
                },
                "title": "Kino in München: Cadillac Veranda Kino mit Kinoprogramm, Infos rund ums Kino und die Filme, Filmtrailern und vielem mehr."
            }
        }
    ]
}

        )
  }

  context("Local Results", function () {
    beforeEach(function (done) {
      this.timeout(4000);
      /*
      fakeServer.respondWith(
        "https://newbeta.cliqz.com/api/v1/results?q=kino%20cadillac&locale=en-US&for…ountry=true&adult=0&loc_pref=ask&loc=48.151753799999994,11.620054999999999",
        [200, { "Content-Type": "application/json" },
        '[{ "id": 12, "comment": "Hey there" }]']);
        */
      contentWindow.addEventListener('imgLoadingOver', function () { done() });

      fakeServer.respondWith(
          "GET",
          "https://newbeta.cliqz.com/api/v1/results?q=kino%20cadillac&locale=en-US&force_country=true&adult=0&loc_pref=ask&loc=48.151753799999994,11.620054999999999",
          [
            200,
            { "Content-Type": "application/json" },
            response({
              extra: {
                address: "xxxx"
              }
            })
          ]
      );
      fakeServer.respondWith(
          "GET",
          "/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&locale=en-US",
        [
          200,
          { "Content-Type": "application/json" },
          JSON.stringify(
            {
            "results": [
              {
                "q": "",
                "news_version": 1455885880,
                "subType": "{\"class\": \"FreshTabNewsCache\", \"ez\": \"deprecated\"}",
                "trigger_urls": [

                ],
                "articles": [
                  {
                    "domain": "www.focus.de",
                    "is_global": false,
                    "description": "",
                    "title": "USA bombardieren IS-St\u00fctzpunkt in Libyen",
                    "url": "http:\/\/www.focus.de\/politik\/ausland\/kampf-gegen-terrormiliz-medienbericht-usa-bombardieren-is-stuetzpunkt-in-libyen_id_5299559.html",
                    "short_title": "USA bombardieren IS-St\u00fctzpunkt in Libyen"
                  }
                ]
              }
              ]
            })
        ]);
      contentWindow.search_mobile("kino cadillac", true, 48.151753799999994, 11.620054999999999);
      //fakeServer.respond();
    });

    it("should have local template with address and map", function () {
      expect($('.local')).to.have.length(1);

      var address = $('.cqz-local-address')[0];
      expect(address).to.be.ok;

      var addressText = address.lastChild.wholeText;
      expect(addressText).to.be.ok;
      expect(addressText.trim()).to.equal("Rosenkavalierpl. 12, 81925 München, Germany");

      var img = $('.local-data-img')[0];
      expect(img).to.be.ok
      expect(img).to.have.property('style');
      expect(img.style).to.have.property('display');
      expect(img.style.display).to.not.equal('none')
    });
  });

  context("Generic Entities", function () {
    beforeEach(function (done) {
      contentWindow.addEventListener('imgLoadingOver', function () { done() });
      contentWindow.search_mobile("amazon");
    });

    it("should render generic template", function () {
      expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- entity-generic -->');
    });
  });

  context("Adult Filter", function () {
    beforeEach(function (done) {
      contentWindow.addEventListener('imgLoadingOver', function () { done() });
      contentWindow.search_mobile("titten");
    });

    it("should filter all results", function () {
      expect($("#cliqz-results")[0].innerHTML).to.contain('<!-- noResult.tpl -->');
    });
  });

  context("Weather", function () {
    beforeEach(function (done) {
      contentWindow.addEventListener('imgLoadingOver', function () { done() });
      contentWindow.search_mobile("wetter münchen");
    });

    it("should have the weather card", function () {
      expect($('.EZ-weather-container')).to.have.length(4);
      expect($('.EZ-weather-img')).to.have.length(4);
    });
  });

  context("FC Bayern", function () {
    beforeEach(function (done) {
      contentWindow.addEventListener('imgLoadingOver', function () { done() });
      contentWindow.search_mobile("fcbayern");
    });

    it("should have the latest results smart card", function () {
      expect($('.ez-liga')).to.have.length(1);
      expect($('.meta__legend')).to.have.length(1);
    });
  });
});
