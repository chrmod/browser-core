'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['ProxyUtils'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

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
  },
  clearRules: function() {
    this.rules = [];
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

var ProxyUtils = {
  Service: ProxyService,
  RegexProxyRule: RegexProxyRule
}
