import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';
import LoggingHandler from 'goldrush/logging_handler';


const MODULE_NAME = 'hour_fid';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a signal in a range of time or not. This way we can stop showing an ad
//        if we already did it in a N period of time.
//
export class HourFID extends FID {
  constructor() {
    super('hour');
    this.args = {}

    this.configParams = {
      'range' : {
        description: 'list of hours for which fid return 1 if current event ts is inside',
        value: []
      }
    };
  }

  configureDataBases(dbsMap) {
  }

  configureArgs(configArgs) {
     // set default values
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    // set default values
    for(let k in this.configParams) {
      this.args[k] = this.configParams[k]['value'];
    }

    // Overwrite values with the once specified in the rule files
    for (let arg_idx in configArgs) {
        this.args[arg_idx] = configArgs[arg_idx];
    }

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'this.args: ' + JSON.stringify(this.args));
  }

  evaluate(intentInput, extras) {
    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const eventTimestamp = intentSession.lastEvent()['ts'];

    let date = new Date(eventTimestamp);
    // Hours part from the timestamp
    let hour = date.getHours();

    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'current_hour: ' + hour +
                        ' range ' + JSON.stringify(this.args));

    // TODO: we can change this with a set instead of list
    if (this.args['range'].indexOf(hour) > -1) {
      return 1.0;
    }
    return 0.0;
  }
}
