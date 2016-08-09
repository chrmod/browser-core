/* global chai */
/* global describeModule */


function loadTestCases(path) {
  const fs = require('fs');
  const data = fs.readFileSync(path, 'utf8');
  const testCases = [];

  // Parse test cases
  data.split(/\n/).forEach(line => {
     let testCase = null;
     try {
       testCase = JSON.parse(line);
       testCases.push(testCase);
     } catch (ex) {
       /* Ignore exception */
     }
  });

  return testCases;
}


export default describeModule('adblocker/filters-parsing',
  function () {
    return {
      'adblocker/utils': {
        log: () => 0,
      },
      'core/cliqz': {
        utils: {},
      },
    };
  },
  function () {
    describe('#AdCosmetics', function () {
      let AdCosmetics;

      // Generate test cases
      context('Cosmetic filter parsing', function () {
        beforeEach(function () {
          AdCosmetics = this.module().AdCosmetics;
        });

        const dataPath = 'modules/adblocker/tests/unit/data/cosmetics_parsing.txt';
        loadTestCases(dataPath).forEach(testCase => {
          it(`parses ${testCase.filter} correctly`, () => {
            return new Promise(function (resolve, reject) {
              const parsed = new AdCosmetics(testCase.filter);
              Object.keys(testCase.compiled).forEach(key => {
                try {
                  chai.expect(parsed[key]).to.deep.equal(testCase.compiled[key]);
                } catch (ex) {
                  reject(`Expected ${key} == ${testCase.compiled[key]} (found ${parsed[key]})`);
                }
              });
              resolve();
            });
          });
        });
      });
    });
  }
);
