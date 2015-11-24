'use strict';
/*
 * This module bypasses Youtube region blocks
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzUnblock'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

/**
  Wrapper for rule-based url proxying: implementation for Firefox
 */
var ProxyService = function() {
  this.pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);
  this.pps.registerFilter(this, 999);
  this.rules = [];
}

ProxyService.prototype = {
  /**
    Disable all proxy rules provided by this instance
   */
  destroy: function() {
    this.pps.unregisterFilter(this);
  },
  applyFilter: function(pps, url, default_proxy) {
    let rule_match = this.rules.find(function(rule) {
      return rule.matches(url.asciiSpec);
    });
    if (rule_match != undefined) {
      CliqzUtils.telemetry({
        'type': 'unblock',
        'action': 'proxy',
        'to_region': rule_match.proxy_region
      });
      return rule_match.proxy_to;
    }
    return default_proxy;
  },
  createProxy: function(type, host, port, failover_timeout, failover_proxy) {
    return this.pps.newProxyInfo(type, host, port, null, failover_timeout || 2000, failover_proxy || null);
  },
  addProxyRule: function(rule) {
    this.removeProxyRule(rule.id);
    return this.rules.push(rule);
  },
  removeProxyRule: function(id) {
    let index = this.rules.findIndex(function(rule) {
      return rule.id == id;
    });
    return index >=0 ? this.rules.splice(index, 1) : null;
  }
}

var RegexProxyRule = function(expr, proxy_to, region) {
  this.expr = expr;
  this.id = expr.toString();
  this.proxy_to = proxy_to;
  this.proxy_region = region || "";
}
RegexProxyRule.prototype = {
  matches: function(url) {
    return this.expr.test(url);
  }
}

/**
  Enables filtered events on http requests, with associated urls
 */
var RequestListener = function() {
  this.pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);
  this.pps.registerFilter(this, 1);
  this.subscribed = []
}
RequestListener.prototype = {
  destroy: function() {
    this.pps.unregisterFilter(this);
  },
  applyFilter: function(pps, url, default_proxy) {
    this.subscribed.filter(function(m) {
      if ('text' in m) {
        return url.asciiSpec.indexOf(m.text) > -1;
      }
      return false;
    }).forEach(function(m) {
      m.callback(url.asciiSpec);
    });
    return default_proxy;
  },
  subscribe: function(matcher) {
    this.subscribed.push(matcher);
  }
}


