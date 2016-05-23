import { utils, events } from 'core/cliqz';
import Reporter from 'goldrush/reporter';
import {DateTimeDB} from 'goldrush/dbs/datetime_db';
import ResourceLoader from 'core/resource-loader';


function log(s){
  utils.log(s, 'GOLDRUSH');
}

export default {
  init() {
    // nothing to do for now
    log('Initializing the background script');
    this.db = new DateTimeDB();
    log('DateTimeDB: ' + this.db.databaseName());

    this.loader = new ResourceLoader(
      [ 'goldrush', 'food_delivery.dbinfo' ],
      {}
    );

    this.loader.load().then( categories => {
      this.db.loadFromDict(categories);
    });
  },

  start() {
    // nothing to do
    log('starting the background script');
    this.reporter = new Reporter(0);

    this.reporter.start();
    events.sub( 'core.location_change', this.reporter.assess.bind(this.reporter) );
    return;
  },

  unload() {
    log('unloading the background script');
    if ( this.reporter ) {
      events.un_sub( 'core.location_change', this.reporter.assess.bind(this.reporter) );
      this.reporter.stop();
    }
  },

};
