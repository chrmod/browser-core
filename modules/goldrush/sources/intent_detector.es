import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';


function log(s){
  utils.log(s, 'GOLDRUSH - INTENT DETECTOR');
}


////////////////////////////////////////////////////////////////////////////////
// Helper string methods
//
function replaceStrArgs(str, args) {
  if (args === undefined || args.length === 0) {
    return str;
  }
  return str.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] !== 'undefined' ? args[number] : match;
  });
}


////////////////////////////////////////////////////////////////////////////////
/*
The rules will be defined as a mathematical expression that can be supported by
python (eval) method in the following way:
({exp1} op {exp2}) op {exp3} ....
where op could be any mathematical symbol. We can also use functions like
max({exp1}, {exp2})....
We need to use the characters '{' and '}' to be able to easily identify the
expressions in the file.

Our parser will get the expressions and evaluate them with the associated FID.
an expression will look like:

nameOfFID_argName1=val1_argName2=val2_...

where nameOfFID is the name of the specific FeatureIntentDetector and the
argName1,argName2.... are the arguments we can provide to it with the given
values val1 and val2 respectively.

for example:
    DateTimeFID_dayWeight=0.1_hourWeight=0.5 means it will use DateTimeFID detector with params:
        0.1 for the day and 0.5 for the hour weights.
*/
////////////////////////////////////////////////////////////////////////////////
/*
This method will parse a string and will return 2 things:
new_rule_string -> will be the same rul expression but replacing each {exp} with
                   a %f value that will be filled in later with the resulting
                   value after calculating the FID.
fids_to_calculate -> will be a list of maps from fid_name -> {argName: argValue}
                     and where each position of the fid_name should then be
                     replaced in the new_rule_string with the evaluated value.
*/
function parseRuleString(ruleString, fidsMap) {
  log('SR' + ' parseRuleString');
  var q = [];
  var indices = [];
  var firstPos = -1;
  var sndPos = -1;
  ruleString = ruleString.replace(/\n/g, ' ');
  for (let i = 0; i < ruleString.length; ++i) {
    var char = ruleString[i];
    if (char === '{') {
      firstPos = i;
      q.push(char);
      if (q.length > 1) {
        log('The format of the rule is not valid, 2 \'{\' where found:\n' + ruleString);
        return null;
      }
    } else if (char === '}') {
        sndPos = i;
        indices.push([firstPos, sndPos]);
        if (q.length === 0 || q.pop() !== '{') {
          log('The format of the rule is not valid, \'}\' not expected?\n' + ruleString);
          return null;
        }
    }
  }

  // now here we have the indices of all the expressions, replace them.
  if (indices.length === 0) {
    log('There are no expressions in the rule:\n' + ruleString);
    return null;
  }

  var newStr = '';
  var expressions = [];
  var lastPos = 0;
  var currentIndex = 0;
  for (let i = 0; i < indices.length; ++i) {
    var it = indices[i];
    firstPos = it[0];
    sndPos = it[1];
    newStr += ruleString.slice(lastPos, firstPos) + ' {' + String(currentIndex++) + '} ';
    lastPos = sndPos + 1;

    var strExpr = ruleString.slice(firstPos+1, sndPos);
    var parts = strExpr.split('_');
    if (parts.length === 0) {
      log('the expression ' + strExpr + ' is not properly formatted in rule: \n' + ruleString);
      return null;
    }
    var args = {};
    var exprName = parts[0].trim();
    var fid = fidsMap[exprName];
    if (fid === undefined) {
      log('we couldnt find the fid with name ' + exprName + ' on the rule:\n' + ruleString);
      return null;
    }
    for (let j = 1; j < parts.length; ++j) {
      var aparts = parts[j].split('=');
      if (aparts.length !== 2) {
        log('some of the arguments in ' + strExpr + ' are wrong formatted in rule:\n' + ruleString);
        return null;
      }
      args[aparts[0].trim()] = aparts[1].trim();
    }
    expressions.push([exprName, args]);
  }

  // test the expression if it is valid to be evaluated (this is test code)
  var dummyValues = [];
  for (let i = 0; i < expressions.length; ++i) {
    dummyValues.push(0.5);
  }
  var strTestExpr = replaceStrArgs(newStr, dummyValues);
  log('evaluating rule to see if it is possible: \n' + strTestExpr);
  try {
    let tmpResult = eval(strTestExpr);
    log('evaluated and the result is: ' + tmpResult);
  } catch(e) {
    log('error evaluating the test expression, error: ' + e);
    return null;
  }

  // build the result object:
  var result = {
    new_rule_string : newStr,
    fids_to_calculate : expressions
  };
  log('SR ' + JSON.stringify(result, null, 4) );
  return result;
}


