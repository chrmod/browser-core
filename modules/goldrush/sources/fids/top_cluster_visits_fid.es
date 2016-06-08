import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';


//
// @brief This class will be in charge of checking how many visits to the cluster
//        do we have in between a range (using a delta value to check [N-delta,N+delta])
// Arguments:
//  N: the number of visits to check.
//  delta: the delta number of visits to check.
//
// TODO: if we want to do this generic we need to add the value in the database
//       so we can do it generic for all the clusters...
//
export class TopClusterVisitsFID extends FID {
  constructor() {
    super('topClusterVisits');
    this.args = {};

    this.configParams = {
      'N' : {
        description: 'N means the number of visits where we will activate this FID and return 1',
        value: 1
      },
      'delta' : {
        description: 'The delta number of visits to check',
        value: 1
      }
    };
  }

  configureDataBases(dbsMap) {
    // nothing to do for now
  }

  configureArgs(configArgs) {
    for (let arg in configArgs) {
      if (arg['name'] in this.configParams) {
        this.args[arg['name']] = this.configParams[arg['name']]['value'];
      } else {
        this.args[arg['name']] = arg['value'];
      }
    }
    if (this.args['N'] <= 0 || this.args['delta'] <= 0) {
      return;
    }

    // nothing else to do.
  }

  evaluate(intentInput, extras) {
    // if we are being called is because there we are visiting the cluster again
    // so we just need to increment a counter or even easier, just count the
    // number of events
    var intentSession = intentInput.currentBuyIntentSession();
    const totalNumEvents = intentSession.totalNumOfEvents();
    const lowerBound = this.args['N'] - this.args['delta'];
    const upperBound = this.args['N'] + this.args['delta'];
    return totalNumEvents >= lowerBound && totalNumEvents <= upperBound;
  }
}
