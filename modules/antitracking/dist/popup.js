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


    console.log("==== whitelisted", whitelisted)
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    document.querySelector("#cookies-count").innerHTML = data.cookiesCount;
    document.querySelector("#requests-count").innerHTML = data.requestsCount;
    hostname = data.url;
    console.log("==== hostname", hostname)

    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted
    });
  });
}

enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

whitelistButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleWhiteList", args: {hostname: hostname} }, populateDOM);
}, false);

populateDOM();
