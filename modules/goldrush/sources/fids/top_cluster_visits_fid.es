import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';


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
    // set default values
    for(let k in this.configParams) {
      this.args[k] = Number(this.configParams[k]['value']);
    }

    // Overwrite values with the once specified in the rule files
    for (let arg_idx in configArgs) {
        this.args[arg_idx] = Number(configArgs[arg_idx]);
    }

    if (this.args['N'] <= 0 || this.args['delta'] <= 0) {
      return;
    }
}

  evaluate(intentInput, extras) {
    // if we are being called is because there we are visiting the cluster again
    // so we just need to increment a counter or even easier, just count the
    // number of events
    let intentSession = intentInput.currentBuyIntentSession();
    let totalNumEvents = intentSession.totalNumOfEvents();
    let lowerBound = this.args['N'] - this.args['delta'];
    let upperBound = this.args['N'] + this.args['delta'];
    if (totalNumEvents >= lowerBound && totalNumEvents <= upperBound) {
      return 1.0;
    }
    return 0.0;
  }
}
