var enableButton = document.querySelector("#cqz-antrc-power-btn"),
    whitelistButton = document.querySelector("#cqz-whitelist-btn"),
    hostname;

function setBodyClass(options) {
  var enabled = options.enabled,
      url = options.url,
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
  // If it is enabled and there is no site
  if(!url && enabled) {
     document.body.classList.add("cqz-no-site");
  } else {
    document.body.classList.remove("cqz-no-site");
  }
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    var elArgs = el.dataset.i18n.split(",");
    el.innerHTML = chrome.i18n.getMessage.apply(null, elArgs);
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    hostname = data.url;

    var m = document.querySelector(".cqz-general-msg");
    m.dataset.i18n = [
      m.dataset.i18n,
      data.url || ' ',
      data.cookiesCount,
      data.requestsCount
    ].join(',');


    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted,
      url: data.url
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
