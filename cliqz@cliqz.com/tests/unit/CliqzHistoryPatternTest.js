'use strict';

TESTS.CliqzHistoryPatternTest = function (CliqzHistoryPattern) {
  describe('CliqzHistoryPattern', function(){

    describe('removeDuplicates', function() {

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
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take first if all https', function(){
        var source = [
          { title: 'title 1',
            url: 'https://www.abs.com/'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/'
          },
          { title: 'title 3',
            url: 'https://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https if in pos 0', function(){
        var source = [
          { title: 'title 1',
            url: 'https://www.abs.com/'
          },
          { title: 'title 2',
            url: 'http://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https if in pos 1', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/'
          },
          { title: 'title 3',
            url: 'http://www.abs.com/'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https in pos 0 if titles the same', function(){
        var source = [
          { title: 'title',
            url: 'https://www.abs.com/gsgfds'
          },
          { title: 'title',
            url: 'http://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[0] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should take https in pos 1 if titles the same', function(){
        var source = [
          { title: 'title',
            url: 'http://www.abs.com/gsgfds'
          },
          { title: 'title',
            url: 'https://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = [ source[1] ];

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

      it('should leave alone if all different urls and titles', function(){
        var source = [
          { title: 'title 1',
            url: 'http://www.abs.com/gsgfds'
          },
          { title: 'title 2',
            url: 'https://www.abs.com/sssssss'
          }
        ].map(function (entry) {
          return {
            title: entry.title,
            url: entry.url,
            _genUrl: CliqzHistoryPattern.generalizeUrl(entry.url)
          };
        });

        var expected = source;

        chai.expect(CliqzHistoryPattern.removeDuplicates(source)).to.deep.equal(expected);
      });

    });

  });
};