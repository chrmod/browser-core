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
function wildcardMatch(find, source) {
    find = find.replace(/[\-\[\]\/\{\}\(\)\+\.\\\^\$\|]/g, "\\$&");
    find = find.replace(/\*/g, ".*");
    find = find.replace(/\?/g, ".");
    var regEx = new RegExp(find, "i");
    return regEx.test(source);
}

var getContentScript = function (window, url) {
  var CONTENT_SCRIPTS = {
    "https://cliqz.com/": function (window, send) {
      window.console.log("Hello World!!!!")
      function onLoad() {
        window.console.log("LOADED 2!!!!");
        send({
          action: "recordCoupon",
          args: ["XYZ"]
        })
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      window.addEventListener("unload", function () {
        window.removeEventListener("DOMContentLoaded", onLoad);
      });
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
                args: [1]
              })
            }
          }
        });
        }
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      window.addEventListener("unload", function () {
        window.removeEventListener("DOMContentLoaded", onUnload);
      });
    },

    "*lieferando.de/*": function(window, send) {
      window.console.log("Lieferando");
      function onLoad() {
        window.console.log("SR-DOMContentLoadedLoaded");
        let elements = window.document.getElementsByClassName("yd-jig-discount-add-check yd-btn-s yd-btn-link");
        if(elements.length > 0) {
          let btn = elements[0];
          btn.addEventListener("click", function() {
            let couponField = window.document.getElementsByClassName("yd-jig-discount-add-input");
            if(couponField){
              window.console.log("content of couponField:\t" + couponField.value);
              if(couponField.value) {
                send({
                  action: "goldrushEM",
                  args: [1]
                })
              }
            }
          });
        }
      }

      window.addEventListener("DOMContentLoaded", onLoad);

      window.addEventListener("unload", function () {
        window.removeEventListener("DOMContentLoaded", onUnload);
      });
    },

    "*holidaycheck.de/bookingtt*": function(window, send) {
      window.console.log("Holidaycheck");
      function onLoad() {
        window.console.log("SR-DOMContentLoadedLoaded");

        let btn = window.document.getElementsByName("check_");
        window.console.log("SR-btn: \t" + JSON.stringify(btn));
        if(btn) {
          btn.addEventListener("click", function(){
          let couponField = window.document.getElementById("bonusCode1");
          if(couponField){
            window.console.log("content of couponField:\t" + couponField.value);
            if(couponField.value) {
              send({
                action: "goldrushEM",
                args: [1]
              })
            }
          }
        });
        }
      }
      window.addEventListener("DOMContentLoaded", onLoad);

      window.addEventListener("unload", function () {
        window.removeEventListener("DOMContentLoaded", onUnload);
      });
    }
  };



  // TODO: find proper content scrip using glob pattern specification
  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  for (var prop in CONTENT_SCRIPTS) {
    if (CONTENT_SCRIPTS.hasOwnProperty(prop)) {
    // or if (Object.prototype.hasOwnProperty.call(obj,prop)) for safety...
      if(wildcardMatch(prop, url)){
        window.console.log("SR-found match:\turl:\t" + url + " prop\t" + prop );
        return CONTENT_SCRIPTS[prop];
      }
    }
  }
  // return CONTENT_SCRIPTS[url];
};
