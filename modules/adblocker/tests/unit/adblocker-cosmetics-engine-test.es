/* global chai */
/* global describeModule */


function readFile(path) {
  const fs = require('fs');
  return fs.readFileSync(path, 'utf8');
}


function loadLinesFromFile(path) {
  return readFile(path).split(/\n/);
}


function loadTestCases(path) {
  return JSON.parse(readFile(path));
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
    describe('Test cosmetic engine', function () {
      let FilterEngine;
      let engine = null;
      const cosmeticsPath = 'modules/adblocker/tests/unit/data/cosmetics.txt';
      const cosmeticMatches = 'modules/adblocker/tests/unit/data/cosmetics_matching.txt';

      beforeEach(function () {
        this.timeout(10000);
        FilterEngine = this.module().default;
        if (engine === null) {
          engine = new FilterEngine();
          engine.onUpdateFilters(undefined, loadLinesFromFile(cosmeticsPath));
        }
      });

      it('matches correctly', () => {
        return new Promise((resolve, reject) => {
          loadTestCases(cosmeticMatches).forEach(testCase => {
            console.log(`NEW TEST ${testCase.url}`);
            const shouldMatch = new Set(testCase.matches);
            console.log(`SHOULD MATCH ${JSON.stringify(testCase.matches)}`);
            const rules = engine.getCosmeticsFilters(testCase.url, [testCase.node]);
            console.log(`FOUND ${rules.length} candidates`);
            chai.expect(shouldMatch.size).to.equal(rules.length);
            rules.forEach(rule => {
              if (!shouldMatch.has(rule.rawLine)) {
                reject(`Expected node ${testCase.url} + ${JSON.stringify(testCase.node)} to match ${rule.rawLine}`);
              }
            });
          });
          resolve();
        });
      });
    });
  }
);
