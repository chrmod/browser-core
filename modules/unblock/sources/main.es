/*
 * This module bypasses Youtube region blocks
 */
 import YoutubeUnblocker from 'unblock/youtube';
 import ProxyUtils from 'unblock/proxy';

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

var ProxyManager = function(proxy_service) {
  this.proxy_service = proxy_service;
  this._p = {};
  this._ctrs = {};
  this._last = null;
  this._preferred_regions = ['IR', 'US', 'UK', 'DE'];
  this.PROXY_UPDATE_URL = 'https://cdn.cliqz.com/unblock/proxies.json';
  CliqzUtils.createLazyResourceLoader({
    url: this.PROXY_UPDATE_URL,
    pref: "unblock_proxies",
    this: this,
    updateFn: this.updateProxyList,
    updateFreq: 1000 * 60 * 10
  });
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
  updateProxyList: function(resp) {
    var self = this;
    let proxies = JSON.parse(resp);
    // reset proxy list
    self._p = {};
    self._preferred_regions = proxies['regions'];
    for (let region in proxies['proxies']) {
      proxies['proxies'][region].forEach(function (proxy) {
        CliqzUtils.log("Adding proxy: "+ proxy['type'] + "://" + proxy['host'] + ":" + proxy['port'], "unblock");
        self.addProxy(region, self.proxy_service.createProxy(proxy['type'], proxy['host'], proxy['port']));
      });
    }
  },
};


