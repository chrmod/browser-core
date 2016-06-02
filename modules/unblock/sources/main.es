/*
 * This module bypasses Youtube region blocks
 */
import ProxyService from 'unblock/proxy';
import RequestListener from 'unblock/request-listener';
import ProxyManager from 'unblock/proxy-manager';
import { utils, events } from 'core/cliqz';

const MODE_ASK = "ask";
const MODE_ALWAYS = "always";
const MODE_NEVER = "never";
const MODES = [MODE_ASK, MODE_ALWAYS, MODE_NEVER];

export default {
  proxy_manager: null,
  proxy_service: null,
  unblockers: [],
  load_listeners: new Set(),
  PREF_MODE: "unblockMode",
  prev_mode: undefined,
  ui_enabled: false,
  setMode: function(mode) {
    if (MODES.indexOf(mode) === -1) {
      return;
    }
    this.prev_mode = this.getMode();
    utils.setPref(this.PREF_MODE, mode);
  },
  onModeChanged: function() {
    let mode = this.getMode();
    let changed = mode !== this.prev_mode;

    if (changed) {
      if (this.prev_mode === MODE_NEVER) {
        // never -> x: enable listeners
        this.init();
      } else if (mode === MODE_NEVER) {
        // x -> never: disable listeners
        this.unload();
      }
      if (mode === MODE_ASK) {
        // always -> ask: clear existing rules
        this.proxy_service.clearRules();
        this.unblockers.forEach(function(u) {
          u.refresh && u.refresh();
        });
      }
      this.prev_mode = mode;
      utils.setTimeout(utils.getWindow().CLIQZ.Core.refreshButtons, 0)
    }
  },
  getMode: function() {
    return utils.getPref(this.PREF_MODE, MODE_NEVER);
  },
  isEnabled: function() {
    return this.getMode() != MODE_NEVER;
  },
  init: function(ui_enabled) {
    this.ui_enabled = this.ui_enabled || (ui_enabled === true);
    this.prev_mode = this.getMode();

    if (this.isEnabled()) {
      utils.log('init', 'unblock');

      this.proxy_service = new ProxyService();
      this.proxy_manager = new ProxyManager(this.proxy_service);
      this.proxy_manager.init();

      this.request_listener = new RequestListener();

      this.unblockers.forEach(function(b) {
        b.init(this.proxy_manager, this.proxy_service, this.request_listener, this.handleBlock.bind(this), this.handleUnblockNotification.bind(this));
      }.bind(this));
    }
  },
  unload: function() {
    // module might not have been enabled, in which case things might be null
    if (this.proxy_service != null) {
      this.proxy_service.destroy();
      this.proxy_service = null;
    }
    if (this.proxy_manager != null) {
      this.proxy_manager.destroy();
      this.proxy_manager = null;
    }
    if (this.request_listener != null) {
      this.request_listener.destroy();
      this.request_listener = null;
    }
    this.unblockers.forEach(function(b) {
      b.unload && b.initialized && b.unload();
    });
  },
  pageObserver: function(url) {
    if (this.isEnabled()) {
      try {
        // run page observers for unblockers which work on this domain
        this.unblockers.filter(function(b) {
          return b.canFilter && b.canFilter(url);
        }).forEach(function(b) {
          b.pageObserver && b.pageObserver(url);
        });
      } catch(e) {}
    }
  },
  handleBlock: function(url, proxy_cb) {
    let mode = this.getMode();
    if (mode === MODE_ASK && this.ui_enabled) {
      this.unblockPrompt(url, proxy_cb);
    } else if (mode === MODE_ALWAYS) {
      proxy_cb();
    }
    // else never
  },
  handleUnblockNotification: function(url, message) {
    if (this.ui_enabled) {
      this.unblockNotification(url, message);
    }
  },
  waiting_prompts: [],
  tabSelectListener: function(event) {
    // filter old entries - older than 5 minutes
    var now = (new Date()).getTime();
    this.waiting_prompts = this.waiting_prompts.filter(function(prompt) {
      return prompt.timestamp > now - 300000;
    });
    // check if this tab should trigger a prompt
    var url = utils.getWindow().gBrowser.currentURI.spec,
      ind = this.waiting_prompts.findIndex(function(prompt) {
        return prompt.url.indexOf(url) == 0;
      });
    if (ind >= 0) {
      // if found, remove from waiting list and prompt
      let prompt = this.waiting_prompts.splice(ind, 1)[0];
      prompt.callback();
    }
  },
  unblockPrompt: function(url, cb) {
    var gBrowser = utils.getWindow().gBrowser,
      message = utils.getLocalizedString("unblock_prompt"),
      box = gBrowser.getNotificationBox(),
      notification = box.getNotificationWithValue('geo-blocking-prevented'),
      on_active_tab = url.indexOf(gBrowser.currentURI.spec) == 0;

    if (!on_active_tab) {
      // wait until tab is activated
      this.waiting_prompts.push({
        url: url,
        callback: () => { this.unblockPrompt(url, cb) }.bind(this),
        timestamp: (new Date()).getTime()
      });
      return;
    }

    if (notification) {
      notification.label = message;
    } else {
      var buttons = [{
        label: utils.getLocalizedString("unblock_always"),
        accessKey: 'B',
        callback: function() {
          box.removeNotification(notification);
          this.setMode(MODE_ALWAYS);
          cb();
          utils.telemetry({
            'type': 'unblock',
            'action': 'allow_always'
          });
        }.bind(this)
      },
      {
        label: utils.getLocalizedString("unblock_once"),
        callback: function() {
          box.removeNotification(notification);
          cb();
          utils.telemetry({
            'type': 'unblock',
            'action': 'allow_once'
          });
          this.setMode(MODE_ASK);
        }.bind(this)
      },
      {
        label: utils.getLocalizedString("unblock_never"),
        callback: function() {
          this.setMode(MODE_NEVER);
          box.removeNotification(notification);
          utils.telemetry({
            'type': 'unblock',
            'action': 'allow_never'
          });
        }.bind(this)
      }];
      notification = box.appendNotification(message, 'geo-blocking-prevented',
                      'chrome://cliqz/content/static/skin/cliqz_btn.png',
                       box.PRIORITY_WARNING_MEDIUM, buttons);
    }
  },
  unblockNotification: function(url, label) {
    var gBrowser = utils.getWindow().gBrowser,
      message = label,
      box = gBrowser.getNotificationBox(),
      notification = box.getNotificationWithValue('geo-blocking-notification'),
      on_active_tab = url.indexOf(gBrowser.currentURI.spec) == 0;

    if (!on_active_tab) {
      // wait until tab is activated
      this.waiting_prompts.push({
        url: url,
        callback: () => { this.unblockNotification(url, label) }.bind(this),
        timestamp: (new Date()).getTime()
      });
      return;
    }

    if (notification) {
      notification.label = message;
    } else {
      notification = box.appendNotification(message, 'geo-blocking-notification',
                      'chrome://cliqz/content/static/skin/cliqz_btn.png',
                       box.PRIORITY_WARNING_MEDIUM);
    }
  }
};
