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

  function respondWith(res) {
    CliqzUtils.getCliqzResults = function(q, callback) {
      callback({
        response: JSON.stringify(res),
        status: 200
      }, q);
    };
  }
  
  describe('UrlBar integration', function(){
    var checker;

    beforeEach(function() {
      getCliqzResults = CliqzUtils.getCliqzResults;
      respondWith({
        "result": [
              {
                  "q": "face",
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
      fillIn("face");

        
      checker = waitFor(function () {
        var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
        return popup.mPopupOpen === true;
      }, done);
    });
  });
};