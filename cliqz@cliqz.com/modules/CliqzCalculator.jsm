
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('chrome://cliqzmodules/content/Result.jsm');
Cu.import('chrome://cliqzmodules/content/extern/math.min.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCalculator'];

var CliqzCalculator = {

    get: function(q, callback){
        var mathRes = null;
        try {
          mathRes = math.eval(q);
        }
        catch(err){
        }
        
        if (mathRes == null || mathRes == q){
          callback([], q);
        } else {
          var result = Result.cliqzExtra(
                      {
                          url : "",
                          q : q,
                          data:
                          {
                              template:'calculator',
                              expression: q,
                              answer: math.eval(q),
                          }
                      }
                  );
          callback([result], q);
        }
    },

    isCalculatorSearch: function(q){
      var basics = "[\\\(\\)\\+\\/\\*\\%\\^\\-\\.\\s0123456789]";
      var utils = "|km|cm|meter|mm|m|inch|inches|foot|yard|mile|gr|rad|grad|celsius|fahrenheit|kelvin|to";
      var math = "|log|exp|sin|cos|tan|asin|acos|atan|sqrt|log|abs|ceil|floor|round|exp";
      var reg = new RegExp( "^([" + basics + math + utils +"|\s])*$"  );

      return reg.test(q)
    },

    isSame: function(suggestion, answer){
      if (answer == null || suggestion == null){
        return false;
      }

      suggestion = suggestion.toString().trim().lower().split(" ")[0];
      answer = answer.toString().trim().lower().split(" ")[0];

      // google start showing in E notation after 10^10, we show after 10^21
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
