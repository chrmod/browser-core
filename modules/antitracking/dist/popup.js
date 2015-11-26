var enableButton = document.querySelector("#cqz-antrc-power-btn"),
    whitelistButton = document.querySelector("#cqz-whitelist-btn"),
    hostname;

function setBodyClass(options) {
  var enabled = options.enabled,
      whitelisted = options.whitelisted;

  if (enabled) {
    document.body.classList.add("cqz-attrack-enabled");
    document.body.classList.remove("cqz-attrack-disabled");
  } else {
    document.body.classList.add("cqz-attrack-disabled");
    document.body.classList.remove("cqz-attrack-enabled");
  }

  if (whitelisted) {
    document.body.classList.add("cqz-domain-in-whitelist");
  } else {
    document.body.classList.remove("cqz-domain-in-whitelist");
  }
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    if(el.dataset.i18n.indexOf(',') != -1) {
      var elArgs = el.dataset.i18n.split(",");
      console.log(elArgs);
      el.innerHTML = chrome.i18n.getMessage.apply(null, arguments);
    }else {
      el.innerHTML = chrome.i18n.getMessage(el.dataset.i18n);
    }
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    document.querySelector("#cookies-count").innerHTML = data.cookiesCount;
    document.querySelector("#requests-count").innerHTML = data.requestsCount;
    hostname = data.url;
    document.querySelector("#url").innerHTML = data.url;

    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted
    });

    localizeDocument();
  });
}

enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

whitelistButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleWhiteList", args: {hostname: hostname} }, populateDOM);
}, false);

populateDOM();
