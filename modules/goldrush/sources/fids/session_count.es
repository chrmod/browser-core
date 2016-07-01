import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';
import LoggingHandler from 'goldrush/logging_handler';
import GoldrushConfigs from 'goldrush/goldrush_configs';


const MODULE_NAME = 'session_count_fid';

//
export class SessionCountFID extends FID {
  constructor() {
    super('sessionCount');
    this.args = {}

    this.configParams = {
      'range' : {
        description: 'list of numbers for which fid return 1 if current event is \
                      taking place inside that session',
        value: [1]
      }
    };
  }

  configureDataBases(dbsMap) {
  }

  configureArgs(configArgs) {
     // set default values
     GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'configuring args: ' + JSON.stringify(configArgs));

    // set default values
    for(let k in this.configParams) {
      this.args[k] = this.configParams[k]['value'];
    }

    // Overwrite values with the once specified in the rule files
    for (let arg_idx in configArgs) {
        this.args[arg_idx] = configArgs[arg_idx];
    }

    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME, 'this.args: ' + JSON.stringify(this.args));
  }

  evaluate(intentInput, extras) {
    // else we need to check if the current event is far away enough in time
    // to return 1
    let intentSession = intentInput.currentBuyIntentSession();
    const numSessions = intentSession.numOfSessions();

    GoldrushConfigs.LOG_ENABLED &&
    LoggingHandler.info(MODULE_NAME,
                        'numSessions: ' + numSessions +
                        ' range ' + JSON.stringify(this.args));

    // TODO: we can change this with a set instead of list
    if (this.args['range'].indexOf(numSessions) > -1) {
      return 1.0;
    }
    return 0.0;
  }
}
