import * as persist from 'antitracking/persistent-state';
import * as datetime from 'antitracking/time';
import { utils, events } from 'core/cliqz';
import md5 from 'antitracking/md5';
import QSWhitelistBase from 'antitracking/qs-whitelist-base';

const updateExpire = 48;

export default class extends QSWhitelistBase {

  constructor() {
    super();
    this.safeTokens = new persist.LazyPersistentObject('tokenExtWhitelist');
    this.trackerDomains = new persist.LazyPersistentObject('trackerDomains');
    this.unsafeKeys = new persist.LazyPersistentObject('unsafeKey');
    this.lastUpdate = ['0', '0', '0', '0'];

    this.TOKEN_WHITELIST_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/whitelist_tokens.json';
    this.TRACKER_DM_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/tracker_domains.json';
    this.SAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json';
    this.UNSAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_unsafe_key.json';
  }

  init() {
    super.init();
    this.safeTokens.load();
    try {
      this.lastUpdate = JSON.parse(persist.getValue('lastUpdate'));
      if (this.lastUpdate.length !== 2) {
          throw 'invalid lastUpdate value';
      }
    } catch(e) {
      this.lastUpdate = ['0', '0', '0', '0'];
    }

    // list update events
    this.onConfigUpdate = (config) => {
      var currentSafeKey = persist.getValue('safeKeyExtVersion', ''),
          currentToken = persist.getValue('tokenWhitelistVersion', ''),
          currentUnsafeKey = persist.getValue('unsafeKeyExtVersion', ''),
          currentTracker = persist.getValue('trackerDomainsversion', '');
      // check safekey
      utils.log('Safe keys: '+ config.safekey_version + ' vs ' + currentSafeKey, 'attrack');
      if (config.safekey_version && currentSafeKey !== config.safekey_version) {
        this._loadRemoteSafeKey(config.force_clean === true);
      }
      utils.log('Token whitelist: '+ config.whitelist_token_version + ' vs ' + currentToken, 'attrack');
      if (config.token_whitelist_version && currentToken !== config.whitelist_token_version) {
        this._loadRemoteTokenWhitelist();
      }
      utils.log('Tracker Domain: '+ config.tracker_domain_version + ' vs ' + currentTracker, 'attrack');
      if (config.tracker_domain_version && currentTracker !== config.tracker_domain_version) {
        this._loadRemoteTrackerDomainList();
      }
      utils.log('Unsafe keys: '+ config.unsafekey_version + ' vs ' + currentUnsafeKey, 'attrack');
      if (config.token_whitelist_version && currentToken !== config.token_whitelist_version) {
        this._loadRemoteUnsafeKey();
      }
    }.bind(this);

    events.sub('attrack:updated_config', this.onConfigUpdate);
  }

  destroy() {
    super.destroy();
    events.un_sub('attrack:updated_config', this.onConfigUpdate);
  }

  isUpToDate() {
    var delay = updateExpire,
        hour = datetime.newUTCDate();
    hour.setHours(hour.getHours() - delay);
    var hourCutoff = datetime.hourString(hour);
    if (this.lastUpdate[0] > hourCutoff &&
        this.lastUpdate[1] > hourCutoff &&
        this.lastUpdate[2] > hourCutoff &&
        this.lastUpdate[3] > hourCutoff) {
      return true;
    }
    return false;
  }

  isReady() {
    // just check they're not null
    return this.safeTokens.value && this.safeKeys.value && this.unsafeKeys.value && this.trackerDomains.value;
  }

  isSafeKey(domain, key) {
    return (!this.isUnsafeKey(domain, key)) && domain in this.safeKeys.value && key in this.safeKeys.value[domain];
  }

  isUnsafeKey(domain, key) {
    return this.isTrackerDomain(domain) && domain in this.unsafeKeys.value && this.unsafeKeys.value[domain].has(key);
  }

  addSafeKey(domain, key, valueCount) {
    if (this.isUnsafeKey(domain, key)) {
      return;  // keys in the unsafekey list should not be added to safekey list
    }
    let today = datetime.dateString(datetime.newUTCDate());
    if (!(domain in this.safeKeys.value)) {
      this.safeKeys.value[domain] = {};
    }
    this.safeKeys.value[domain][key] = [today, 'l', valueCount];
    this.safeKeys.setDirty();
  }

