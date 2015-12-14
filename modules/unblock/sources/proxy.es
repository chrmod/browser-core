/**
  Wrapper for rule-based url proxying: implementation for Firefox
 */
export default class {
  constructor() {
    this.pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
      .getService(Components.interfaces.nsIProtocolProxyService);
    this.pps.registerFilter(this, 999);
    this.rules = [];
  }

  /**
    Disable all proxy rules provided by this instance
   */
  destroy() {
    this.pps.unregisterFilter(this);
  }

  applyFilter(pps, url, default_proxy) {
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
  }

  createProxy(type, host, port, failover_timeout, failover_proxy) {
    return this.pps.newProxyInfo(type, host, port, null, failover_timeout || 2000, failover_proxy || null);
  }

  addProxyRule(rule) {
    this.removeProxyRule(rule.id);
    return this.rules.push(rule);
  }

  removeProxyRule(id) {
    let index = this.rules.findIndex(function(rule) {
      return rule.id == id;
    });
    return index >=0 ? this.rules.splice(index, 1) : null;
  }

  clearRules() {
    this.rules = [];
  }
};
