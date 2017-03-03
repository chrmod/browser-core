import inject from '../core/kord/inject';
import TrackerProxy from './tracker-proxy';

export default {

  antitracking: inject.module('antitracking'),

  init(/* settings */) {
    this.trackerProxy = new TrackerProxy(this.antitracking);
    this.trackerProxy.init();
  },
  unload() {
    this.trackerProxy.unload();
  },
};
