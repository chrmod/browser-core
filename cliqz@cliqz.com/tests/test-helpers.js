function injectTestHelpers(CliqzUtils) {
  var chrome = CliqzUtils.getWindow();
  var urlBar = chrome.CLIQZ.Core.urlbar;
  
  window.fillIn = function fillIn(text) {
    urlBar.focus();
    urlBar.mInputField.focus();
    urlBar.mInputField.setUserInput(text);
  };

  window.waitFor = function waitFor(fn, callback) {
  	chai.expect(fn()).to.equal(false);
    function check() {
      CliqzUtils.log("!!", fn());
      if(fn()) {
        clearInterval(interval);
        callback(); 
      }
    }
    var interval = setInterval(check, 250);
    check();
    registerInterval(interval);
    return interval;	
  };

  window.registerInterval = function registerInterval(interval) {
    if(!window.TestIntervals) { window.TestIntervals = []; }
    TestIntervals.push(interval);  
  };

  window.clearIntervals = function clearIntervals() {
    window.TestIntervals && window.TestIntervals.forEach(window.clearInterval);
  }

  window.click = function click(el) {
    var ev = new MouseEvent("mouseup", {
      bubbles: true,
      cancelable: false,
      ctrlKey: true,
      metaKey: true
    });
    el.dispatchEvent(ev)
  };

  window.respondWith = function respondWith(res) {
    CliqzUtils.getCliqzResults = function (q, callback) {
      callback({
        response: JSON.stringify(res),
        status: 200
      }, q);
    };
  };

 	window.$cliqzResults = function $cliqzResults() {
    return $(chrome.document.getElementById("cliqz-results"));
  }

  window.waitForResult = function waitForResult(selector, cb) {
    waitFor(function () {
      return $cliqzResults().find(".cqz-result-box " + selector).length === 1;
    }, cb);
  };

  window.waitForPopup = function waitForPopupOpen(cb) {
    waitFor(function () {
      var popup = chrome.document.getElementById("PopupAutoCompleteRichResultCliqz");
      return popup.mPopupOpen === true;
    }, cb);
  };
}