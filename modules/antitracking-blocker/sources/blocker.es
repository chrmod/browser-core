import console from '../core/console';
import md5 from '../antitracking/md5';
import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';

export default class {

  constructor() {
    this.rules = {};
  }

  init() {
    const blockListLoader = new ResourceLoader(['antitracking-blocker', 'bugs.json'], {
      remoteURL: 'https://cdn.cliqz.com/anti-tracking/bugs.json',
      cron: 1000 * 60 * 60 * 12,
    });
    resourceManager.addResourceLoader(blockListLoader, (bugs) => {
      this.rules = bugs.patterns;
    });
    return Promise.resolve();
  }

  unload() {
  }

  ruleMatches(urlParts) {
    const hostPartsReversed = urlParts.hostname.split('.').reverse();
    return this.hostRuleMatches(hostPartsReversed) ||
      this.hostPathRuleMatches(hostPartsReversed, urlParts.path);
  }

  hostRuleMatches(hostPartsReversed) {
    let root = this.rules.host;
    for (let i = 0; i < hostPartsReversed.length; i += 1) {
      const part = hostPartsReversed[i];
      if (!root[part]) {
        break;
      }
      root = root[part];
      if (root.$) {
        console.log('blocklist', 'match host', hostPartsReversed.join('.'));
        return true;
      }
    }
    return false;
  }

  hostPathRuleMatches(hostPartsReversed, path) {
    const pathHash = md5(path).substring(0, 16);
    let root = this.rules.host_path;
    let match = false;
    for (let i = 0; i < hostPartsReversed.length; i += 1) {
      const part = hostPartsReversed[i];
      if (root[part]) {
        root = root[part];
      }

      if (root.$) {
        match = Number.isInteger(root.$) || (root.$ || []).some(rule => `/${rule.path}` === path);
        if (match) {
          console.log('blocklist', 'match', hostPartsReversed.join('.'), path);
          break;
        }
      }
      if (root['#']) {
        match = root['#'].some(hash => hash === pathHash);
        if (match) {
          console.log('blocklist', 'match hash', hostPartsReversed.join('.'), path);
          break;
        }
      }
    }
    return match;
  }

  checkBlockRules(state, _resp) {
    if (this.ruleMatches(state.urlParts)) {
      const response = _resp;
      response.cancel = true;
      state.incrementStat('token_blocked_block');
      return false;
    }
    return true;
  }
}
