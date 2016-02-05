import { utils } from 'core/cliqz';

export default class {

  constructor({ url,
                pref,
                updateFn,
                updateFreq = 86400000,
                defaultValue = "{}"
              }) {
    this.url = url;
    this.pref = pref;
    this.updateFn = updateFn;
    this.updateFreq = updateFreq;
    this.defaultValue = defaultValue;
    this._interval = undefined;
  }

  start() {
    if (!this._interval) {
      // initialise from cache first
      this.loadFromCache();
      // if data is out of date, load immediately
      this.updateIfNeeded();
      // create fetch interval
      this._interval = utils.setInterval(this.updateIfNeeded.bind(this), this.updateFreq);
    }
  }

  stop() {
    utils.clearInterval(this._interval);
    this._interval = undefined;
  }

  loadFromCache() {
    utils.log("loadFromCache: "+ this.pref, "resource-loader")
    let value = utils.getPref(this.pref, this.defaultValue);
    this.updateFn(value);
  }

  loadFromRemote() {
    utils.log("loadFromRemote: "+ this.url, "resource-loader")
    utils.loadResource(this.url, function(req) {
      let value = req.response;
      this.updateFn(value);
      utils.setPref(this.pref, value);
      utils.setPref(this.pref +"_lastUpdate", '' + Date.now());
    }.bind(this));
  }

  updateIfNeeded() {
    let lastUpdate = parseInt(utils.getPref(this.pref +"_lastUpdate", "0")) || 0;
    if (lastUpdate < Date.now() - this.updateFreq) {
      this.loadFromRemote()
    }
  }

};
