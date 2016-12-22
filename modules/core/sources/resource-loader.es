import { readFile, writeFile, mkdir } from 'core/fs';
import { utils } from 'core/cliqz';
import { promiseReject, promiseResolve } from 'core/promises';


// Common durations
const ONE_SECOND = 1000;
const ONE_MINUTE = 60 * ONE_SECOND;
const ONE_HOUR = 60 * ONE_MINUTE;


function get(url) {
  return new Promise((resolve, reject) => {
    utils.httpGet(url, (res) => {
      resolve(res.response);
    }, reject, 10 * ONE_SECOND);
  });
}


function makeDirRecursive(path, from = []) {
  const [first, ...rest] = path;

  if (!first) {
    return promiseResolve();
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
    return Promise.all(this.callbacks.map(cb => cb(args)));
  }
}


/* A resource is responsible for handling a remote resource persisted on
 * disk. It will be persisted on disk upon each update from remote. It is
 * also able to parse JSON automatically if `dataType` is 'json'.
 */
export class Resource {

  constructor(name, options = {}) {
    this.name = (typeof name === 'string') ? [name] : name;
    this.remoteURL = options.remoteURL;
    this.dataType = options.dataType || 'json';
    this.filePath = ['cliqz', ...this.name];
    this.chromeURL = options.chromeURL || `chrome://cliqz/content/${this.name.join('/')}`;
  }

  /**
   * Loads the resource. Load either a cached version of the file available in
   * the profile, or at the chrome URL (if provided) or from remote.
   *
   * @returns a Promise resolving to the resource. This Promise can fail on
   * error (if the remote resource cannot be fetched, or if the parsing
   * fails, for example), thus **you should should add a _catch_** to this
   * promise to handle errors properly.
   */
  load() {
    return readFile(this.filePath)
      .then((data) => {
        try {
          // If TextDecoder is not available just use `data`
          return (new TextDecoder()).decode(data);
        } catch (e) {
          return data;
        }
      })
      .then(data => this.parseData(data))
      .catch(() => this.updateFromURL(this.chromeURL))
      .catch(() => this.updateFromRemote());
  }

  /**
   * Tries to update the resource from the `remoteURL`.
   *
   * @returns a Promise resolving to the updated resource. Similarly
   * to the `load` method, the promise can fail, and thus you should
   * had a **catch** close to your promise to handle any exception.
   */
  updateFromRemote() {
    if (this.remoteURL === undefined) {
      return promiseReject('updateFromRemote: remoteURL is undefined');
    }
    return this.updateFromURL(this.remoteURL);
  }

  /* *****************************************************************
   * Private API
   ******************************************************************/

  updateFromURL(url) {
    if (url) {
      return get(url)
        .then(this.persist.bind(this));
    }

    return promiseReject('updateFromURL: url is undefined');
  }

  persist(data) {
    return this.parseData(data)
      .then((parsed) => {
        const dirPath = this.filePath.slice(0, -1);
        return makeDirRecursive(dirPath)
          .then(() => {
            try {
              // If TextEncoder is not available just use `data`
              return (new TextEncoder()).encode(data);
            } catch (e) {
              return data;
            }
          })
          .then(encoded => writeFile(this.filePath, encoded))
          .then(() => parsed);
      });
  }

  parseData(data) {
    if (this.dataType === 'json') {
      try {
        const parsed = JSON.parse(data);
        return promiseResolve(parsed);
      } catch (e) {
        return promiseReject(`parseData: failed with exception ${e}`);
      }
    }

    return promiseResolve(data);
  }
}


export default class extends UpdateCallbackHandler {

  constructor(resourceName, options = {}) {
    super();

    this.resource = new Resource(resourceName, options);
    this.cron = options.cron || ONE_HOUR;
    this.updateInterval = options.updateInterval || 10 * ONE_MINUTE;
    this.intervalTimer = utils.setInterval(
        this.updateFromRemote.bind(this),
        this.updateInterval);
  }


  /**
   * Loads the resource hold by `this.resource`. This can return
   * a failed promise. Please read `Resource.load` doc string for
   * further information.
   */
  load() {
    return this.resource.load();
  }

  /**
   * Updates the resource from remote (maximum one time per `cron`
   * time frame).
   *
   * @returns a Promise which never fails, since this update will be
   * triggered by `setInterval` and thus you cannot catch. If the update
   * fails, then the callback won't be called.
   */
  updateFromRemote() {
    const pref = `resource-loader.lastUpdates.${this.resource.name.join('/')}`;
    const lastUpdate = Number(utils.getPref(pref, 0));
    const currentTime = Date.now();

    if (currentTime > this.cron + lastUpdate) {
      return this.resource.updateFromRemote()
        .then((data) => {
          utils.setPref(pref, String(Date.now()));
          return data;
        })
        .then(this.triggerCallbacks.bind(this))
        .catch(() => undefined);
    }
    return promiseResolve();
  }

  stop() {
    utils.clearInterval(this.intervalTimer);
  }
}
