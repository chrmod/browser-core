import { utils } from '../core/cliqz';
import platformTelemetry from '../platform/telemetry';

export default {
  telemetry: function(payl) {
    utils.log("No telemetry provider loaded", "attrack");
  },

  msgType: 'humanweb',

  loadFromProvider: function(provider) {
    utils.log("Load telemetry provider: "+ provider, "attrack");
    if (typeof System !== 'undefined') {
      return System.import(provider).then((mod) => {
        this.telemetry = mod.default.telemetry.bind(mod);
        this.msgType = mod.default.msgType;
        return this;
      });
    } else {
      this.telemetry = platformTelemetry.telemetry.bind(platformTelemetry);
      this.msgType = platformTelemetry.msgType;
      return Promise.resolve(this);
    }
  }
};
