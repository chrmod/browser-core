import * as persist from './persistent-state';
import pacemaker from './pacemaker';
import * as datetime from './time';
import { events } from '../core/cliqz';

const DAYS_EXPIRE = 7;

export default class {

  constructor() {
    this._tokenDomain = new persist.LazyPersistentObject('tokenDomain');
  }

  init() {
    this._tokenDomain.load();

    // save list to disk every 5 mins
    this._pmTask = pacemaker.register(this._tokenDomain.save.bind(this._tokenDomain), 1000 * 60 * 5);

    this.onHourChanged = () => {
      this.clean();
    };
    events.sub('attrack:hour_changed', this.onHourChanged);
  }

  unload() {
    events.un_sub('attrack:hour_changed', this.onHourChanged);
    pacemaker.deregister(this._pmTask);
  }

  addTokenOnFirstParty(token, firstParty) {
    if (!this._tokenDomain.value[token]) {
      this._tokenDomain.value[token] = {};
    }
    this._tokenDomain.value[token][firstParty] = datetime.getTime().substr(0, 8);
    this._tokenDomain.setDirty();
  }

  getNFirstPartiesForToken(token) {
    return Object.keys(this._tokenDomain.value[token] || {}).length;
  }

  clean() {
    const day = datetime.newUTCDate();
    day.setDate(day.getDate() - DAYS_EXPIRE);
    const dayCutoff = datetime.dateString(day);
    const td = this._tokenDomain.value;
    for (const tok in td) {
      for (const s in td[tok]) {
        if (td[tok][s] < dayCutoff) {
          delete td[tok][s];
        }
      }
      if (Object.keys(td[tok]).length === 0) {
        delete td[tok];
      }
    }
    this._tokenDomain.setDirty();
    this._tokenDomain.save();
  }

  clear() {
    this._tokenDomain.clear();
  }
}
