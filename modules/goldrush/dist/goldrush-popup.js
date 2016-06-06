var attPopUp = document.querySelector(".cqz-goldrush-popup"),
    couponsElements = document.querySelector(".cqz-coupons"),
    hostname;

var couponListTemplate = Handlebars.compile(document.querySelector("#couponListTemplate").innerHTML);

Handlebars.registerHelper('nameCleaner', function(name) {
  return name.replace(/ /g,"-");
});

function setBodyClass(options) {

}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    var elArgs = el.dataset.i18n.split(","),
        key = elArgs.shift();
    el.textContent = chrome.i18n.getMessage(key, elArgs);
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupCouponsData" }, function (couponsMap) {
    alert('callback called');
    /*if (!couponsMap) {
      // nothing to show
      return;
    }
    var toShow = [];
    for (var domainID in couponsMap) {
      if (!couponsMap.hasOwnProperty(domainID)) {
        continue;
      }

      // remap the coupons info we need to show here
      let couponsList = couponsMap[domainID];
      for (let i = 0; i < couponsList.length; ++i) {
        let coupon = couponsList[i];
        toShow.push({
          coupon_link: coupon.redirect_url,
          name: coupon.title,
          price: coupon.price,
          code: coupon.code,
          id: coupon.coupon_id
        });
      }
    }

    // now we add the coupons to the popup if we have
    if (toShow.length > 0) {
      couponsElements.innerHTML = couponListTemplate(toShow);
      expandPopUp('big');
    } else {
      expandPopUp('small');
    }

    localizeDocument();*/
  });
}

/*
enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

whitelistButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleWhiteList", args: {hostname: hostname} }, populateDOM);
}, false);
*/
function expandPopUp (command) {
  var height;

  if(command == 'small') {
    attPopUp.classList.add('cqz-small-popup');
    attPopUp.classList.remove('cqz-big-popup');
  }

  if(command == 'big') {
    attPopUp.classList.remove('cqz-small-popup');
    attPopUp.classList.add('cqz-big-popup');
  }

  height = attPopUp.classList.contains('cqz-big-popup') ? 420 : 240;

  chrome.runtime.sendMessage({
    functionName: "updateHeight",
    args: [ height]
  }, function () {});
}

populateDOM();
//chrome.runtime.sendMessage({ functionName: "telemetry", args: { action: "click", target: "popup", includeUnsafeCount: true } });
