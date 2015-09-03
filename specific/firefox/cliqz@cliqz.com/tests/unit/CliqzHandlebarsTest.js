'use strict';

var expect = chai.expect;

TESTS.CliqzHandlebarsTest = function (CliqzHandlebars) {
    describe('CliqzHandlebarsTest', function () {
        describe('localizeNumber', function () {
            it('normal number string localisation', function () {
                expect(CliqzHandlebars.helpers.localizeNumbers('1203'))
                    .to.satisfy(function(str_num){
                        return ['1.203', '1,203'].indexOf(str_num) >= 0;
                    });
            });

            it('number with postfix, e.g. 1202.3B (B= Billion)', function () {
                expect(CliqzHandlebars.helpers.localizeNumbers('1202.3B'))
                    .to.satisfy(function(str_num){
                        return ['1.202,3B', '1,202.3B'].indexOf(str_num) >= 0;
                    });
            });
        });

    });
};
