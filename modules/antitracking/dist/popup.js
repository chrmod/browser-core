var enableButton = document.querySelector("#cqz-attrack-enable");

function setBodyClass(options) {
  var enabled = options.enabled;

  if (enabled) {
    document.body.classList.add("cqz-attrack-enabled");
  } else {
    document.body.classList.remove("cqz-attrack-enabled");
  }
}

function localizeDocument() {
  Array.prototype.forEach.call(document.querySelectorAll("[data-i18n]"), el => {
    el.innerHTML = chrome.i18n.getMessage(el.dataset.i18n);
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    document.querySelector("#cookies-count").innerHTML = data.cookiesCount;
    document.querySelector("#requests-count").innerHTML = data.requestsCount;
    document.querySelector("#url").innerHTML = data.url;

    setBodyClass({
      enabled: data.enabled
    });

    localizeDocument();
  });
}

enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

populateDOM();
