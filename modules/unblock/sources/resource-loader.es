
var _interval = null;
var _queue = [];

function _fetcher() {
  // find first load due
  var now = (new Date()).getTime();
  let ind = _queue.findIndex(function(c) {
    return c.lastPull + c.updateFreq < now && c.retries < 3;
  });
  if (ind >= 0) {
    let load_conf = _queue[ind];
    _fetch(load_conf);
    _queue.push(_queue.splice(ind, 1)[0]);
  }
};

function _fetch(load_conf) {
  CliqzUtils.log("Load "+ load_conf.url +"", "resource-loader");
  load_conf.retries++;
  CliqzUtils.loadResource(load_conf.url, function(req) {
    let value = req.response;
    let now = (new Date()).getTime();
    load_conf.updateFn.call(load_conf.this, value);
    CliqzUtils.setPref(load_conf.pref, value);
    CliqzUtils.setPref(load_conf.pref +"_lastUpdate", ""+ now);
    load_conf.lastPull = now;
    load_conf.retries = 0;
  }, CliqzUtils.log);
};

export default function(args) {
  /** Loads resources periodically, with no guarantees of when.
    Args specify what resource to load, how often, and where to callback with
    new data:
  args: {
    url: url to get resource,
    pref: pref key where data should be cached,
    updateFn: function to send updates to,
    updateFreq: Frequency to update resource (default: daily)
    defaultValue: default value (default: "{}")
  }
    Returns the loader binding, including a forceFetch function to override lazy loading.

    Resource data is cached in Prefs, so it should not be used for large resources. The
    primary use-case is configuration files on the cdn.
   */
  var load_conf = {
    url: args.url,
    pref: args.pref,
    updateFn: args.updateFn,
    updateFreq: args.updateFreq || 86400000,
    defaultValue: args.defaultValue || "{}",
    this: args.this || undefined,
    lastPull: parseInt(CliqzUtils.getPref(args.pref +"_lastUpdate", "0")),
    retries: 0
  }
  load_conf.forceFetch = (function() {
    _fetch(this);
  }).bind(load_conf);
  load_conf.cancel = function() {
    let ind = _queue.indexOf(this);
    if (ind >= 0) {
      _queue.splice(ind, 1);
    }
  }.bind(load_conf);

  let value = CliqzUtils.getPref(load_conf.pref, load_conf.defaultValue);
  let first_pull = load_conf.lastPull == 0;

  // set up fetcher task if not already
  if (_interval == null) {
    _interval = CliqzUtils.setInterval(_fetcher, 300000);
  }

  load_conf.updateFn.call(load_conf.this, value);
  // expedited fetch for blank data
  if (first_pull) {
    CliqzUtils.setTimeout(function () {
      _fetch(load_conf);
    }, 0);
  }
  _queue.push(load_conf);
  return load_conf;
};
