/* global chai */
/* global sinon */
/* global describeModule */


const PouchDB = System._nodeRequire('pouchdb');
const UAParser = System._nodeRequire('ua-parser-js');
const moment = System._nodeRequire('moment');

const CURRENT_DATE = '2017-01-01';
const DATE_FORMAT = 'YYYY-MM-DD';

const DAY_FORMAT = 'YYYY-DDD';
const WEEK_FORMAT = 'YYYY-WW';
const MONTH_FORMAT = 'YYYY-M';


function getCurrentDate() {
  return moment(CURRENT_DATE, DATE_FORMAT);
}


export default describeModule('anolysis/anolysis',
  () => ({
    'platform/moment': {
      default: moment,
    },
    'platform/ua-parser': {
      default: UAParser,
    },
    'anolysis/synchronized-date': {
      DATE_FORMAT,
      DAY_FORMAT,
      WEEK_FORMAT,
      MONTH_FORMAT,
      default() {
        return getCurrentDate();
      },
    },
    'core/cliqz': {
      utils: {
        getPref(name, defaultValue) {
          if (name === 'ABTests') {
            return '{}';
          }

          return defaultValue;
        },
        setPref() {},
        setTimeout(fun) { return fun(); },
        clearTimeout() { },
      },
    },
    'core/database': {
      default: class Database {
        constructor() {
          this.db = new PouchDB(
            'cliqz-test-anolysis-integration-analyses',
            { db: System._nodeRequire('memdown') });
        }
        put(...args) {
          return this.db.put(...args);
        }
        get(...args) {
          return this.db.get(...args);
        }
        query(...args) {
          return this.db.query(...args);
        }
        info() {
          return this.db.info();
        }
        remove(...args) {
          return this.db.remove(...args);
        }
        allDocs(...args) {
          return this.db.allDocs(...args);
        }
      },
    },
    'anolysis/simple-statistics': {
      default: {
        mean() { return 'mean'; },
        median() { return 'median'; },
        stdev() { return 'standardDeviation'; },
        min() { return 'min'; },
        max() { return 'max'; },
      },
    },
    'anolysis/gid-manager': {
      default: class GIDManager {
        getGID() {
          return Promise.resolve();
        }
      },
    },
    'anolysis/signals-queue': {
      default: class SignalQueue {
        push(...args) { console.log('PUSH', ...args); }
      },
    },
    'anolysis/logging': {
      default(...args) {
        console.log(...args);
      },
    },
  }),
  () => {
    let anolysis;

    // Signals to feed to anolysis
    const signals = [
      { action: 'test', type: 'test', value: 1 },
      { action: 'test', type: 'test', value: 2 },
    ];

    beforeEach(function importAnolysis() {
      const Anolysis = this.module().default;
      anolysis = new Anolysis();
    });

    describe('Test analyses', () => {
      // Workflow
      // 1. Load fake telemetry signals
      // 2. Init anolysis (which should trigger loading of analyses, etc.)
      // 3. Feed fake signals into anolysis
      // 4. Trigger aggregation of signals + generation via analyses
      // 5. Intercept result of analyses
      // 6. Compare to what we expect.
      it('works', () => {
        console.log(`START`);
        return Promise.all(signals.map(signal => anolysis.handleTelemetrySignal(signal)))
          .then(() => anolysis.registerSchemas({ retention_daily: { instantPush: true, schema: {} } }))
          .then(() => anolysis.generateAndSendAnalysesSignalsForDay(CURRENT_DATE))
          .catch((ex) => {
            console.log(`EXCEPTION ${ex}`);
          })
      });
    });
  },
);
