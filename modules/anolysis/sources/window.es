import { utils } from '../core/cliqz';
import background from './background';


export default class {
  init(settings) {
    if (!background.enabled()) {
      return;
    }

    this.generateDemographicsSignal(settings.window);
  }

  generateDemographicsSignal(window) {
    // TODO: We could actually convert to the new trees here instead of in the
    // preprocessor.
    const navigator = window.navigator;
    background.actions.handleTelemetrySignal({
      type: 'environment',
      agent: navigator.userAgent,
      distribution: utils.getPref('distribution', ''),
      install_date: utils.getPref('install_date'),
      version: utils.extensionVersion,
      version_dist: utils.getPref('distribution.version', '', ''),
      version_host: utils.getPref('gecko.mstone', '', ''),
    });
  }

  unload() {
  }
}
