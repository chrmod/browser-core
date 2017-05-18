import inject from '../core/kord/inject';
import utils from '../core/utils';
import prefs from '../core/prefs';

export default class {
  constructor(settings) {
    this.geolocation = inject.module('geolocation');
  }

  init() {
    this.geolocation.action("updateGeoLocation");
  }

  unload() {

  }

  status() {
    // we only need the show the location setting for cliqz UI
    if (prefs.get('dropDownStyle', 'cliqz') == 'cliqz') {
      return {
        visible: true,
        state: utils.getLocationPermState()
      }
    }
  }
}
