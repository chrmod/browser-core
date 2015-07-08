TESTS.UrlBarTest = function (CliqzUtils) {
  var chrome = CliqzUtils.getWindow();
  var urlBar = chrome.CLIQZ.Core.urlbar;
  var getCliqzResults;
  
  function fillIn(text) {
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  }
  
  function waitFor(fn, callback) {
    chai.expect(fn()).to.equal(false);
    function check() {
      if(fn()) {
        clearInterval(interval);
        callback(); 
      }
    }
    var interval = setInterval(check, 250);
    check();
    return interval;
  }

  function click(el) {
    var ev = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: false,
      ctrlKey: true,
      metaKey: true
    });
    el.dispatchEvent(ev)
  }

  function respondWith(res) {
    CliqzUtils.getCliqzResults = function(q, callback) {
      callback({
        response: JSON.stringify(res),
        status: 200
      }, q);
    };
  }

  function waitForResult(selector, cb) {
      waitFor(function () {
        return $cliqzResults().find(".cqz-result-box " + selector).length === 1;
      }, cb);
    }

    function $cliqzResults() {
      return $(chrome.document.getElementById("cliqz-results"));
    }

  function mockSmartCliqz(ez) {
    return new Promise(function (resolve, reject) {
      CliqzUtils.loadResource('chrome://cliqz/content/tests/scripts/EZ/' + ez + '.json', function (req) {
        json = JSON.parse(req.response);
        respondWith(json);
        resolve();
      });
    });
  }
  
  describe('UrlBar integration', function(){
    var checker,
        query = "xxx-face";
    beforeEach(function() {
      chrome.gBrowser.removeAllTabsBut(chrome.gBrowser.selectedTab);
            
      getCliqzResults = CliqzUtils.getCliqzResults;
      respondWith({
        "result": [
              {
                  "q": query,
                  "url": "https://www.facebook.com/",
                  "score": 0,
                  "confidence": null,
                  "source": "bm",
                  "snippet": {
                      "alternatives": [],
                      "desc": "Facebook is a social utility that connects people with friends and others who work, study and live around them.",
                      "language": {
                          "en": 1
                      },
                      "og": {
                          "image": "https://www.facebook.com/images/fb_icon_325x325.png"
                      },
                      "title": "Facebook"
                    }
              }
          ]
      });
    });
  
    afterEach(function () {
      CliqzUtils.getCliqzResults = getCliqzResults;
      clearInterval(checker); 
      fillIn("");
    });
    
    it('popup opens', function(done) {
      fillIn(query);

      checker = waitFor(function () {
        var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
        return popup.mPopupOpen === true;
      }, done);
    });

    it('includes results from bigmachine', function (done) {

      fillIn(query);

      checker = waitForResult(".cqz-result-title", function () {
        var $title = $cliqzResults().find(".cqz-result-box .cqz-result-title")[0].textContent.trim();
        chai.expect($title).to.equal("Facebook");
        done();
      });
    });

    it('should trigger Core#openLink when clicking on a result', function (done) {
      fillIn(query);
      
      checker = waitForResult(".cqz-result-title", function () {
        click($cliqzResults().find(".cqz-result-box .cqz-result-title")[0]);
        chai.expect(chrome.gBrowser.tabs).to.have.length(2);
        done();
      });
    });

    it('should trigger firefox history search', function (done) {
      respondWith({
        result: []
      });
      fillIn("mozilla");

      checker = waitForResult(".cqz-ez-title", function () {
         var $pattern = $cliqzResults().find(".cqz-result-box .cliqz-pattern-element"),
             $title   = $cliqzResults().find(".cqz-result-box .cqz-ez-title");

        chai.expect($title[0].textContent.trim()).to.equal("Mozilla");
        chai.expect($pattern).to.have.length.above(1);
        done();
      });
    });

    it('should display spiegel smart cliqz', function (done) {
      mockSmartCliqz('spiegel').then(function () {
        fillIn("spiegel");

        checker = waitForResult(".cqz-result-title", function () {
          var title = $cliqzResults().find(".cqz-result-box .cqz-ez-title")[0].textContent.trim();
          chai.expect(title).to.equal("SPIEGEL ONLINE");
          done();
        });
      });

    });
  });
};