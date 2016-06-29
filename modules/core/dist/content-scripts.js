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
    },

    "*holidaycheck.de/wbf/*": function(window, send) {
      window.console.log("Holidaycheck");
      window.addEventListener("DOMContentLoaded", onLoad);

      function onLoad() {
        window.console.log("Waiting...");
        window.setTimeout(function() {
          window.console.log("DOMContentLoaded");

          let btns = window.document.getElementsByClassName("js-redeem-coupon");
          window.console.log("elements found: \t", btns);
          if(btns.length > 0) {
            let btn = btns[0];
            btn.addEventListener("click", function() {
              let inputFields = window.document.getElementsByName("coupon_code");
              if(inputFields.length > 0) {
                let inputField = inputFields[0];
                window.console.log("inputfield value: \t", inputField.value);
                send({
                  action: "goldrushEM",
                  args: [{"domain": "holidaycheck", "code": inputField.value}]
              });
              }
            });
        }
        }, 7000);
      }
    },

    "*hotels.com/bookingInitialise*": function(window, send) {
      window.console.log("hotels.com");
      function onLoad() {
          //debugger
        window.console.log("SR-DOMContentLoaded");
        let btn = window.document.getElementById("coupon-code-apply-btn");
        window.console.log("SR-elements\t", btn);
        if(btn) {
          btn.addEventListener("click", function() {
            let inputField = window.document.getElementById("coupon-code-field");
            window.console.log("SR-inputfields\t", inputField);
            if(inputField) {
              send({
                action: "goldrushEM",
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
    }
  };


  // https://developer.chrome.com/extensions/content_scripts#match-patterns-globs
  for (var prop in CONTENT_SCRIPTS) {
    if (CONTENT_SCRIPTS.hasOwnProperty(prop)) {
      if(globsMatch(prop, url)){
        window.console.log("SR-found match:\turl:\t" + url + " prop\t" + prop );
        return CONTENT_SCRIPTS[prop];
      }
    }
  }
};
