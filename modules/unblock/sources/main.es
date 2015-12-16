/*
 * This module bypasses Youtube region blocks
 */
import YoutubeUnblocker from 'unblock/youtube';
import ProxyService from 'unblock/proxy';
import RequestListener from 'unblock/request-listener'
import ProxyManager from 'unblock/proxy-manager'

var CliqzUnblock = {
  proxy_manager: null,
  proxy_service: null,
  unblockers: [YoutubeUnblocker],
  load_listeners: new Set(),
  PREF_MODE: "unblockMode",
  prev_mode: undefined,
  setMode: function(mode) {
    if (["ask", "always", "never"].indexOf(mode) == -1) {
      return;
    }
    this.prev_mode = this.getMode();
    CliqzUtils.setPref(CliqzUnblock.PREF_MODE, mode);
  },
  onModeChanged: function() {
    let mode = this.getMode();
    let changed = mode != this.prev_mode;

    if (changed) {
      if (this.prev_mode == "never") {
        // never -> x: enable listeners
        this.init();
      } else if (mode == "never") {
        // x -> never: disable listeners
        this.unload();
      }
      if (mode == "ask") {
        // always -> ask: clear existing rules
        this.proxy_service.clearRules();
        this.unblockers.forEach(function(u) {
          u.refresh && u.refresh();
        });
      }
      this.prev_mode = mode;
      CliqzUtils.setTimeout(CliqzUtils.getWindow().CLIQZ.Core.refreshButtons, 0)
    }
  },
  getMode: function() {
    return CliqzUtils.getPref(CliqzUnblock.PREF_MODE, "never");
  },
  isEnabled: function() {
    return this.getMode() != "never";
  },
  init: function() {
    this.prev_mode = this.getMode();

    if (CliqzUnblock.isEnabled()) {
      CliqzUtils.log('init', 'unblock');

      CliqzUnblock.proxy_service = new ProxyService();
      // reuse existing proxy manager if it exists
      if (CliqzUnblock.proxy_manager) {
        CliqzUnblock.proxy_manager.proxy_service = CliqzUnblock.proxy_service;
      } else {
        CliqzUnblock.proxy_manager = new ProxyManager(CliqzUnblock.proxy_service);
      }
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
      b.unload && b.unload();
    });
  },
  initWindow: function(window) {
    if (!(window in CliqzUnblock.load_listeners)) {
      CliqzUtils.log("InitWindow", "unblock");
      window.gBrowser.addEventListener("load", CliqzUnblock.pageObserver, true);
      CliqzUnblock.load_listeners.add(window);
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
    if (CliqzUnblock.isEnabled()) {
      try {
        var doc = event.originalTarget,
          url = doc.defaultView.location.href;
        // run page observers for unblockers which work on this domain
        CliqzUnblock.unblockers.filter(function(b) {
          return b.canFilter && b.canFilter(url);
        }).forEach(function(b) {
          b.pageObserver && b.pageObserver(doc);
        });
      } catch(e) {}
    }
  },
  handleBlock: function(url, proxy_cb) {
    let mode = CliqzUnblock.getMode();
    if (mode == "ask") {
      CliqzUnblock.unblockPrompt(url, proxy_cb);
    } else if (mode == "always") {
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
          CliqzUnblock.setMode("never");
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
};

export default CliqzUnblock;
