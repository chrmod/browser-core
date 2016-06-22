import Anacron from 'telemetry/anacron';
import Behavior from 'telemetry/aggregators/behavior';
import Database from 'telemetry/database';
import Demographics from 'telemetry/aggregators/demographics';
import Preprocessor from 'telemetry/preprocessor';
import Reporter from 'telemetry/reporter';
import ResourceLoader from 'core/resource-loader';
import Retention from 'telemetry/aggregators/retention';
import Storage from 'telemetry/storage';
import Tree from 'telemetry/tree';
import background from 'core/base/background';
import { utils } from 'core/cliqz';

const ONE_MINUTE = 60000;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;
const ENABLE_PREF = 'telemetryNoSession';

export default background({
  enabled() { return true; },

  init(settings) {
    this.behaviorStorage = new Storage(new Database('cliqz-telemetry-behavior'));
    this.demographicsStorage = new Storage(new Database('cliqz-telemetry-demographics'));
    // TODO: rename the following 3 to *Aggregator
    this.behavior = new Behavior();
    this.rentention = new Retention();
    this.demographics = new Demographics();
    this.preprocessor = new Preprocessor(settings);
    this.reporter = new Reporter(this.behaviorStorage, this.demographicsStorage);
    this.isRunning = false;

    this.loader = new ResourceLoader(
      ['telemetry', 'trees.json'],
      {
        remoteURL: undefined,
        cron: ONE_DAY,
      }
    );

    this.anacron = new Anacron();
    // TODO: re-enable for production
    // this.actions.schedule('20-min-behavior', this.behavior,
    //   '*/20 *', 20 * ONE_MINUTE);
    this.actions.schedule('daily-behavior', this.behavior,
      '0 0', ONE_DAY);
    this.actions.schedule('daily-retention', this.rentention,
      '0 0', 30 * ONE_DAY, ONE_DAY);

    if (utils.getPref(ENABLE_PREF, false)) {
      this.start();
    }
  },

  start() {
    if (this.isRunning) return;

    this.loader.load().then((trees) => {
      this.demographics.trees = { };
      Object.keys(trees).forEach((key) => {
        this.demographics.trees[key] = new Tree();
        this.demographics.trees[key].insertNodes(trees[key]);
      });
    });

    // TODO: move somewhere else (e.g., to storage as auto-delete setting)
    this.behaviorStorage
      .deleteByTimespan({ to: Date.now() - 30 * ONE_DAY })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    // TODO: move somewhere else (e.g., to storage as auto-delete setting)
    this.demographicsStorage
      .deleteByTimespan({ to: Date.now() - 30 * ONE_DAY })
      .catch(err => utils.log(`error deleting old behavior data: ${err}`));

    this.anacron.start();

    this.isRunning = true;
    utils.log(`started`, 'anon');
  },

  stop() {
    if (!this.isRunning) return;

    this.anacron.stop();
    this.loader.stop();
    this.isRunning = false;
    utils.log(`stopped`, 'anon');
  },

  unload() {
    this.stop();
  },

  beforeBrowserShutdown() {

  },

  events: {
    /**
    * @event telemetry:log
    * @param data
    */
    'telemetry:log'(data) {
      if (!this.isRunning) return;

      this.actions.log(data);
    },
    'prefchange'(pref) {
      if (pref !== ENABLE_PREF) return;

      if (utils.getPref('telemetryNoSession', false)) {
        this.start();
      } else {
        this.stop();
      }
    },
  },

  actions: {
    // examples: schedule('20-min-behavior', behavior, '*/20 *', 20 * ONE_MINUTE)
    //           schedule('daily-retention', retention, '0 0', 30 * ONE_DAY, ONE_DAY)
    // TODO: add test
    // TODO: derive interval from pattern
    // TODO: rename `interval` to `timespan`? `retention` => `interval`?
    schedule(id, aggregator, pattern, interval, retention = null) {
      this.anacron.schedule(date => {
        utils.log(`start ${id}`, 'anon');
        const start = Date.now();
        this.reporter
          .createMessages(aggregator, this.demographics,
            { from: date - interval, to: date }, retention)
          .then(messages => {
            const stop = Date.now();
            messages.forEach(msg => {
              // don't re-insert these messages into telemetry (filtered in environment)
              msg._report = true;
              msg.type = 'anon';
              msg.id = id;
              msg.meta = {
                // the report date and time
                report: date.getTime(),
                // TODO: use a date format that can be easily parsed (instead of timestamps)
                start,
                stop,
                duration: stop - start,
                version: '0.1',
              };
              utils.log(`stop ${id}`, 'anon');
              utils.telemetry(msg);
            });
          })
          .catch(error => utils.log(error, 'telemetry'));
      }.bind(this), pattern);
    },

    // TODO: add test
    log(signal) {
      const processedSignal = this.preprocessor.process(signal);
      // TODO: use 'type' instead of 'id'
      const id = processedSignal.id;
      if (id === '_demographics') {
        this.demographicsStorage.put(processedSignal);
      } else {
        this.behaviorStorage.put(processedSignal);
      }
    },
  },
});
