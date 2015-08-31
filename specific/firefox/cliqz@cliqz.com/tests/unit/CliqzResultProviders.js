'use strict';

TESTS.CliqzResultProviders = function (CliqzResultProviders) {
  describe('CliqzResultProviders', function(){
    describe('custom search - #team', function(){
      it('should return #team result', function(){
        var team = CliqzResultProviders.isCustomQuery('#team'),
        expected = {"updatedQ":"#team","engineName":"CLIQZ","queryURI":"https://cliqz.com/team/","code":"#"}

        chai.expect(team).to.deep.equal(expected);
      });
    });

    describe('custom search - maps', function(){
      it('should return google maps result for wisen', function(){
        var team = CliqzResultProviders.isCustomQuery('#gm wisen'),
          expected = {"updatedQ":"wisen","engineName":"Google Maps","queryURI":"https://maps.google.de/maps?q=wisen","code":2};

        chai.expect(team).to.deep.equal(expected);
      });
    });

  });
};


