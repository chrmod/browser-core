import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';


const MODULE_NAME = 'hour_fid';

//
// @brief This FID will be used to filter (return 1/0) depending if we detected
//        a signal in a range of time or not. This way we can stop showing an ad
//        if we already did it in a N period of time.
//
export class HourFID extends FID {
  constructor() {
    super('hour');
    this.args = {};

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
    let date = new Date(eventTimestamp*1000);
    // Hours part from the timestamp
    let hours = date.getHours();

    LoggingHandler.info(MODULE_NAME,
                        'current_hour: ' + hours +
                        ' range ' + this.configArgs['range']['value']);

    return (hours in this.configArgs['range']['value']) ? 1.0 : 0.0;
  }
}
