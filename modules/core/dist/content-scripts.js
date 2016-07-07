Components.utils.import('resource://gre/modules/Services.jsm');

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
    "*deliveroo.??/??/checkout": function(window, send) {

      function onLoad() {
        let frm = window.document.getElementById("status-form");
        if(frm) {
          frm.addEventListener("submit", function(){
          let couponField = window.document.getElementById("code");
          if(couponField && couponField.value){
            send({
              action: "offersEM",
              args: [{"domain": "deliveroo", "code":couponField.value}]
            })
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
      function onLoad() {
        let elements = window.document.getElementsByClassName("yd-jig-discount-add-check yd-btn-s yd-btn-link");
        if(elements.length > 0) {
          let btn = elements[0];
          btn.addEventListener("click", function() {
            let inputFields = window.document.getElementsByClassName("yd-jig-discount-add-input");
            if(inputFields.length > 0) {
              send({
                action: "offersEM",
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

      function onLoad() {
        let btns = window.document.getElementsByName("check_");
        if(btns.length > 0) {
          let btn = btns[0];
          btn.addEventListener("click", function() {
            let inputField = window.document.getElementById("bonusCode1");
            if(inputField) {
              send({
                action: "offersEM",
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
    },

    "*holidaycheck.de/wbf/*": function(window, send) {
      window.addEventListener("DOMContentLoaded", onLoad);

      function onLoad() {
        window.setTimeout(function() {
          let btns = window.document.getElementsByClassName("js-redeem-coupon");
          if(btns.length > 0) {
            let btn = btns[0];
            btn.addEventListener("click", function() {
              let inputFields = window.document.getElementsByName("coupon_code");
              if(inputFields.length > 0) {
                let inputField = inputFields[0];
                send({
                  action: "offersEM",
                  args: [{"domain": "holidaycheck", "code": inputField.value}]
              });
              }
            });
          }
        }, 7000);
      }
    },

    "*hotels.com/bookingInitialise*": function(window, send) {
      function onLoad() {
          //debugger
        let btn = window.document.getElementById("coupon-code-apply-btn");
        if(btn) {
          btn.addEventListener("click", function() {
            let inputField = window.document.getElementById("coupon-code-field");
            if(inputField) {
              send({
                action: "offersEM",
                args: [{"domain": "hotels", "code": inputField.value}]
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

    "*reisen.de/*/booking/booking*": function(window, send) {

      function onLoad() {
        window.setTimeout(function() {
          let btn = window.document.getElementById("submitbutton");
          btn && btn.addEventListener("click", function(){
            let couponField = window.document.getElementById("customerCouponCode");
            if(couponField && couponField.value) {
              send({
                  action: "offersEM",
                  args: [{"domain": "reisen", "code": couponField.value}]
                });
            }
          });
        }, 2000);
      }

      window.addEventListener("DOMContentLoaded", onLoad);
    }
  };


  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  const branch = Services.prefs.getBranch("");
  const prefType = branch.getPrefType("extensions.cliqz.grFeatureEnabled");
  if (prefType === branch.PREF_BOOL &&
      Services.prefs.getBranch("").getBoolPref("extensions.cliqz.grFeatureEnabled")) {
    for (var prop in CONTENT_SCRIPTS) {
      if (CONTENT_SCRIPTS.hasOwnProperty(prop)) {
        if(globsMatch(prop, url)){
          return CONTENT_SCRIPTS[prop];
        }
      }
    }
  }


};
