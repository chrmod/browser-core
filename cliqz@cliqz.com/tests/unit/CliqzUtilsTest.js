TESTS.CliqzUtilsTest = function (CliqzUtils, CliqzTour) {
  describe('CliqzUtils', function(){
    describe('#HOST', function(){
      it('should be set to cliqz.com', function(){
        chai.expect(CliqzTour.VERSION).to.equal("1.1");
        chai.expect(CliqzUtils.HOST).to.equal('https://cliqz.com');
      })
    })
  });
};