////////////////////////////////////////////////////////////////////////////////
export function IntentDetector(clusterID, mappings = null, dbMaps = null, fidsMap = null) {
  this.clusterID = clusterID;
  this.mappings = mappings;
  this.dbMap = dbMaps;
  this.fidsMap = fidsMap;
  this.originalRuleStr = '';
  this.ruleData = null;
}

//
// @brief load the databases from a raw db file (json)
// @returns true on success | false otherwise
//
IntentDetector.prototype.loadDataBases = function(rawDatabase) {
  if (this.dbMap === null) {
    throw new Error('no databases map found! for IntentDetector: ' + this.clusterID);
  }
  for (var dbName in rawDatabase) {
    if (!this.dbMap.hasOwnProperty(dbName)) {
      throw new Error('we couldnt find the database with name ' + dbName + ' in the map');
    }

    // initialize all the databases
    let db = this.dbMap[dbName];
    db.loadFromDict(rawDatabase[dbName]);
  }

  log('databases loaded for intent detector of cluster ' + this.clusterID);

  return true;
};

//
// @brief load and parse the rule
//
IntentDetector.prototype.loadRule = function(ruleString) {
  if (this.fidsMap === null) {
    throw new Error('no fids map found for IntentDetector: ' + this.clusterID);
  }
  if (!ruleString || ruleString.length === 0) {
    throw new Error('we cannot load an empty rule for IntentDetector: ' + this.clusterID);
  }
  this.originalRuleStr = ruleString;
  this.ruleData = parseRuleString(ruleString, this.fidsMap);

  if (this.ruleData === null) {
    throw new Error('Something happened when parsing the rule: ' + ruleString +
        '\n for IntentDetector with cluster: ' + this.clusterID);
  }

  for (var fidName in this.fidsMap) {
    if (!this.fidsMap.hasOwnProperty(fidName)) {
      continue;
    }
    let fid = this.fidsMap[fidName];
    fid.configureDataBases(this.dbMap);
  }

  return true;
};

//
// @brief evaluateInput
//
IntentDetector.prototype.evaluateInput = function(intentInput) {
  if (this.ruleData === null) {
    log('cannot evaluate we have a null rule data: ' + this.clusterID);
    return 0;
  }
  var resultValues = [];
  var exps = this.ruleData['fids_to_calculate'];
  var extras = {'mappings' : this.mappings};

  log('exps' + JSON.stringify(exps));

  for (let ex in exps) {
    if (!exps.hasOwnProperty(ex)) {
      // TODO: mark an error here...?
      continue;
    }
    log('ex' + JSON.stringify(ex));
    let exName = exps[ex][0];
    let argsMap = exps[ex][1];
    log(exName);
    log(argsMap);
    let fid = this.fidsMap[exName];
    if (fid === undefined) {
      log('this cannot happen, we dont have the fid with name ' + exName);
      continue;
    }
    fid.configureArgs(argsMap);
    let rvalue = fid.evaluate(intentInput, extras);
    log('rvalue ' + rvalue);
    resultValues.push(rvalue);
  }
  let strToEvaluate = replaceStrArgs(this.ruleData['new_rule_string'] , resultValues);
  log('strToEvaluate ' + strToEvaluate);
  let result = eval(strToEvaluate);
  log('result ' + result);
  if (typeof(result) !== 'number') {
    log('the eval method of the rule ' + this.originalRuleStr + ' is not a number?: ' + result);
    return 0;
  }

  // else alles gut
  return result;
};

