/* global chai */
/* global describeModule */


function loadLinesFromFile(path) {
  const fs = require('fs');
  const data = fs.readFileSync(path, 'utf8');
  return data.split(/\n/);
}


function loadTestCases(path) {
  const testCases = [];

  // Parse test cases
  loadLinesFromFile(path).forEach(line => {
    try {
      const testCase = JSON.parse(line);
      testCases.push(testCase);
    } catch (ex) {
      /* Ignore exception */
    }
  });

  return testCases;
}


export default describeModule('adblocker/filters-engine',
  function () {
    return {
      'adblocker/utils': {
        log: msg => {
          // const message = `[adblock] ${msg}`;
          // console.log(message);
        },
      },
      'antitracking/hash': {
        HashProb: () => { return { isHash: () => false }; },
      },
      'core/cliqz': {
        utils: {},
      },
    };
  },
  function () {
    describe('Test filter engine one filter at a time', function () {
      let FilterEngine;
      let engine = null;
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';

      beforeEach(function () {
        FilterEngine = this.module().default;
      });

      it('matches correctly', () => {
        this.timeout(10000);
        return new Promise((resolve, reject) => {
          loadTestCases(matchingPath).forEach(testCase => {
            // Create filter engine with only one filter
            engine = new FilterEngine();
            engine.onUpdateFilters(undefined, [testCase.filter]);

            // Check should match
            try {
              if (!engine.match(testCase)) {
                reject(`Expected ${testCase.filter} to match ${testCase.url}`);
              }
              resolve();
            } catch (ex) {
              reject(`Encountered exception ${ex} while matching ` +
                `${testCase.filter} against ${testCase.url}`);
            }
          });
        });
      });
    });

    describe('Test filter engine all filters', function () {
      let FilterEngine;
      let engine = null;

      // Load test cases
      const matchingPath = 'modules/adblocker/tests/unit/data/filters_matching.txt';
      const testCases = loadTestCases(matchingPath);

      // Load filters
      const filters = [];
      testCases.forEach(testCase => {
        filters.push(testCase.filter);
      });

      beforeEach(function () {
        if (engine === null) {
          FilterEngine = this.module().default;
          engine = new FilterEngine();
          engine.onUpdateFilters(undefined, filters);
        }
      });

      it('matches correctly against full engine', () => {
        this.timeout(10000);
        return new Promise((resolve, reject) => {
          loadTestCases(matchingPath).forEach(testCase => {
            // Check should match
            try {
              if (!engine.match(testCase)) {
                reject(`Expected ${testCase.filter} to match ${testCase.url}`);
              }
              resolve();
            } catch (ex) {
              reject(`Encountered exception ${ex} while matching ` +
                `${testCase.filter} against ${testCase.url}`);
            };
          });
        });
      });
    });

    describe('Test filter engine should not match', function () {
      let FilterEngine;
      let engine = null;
      const filterListPath = 'modules/adblocker/tests/unit/data/filters_list.txt';
      const notMatchingPath = 'modules/adblocker/tests/unit/data/filters_not_matching.txt';

      beforeEach(function () {
        if (engine === null) {
          this.timeout(10000);
          FilterEngine = this.module().default;
          engine = new FilterEngine();
          engine.onUpdateFilters(undefined, loadLinesFromFile(filterListPath));
        }
      });

      it('does not match', () => {
        this.timeout(10000);
        return new Promise((resolve, reject) => {
          loadTestCases(notMatchingPath).forEach(testCase => {
            // Check should match
            try {
              if (engine.match(testCase)) {
                reject(`Expected to *not* match ${testCase.url}`);
              }
              resolve();
            } catch (ex) {
              reject(`Encountered exception ${ex} while matching ` +
                `${testCase.filter} against ${testCase.url}`);
            }
          });
        });
      });
    });
  }
);
