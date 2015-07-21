TESTS.UrlBarTest = function (CliqzUtils) {
  
  describe('UrlBar integration', function(){
    
    afterEach(function () {
      fillIn("");
    });

    context("api driven result", function () {
      var result = {
        "result": [
          {
            "q": "fb",
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
      }, query = result.result[0].q;
        
      beforeEach(function() {        
        respondWith(result);
        fillIn(query);
      });
      
      it('popup opens', function(done) {
        waitFor(function () {
          var popup = CliqzUtils.getWindow().document.getElementById("PopupAutoCompleteRichResultCliqz");
          return popup.mPopupOpen === true;
        }, done);
      });

      it('should return results from bigmachine', function (done) {
        waitForResult(".cqz-result-title", function () {
          var $title = $cliqzResults().find(".cqz-result-box .cqz-result-title")[0].textContent.trim();
          chai.expect($title).to.equal("Facebook");
          done();
        });
      });

      it('should open new tab when clicking on a result', function (done) {
        waitForResult(".cqz-result-title", function () {
          click($cliqzResults().find(".cqz-result-box .cqz-result-title")[0]);
          chai.expect(CliqzUtils.getWindow().gBrowser.tabs).to.have.length(2);
          done();
        });
      });

    });

    context("history results", function () {
      it('should trigger firefox history search', function (done) {
        respondWith({
          result: []
        });
        fillIn("mozilla");

        waitForResult(".cqz-ez-title", function () {
           var $pattern = $cliqzResults().find(".cqz-result-box .cliqz-pattern-element"),
               $title   = $cliqzResults().find(".cqz-result-box .cqz-ez-title");

          chai.expect($title[0].textContent.trim()).to.equal("Mozilla");
          chai.expect($pattern).to.have.length.above(1);
          done();
        });
      });

    });
  });
};
