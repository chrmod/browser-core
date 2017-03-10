import * as persist from './persistent-state';
import md5 from './md5';
import { events } from '../core/cliqz';
import * as datetime from './time';


export default class {

  constructor(telemetry, config) {
    this.telemetry = telemetry;
    this.config = config;
    this.blocked = new persist.LazyPersistentObject('blocked');
    this.localBlocked = new persist.LazyPersistentObject('localBlocked');
  }

  get blockReportList() {
    return this.config.reportList || {};
  }

  init() {
    this.blocked.load();
    this.localBlocked.load();

    this.onHourChanged = () => {
      const delay = 24;
      const hour = datetime.newUTCDate();
      hour.setHours(hour.getHours() - delay);
      const hourCutoff = datetime.hourString(hour);

      this._cleanLocalBlocked(hourCutoff);
      this.sendTelemetry();
    };
    events.sub('attrack:hour_changed', this.onHourChanged);
  }

  unload() {
    events.un_sub('attrack:hour_changed', this.onHourChanged);
  }

  // blocked + localBlocked
  add(sourceUrl, tracker, key, value, type) {
    const s = tracker;
    const k = md5(key);
    const v = md5(value);
    const hour = datetime.getTime();
    const source = md5(sourceUrl);

    if (this.isInBlockReportList(s, k, v)) {
      this._addBlocked(s, k, v, type);
    }
    // local logging of blocked tokens
    this._addLocalBlocked(source, tracker, key, value, hour);
  }

  clear() {
    this.blocked.clear();
    this.localBlocked.clear();
  }

  _addBlocked(tracker, key, value, type) {
    const bl = this.blocked.value;
    if (!(tracker in bl)) {
      bl[tracker] = {};
    }
    if (!(key in bl[tracker])) {
      bl[tracker][key] = {};
    }
    if (!(value in bl[tracker][key])) {
      bl[tracker][key][value] = {};
    }
    if (!(type in bl[tracker][key][value])) {
      bl[tracker][key][value][type] = 0;
    }
    bl[tracker][key][value][type]++;
    this.blocked.setDirty();
  }

  _addLocalBlocked(source, s, k, v, hour) {
    const lb = this.localBlocked.value;
    if (!(source in lb)) {
      lb[source] = {};
    }
    if (!(s in lb[source])) {
      lb[source][s] = {};
    }
    if (!(k in lb[source][s])) {
      lb[source][s][k] = {};
    }
    if (!(v in lb[source][s][k])) {
      lb[source][s][k][v] = {};
    }
    if (!(hour in lb[source][s][k][v])) {
      lb[source][s][k][v][hour] = 0;
    }
    lb[source][s][k][v][hour]++;
    this.localBlocked.setDirty();
  }

  _cleanLocalBlocked(hourCutoff) {
    // localBlocked
    for (const source in this.localBlocked.value) {
      for (const s in this.localBlocked.value[source]) {
        for (const k in this.localBlocked.value[source][s]) {
          for (const v in this.localBlocked.value[source][s][k]) {
            for (const h in this.localBlocked.value[source][s][k][v]) {
              if (h < hourCutoff) {
                delete this.localBlocked.value[source][s][k][v][h];
              }
            }
            if (Object.keys(this.localBlocked.value[source][s][k][v]).length === 0) {
              delete this.localBlocked.value[source][s][k][v];
            }
          }
          if (Object.keys(this.localBlocked.value[source][s][k]).length === 0) {
            delete this.localBlocked.value[source][s][k];
          }
        }
        if (Object.keys(this.localBlocked.value[source][s]).length === 0) {
          delete this.localBlocked.value[source][s];
        }
      }
      if (Object.keys(this.localBlocked.value[source]).length === 0) {
        delete this.localBlocked.value[source];
      }
    }
    this.localBlocked.setDirty(true);
    this.localBlocked.save();
  }

  isInBlockReportList(s, k, v) {
    if ('*' in this.blockReportList) {
      return true;
    } else if (s in this.blockReportList) {
      const keyList = this.blockReportList[s];
      if (keyList === '*') {
        return true;
      } else if (k in keyList) {
        const valueList = keyList[k];
        if (valueList === '*') {
          return true;
        } else if (v in valueList) {
          return true;
        }
      }
    }
    return false;
  }

  sendTelemetry() {
    if (Object.keys(this.blocked.value).length > 0) {
      this.telemetry({
        message:{
          action: 'attrack.blocked',
          payload: this.blocked.value,
        }
      });
      // reset the state
      this.blocked.clear();
    }
  }
}
