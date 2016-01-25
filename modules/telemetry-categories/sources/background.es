import { utils, events } from 'core/cliqz';
import Reporter from 'telemetry-categories/reporter';
import ResourceLoader from 'telemetry-categories/resource-loader';

export default {
  init(settings) {
    this.loader = new ResourceLoader(
      [ 'telemetry-categories', 'categories.json' ],
      {
        remoteURL: 'https://cdn.cliqz.com/domain-categories/categories.json',
        cron: '0 12 * * *',
      }
    );
  },

  start() {
    if ( this.reporter || utils.getPref( 'categoryAssessment', false ) ) {
      return;
    }

    loader.load().then( categories => {
      this.reporter = new Reporter( categories );

      this.reporter.start();
      events.sub( 'core.location_change', this.reporter.assess )
    });

    loader.onUpdate( categories => {
      if ( !this.loader ) {
        return;
      }

      this.reporter.categories = categories;
    });
  },

  unload() {
    this.loader.stop();

    if ( this.reporter ) {
      CliqzEvents.un_sub( 'core.location_change', this.reporter.assess );
      reporter.stop();
    }
  },

}