// DNS Filter for unblocking YT videos
var YoutubeUnblocker = {
  canFilter: function(url) {
    return url.indexOf("https://www.youtube.com") > -1;
  },
  init: function(proxy_manager, proxy_service, request_listener) {
    var self = this;
    this.proxy_manager = proxy_manager;
    this.proxy_service = proxy_service;
    this.request_listener = request_listener;
    this.request_listener.subscribe({
      text: 'https://www.youtube.com/watch',
      callback: function(url) {
        return self.shouldProxy(url);
      }
    });
    CliqzUtils.loadResource(this.CONFIG_URL, function(req) {
      CliqzUtils.log(req.response);
      self.conf = JSON.parse(req.response);
    }, function(err) {
      CliqzUtils.log(err);
    });
  },
  updateProxyRule: function(vid) {
    let block_info = this.blocked[vid];
    let regex = this.getURLRegex(vid);
    // make a new rule
    if (block_info['a'].length > 0) {
      let region = this.proxy_manager.getPreferredRegion(block_info['a']);
      let proxy = this.proxy_manager.getNextProxy(region);
      if (proxy) {
        this.proxied_videos.add(vid);
        this.proxy_service.addProxyRule(new RegexProxyRule(regex, proxy, region));
        this.blocked[vid]['p'] = region;
      }
    }
  },
  getURLRegex: function(vid) {
    return new RegExp("^https://www.youtube.com/watch\\?.*v="+vid);
  },
  pageObserver: function(doc) {
    var url = doc.defaultView.location.href,
      vid = this.getVideoID(url),
      proxied = this.proxied_videos.has(vid);

    if(vid != undefined) {

      if(!proxied) {
        // detect user locale from youtube logo
        try {
          let locale = doc.defaultView.body.querySelector(this.conf.locale_element_selector).textContent;
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
          allowed_regions = new Set(this.proxy_manager.getAvailableRegions());
          allowed_regions.delete(this.current_region);
          this.blocked[vid] = {'b': [this.current_region], 'a': Array.from(allowed_regions)}
          CliqzUtils.log('Add blocked youtube page', 'unblock');
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_blocked_message',
            'region': this.current_region
          });
        } else {
          // proxy was also blocked, remove region from allow list
          allowed_regions = new Set(this.blocked[vid]['a']);
          allowed_regions.delete(this.blocked[vid]['p'] || '');
          this.blocked[vid]['a'] = Array.from(allowed_regions);
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'yt_blocked_2',
            'region': this.blocked[vid]['p'] || '',
            'remaining': allowed_regions.size
          });
        }

        // reload if we have a useable proxy region
        if(allowed_regions.size > 0) {
          // tell unblock that we can unblock here
          var self = this;
          CliqzUnblock.handleBlock(url, function() {
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_retry',
              'regions': Array.from(allowed_regions)
            });
            self.updateProxyRule(vid);
            doc.defaultView.location.reload();
          });
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
      let msg = doc.defaultView.body.querySelector(this.conf.blocked_video_element);
      return msg.offsetParent != null
    } catch(e) {
      return false;
    }
  },
  shouldProxy: function(url) {
    if (url.indexOf("https://www.youtube.com/watch") == -1) {
      return false;
    }
    var self = this;

    var vid = this.getVideoID(url);
    if(vid && vid.length > 0) {
      // check block cache
      if(vid in this.blocked &&
        this.blocked[vid]['b'].indexOf(this.current_region) != -1) {
        return this.blocked[vid]['a'];
      }
      // lookup api
      if (!this.video_lookup_cache.has(vid)) {
        this.video_lookup_cache.add(vid);

        CliqzUtils.httpGet(this.conf.api_url.replace('{video_id}', vid), function(req) {
          if (self.conf.api_check.not_blocked_if.every(function(test) { req.response.indexOf(test) == -1})
            && self.conf.api_check.blocked_if.some(function(test) { req.response.indexOf(test) > -1})) {
            // error code,
            let allowed_regions = new Set(self.proxy_manager.getAvailableRegions());
            allowed_regions.delete(self.current_region);
            self.blocked[vid] = {'b': [self.current_region], 'a': Array.from(allowed_regions)};
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_blocked_api',
              'region': self.current_region
            });

            CliqzUnblock.handleBlock(url, function() {
              // try to refresh page
              self.updateProxyRule(vid);
              self.refreshPageForVideo(vid);
            });
          }
        });
      }
    }
    return false;
  },
  /** Adapted from getCDByURL on CliqzHumanWeb. Finds the tab(s) which have this video in them, and refreshes.
   */
  refreshPageForVideo: function(vid) {
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      var gBrowser = win.gBrowser;
      if (gBrowser.tabContainer) {
        var numTabs = gBrowser.tabContainer.childNodes.length;
        for (var i=0; i<numTabs; i++) {
          var currentTab = gBrowser.tabContainer.childNodes[i];
          var currentBrowser = gBrowser.getBrowserForTab(currentTab);
          var cd = currentBrowser[win.gMultiProcessBrowser ? 'contentDocumentAsCPOW' : 'contentDocument'];
          var currURL=''+cd.location;

          if(currURL.indexOf(vid) > -1 && currURL.indexOf('www.youtube.com') > -1) {
            cd.defaultView.location.reload();
          }
        }
      }
    }
  },
  current_region: '', // current region for YT videos
  blocked: {}, // cache of seen blocked videos
  proxies: [],
  video_lookup_cache: new Set(),
  proxied_videos: new Set(),
  last_success: null,
  CONFIG_URL: "chrome://cliqz/content/yt_unblock_config.json",
}

var ProxyManager = function(proxy_service) {
  this.proxy_service = proxy_service;
  this._p = {};
  this._ctrs = {};
  this._last = null;
  this._preferred_regions = ['IR', 'US', 'UK', 'DE'];
  this._last_update = 0;
  this._min_update_interval = 1000 * 60 * 10;
  this.PROXY_UPDATE_URL = 'https://s3.amazonaws.com/sam-cliqz-test/unblock/proxies.json';
  this.updateProxyList();
}

