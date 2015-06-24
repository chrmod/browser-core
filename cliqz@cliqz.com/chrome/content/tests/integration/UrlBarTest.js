TESTS.UrlBarTest = function (CliqzUtils) {
  var chrome = CliqzUtils.getWindow();
  var urlBar = chrome.CLIQZ.Core.urlbar;
  
  function fillIn(text) {
    urlBar.focus();
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
  
  describe('UrlBar integration', function(){
    var checker;
  
    afterEach(function () {
      clearInterval(checker); 
      fillIn("");
    });
    
    it('popup opens', function(done) {
      fillIn("face");
        
      checker = waitFor(function () {
        var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
        return $(popup).attr("autocompleteinput") === "urlbar";
      }, done);
    });
  });
};