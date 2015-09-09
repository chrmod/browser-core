var expect = chai.expect;

TESTS.CliqzCalculatorTest = function (CliqzCalculator) {

    describe('Calculator and unit converter integration', function () {

        afterEach(function () {
            fillIn("");
        });

        context("Calculator simple - 2*3333.2", function () {
            beforeEach(function () {
                respondWith({
                    result: []
                });
                fillIn("2*3333.2");
                return waitForPopup();
            });

            it('Results should have ID calc-answer, in localized format', function () {
                expect($cliqzResults().find(".cqz-result-box").find("#calc-answer")[0].textContent.trim())
                    .to.equal(getLocaliseString({'de': '6.666,4', 'default': '6,666.4'}));
            });

            it('Should have copy message', function () {
                expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
            });
        });

        context("Unit converter simple - 1m to mm", function () {
            beforeEach(function () {
                respondWith({
                    result: []
                });
                fillIn("1m to mm");
                return waitForPopup();
            });

            it('Results should have ID calc-answer, in localized format', function () {
                expect($cliqzResults().find(".cqz-result-box").find("#calc-answer")[0].textContent.trim())
                    .to.equal(getLocaliseString({'de': '1.000 mm', 'default': '1,000 mm'}));
            });

            it('Should have base-unit conversion in localized format', function () {
                expect($cliqzResults().find(".cqz-result-box").find(".expression")[0].firstChild.textContent.trim())
                    .to.equal(getLocaliseString({'de': '1 m = 1.000 mm', 'default': '1 m = 1,000 mm'}));
            });

            it('Should have copy message', function () {
                expect($cliqzResults().find(".cqz-result-box").find("#calc-copy-msg")[0].textContent.trim()).to.exist;
            });
        });

// PR IARRM-17 should use this!
//        context("Unit converter language specific and singular/plural unit term - 1m to mm", function () {
//            beforeEach(function () {
//                respondWith({
//                    result: []
//                });
//                fillIn("10 meilen to km");
//                return waitForPopup();
//            });
//        });
    });
};
