import { Rule } from 'goldrush/rules/rule';
import LoggingHandler from 'goldrush/logging_handler';



const MODULE_NAME = 'food_delivery_rule';



////////////////////////////////////////////////////////////////////////////////
// define local FIDS ids for the internal map
//


////////////////////////////////////////////////////////////////////////////////
// Generic FoodDeliveryRule class
export class FoodDeliveryRule extends Rule {
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
      FID_topClusterVisits_N3_delta0 : {
        name : 'topClusterVisits',
        args : {'N' : 3, 'delta' : 0}
      },
      FID_hour_range_18_20 : {
        name : 'hour',
        args: {'range': [18,19,20]}
      },
      FID_day_range_5_6 : {
        name : 'day',
        args: {'range': [5,6]}
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
    LoggingHandler.info(MODULE_NAME,
                         'returning only the value of the visits fid: ' +
                         fidsValuesMapping.FID_topClusterVisits_N3_delta1);
    LoggingHandler.info(MODULE_NAME,
                     'returning only the value of the hour fid: ' +
                     fidsValuesMapping.FID_hour_range_4_8);
    LoggingHandler.info(MODULE_NAME,
                     'returning only the value of the day fid: ' +
                       fidsValuesMapping.FID_day_range_5_6);
    if(fidsValuesMapping.FID_topClusterVisits_N3_delta0 === 1) {
      return 1.0;
    } else if (fidsValuesMapping.FID_hour_range_18_20 === 1 && fidsValuesMapping.FID_day_range_5_6 === 1) {
      return 1.0;
    }
    return 0;
  }


}



