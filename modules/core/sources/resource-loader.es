import { readFile, writeFile, mkdir } from 'core/fs';
import { utils } from 'core/cliqz';


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;


function get(url) {
  return new Promise((resolve, reject) => {
    utils.httpGet(url, res => {
      resolve(res.response);
    }, reject);
  });
}


function makeDirRecursive(path, from = []) {
  const [first, ...rest] = path;

  if (!first) {
    return Promise.resolve();
  }

  return mkdir(from.concat(first)).then(() =>
    makeDirRecursive(rest, from.concat(first))
  );
}


/* Abstract away the pattern `onUpdate` trigger list of
 * callbacks. This pattern is used a lot, so it looks worth
 * it to create a base class to handle it.
 */
export class UpdateCallbackHandler {
  constructor() {
    this.callbacks = [];
  }

  onUpdate(callback) {
    this.callbacks.push(callback);
  }

  triggerCallbacks(args) {
    this.callbacks.map(cb => cb(args));
  }
}


/* A resource is responsible for handling a remote resource persisted on
 * disk. It will be persisted on disk upon each update from remote. It is
 * also able to parse JSON automatically if `dataType` is 'json'.
 */
export class Resource extends UpdateCallbackHandler {

  constructor(name, options = {}) {
    super();

    this.name = (typeof name === 'string') ? [name] : name;
    this.remoteURL = options.remoteURL;
    this.dataType = options.dataType || 'json';
    this.filePath = ['cliqz', ...this.name];
    this.chromeURL = options.chromeURL ||`chrome://cliqz/content/${this.name.join('/')}`;
  }

  persist(data) {
    const dirPath = this.filePath.slice(0, -1);
    return makeDirRecursive(dirPath)
      .then(() => writeFile(this.filePath, (new TextEncoder()).encode(data)))
      .catch(() => writeFile(this.filePath, data))
      .then(() => data);
  }

  load() {
    return readFile(this.filePath)
      .then(data => (new TextDecoder()).decode(data))
      .then(this.parseData.bind(this))
      .catch(() => this.updateFromURL(this.chromeURL))
      .catch(() => this.updateFromRemote());
  }

  updateFromURL(url) {
    return get(url)
      .then(this.persist.bind(this))
      .then(this.parseData.bind(this));
  }

  updateFromRemote() {
    if (this.remoteURL === undefined) {
      return Promise.resolve();
    }
    return this.updateFromURL(this.remoteURL)
      .then(data => {
        this.triggerCallbacks(data);
        return data;
      }).catch(ex => {
      });
  }

  parseData(data) {
    if (this.dataType === 'json') {
      return JSON.parse(data);
    }
    return data;
  }
}


export default class {

  constructor(resourceName, options = {}) {
    this.resource = new Resource(resourceName, options);
    this.cron = options.cron || ONE_HOUR;
    this.updateInterval = utils.setInterval(
        this.updateFromRemote.bind(this),
        this.cron);
  }

  load() {
    return this.resource.load();
  }

  updateFromRemote() {
    const pref = `resource-loader.lastUpdates.${this.resource.name.join('/')}`;
    const lastUpdate = Number(utils.getPref(pref, 0));
    const currentTime = Date.now();

    if (currentTime > this.cron + lastUpdate) {
      return this.resource.updateFromRemote()
        .then(() => utils.setPref(pref, String(Date.now())));
    }
    return Promise.resolve();
  }

  onUpdate(callback) {
    this.resource.onUpdate(callback);
  }

  stop() {
    utils.clearInterval(this.updateInterval);
  }
}
