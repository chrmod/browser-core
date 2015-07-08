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

  function mockSmartCliqz(ez, callback) {
    CliqzUtils.loadResource('chrome://cliqz/content/tests/scripts/EZ/' + ez + '.json',
      function(req){
        if(CliqzUtils) {
          callback && callback(req, ez);
        }
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

    it('should displays results', function (done) {
      fillIn(query);

      checker = waitFor(function () {
        var results = $(chrome.document.getElementById("cliqz-results"));
        return  results.find(".cqz-result-box").length === 1;
      }, done);
    });

    it('includes results from bigmachine', function (done) {
      fillIn(query);

      checker = waitFor(function () {
        var results = $(chrome.document.getElementById("cliqz-results"));
        var res = results.find(".cqz-result-box");
        return  results.find(".cqz-result-box .cqz-result-title").length === 1;
      }, done);
    });

    it('should trigger Core#openLink when clicking on a result', function (done) {
      fillIn(query);

      var results = $(chrome.document.getElementById("cliqz-results"));
      
      checker = waitFor(function () {
        var res = results.find(".cqz-result-box");
        return  results.find(".cqz-result-box .cqz-result-title").length === 1;
      }, function () {
        var el = results.find(".cqz-result-box .cqz-result-title")[0];
        click(el);
        var tabs = Array.prototype.slice.apply(chrome.gBrowser.tabs);
        chai.expect(tabs.length).to.equal(2);
        done();
      });
    });

    it('should trigger firefox history search', function(done) {
      respondWith({
        "result": []
      });
      fillIn("mozilla");

      var results = $(chrome.document.getElementById("cliqz-results"));
      checker = waitFor(function () {
        var res = results.find(".cqz-result-box");
        return results.find(".cqz-result-box .cqz-ez-title").length === 1;
      }, function() {
        var title = results.find(".cqz-result-box .cqz-ez-title")[0],
          expectedTitle = "Mozilla",
          actualTitle,
          patternElement = results.find(".cqz-result-box .cliqz-pattern-element"),
          actualTitle = title.textContent.trim();

          console.log(patternElement.length);
        
        chai.expect(1).to.equal(1);
        chai.expect(expectedTitle, actualTitle);
        chai.expect(patternElement).to.have.length.above(1);
        done();
      });
    });

    it('should display spiegel smart cliqz', function(done) {
      var json,
          results = [];
      
      fillIn("spiegel");

      var p1 = new Promise(
        function(resolve, reject) {
          mockSmartCliqz('spiegel', function(req, ez){
            json = JSON.parse(req.response);
            respondWith(json);
            resolve();
          });  
        }
      );

      p1.then(function() {
        checker = waitFor(function () {
        var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
        return popup.mPopupOpen === true;
      }, done);
      })

    });
  });
};