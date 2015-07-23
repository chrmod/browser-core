Components.utils.import('chrome://cliqztests/content/screenshots/Screenshot.jsm');
var QUERIES = [];

TESTS.SmartCliqzTest = function (CliqzUtils) {

  function readQueries() {
    return new Promise(function (resolve, reject) {
      CliqzUtils.loadResource('chrome://cliqztests/content/screenshots/queries.json', function (req) {
        var json = JSON.parse(req.response),
            queries = [];
        for(var i = 0; i < json.queries.length; i++) {
          queries.push(json.queries[i].q);
        }
        resolve(queries);
      });
    });
  }

  describe('SmartCliqz', function(){
    this.timeout(5000);

    before(function () {
      // Give browser some time to startup properly
      return new Promise(function (resolve) {
        setTimeout(resolve, 1000);
      });
    });

    after(function () {
      // Give browser some time save last image
      return new Promise(function (resolve) {
        setTimeout(resolve, 2000);
      });
    });

    beforeEach(function() {
      CliqzUtils.getWindow().document.getElementById("mainPopupSet").style.position = "relative";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.display = "block";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.position = "absolute";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginTop = "72px";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginLeft = "32px";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.boxShadow = "1px 1px 10px #ccc";
    });

    //TODO get queries from queries.json
    ['spiegel', 'miley cyrus'].forEach(function (ezName) {

      it('should take screenshot of smart cliqz:'+ ezName, function() {
        fillIn(ezName);

        return waitForResult().then(function() {
          return new Promise(function (resolve) {
            setTimeout(resolve, 300);
          });
        }).then(function () {
          return Screenshot.exec({ 
            filename: ezName
          });
        });
      });
    });
  });
};