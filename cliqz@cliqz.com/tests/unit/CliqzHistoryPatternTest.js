TESTS.CliqzHistoryPatternTest = function (CliqzHistoryPattern) {
  describe('CliqzHistoryPattern', function(){

    describe('removeDuplicates', function() {

      function prep_list(entries) {
        entries.forEach(function (entry) {
          entry._genUrl = CliqzHistoryPattern.generalizeUrl(entry.url);
        })
      }

      it('should take first if no https', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/'
          },
          { title: 'title 2',
            url: 'http://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url),
            title: entry.title
          };
        });

        var expected = [ source[0] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      })

    });


  });
};