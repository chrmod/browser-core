import * as persist from 'antitracking/persistent-state';
import * as datetime from 'antitracking/time';
import { utils, events } from 'core/cliqz';
import md5 from 'antitracking/md5';
import CliqzAttrack from 'antitracking/attrack';
import CliqzHumanWeb from 'human-web/human-web';

const updateExpire = 48;
const safeKeyExpire = 7;

export default class {

  constructor() {
    this.safeTokens = new persist.LazyPersistentObject('tokenExtWhitelist');
    this.safeKeys = new persist.LazyPersistentObject('safeKey');
    this.lastUpdate = ['0', '0'];

    this.TOKEN_WHITELIST_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json';
    this.SAFE_KEY_URL = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json';
  }

  init() {
    this.safeTokens.load();
    this.safeKeys.load();
    try {
      this.lastUpdate = JSON.parse(persist.getValue('lastUpdate'));
      if (this.lastUpdate.length !== 2) {
          throw 'invalid lastUpdate value';
      }
    } catch(e) {
      this.lastUpdate = ['0', '0'];
    }

    // every hour, prune and send safekeys
    this.hourlyPruneAndSend = () => {
      this._pruneSafeKeys();
      this._sendSafeKeys();
    }.bind(this);
    events.sub('attrack:hour_changed', this.hourlyPruneAndSend);

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
    events.un_sub('attrack:hour_changed', this.hourlyPruneAndSend);
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

  isSafeKey(domain, key) {
    return domain in this.safeKeys.value && key in this.safeKeys.value[domain];
  }

  isSafeToken(domain, token) {
    return domain in this.safeTokens.value && token in this.safeTokens.value[domain];
  }

  addSafeKey(domain, key) {
    let today = datetime.dateString(datetime.newUTCDate());
    if (!(domain in this.safeKeys.value)) {
      this.safeKeys.value[domain] = {};
    }
    this.safeKeys.value[domain][key] = [today, 'l'];
    this.safeKeys.setDirty();
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
      // TODO external dependency
      //CliqzAttrack.checkWrongToken('token');
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
      //CliqzAttrack.checkWrongToken('safeKey');
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

  _pruneSafeKeys() {
    var day = datetime.newUTCDate();
    day.setDate(day.getDate() - safeKeyExpire);
    var dayCutoff = datetime.dateString(day);
    for (var s in this.safeKeys.value) {
        for (var key in this.safeKeys.value[s]) {
            if (this.safeKeys.value[s][key][0] < dayCutoff) {
                delete this.safeKeys.value[s][key];
            }
        }
        if (Object.keys(this.safeKeys.value[s]).length === 0) {
            delete this.safeKeys.value[s];
        }
    }
    this.safeKeys.setDirty();
    this.safeKeys.save();
  }

  _sendSafeKeys() {
    // get only keys from local key
    var day = datetime.getTime().substring(0, 8);
    var dts = {}, local = {}, localE = 0, s, k;
    var safeKey = this.safeKeys.value;
    for (s in safeKey) {
      for (k in safeKey[s]) {
        if (safeKey[s][k][1] === 'l') {
          if (!local[s]) {
            local[s] = {};
            localE ++;
          }
          local[s] = safeKey[s][k];
          if (safeKey[s][k][0] === day) {
            if (!dts[s]) {
              dts[s] = {};
            }
            dts[s][k] = safeKey[s][k][0];
          }
        }
      }
    }
    if(Object.keys(dts).length > 0) {
      var payl = CliqzAttrack.generatePayload(dts, day, false, true);
      CliqzHumanWeb.telemetry({'type': CliqzHumanWeb.msgType, 'action': 'attrack.safekey', 'payload': payl});
    }
  }

}
