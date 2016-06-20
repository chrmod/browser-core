//Explanation code
function matchRuleExpl(str, rule) {
  // "."  => Find a single character, except newline or line terminator
  // ".*" => Matches any string that contains zero or more characters
  rule = rule.split("*").join(".*");

  // "^"  => Matches any string with the following at the beginning of it
  // "$"  => Matches any string with that in front at the end of it
  rule = "^" + rule + "$"

  //Create a regular expression object for matching string
  var regex = new RegExp(rule);

  //Returns true if it finds a match, otherwise it returns false
  return regex.test(str);
}

// http://www.rlvision.com/blog/using-wildcard-matching-in-any-programming-language/
function globsMatch(find, source) {
    find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
    find = find.replace(/\*/g, ".*");
    find = find.replace(/\?/g, ".");
    var regEx = new RegExp(find, "i");
    return regEx.test(source);
}


////////////////////////////////////////////////////////////////////////////////
//
// @brief this method should be called everytime we change the url so we can
//        track if a coupon has been used or not. Basically here we will need
//        to check the content of the page and trigger an event when a button of
//        the checkout form is being used and analyze the content to search for
//        the associated coupon ID.
//
var getContentScript = function (window, url) {
  var CONTENT_SCRIPTS = {
    "*cliqz.com/??": function (window, send) {
      window.console.log("Hello World!!!!")
      function onLoad() {
        window.console.log("LOADED 2!!!!");
        send({
          action: "recordCoupon",
          args: ["XYZ"]
        })
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      // window.addEventListener("unload", function () {
      //   window.removeEventListener("DOMContentLoaded", onLoad);
      // });
    },

    "*deliveroo.??/??/checkout": function(window, send) {
      window.console.log("Deliveroo");
      function onLoad() {
        window.console.log("SR-DOMContentLoadedLoaded");

        let frm = window.document.getElementById("status-form");
        if(frm) {
          frm.addEventListener("submit", function(){
          let couponField = window.document.getElementById("code");
          if(couponField){
            window.console.log("content of couponField:\t" + couponField.value);
            if(couponField.value) {
              send({
                action: "goldrushEM",
                args: [{"domain": "deliveroo", "code":couponField.value}]
              })
            }
          }
        });
        }
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      // window.addEventListener("unload", function () {
      //   window.removeEventListener("DOMContentLoaded", onUnload);
      // });
    },

    "*lieferando.de/*": function(window, send) {
      window.console.log("Lieferando");
      function onLoad() {
        window.console.log("SR-DOMContentLoaded");
        let elements = window.document.getElementsByClassName("yd-jig-discount-add-check yd-btn-s yd-btn-link");
        window.console.log("SR-elements\t", elements);
        if(elements.length > 0) {
          let btn = elements[0];
          btn.addEventListener("click", function() {
            let inputFields = window.document.getElementsByClassName("yd-jig-discount-add-input");
            window.console.log("SR-inputfields\t", inputFields);
            if(inputFields.length > 0) {
              send({
                action: "goldrushEM",
                args: [{"domain": "lieferando", "code": inputFields[0].value}]
              });
            }
          });
        }
      }

      window.addEventListener("DOMContentLoaded", onLoad);

      // window.addEventListener("unload", function () {
      //   window.removeEventListener("DOMContentLoaded", onUnload);
      // });
    },

    "*holidaycheck.de/bookingtt.html": function(window, send) {
      window.console.log("Holidaycheck");
      function onLoad() {
          //debugger
        window.console.log("SR-DOMContentLoaded");
        let btns = window.document.getElementsByName("check_");
        window.console.log("SR-elements\t", btns);
        if(btns.length > 0) {
          let btn = btns[0];
          btn.addEventListener("click", function() {
            let inputField = window.document.getElementById("bonusCode1");
            window.console.log("SR-inputfields\t", inputField);
            if(inputField) {
              send({
                action: "goldrushEM",
                args: [{"domain": "holidaycheck", "code": inputField.value}]
              });
            }
          });
        }
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      // window.addEventListener("unload", function () {
      //   window.removeEventListener("DOMContentLoaded", onUnload);
      // });
    }
  };


  // TODO: find proper content scrip using glob pattern specification
  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  for (var prop in CONTENT_SCRIPTS) {
    if (CONTENT_SCRIPTS.hasOwnProperty(prop)) {
    // or if (Object.prototype.hasOwnProperty.call(obj,prop)) for safety...
      if(globsMatch(prop, url)){
        window.console.log("SR-found match:\turl:\t" + url + " prop\t" + prop );
        return CONTENT_SCRIPTS[prop];
      }
    }
  }
  // return CONTENT_SCRIPTS[url];
};
