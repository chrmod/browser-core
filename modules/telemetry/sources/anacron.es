import { utils } from 'core/cliqz';

const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;

export class Task {
  constructor(run, pattern) {
    this.run = run;
    this.pattern = this.parse(pattern);
  }

  // TODO: return false if currently running
  shouldRun(date = new Date()) {
    const pattern = this.pattern;
    const minutes = date.getMinutes();
    const hours = date.getHours();

    return (minutes % pattern.minutes.interval === 0 ||
            isNaN(pattern.minutes.interval) &&
              (isNaN(pattern.minutes.absolute) ||
               pattern.minutes.absolute === minutes)) &&
           (hours % pattern.hours.interval === 0 ||
            isNaN(pattern.hours.interval) &&
              (isNaN(pattern.hours.absolute) ||
               pattern.hours.absolute === hours));
  }

  parse(pattern) {
    const [minutes, hours] = pattern.split(' ').map((unit) => {
      const [absolute, interval] = unit.split('/').map(Number);
      return { absolute, interval };
    });
    return { hours, minutes };
  }
}

export class Queue {
  constructor() {
    this.consumers = [];
    this.queue = [];
  }

  isEmpty() {
    return !this.queue.length;
  }

  // TODO: add tests
  head() {
    return this.queue[0];
  }

  // TODO: add tests
  enqueue(item) {
    this.queue.push(item);
    if (!this.timeout) {
      this.timeout = utils.setTimeout(this.consume.bind(this), 0);
    }
  }

  // TODO: add tests
  subscribe(callback) {
    this.consumers.push(callback);
  }

  // TODO: add tests
  consume() {
    while (!this.isEmpty()) {
      const item = this.queue.shift();
      this.consumers.forEach(callback => callback(item));
      // TODO: make asynch, use setTimeout for next item
    }
    this.timeout = null;
  }
}

export class Cron {
  constructor() {
    this.isRunning = false;
    this.tasks = [];
  }

  start() {
    if (this.isRunning) {
      return;
    }

    this.clock = utils.setInterval(
      this.onTick.bind(this), ONE_MINUTE);
    this.isRunning = true;
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    utils.clearInterval(this.clock);
    this.isRunning = false;
  }

  schedule(func, pattern) {
    this.tasks.push(new Task(func, pattern));
  }

  run(date) {
    this.tasks
      .filter(task => task.shouldRun(date))
      .forEach(task => task.run(date));
  }

  onTick(date = new Date()) {
    this.run(date);
  }
}

// Anacron
export default class extends Cron {
  constructor({ name = 'telemetry.anacron' } = { }) {
    super();
    // TODO: inject storage service
    // TODO: test getting of pref
    this.pref = `${name}.last`;
    this.last = Number(utils.getPref(this.pref, 0));
    this.queue = new Queue();
    // TODO: move to `start`; also call `unsubscribe` from `stop`
    this.queue.subscribe(this.run.bind(this));
  }

  // TODO: add tests
  run(date) {
    super.run(date);
    // TODO: test setting of pref
    this.last = date.getTime();
    utils.setPref(this.pref, String(this.last));
  }

  converge(date) {
    const now = date.getTime();
    if (!this.last || this.last > now) {
      this.last = now - ONE_MINUTE;
    }
    let next = this.last + ONE_MINUTE;
    while (now - next >= 0) {
      this.queue.enqueue(new Date(next));
      next += ONE_MINUTE;
    }
  }

  onTick(date = new Date()) {
    this.converge(date);
  }
}
