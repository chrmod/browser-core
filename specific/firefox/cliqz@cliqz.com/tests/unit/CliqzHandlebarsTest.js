'use strict';

var expect = chai.expect;

TESTS.CliqzHandlebarsTest = function (CliqzHandlebars, CliqzUtils) {
    var lang = CliqzUtils.getLocalizedString('locale_lang_code');

    describe('CliqzHandlebarsTest', function () {
        describe('localizeNumber', function () {
            it('normal number string localisation 1', function () {
                expect(checkLocaliseString(CliqzHandlebars.helpers.localizeNumbers('1203'), {'de': '1.203', 'default': '1,203'}))
                    .to.be.true;
            });

            it('number with postfix, e.g. 1202.3B (B= Billion)', function () {
                expect(checkLocaliseString(CliqzHandlebars.helpers.localizeNumbers('1202.3B'), {'de': '1.202,3B', 'default': '1,202.3B'}))
                    .to.be.true;
            });
        });

    });
};
