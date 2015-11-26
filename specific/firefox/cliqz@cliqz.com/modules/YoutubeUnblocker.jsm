'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['YoutubeUnblocker'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'ProxyUtils',
  'chrome://cliqzmodules/content/ProxyUtils.jsm');

// DNS Filter for unblocking YT videos
var YoutubeUnblocker = {
  canFilter: function(url) {
    return url.indexOf("https://www.youtube.com") > -1;
  },
  init: function(proxy_manager, proxy_service, request_listener, on_block_cb) {
    var self = this;
    this.proxy_manager = proxy_manager;
    this.proxy_service = proxy_service;
    this.request_listener = request_listener;
    this.on_block_cb = on_block_cb;

    this.request_listener.subscribe({
      text: 'https://www.youtube.com/watch',
      callback: function(url) {
        return self.shouldProxy(url);
      }
    });
    CliqzUtils.createLazyResourceLoader({
      url: this.CONFIG_URL,
      pref: "unblock_yt_config",
      this: self,
      updateFn: function(val) {
        this.conf = JSON.parse(val);
      }
    });
  },
  refresh: function() {
    // reset internal caches
    this.blocked = {};
    this.video_lookup_cache = new Set();
    this.proxied_videos = new Set();
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
        this.proxy_service.addProxyRule(new ProxyUtils.RegexProxyRule(regex, proxy, region));
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
      proxied = this.proxied_videos.has(vid),
      blocking_detected = vid in this.blocked;

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

      if (!blocking_detected && isBlocked) {
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
          this.on_block_cb(url, function() {
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
          if (self.conf.api_check.not_blocked_if.every(function(test) { return req.response.indexOf(test) == -1})
            && self.conf.api_check.blocked_if.some(function(test) { return req.response.indexOf(test) > -1})) {
            // error code,
            let allowed_regions = new Set(self.proxy_manager.getAvailableRegions());
            allowed_regions.delete(self.current_region);
            self.blocked[vid] = {'b': [self.current_region], 'a': Array.from(allowed_regions)};
            CliqzUtils.telemetry({
              'type': 'unblock',
              'action': 'yt_blocked_api',
              'region': self.current_region
            });

            self.on_block_cb(url, function() {
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
  video_lookup_cache: new Set(),
  proxied_videos: new Set(),
  last_success: null,
  CONFIG_URL: "chrome://cliqz/content/yt_unblock_config.json",
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
