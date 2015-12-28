import createLazyResourceLoader from 'unblock/resource-loader';

/**
  Proxy manager class
 */
export default class {
  constructor(proxy_service) {
    this.proxy_service = proxy_service;
    this._p = {};
    this._ctrs = {};
    this._last = null;
    this._preferred_regions = ['IR', 'US', 'UK', 'DE'];
    this.PROXY_UPDATE_URL = 'https://cdn.cliqz.com/unblock/proxies.json';
    createLazyResourceLoader({
      url: this.PROXY_UPDATE_URL,
      pref: "unblock_proxies",
      this: this,
      updateFn: this.updateProxyList
    });
  }

  getAvailableRegions() {
    return Object.keys(this._p);
  }

  getLastUsed() {
    return this._last;
  }

  addProxy(region, proxy) {
    if (!(region in this._p)) {
      this._p[region] = [];
      this._ctrs[region] = -1;
    }
    this._p[region].push(proxy);
  }

  getPreferredRegion(allowed_regions) {
    return this._preferred_regions.find(function(reg) {
      return allowed_regions.indexOf(reg) > -1 && reg in this._p && this._p[reg].length > 0
    }.bind(this)) || allowed_regions[0];
  }

  getNextProxy(region) {
    if(!(region in this._ctrs)) {
      return null;
    }
    this._ctrs[region] = (this._ctrs[region] + 1) % this._p[region].length;
    return this._p[region][this._ctrs[region]];
  }

  removeProxy(region, proxy) {
    let ind = this._p[region].indexOf(proxy);
    if (ind > -1) {
      this._p[region].splice(ind, 1);
    }
  }

  updateProxyList(resp) {
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
  }
};
