import LoggingHandler from 'goldrush/logging_handler';
import GoldrushConfigs from 'goldrush/goldrush_configs';
// rules
import { Rule } from 'goldrush/rules/rule';
import { FoodDeliveryRule } from 'goldrush/rules/food_delivery_rule';
import { TravelRule } from 'goldrush/rules/travel_rule';


const MODULE_NAME = 'rules_builder';


////////////////////////////////////////////////////////////////////////////////
export class RulesBuilder {
  constructor() {
  }

  //
  // @brief Build a new rule for the given cluster ID
  // @return a new instance of that rule type || null on error
  //
  buildRule(clusterID) {
    let cidNum = Number(clusterID);
    var rule = null;
    switch (cidNum) {
      // toner
      case 0: break;
      // travel
      case 1:
        rule = new TravelRule();
      break;
      // car parts
      case 2: break;
      // online tickets
      case 3: break;
      // food delivery
      case 4:
        rule = new FoodDeliveryRule();
        break;

      default:
    }
    if (!rule) {
      GoldrushConfigs.LOG_ENABLED &&
      LoggingHandler.error(MODULE_NAME, 'We dont have the rule for clusterid: ' + cidNum);
    } else {
      rule.setClusterID(clusterID);
    }

    // TODO: init or whatever we need
    return rule;
  }


}



