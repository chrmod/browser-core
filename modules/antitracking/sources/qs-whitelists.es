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
    this.lastUpdate = ['0', '0'];

    this.TOKEN_WHITELIST_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json';
    this.SAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json';
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
      this.lastUpdate = ['0', '0'];
    }

    // list update events
    this.onConfigUpdate = (config) => {
      var currentSafeKey = persist.getValue('safeKeyExtVersion', ''),
          currentToken = persist.getValue('tokenWhitelistVersion', '');
      // check safekey
      utils.log('Safe keys: '+ config.safekey_version + ' vs ' + currentSafeKey, 'attrack');
      if (config.safekey_version && currentSafeKey !== config.safekey_version) {
        this._loadRemoteSafeKey(config.force_clean === true);
      }
      utils.log('Token whitelist: '+ config.token_whitelist_version + ' vs ' + currentToken, 'attrack');
      if (config.token_whitelist_version && currentToken !== config.token_whitelist_version) {
        this._loadRemoteTokenWhitelist();
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
        this.lastUpdate[1] > hourCutoff) {
      return true;
    }
    return false;
  }

  isReady() {
    // just check they're not null
    return this.safeTokens.value && this.safeKeys.value;
  }

  isTrackerDomain(domain) {
    return domain in this.safeTokens.value;
  }

  isSafeToken(domain, token) {
    return domain in this.safeTokens.value && token in this.safeTokens.value[domain];
  }

  addSafeToken(domain, token) {
    if (!(domain in this.safeTokens.value)) {
      this.safeTokens.value[domain] = {};
    }
    this.safeTokens.value[domain][token] = true;
  }

  attachVersion(payl) {
    payl['whitelist'] = persist.getValue('tokenWhitelistVersion', '');
    payl['safeKey'] = persist.getValue('safeKeyExtVersion', '');
    return payl;
  }

  _loadRemoteTokenWhitelist() {
    var today = datetime.getTime().substring(0, 10);
    utils.httpGet(this.TOKEN_WHITELIST_URL +'?'+ today, function(req) {
      var tokenExtWhitelist = JSON.parse(req.response),
          tokenWhitelistVersion = md5(req.response);
      this.safeTokens.setValue(tokenExtWhitelist);
      persist.setValue('tokenWhitelistVersion', tokenWhitelistVersion);
      this.lastUpdate[1] = datetime.getTime();
      persist.setValue('lastUpdate', JSON.stringify(this.lastUpdate));
      events.pub('attrack:token_whitelist_updated', tokenWhitelistVersion);
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

}
