'use strict';
/*
 * This module handles various calculations
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');
Cu.import('chrome://cliqzmodules/content/extern/math.min.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCalculator'];

var basics = "[\\\(\\)\\+\\/\\*\\%\\^\\-\\.\\s0123456789]",
    utils = "|km|cm|meter|mm|m|inch|inches|foot|yard|mile|gr|rad|grad|celsius|fahrenheit|kelvin|to",
    mathExp = "|log|exp|sin|cos|tan|asin|acos|atan|sqrt|log|abs|ceil|floor|round|exp",
    REG_CALC = new RegExp( "^([" + basics + mathExp + utils +"|\s])*$");

var CliqzCalculator = {
    CALCULATOR_RES: 0,
    UNIT_CONVERT_OPERATORS: ['to', 'in'], // ref.: http://mathjs.org/docs/expressions/syntax.html

    get: function(q){
        if (this.CALCULATOR_RES == null || this.CALCULATOR_RES == q){
          return null;
        } else {
          var result = Result.cliqzExtra(
                      {
                          url : "",
                          q : q,
                          style: "cliqz-extra",
                          type: "cliqz-extra",
                          subType: JSON.stringify({empty:true}),
                          data:
                          {
                              template:'calculator', //calculator_bck',
                              expression: math.parse(q).toString(),
                              answer: this.CALCULATOR_RES, // math.eval(q),
                              prefix_answer: '= ',
                              is_calculus: !this.isUniConverter(q),
                              support_copy_ans: true
                          }
                      }
                  );
          return result;
        }
    },

    isCalculatorSearch: function(q){
        try {
            this.CALCULATOR_RES = math.eval(q);
            return true
        }
        catch(err) {
            return false
        }
    },

    isUniConverter: function(expression){
        // thuy@cliqz.com
        // Feb2015

        return false;  // thuy@cliqz.com - to force: use only 1 template for all sort of calculator

        var tree = math.parse(expression);
        var self = this;
        var findUnitOperator = false;

        // validate operators
        // source: http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
        //          http://jsbin.com/duduru/1/edit?html,output
        tree.find({
              type: math.expression.node.OperatorNode
            })
            .forEach(function (operator) {
              CliqzUtils.log("THUY-----------operator: ");
              CliqzUtils.log(operator.op);

              if (self.UNIT_CONVERT_OPERATORS.indexOf(operator.op) !== -1) {
                  findUnitOperator = true;
              }
            });

        return findUnitOperator
    },

    isSame: function(suggestion, answer){
      if (answer == null || suggestion == null){
        return false;
      }

      suggestion = suggestion.toString().trim().toLowerCase().split(" ")[0];
      answer = answer.toString().trim().toLowerCase().split(" ")[0];

      // google start showing in E notation after 10^10, we show after 10^21
      // invest more if this is an issue
      // if(suggestion.indexOf("e")){
      //   CliqzUtils.log(Number(suggestion).toString, "Long number");
      // }

      var dotPos = answer.indexOf(".");
      if(dotPos != -1){
        answer = answer.slice(0, dotPos + 3);
        suggestion = suggestion.slice(0, dotPos + 3);
      }
      return answer == suggestion;
    }
}
