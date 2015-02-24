'use strict';
/*
 * This module handles various calculations
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');
Cu.import('chrome://cliqzmodules/content/extern/math.min.jsm');
// REF:
//      http://mathjs.org/docs/index.html
//      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
//      http://jsbin.com/duduru/1/edit?html,output

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCalculator'];

var basics = "[\\\(\\)\\+\\/\\*\\%\\^\\-\\.\\s0123456789]",
//    utils = "|km|cm|meter|mm|m|inch|inches|foot|yard|mile|gr|rad|grad|celsius|fahrenheit|kelvin|to",
    utils = "meter|m|inch|inches|in|foot|ft|feet|yard",
    mathExp = "|log|exp|sin|cos|tan|asin|acos|atan|sqrt|log|abs|ceil|floor|round|exp",
    REG_CALC = new RegExp( "^([" + basics + mathExp + utils +"|\s])*$");

var CliqzCalculator = {
    CALCULATOR_RES: 0,
    IS_UNIT_CONVERTER: false,
    FLOAT_DEC: 100000,
    UNIT_CONVERT_OPERATORS: ['to', 'in'], // ref.: http://mathjs.org/docs/expressions/syntax.html
                                          //       http://mathjs.org/docs/reference/units.html

    get: function(q){
        if (this.CALCULATOR_RES == null || this.CALCULATOR_RES == q){
          return null;
        } else {
          var expanded_expression = this.IS_UNIT_CONVERTER ? '' : math.parse(q).toString();
          var result_sign = '= ';

          // fix 1feet -> 1foot
          this.CALCULATOR_RES = ' ' + this.CALCULATOR_RES;
          this.CALCULATOR_RES = this.CALCULATOR_RES.replace(' 1 feet', ' 1 foot');
          this.CALCULATOR_RES = this.CALCULATOR_RES.trim();

          // shorten numbers when needed
          try {
              var num, num1, partial;
              partial = this.CALCULATOR_RES.split(' ');

              num1 = parseFloat(partial[0]);
              num = Math.round(num1 * this.FLOAT_DEC)/this.FLOAT_DEC;
              if (num != num1)
                 result_sign = '\u2248 ';

              if (partial.length > 1)
                this.CALCULATOR_RES = num + ' ' + partial[1];
              else
                this.CALCULATOR_RES = num + ''
          }catch(err) {}

           // format number to german style
           this.CALCULATOR_RES = this.CALCULATOR_RES.replace('.',',');

          return Result.cliqzExtra(
                      {
                          url : "",
                          q : q,
                          style: "cliqz-extra",
                          type: "cliqz-extra",
                          subType: JSON.stringify({type:'calculator'}),
                          data:
                          {
                              template:'calculator', //calculator_bck',
                              expression: expanded_expression,
                              answer: this.CALCULATOR_RES,
                              prefix_answer: result_sign,
                              is_calculus: !this.IS_UNIT_CONVERTER,
                              support_copy_ans: true
                          }
                      }
                  );
        }
    },

    isCalculatorSearch: function(q){
        // thuy@cliqz.com
        // Feb2015

        // filter out:
        // + too short query (avoid answering e, pi)
        // + automatically convert for queries like '10cm
        var tmp = q.replace(/ /g,'');  // remove all space
        if (tmp.length <=2) {
            return false;
        }

        try{
            math.unit(tmp);
            return false;
        }
        catch (err){}


        try {
            tmp = q.replace(' zu ', ' to ');
            tmp = tmp.replace(' im ', ' in ');
            tmp = tmp.replace(' into ', ' in ');
            this.CALCULATOR_RES = math.eval(tmp);

            if (typeof(this.CALCULATOR_RES) === 'number') {
                this.IS_UNIT_CONVERTER = false;
                return true
            }
            if (typeof(this.CALCULATOR_RES) === 'object' && this.CALCULATOR_RES.hasOwnProperty('unit')) {
                if (this.CALCULATOR_RES.value === null) {
                    tmp = '1' + tmp;
                    var tmp_CALCULATOR_RES = math.eval(tmp);
                    if (typeof(tmp_CALCULATOR_RES) === 'object' && tmp_CALCULATOR_RES.hasOwnProperty('unit'))
                        this.CALCULATOR_RES = tmp_CALCULATOR_RES;
                    else
                        return false;
                }
                this.IS_UNIT_CONVERTER = true;
                return true
            }
        }
        catch(err) {
            return false
        }
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
