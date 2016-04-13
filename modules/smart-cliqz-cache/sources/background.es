import { utils } from 'core/cliqz';
import { mkdir } from 'core/fs';
import SmartCliqzCache from 'smart-cliqz-cache/smart-cliqz-cache';

export default {
  init() {
    this.smartCliqzCache = new SmartCliqzCache();
  },

  unload() {
    this.smartCliqzCache.unload();
  },

  beforeBrowserShutdown() {

  }
};
