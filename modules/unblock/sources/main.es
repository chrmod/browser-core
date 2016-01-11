/*
 * This module bypasses Youtube region blocks
 */
import YoutubeUnblocker from 'unblock/youtube';
import ProxyService from 'unblock/proxy';
import RequestListener from 'unblock/request-listener'
import ProxyManager from 'unblock/proxy-manager'

const MODE_ASK = "ask";
const MODE_ALWAYS = "always";
const MODE_NEVER = "never";
const MODES = [MODE_ASK, MODE_ALWAYS, MODE_NEVER];

export default {
  proxy_manager: null,
  proxy_service: null,
  unblockers: [YoutubeUnblocker],
  load_listeners: new Set(),
  PREF_MODE: "unblockMode",
  prev_mode: undefined,
  ui_enabled: false,
  setMode: function(mode) {
    if (MODES.indexOf(mode) == -1) {
      return;
    }
    this.prev_mode = this.getMode();
    CliqzUtils.setPref(this.PREF_MODE, mode);
  },
  onModeChanged: function() {
    let mode = this.getMode();
    let changed = mode != this.prev_mode;

    if (changed) {
      if (this.prev_mode == MODE_NEVER) {
        // never -> x: enable listeners
        this.init();
      } else if (mode == MODE_NEVER) {
        // x -> never: disable listeners
        this.unload();
      }
      if (mode == MODE_ASK) {
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
    return CliqzUtils.getPref(this.PREF_MODE, MODE_NEVER);
  },
  isEnabled: function() {
    return this.getMode() != MODE_NEVER;
  },
  init: function(ui_enabled) {
    this.ui_enabled = this.ui_enabled || (ui_enabled === true);
    this.prev_mode = this.getMode();

    if (this.isEnabled()) {
      CliqzUtils.log('init', 'unblock');

      this.proxy_service = new ProxyService();
      // reuse existing proxy manager if it exists
      if (this.proxy_manager) {
        this.proxy_manager.proxy_service = this.proxy_service;
      } else {
        this.proxy_manager = new ProxyManager(this.proxy_service);
      }
      this.request_listener = new RequestListener();

      this.unblockers.forEach(function(b) {
        b.init(this.proxy_manager, this.proxy_service, this.request_listener, this.handleBlock.bind(this));
      }.bind(this));
    }
  },
  unload: function() {
    if (this.proxy_service != null) {
      this.proxy_service.destroy();
      this.proxy_service = null;
    }
    if (this.request_listener != null) {
      this.request_listener.destroy();
      this.request_listener = null;
    }
    this.unblockers.forEach(function(b) {
      b.unload && b.unload();
    });
  },
  initWindow: function(window) {
    if (!(window in this.load_listeners)) {
      CliqzUtils.log("InitWindow", "unblock");
      this.boundPageObserver = this.pageObserver.bind(this);
      window.gBrowser.addEventListener("load", this.boundPageObserver, true);
      this.load_listeners.add(window);
      // listen to tab changes (for notification bar)
      this.boundTabSelectListener = this.tabSelectListener.bind(this);
      window.gBrowser.tabContainer.addEventListener("TabSelect", this.boundTabSelectListener);
    }
  },
  unloadWindow: function(window) {
    window.gBrowser.removeEventListener("load", this.boundPageObserver, true);
    this.load_listeners.delete(window);
    window.gBrowser.tabContainer.removeEventListener("TabSelect", this.boundTabSelectListener);
  },
  pageObserver: function(event) {
    if (this.isEnabled()) {
      try {
        var doc = event.originalTarget,
          url = doc.defaultView.location.href;
        // run page observers for unblockers which work on this domain
        this.unblockers.filter(function(b) {
          return b.canFilter && b.canFilter(url);
        }).forEach(function(b) {
          b.pageObserver && b.pageObserver(doc);
        });
      } catch(e) {}
    }
  },
  handleBlock: function(url, proxy_cb) {
    let mode = this.getMode();
    if (mode == MODE_ASK && this.ui_enabled) {
      this.unblockPrompt(url, proxy_cb);
    } else if (mode == MODE_ALWAYS) {
      proxy_cb();
    }
    // else never
  },
  waiting_prompts: [],
  tabSelectListener: function(event) {
    // filter old entries - older than 5 minutes
    var now = (new Date()).getTime();
    this.waiting_prompts = this.waiting_prompts.filter(function(tuple) {
      return tuple[2] > now - 300000;
    });
    // check if this tab should trigger a prompt
    var url = CliqzUtils.getWindow().gBrowser.currentURI.spec,
      ind = this.waiting_prompts.findIndex(function(tuple) {
        return tuple[0].indexOf(url) == 0;
      });
    if (ind >= 0) {
      // if found, remove from waiting list and prompt
      let tuple = this.waiting_prompts.splice(ind, 1)[0];
      this.unblockPrompt(tuple[0], tuple[1]);
    }
  },
  unblockPrompt: function(url, cb) {
    var gBrowser = CliqzUtils.getWindow().gBrowser,
      message = CliqzUtils.getLocalizedString("unblock_prompt"),
      box = gBrowser.getNotificationBox(),
      notification = box.getNotificationWithValue('geo-blocking-prevented'),
      on_active_tab = url.indexOf(gBrowser.currentURI.spec) == 0;

    if (!on_active_tab) {
      // wait until tab is activated
      this.waiting_prompts.push([url, cb, (new Date()).getTime()]);
      return;
    }

    if (notification) {
       notification.label = message;
    } else {
      var notification;
      var buttons = [{
        label: CliqzUtils.getLocalizedString("unblock_always"),
        accessKey: 'B',
        callback: function() {
          box.removeNotification(notification);
          this.setMode(MODE_ALWAYS);
          cb();
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_always'
          });
        }.bind(this)
      },
      {
        label: CliqzUtils.getLocalizedString("unblock_once"),
        callback: function() {
          box.removeNotification(notification);
          cb();
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_once'
          });
          this.setMode(MODE_ASK);
        }.bind(this)
      },
      {
        label: CliqzUtils.getLocalizedString("unblock_never"),
        callback: function() {
          this.setMode(MODE_NEVER);
          box.removeNotification(notification);
          CliqzUtils.telemetry({
            'type': 'unblock',
            'action': 'allow_never'
          });
        }.bind(this)
      }];
      let priority = box.PRIORITY_WARNING_MEDIUM;
      notification = box.appendNotification(message, 'geo-blocking-prevented',
                      'chrome://cliqzres/content/skin/cliqz_btn.png',
                       priority, buttons);
    }
  }
};