var CliqzUnblock = {
  proxy_manager: null,
  proxy_service: null,
  unblockers: [YoutubeUnblocker],
  load_listeners: new Set(),
  PREF_ENABLED: "unblockEnabled",
  PREF_MODE: "unblockMode",
  unblock_mode: "ask",
  setMode: function(mode) {
    if (["ask", "always", "never"].indexOf(mode) == -1) {
      return;
    }
    var changed = mode != this.unblock_mode;
    this.unblock_mode = mode;
    CliqzUtils.setPref(CliqzUnblock.PREF_MODE, mode);
    // changing to 'ask' requires us to clear proxy rules
    if (changed && mode == 'ask') {
      this.proxy_service.clearRules();
      this.unblockers.forEach(function(u) {
        if ('refresh' in u) {
          u.refresh();
        }
      });
    }
    if (changed) {
      // update menu buttons
      CliqzUnblock.load_listeners.forEach(function(window) {
        CliqzUtils.setTimeout(window.CLIQZ.Core.refreshButtons, 0);
      });
      // send telemetry
      CliqzUtils.telemetry({
        'type': 'unblock',
        'action': 'setting_' + mode
      });
    }
  },
  isEnabled: function() {
    return CliqzUtils.getPref(CliqzUnblock.PREF_ENABLED, false);
  },
  enable: function() {
    if (!CliqzUnblock.isEnabled()) {
      CliqzUtils.setPref(CliqzUnblock.PREF_ENABLED, true);
      CliqzUnblock.init();
      // TODO: initialise for all available windows
      CliqzUnblock.initWindow(CliqzUtils.getWindow());
    }
  },
  disable: function() {
    if (CliqzUnblock.isEnabled()) {
      CliqzUtils.setPref(CliqzUnblock.PREF_ENABLED, false);
      CliqzUnblock.unload();
    }
  },
  init: function() {
    CliqzUnblock.unblock_mode = CliqzUtils.getPref(CliqzUnblock.PREF_MODE, "ask");

    if (CliqzUnblock.isEnabled()) {
      CliqzUtils.log('init', 'unblock');

      CliqzUnblock.proxy_service = new ProxyUtils.Service();
      CliqzUnblock.proxy_manager = new ProxyManager(CliqzUnblock.proxy_service);
      CliqzUnblock.request_listener = new RequestListener();

      CliqzUnblock.unblockers.forEach(function(b) {
        b.init(CliqzUnblock.proxy_manager, CliqzUnblock.proxy_service, CliqzUnblock.request_listener, CliqzUnblock.handleBlock);
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
      // add entry to toolbar menu
      window.CLIQZ.COMPONENTS.push(this.toolbar_menu);
      // listen to tab changes (for notification bar)
      window.gBrowser.tabContainer.addEventListener("TabSelect", CliqzUnblock.tabSelectListener);
    }
  },
  unloadWindow: function(window) {
    window.gBrowser.removeEventListener("load", CliqzUnblock.pageObserver, true);
    CliqzUnblock.load_listeners.delete(window);
    window.gBrowser.tabContainer.removeEventListener("TabSelect", CliqzUnblock.tabSelectListener);
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
    if (CliqzUnblock.unblock_mode == "ask") {
      CliqzUnblock.unblockPrompt(url, proxy_cb);
    } else if (CliqzUnblock.unblock_mode == "always") {
      proxy_cb();
    }
    // else never
  },
  waiting_prompts: [],
  tabSelectListener: function(event) {
    // filter old entries - older than 5 minutes
    var now = (new Date()).getTime();
    CliqzUnblock.waiting_prompts = CliqzUnblock.waiting_prompts.filter(function(tuple) {
      return tuple[2] > now - 300000;
    });
    // check if this tab should trigger a prompt
    var url = CliqzUtils.getWindow().gBrowser.currentURI.spec,
      ind = CliqzUnblock.waiting_prompts.findIndex(function(tuple) {
        return tuple[0].indexOf(url) == 0;
      });
    if (ind >= 0) {
      // if found, remove from waiting list and prompt
      let tuple = CliqzUnblock.waiting_prompts.splice(ind, 1)[0];
      CliqzUnblock.unblockPrompt(tuple[0], tuple[1]);
    }
  },
  unblockPrompt: function(url, cb) {
    var gBrowser = CliqzUtils.getWindow().gBrowser,
      message = 'Content blocked? CLIQZ can try to unblock this for you.',
      box = gBrowser.getNotificationBox(),
      notification = box.getNotificationWithValue('geo-blocking-prevented'),
      on_active_tab = url.indexOf(gBrowser.currentURI.spec) == 0;

    if (!on_active_tab) {
      // wait until tab is activated
      CliqzUnblock.waiting_prompts.push([url, cb, (new Date()).getTime()]);
      return;
    }

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
          CliqzUnblock.setMode("ask");
        }
      },
      {
        label: 'Never ask again',
        callback: function() {
          CliqzUtils.setMode("never");
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
  },
  toolbar_menu: {
    button: function(win) {
      var doc = win.document,
        menu = doc.createElement('menu'),
        menupopup = doc.createElement('menupopup');

      menu.setAttribute('label', 'Unblock content');

      var filter_levels = {
          'always': {
            name: CliqzUtils.getLocalizedString('always'),
            selected: false
          },
          'ask': {
            name: CliqzUtils.getLocalizedString('always_ask'),
            selected: false
          },
          'never': {
            name: CliqzUtils.getLocalizedString('never'),
            selected: false
          }
      };
      filter_levels[CliqzUtils.getPref(CliqzUnblock.PREF_MODE, 'ask')].selected = true;

      for(var level in filter_levels) {
        var item = doc.createElement('menuitem');
        item.setAttribute('label', filter_levels[level].name);
        item.setAttribute('class', 'menuitem-iconic');

        if(filter_levels[level].selected){
          item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
        }

        item.filter_level = level;
        item.addEventListener('command', function(event) {
          CliqzUtils.log(this, "xxx");
          CliqzUnblock.setMode(this.filter_level);
          if (!CliqzUnblock.isEnabled() && CliqzUnblock.unblock_mode != "never") {
            CliqzUnblock.enable();
          }
          CliqzUtils.setTimeout(win.CLIQZ.Core.refreshButtons, 0);
        }, false);

        menupopup.appendChild(item);
      };
      menu.appendChild(menupopup);
      return menu;
    }
  }
};

export default CliqzUnblock;