  isTrackerDomain(domain) {
    return domain in this.trackerDomains.value;
  }

  isSafeToken(domain, token) {
    return this.isTrackerDomain(domain) && token in this.safeTokens.value;
  }

  addSafeToken(domain, token) {
    this.trackerDomains.value[domain] = true;
    if (token && token !== '') {
      this.safeTokens.value[token] = true;
    }
  }

  addUnsafeKey(domain, key) {
    if (!(domain in this.unsafeKeys.value)) {
      this.unsafeKeys.value[domain] = new Set();
    }
    this.unsafeKeys.value[domain].add(key);
  }

  attachVersion(payl) {
    payl['whitelist'] = persist.getValue('tokenWhitelistVersion', '');
    payl['safeKey'] = persist.getValue('safeKeyExtVersion', '');
    payl['unsafeKey'] = persist.getValue('unsafeKeyExtVersion', '');
    payl['trackerDomains'] = persist.getValue('trackerDomainsVersion', '');
    return payl;
  }

  _loadRemoteTokenWhitelist() {
    var today = datetime.getTime().substring(0, 10);
    utils.httpGet(this.TOKEN_WHITELIST_URL +'?'+ today, function(req) {
      utils.log(req.response);
      var rList = JSON.parse(req.response),
          rListMd5 = md5(req.response);
      this.safeTokens.setValue(rList);
      persist.setValue('tokenWhitelistVersion', rListMd5);
      this.lastUpdate[1] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      events.pub('attrack:token_whitelist_updated', rListMd5);
    }.bind(this),
    function() {},
    100000);
  }

  _loadRemoteTrackerDomainList() {
    var today = datetime.getTime().substring(0, 10);
    utils.httpGet(this.TRACKER_DM_URL +'?'+ today, function(req) {
      utils.log(req.response);
      var rList = JSON.parse(req.response),
          rListMd5 = md5(req.response);
      this.trackerDomains.setValue(rList);
      persist.setValue('trackerDomainsversion', rListMd5);
      this.lastUpdate[3] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
    }.bind(this),
    function() {},
    100000);
  }

  _loadRemoteSafeKey(forceClean) {
    var today = datetime.getTime().substring(0, 10);
    if (forceClean) {
      this.safeKeys.clear();
    }
    utils.httpGet(this.SAFE_KEY_URL +'?'+ today, function(req) {
      var safeKey = JSON.parse(req.response),
          s, k,
          safeKeyExtVersion = md5(req.response);
      for (s in safeKey) {
        for (k in safeKey[s]) {
          // r for remote keys
          safeKey[s][k] = [safeKey[s][k], 'r'];
        }
      }
      for (s in safeKey) {
        if (!(s in this.safeKeys.value)) {
          this.safeKeys.value[s] = safeKey[s];
        } else {
          for (var key in safeKey[s]) {
            if (this.safeKeys.value[s][key] == null ||
                this.safeKeys.value[s][key][0] < safeKey[s][key][0]) {
              this.safeKeys.value[s][key] = safeKey[s][key];
            }
          }
        }
      }
      this._pruneSafeKeys();
      this.lastUpdate[0] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      this.safeKeys.setDirty();
      this.safeKeys.save();
      persist.setValue('safeKeyExtVersion', safeKeyExtVersion);
      events.pub('attrack:safekeys_updated', safeKeyExtVersion, forceClean);
    }.bind(this),
      function() {
        // on error
      }, 60000
    );
  }

  _loadRemoteUnsafeKey() {
    let today = datetime.getTime().substring(0, 10);
    utils.log(this.UNSAFE_KEY_URL);
    utils.httpGet(this.UNSAFE_KEY_URL +'?'+ today, function(req) {
      let unsafeKeys = JSON.parse(req.response),
          unsafeKeyExtVersion = md5(req.response);
      utils.log(unsafeKeys, 'unsafekey');
      for (let usk of unsafeKeys) {
        var dm = usk[0],
            k = usk[1];
        this.addUnsafeKey(dm, k);
      }
      this.lastUpdate[2] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      persist.setValue('unsafeKeyExtVesion', unsafeKeyExtVersion);
      this.unsafeKeys.setDirty();
      this.unsafeKeys.save();
    }.bind(this), function() {}, 100000);
  }

}
