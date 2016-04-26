var expect = chai.expect;

TESTS.CliqzCalculatorTest = function(CliqzCalculator) {
  function getResultString() {
    return $cliqzResults().find(".cqz-result-box").find("#calc-answer")[0].textContent.trim();
  }

  function getUnitBaseString() {
    return $cliqzResults().find(".cqz-result-box").find(".expression")[0].firstChild.textContent.trim();
  }

  describe('Calculator and unit converter integration', function() {

    afterEach(function() {
      fillIn("");
    });

    context("Calculator simple - 2*3333.2", function() {
      beforeEach(function() {
        respondWith({result: []});
        fillIn("2*3333.2");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '6.666,4', 'default': '6,666.4'}));
      });

      it('Should have copy message', function() {
        expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Calculator with thousand marks EN", function() {
      var lang;
      beforeEach(function() {
        respondWith({result: []});
        lang = CliqzUtils.locale["default"].locale_lang_code.message;
        CliqzUtils.locale["default"].locale_lang_code.message = 'en-US';
        fillIn("2*3,222.2");
        return waitForPopup();
      });

      afterEach(function() {
        CliqzUtils.locale["default"].locale_lang_code.message = lang;
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '6.444,4', 'default': '6,444.4'}));
      });

      it('Should have copy message', function() {
        expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Calculator with thousand marks DE", function() {
      var lang;
      beforeEach(function() {
        respondWith({result: []});
        lang = CliqzUtils.locale["en-US"].locale_lang_code.message;
        CliqzUtils.locale["en-US"].locale_lang_code.message = 'de-DE';
        fillIn("2*3.222,2");
        return waitForPopup();
      });

      afterEach(function() {
        CliqzUtils.locale["en-US"].locale_lang_code.message = lang;
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'en': '6,444.4', 'default': '6.444,4'}));
      });

      it('Should have copy message', function() {
        expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Unit converter simple - 1m to mm", function() {
      beforeEach(function() {
        respondWith({result: []});
        fillIn("1m to mm");
        return waitForPopup();
      });

      it('Results should have ID calc-answer, in localized format', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '1.000 mm', 'default': '1,000 mm'}));
      });

      it('Should have base-unit conversion in localized format', function() {
        expect(getUnitBaseString()).to.equal(getLocaliseString({'de': '1 m = 1.000 mm', 'default': '1 m = 1,000 mm'}));
      });

      it('Should have copy message', function() {
        expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
      });
    });

    context("Unit converter language specific - 1 mile to m", function() {
      beforeEach(function() {
        respondWith({result: []});
        fillIn("1 mile to m");  // 1.609,34 m
        return waitForPopup();
      });

      it('Unit base line should show 1 meile = ... in German browser, and 1 mile = ... in English browser', function() {
        expect(getUnitBaseString().split("=")[0].trim()).to.equal(getLocaliseString({'de': '1 meile', 'default': '1 mile'}))
      });
    });

    context("Unit converter singular/plural unit term - 1m to mile", function() {
      beforeEach(function() {
        respondWith({result: []});
        fillIn("1 km to mile");
        return waitForPopup();
      });

      it('Result should show 0,621 meilen in German browser, and 0.621 miles in English browser', function() {
        expect(getResultString()).to.equal(getLocaliseString({'de': '0,621 meilen', 'default': '0.621 miles'}));
      });

    });
  });
};
