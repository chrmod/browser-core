'use strict';
/*
 * This module bypasses Youtube region blocks
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzUnblock'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
  .getService(Components.interfaces.nsIProtocolProxyService);

// DNS Filter for unblocking YT videos
var YoutubeUnblocker = {
  canFilter: function(url) {
    return url.indexOf("https://www.youtube.com") > -1;
  },
  enable: function(proxies) {
    this.proxies = proxies;
  },
  pageObserver: function(doc) {
    var url = doc.defaultView.location.href,
      proxied = (this.shouldProxy(url) != false),
      vid = this.getVideoID(url);

    if(vid != undefined) {

      if(!proxied) {
        // detect user locale from youtube logo
        try {
          let locale = doc.defaultView.body.querySelector('#logo-container').querySelector('.content-region').textContent;
          CliqzUtils.log("YT locale = " + locale, "unblock");
          this.current_region = locale;
        } catch(e) {
          CliqzUtils.log("Locale exception: " + e.toString(), "unblock");
        }
      }

      let isBlocked = this.isVideoBlocked(doc);

      if (isBlocked) {
        let allowed_regions = [];
        if (!proxied) {
          // normal block, add blocked entry and reload page
          CliqzUtils.log("blocked video: "+ vid, "unblock");
          // add blocked entry
          allowed_regions = new Set(this.proxies.getAvailableRegions());
          allowed_regions.delete(this.current_region);
          this.blocked[vid] = {'b': [this.current_region], 'a': Array.from(allowed_regions)}
          CliqzUtils.log('Add blocked youtube page', 'unblock');
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_blocked',
            'region': this.current_region
          });
        } else {
          // proxy was also blocked, remove region from allow list
          allowed_regions = new Set(this.blocked[vid]['a']);
          allowed_regions.delete(this.proxies.getLastUsed());
          this.blocked[vid]['a'] = Array.from(allowed_regions);
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_blocked_2',
            'region': this.proxies.getLastUsed(),
            'remaining': allowed_regions.size
          });
        }

        // reload if we have a useable proxy region
        if(allowed_regions.size > 0) {
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_retry',
            'regions': Array.from(allowed_regions)
          });
          doc.defaultView.location.reload();
        }
      }

      // If we proxied and now the video isn't blocked, we have been successful!
      // We also cache the url to prevent multiple triggering of this signal, as this function
      // is triggered multiple times for a single video load.
      if (proxied && !isBlocked && url != this.last_success) {
        CliqzUtils.telemetry({
          'type': 'unblock',
          'action': 'yt_success'
        });
        this.last_success = url;
      }
    }
  },
  getVideoID: function(url) {
    let url_parts = CliqzUtils.getDetailsFromUrl(url),
      query = getParametersQS(url_parts.query);
    if(url_parts.path == '/watch' &&
        'v' in query) {
      return query['v'];
    } else {
      return undefined;
    }
  },
  isVideoBlocked: function(doc) {
    // check for block message
    try {
      let msg = doc.defaultView.body.querySelector('#unavailable-message');
      return msg.offsetParent != null
    } catch(e) {
      return false;
    }
  },
  shouldProxy: function(url) {
    if(this.current_region == '') return false;

    let vid = this.getVideoID(url);
    if(vid && vid in this.blocked &&
        this.blocked[vid]['b'].indexOf(this.current_region) != -1) {
      return this.blocked[vid]['a'];
    }
    return false;
  },
  current_region: '', // current region for YT videos
  blocked: {}, // cache of seen blocked videos
  proxies: [],
  last_success: null
}

var CliqzUnblock = {
  proxies: {
    _p: {},
    _ctrs: {},
    _last: null,
    _preferred_regions: ['IR', 'US', 'UK', 'DE'],
    getAvailableRegions: function() {
      return Object.keys(this._p);
    },
    getLastUsed: function() {
      return this._last;
    },
    addProxy: function(region, proxy) {
      if (!(region in this._p)) {
        this._p[region] = [];
        this._ctrs[region] = -1;
      }
      this._p[region].push(proxy);
    },
    getPreferredRegion: function(allowed_regions) {
      for(let i=0; i<this._preferred_regions.length; i++) {
        let reg = this._preferred_regions[i];
        if(allowed_regions.indexOf(reg) > -1 && reg in this._p && this._p[reg].length > 0) {
          return reg;
        }
      }
      return allowed_regions[0];
    },
    getNextProxy: function(region) {
      if(!(region in this._ctrs)) {
        return null;
      }
      this._ctrs[region] = (this._ctrs[region] + 1) % this._p[region].length;
      return this._p[region][this._ctrs[region]];
    },
    removeProxy: function(region, proxy) {
      let ind = this._p[region].indexOf(proxy);
      if (ind > -1) {
        this._p[region].splice(ind, 1);
      }
    }
  },
  unblockers: [YoutubeUnblocker],
  filter_registered: false,
  load_listeners: new Set(),
  proxy_timeout: {},
  proxy_last_update: 0,
  proxy_min_update_interval: 1000 * 60 * 10, // 10 mins
  isEnabled: function() {
    return CliqzUtils.getPref("unblockEnabled", false);
  },
  enable: function() {
    if (!CliqzUnblock.isEnabled()) {
      CliqzUtils.setPref("unblockEnabled", true);
      CliqzUnblock.init();
      // TODO: initialise for all available windows
      CliqzUnblock.initWindow(CliqzUtils.getWindow());
    }
  },
  disable: function() {
    if (CliqzUnblock.isEnabled()) {
      CliqzUtils.setPref("unblockEnabled", false);
      CliqzUnblock.unload();
    }
  },
  init: function() {

    if (CliqzUnblock.isEnabled()) {
      CliqzUtils.log('init', 'unblock');

      CliqzUnblock.updateProxyList();

      pps.registerFilter(CliqzUnblock.proxyFilter, 1);
      CliqzUnblock.filter_registered = true;
      CliqzUnblock.unblockers.forEach(function(b) {
        b.enable(CliqzUnblock.proxies);
      });
    }

  },
  unload: function() {
    if (CliqzUnblock.filter_registered) {
      pps.unregisterFilter(CliqzUnblock.proxyFilter);
      CliqzUnblock.filter_registered = false;
    }
    CliqzUnblock.load_listeners.forEach(function(window) {
      CliqzUnblock.unloadWindow(window);
    });
  },
  initWindow: function(window) {
    if (CliqzUnblock.isEnabled() && !(window in CliqzUnblock.load_listeners)) {
      CliqzUtils.log("InitWindow", "unblock");
      window.gBrowser.addEventListener("load", CliqzUnblock.pageObserver, true);
      CliqzUnblock.load_listeners.add(window);
    }
  },
  unloadWindow: function(window) {
    window.gBrowser.removeEventListener("load", CliqzUnblock.pageObserver, true);
    CliqzUnblock.load_listeners.delete(window);
  },
  updateProxyList: function() {
    var now = (new Date()).getTime();
    if (CliqzUnblock.proxy_last_update < now - CliqzUnblock.proxy_min_update_interval) {
      CliqzUtils.httpGet('https://s3.amazonaws.com/sam-cliqz-test/unblock/proxies.json',
        function success(req) {
          let proxies = JSON.parse(req.response);
          CliqzUtils.log(proxies, "unblock");
          // reset proxy list
          CliqzUnblock.proxies._p = {};
          CliqzUnblock.proxies._preferred_regions = proxies['regions'];
          for (let region in proxies['proxies']) {
            proxies['proxies'][region].forEach(function (proxy) {
              CliqzUtils.log("Adding proxy: "+ proxy['type'] + "://" + proxy['host'] + ":" + proxy['port'], "unblock");
              CliqzUnblock.proxies.addProxy(region, pps.newProxyInfo(proxy['type'], proxy['host'], proxy['port'], 0, 2000, null));
            });
          }
          CliqzUnblock.proxy_last_update = now;
        },
        function error() {
          CliqzUtils.log("Failed to load proxies", "unblock");
        },
        5000
      );
    }
  },
  pageObserver: function(event) {
    var doc = event.originalTarget,
      url = doc.defaultView.location.href;
    // run page observers for unblockers which work on this domain
    CliqzUnblock.unblockers.filter(function(b) {
      return b.canFilter(url);
    }).forEach(function(b) {
      b.pageObserver(doc);
    });
  },
  proxyFilter: {
    applyFilter: function(pps, url, default_proxy) {
      var unblockers = CliqzUnblock.unblockers.filter(function(b) {
        return b.canFilter(url.asciiSpec);
      });
      for(let i=0; i<unblockers.length; i++) {
        let allowed_regions = unblockers[i].shouldProxy(url.asciiSpec);
        if(allowed_regions != false && allowed_regions.length > 0) {
          let region = CliqzUnblock.proxies.getPreferredRegion(allowed_regions);
          let proxy = CliqzUnblock.proxies.getNextProxy(region);
          if(proxy != null) {
            CliqzUnblock.proxies._last = region;
            CliqzUtils.log('proxy: ' + url.asciiSpec, 'unblock');
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'proxy',
              'to_region': region
            });
            return proxy;
          } else {
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'no_proxies_available',
              'regions': allowed_regions
            });
            CliqzUnblock.updateProxyList();
          }
        }
      }
      return default_proxy;
    }
  }
}

// -- getParametersQS function from CliqzAttrack, replace after attrack is merged into master

var getParametersQS = function(qs) {
  var res = {};
  let state = 'key';
  let k = '';
  let v = '';

  for(let i=0; i<qs.length; i++) {
      let c = qs.charAt(i);
      if(c == '=' && state == 'key' && k.length > 0) {
          state = 'value';
          continue;
      } else if(c == '&' || c == ';') {
          if(state == 'value') {
              state = 'key';
              res[k] = v;
          } else if(state == 'key' && k.length > 0) {
              // key with no value, set value=true
              res[k] = true;
          }
          k = '';
          v = '';
          continue;
      }
      switch(state) {
          case 'key':
              k += c;
              break;
          case 'value':
              v += c;
              break;
      }
  }
  if(state == 'value') {
      state = 'key';
      res[k] = v;
  } else if(state == 'key' && k.length > 0) {
      res[k] = true;
  }
  return res;
};
