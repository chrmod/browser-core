import inject from '../core/kord/inject';
import background from '../core/base/background';
import Blocker from './blocker';

// const ENABLED_PREF = 'attrackForceBlock';
const STEP_NAME = 'blockList';

export default background({

  antitracking: inject.module('antitracking'),

  init() {
    this.blockEngine = new Blocker();
    return this.blockEngine.init().then(
      () => this.antitracking.action('addPipelineStep', {
        name: STEP_NAME,
        stages: ['open'],
        after: ['determineContext', 'checkSameGeneralDomain', 'attachStatCounter', 'logRequestMetadata'],
        fn: this.blockEngine.checkBlockRules.bind(this.blockEngine),
      })
    );
  },

  unload() {
    this.antitracking.action('removePipelineStep', STEP_NAME);
    this.blockEngine.unload();
  },

  events: {
  }
});
