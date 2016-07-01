import { Rule } from 'goldrush/rules/rule';
import LoggingHandler from 'goldrush/logging_handler';



const MODULE_NAME = 'travel_rule';



////////////////////////////////////////////////////////////////////////////////
// define local FIDS ids for the internal map
//


////////////////////////////////////////////////////////////////////////////////
// Generic TravelRule class
export class TravelRule extends Rule {
  constructor() {
    super();
  }

  //////////////////////////////////////////////////////////////////////////////
  //                        API TO IMPLEMENT
  //////////////////////////////////////////////////////////////////////////////

  //
  // @brief this function should return a map with the following data:
  //  {
  //    id1: {name: 'fid_name', args: {arg_name1: arg_value1, ...}},
  //  }
  //
  // note that we could have repeated fid_names if and only if they differ
  // in the arg_values for the same arg_name. If not this will be less performant
  // (in the future we can automatically check this.)
  //
  fidsMappings() {
    return {
      FID_numEventsCurrSession_N5_delta0 : {
        name : 'numEventsCurrSession',
        args : {'N' : 3, 'delta' : 0}
      },
      FID_sessionCount_range_2: {
        name: 'sessionCount',
        args: {'range': [2]}
      }
    };
  }

  //
  // @brief this method is the one that should contain the rule logic to be
  //        evaulated.
  // @param fidsValuesMapping is the argument containing the following data
  //        structure:
  //  {
  //    id1: value,
  //  }
  // where id1 is the same id provided in get fidsMappings() function and
  //       value is the resulting value from the evaluated fid with the given
  //             arguments.
  //
  // @return a value between [0,1] as intent value.
  //
  evaluate(fidsValuesMapping) {
    LoggingHandler.error(MODULE_NAME,
                         'returning only the value of the topClusterVisits fid: ' +
                         fidsValuesMapping.FID_numEventsCurrSession_N5_delta0);

    LoggingHandler.error(MODULE_NAME,
                         'returning only the value of the sessionCount fid: ' +
                         fidsValuesMapping.FID_sessionCount_range_2);

    if (fidsValuesMapping.FID_numEventsCurrSession_N5_delta0 == 1 &&
        fidsValuesMapping.FID_sessionCount_range_2 == 1) {
      return 1;
    }
    return 0;
  }


}



