import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';
import LoggingHandler from 'goldrush/logging_handler';


const MODULE_NAME = 'day_fid';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a signal in a range of time or not. This way we can stop showing an ad
//        if we already did it in a N period of time.
//
export class DayFID extends FID {
  constructor() {
    super('day');
    this.args = {};

    this.configParams = {
      'range' : {
        description: 'list of days for which fid return 1 if current event ts is inside',
        value: []
      }
    };
  }

  configureDataBases(dbsMap) {
  }

  configureArgs(configArgs) {
     // set default values
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    // set default values
    for(let k in this.configParams) {
      this.args[k] = this.configParams[k]['value'];
    }

    // Overwrite values with the once specified in the rule files
    for (let arg_idx in configArgs) {
        this.args[arg_idx] = configArgs[arg_idx];
    }
  }

  evaluate(intentInput, extras) {
    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const eventTimestamp = intentSession.lastEvent()['ts'];

    // Create a new JavaScript Date object based on the timestamp
    // multiplied by 1000 so that the argument is in milliseconds, not seconds.
    let date = new Date(eventTimestamp);
    // Hours part from the timestamp
    let day = date.getDay();

    LoggingHandler.info(MODULE_NAME,
                        'current_day: ' + day +
                        ' range ' + this.args['range']);

    if (this.args['range'].indexOf(day) > -1) {
      return 1.0;
    }
    return 0.0;
  }
}
