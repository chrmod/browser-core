Components.utils.import('chrome://cliqztests/content/screenshots/Screenshot.jsm');

TESTS.SmartCliqzTest = function (CliqzUtils) {

  function mockSmartCliqz(ez) {
    return new Promise(function (resolve, reject) {
      CliqzUtils.loadResource('chrome://cliqztests/content/EZ/' + ez + '.json', function (req) {
        var json = JSON.parse(req.response);
        CliqzUtils.log(json);
        respondWith(json);
        resolve();
      });
    });
  }

  describe('SmartCliqz', function(){
    this.timeout(5000);

    beforeEach(function() {
      CliqzUtils.getWindow().document.getElementById("mainPopupSet").style.position = "relative";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.display = "block";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.position = "absolute";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginTop = "72px";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.marginLeft = "32px";
      CliqzUtils.getWindow().CLIQZ.Core.popup.style.boxShadow = "1px 1px 10px #ccc";

    });

    ['gmx.de', 'spiegel'].forEach(function (ezName) {

      it('should take screenshot of smart cliqz:'+ezName, function() {
        return mockSmartCliqz(ezName).then(function () {
          fillIn(ezName);
          return waitForPopup();
        }).then(function() {
          Screenshot.exec();
        }); 
      });

    });
  });

};