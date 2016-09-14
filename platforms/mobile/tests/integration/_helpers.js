var expect = chai.expect;

var contentWindow, fakeServer;

function cliqzResponse(query, results, extra) {
  var results = JSON.stringify({
    "cached": false,
    "choice": "type1",
    "completions": null,
    "country": "de",
    "duration": 52,
    "extra": {
      "durationTotal": 9,
      "vertical_name": "extra",
      "results": extra
    },
    "navigational": false,
    "q": query,
    "result": results
  });

  fakeServer.respondWith(
    "GET",
    new RegExp("^https:\/\/newbeta.cliqz.com\/api\/v1\/results\\?q="+encodeURIComponent(query)),
    [ 200, { "Content-Type": "application/json" }, results ]
  );
}


function newsResponse(articles) {
  var response = JSON.stringify({
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
  });

  fakeServer.respondWith(
    "GET",
    new RegExp(".*rich-header.*"),
    [ 200, { "Content-Type": "application/json" }, response ]
  );
}

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
