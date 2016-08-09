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
    describe('#AdFilter', function () {
      let AdFilter;

      // Generate test cases
      context('Filters parsing', function () {
        beforeEach(function () {
          AdFilter = this.module().AdFilter;
        });

        const dataPath = 'modules/adblocker/tests/unit/data/filters_parsing.txt';
        loadTestCases(dataPath).forEach(testCase => {
          it(`parses ${testCase.filter} correctly`, () => {
            return new Promise(function (resolve, reject) {
              const parsed = new AdFilter(testCase.filter);
              Object.keys(testCase.compiled).forEach(key => {
                if (parsed[key] !== testCase.compiled[key]) {
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