ProxyManager.prototype = {
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
  },
  getProxyForRegions: function(allowed_regions) {
    let region = CliqzUnblock.proxies.getPreferredRegion(allowed_regions);
    return CliqzUnblock.proxies.getNextProxy(region);
  },
  updateProxyList: function() {
    var now = (new Date()).getTime(),
      self = this;
    if (this._last_update < now - this._min_update_interval) {
      CliqzUtils.httpGet(this.PROXY_UPDATE_URL,
        function success(req) {
          let proxies = JSON.parse(req.response);
          CliqzUtils.log(proxies, "unblock");
          // reset proxy list
          self._p = {};
          self._preferred_regions = proxies['regions'];
          for (let region in proxies['proxies']) {
            proxies['proxies'][region].forEach(function (proxy) {
              CliqzUtils.log("Adding proxy: "+ proxy['type'] + "://" + proxy['host'] + ":" + proxy['port'], "unblock");
              self.addProxy(region, self.proxy_service.createProxy(proxy['type'], proxy['host'], proxy['port']));
            });
          }
          self._last_update = now;
        },
        function error() {
          CliqzUtils.log("Failed to load proxies", "unblock");
        },
        5000
      );
    }
  },
}

var CliqzUnblock = {
  proxy_manager: null,
  proxy_service: null,
  unblockers: [YoutubeUnblocker],
  load_listeners: new Set(),
  unblock_mode: CliqzUtils.getPref("unblockMode", "ask"),
  setMode: function(mode) {
    this.unblock_mode = mode;
  },
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

      CliqzUnblock.proxy_service = new ProxyService();
      CliqzUnblock.proxy_manager = new ProxyManager(CliqzUnblock.proxy_service);
      CliqzUnblock.request_listener = new RequestListener();

      CliqzUnblock.unblockers.forEach(function(b) {
        b.init(CliqzUnblock.proxy_manager, CliqzUnblock.proxy_service, CliqzUnblock.request_listener);
      });
    }

  },
  unload: function() {
    if (CliqzUnblock.proxy_service != null) {
      CliqzUnblock.proxy_service.destroy();
      CliqzUnblock.proxy_service = null;
    }
    if (CliqzUnblock.request_listener != null) {
      CliqzUnblock.request_listener.destroy();
      CliqzUnblock.request_listener = null;
    }
    CliqzUnblock.unblockers.forEach(function(b) {
      ('unload' in b) && b.unload();
    });
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
  pageObserver: function(event) {
    try {
      var doc = event.originalTarget,
        url = doc.defaultView.location.href;
      // run page observers for unblockers which work on this domain
      CliqzUnblock.unblockers.filter(function(b) {
        return ('canFilter' in b) && b.canFilter(url);
      }).forEach(function(b) {
        ('pageObserver' in b) && b.pageObserver(doc);
      });
    } catch(e) {}
  },
  handleBlock: function(url, proxy_cb) {
    if (this.unblock_mode == "ask") {
      this.unblockPrompt(url, proxy_cb);
    } else {
      proxy_cb();
    }
  },
  unblockPrompt: function(url, cb) {
    var gBrowser = CliqzUtils.getWindow().gBrowser,
      message = 'Content blocked? CLIQZ can try to unblock this for you.',
      box = gBrowser.getNotificationBox(),
      notification = box.getNotificationWithValue('geo-blocking-prevented');
    if (notification) {
       notification.label = message;
    } else {
      var notification;
      var buttons = [{
        label: 'Great, thanks!',
        accessKey: 'B',
        callback: function() {
          box.removeNotification(notification);
          CliqzUnblock.setMode('always');
          CliqzUtils.setPref("unblockMode", "always");
          cb();
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_always'
          });
        }
      },
      {
        label: 'Just this once',
        callback: function() {
          box.removeNotification(notification);
          cb();
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_once'
          });
          CliqzUtils.setPref("unblockMode", "ask");
        }
      },
      {
        label: 'Never ask again',
        callback: function() {
          CliqzUnblock.disable();
          box.removeNotification(notification);
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_never'
          });
        }
      }];
      let priority = box.PRIORITY_INFO_MEDIUM;
      notification = box.appendNotification(message, 'geo-blocking-prevented',
                      'chrome://browser/skin/Info.png',
                       priority, buttons);
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
