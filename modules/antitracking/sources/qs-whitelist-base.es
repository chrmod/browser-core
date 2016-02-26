import * as persist from 'antitracking/persistent-state';
import * as datetime from 'antitracking/time';
import { events } from 'core/cliqz';
import CliqzAttrack from 'antitracking/attrack';
import CliqzHumanWeb from 'human-web/human-web';

const safeKeyExpire = 7;

/** Base QS Whitelist
 *  Contains only local safekeys, extra safekeys and safe tokens are left to sub-class.
 */
export default class {

  constructor() {
    this.safeKeys = new persist.LazyPersistentObject('safeKey');
  }

  init() {
    this.safeKeys.load();

    // every hour, prune and send safekeys
    this.hourlyPruneAndSend = () => {
      this._pruneSafeKeys();
      this._sendSafeKeys();
    }.bind(this);
    events.sub('attrack:hour_changed', this.hourlyPruneAndSend);
  }

  destroy() {
    events.un_sub('attrack:hour_changed', this.hourlyPruneAndSend);
  }

  isSafeKey(domain, key) {
    return domain in this.safeKeys.value && key in this.safeKeys.value[domain];
  }
  addSafeKey(domain, key, valueCount) {
    let today = datetime.dateString(datetime.newUTCDate());
    if (!(domain in this.safeKeys.value)) {
      this.safeKeys.value[domain] = {};
    }
    this.safeKeys.value[domain][key] = [today, 'l', valueCount];
    this.safeKeys.setDirty();
  }

  /** Annotate safekey entries with count of tokens seen, from requestKeyValue data.
   *  This will add data on how many values were seen for each key by individual users.
   */
  annotateSafeKeys(requestKeyValue) {
    for ( let domain in this.safeKeys.value ) {
      for ( let key in this.safeKeys.value[domain] ) {
        let tuple = this.safeKeys.value[domain][key];
        // check if we have key-value data for this domain, key pair
        if ( requestKeyValue[domain] && requestKeyValue[domain][key]) {
          // remote and old safekeys may be in old pair format
          if ( tuple.length === 2 ) {
            tuple.push(0);
          }

          let valueCount = Object.keys(requestKeyValue[domain][key]).length;
          tuple[2] = Math.max(tuple[2], valueCount);
        }
      }
    }
    this.safeKeys.setDirty();
    this.safeKeys.save();
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
