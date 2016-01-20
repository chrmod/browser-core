import { utils, events } from 'core/cliqz';
import Reporter from 'telemetry-categories/reporter';

export default {
  init(settings) {
  },

  start() {
    if (this.reporter || utils.getPref('categoryAssessment', false)) {
      return;
    }

    this.reporter = new Reporter();
    this.reporter.start();
    events.sub("core.location_change", this.reporter.assess);
  },

  unload() {
    if (this.reporter) {
      CliqzEvents.un_sub("core.location_change", this.reporter.assess);
      reporter.stop();
    }
  },

}
