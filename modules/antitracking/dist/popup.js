var attPopUp = document.querySelector(".cqz-antitracking-popup"),
    enableButton = document.querySelector("#cqz-antrc-power-btn"),
    whitelistButton = document.querySelector("#cqz-whitelist-btn"),
    seeDetailsButton = document.querySelector("#cqz-see-details"),
    trackersListElement = document.querySelector(".cqz-trackers-blocked"),
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
    var elArgs = el.dataset.i18n.split(","),
        key = elArgs.shift();
    el.innerHTML = chrome.i18n.getMessage(key, elArgs);
  });
}

function populateDOM() {
  chrome.runtime.sendMessage({ functionName: "getPopupData" }, function (data) {
    hostname = data.url;

    var general_msg_trnsl = document.querySelector(".cqz-general-trackers-msg");
    var general_trackers_count = data.cookiesCount + data.requestsCount;

    document.querySelector(".cqz-general-domain-msg").innerHTML = data.url;

    general_msg_trnsl.dataset.i18n = [
      general_msg_trnsl.dataset.i18n,
      general_trackers_count
    ].join(',');


    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted,
      url: data.url
    });

    if(general_trackers_count > 0 && data.trakersList && data.trakersList.trackers ) {
      var trackL = data.trakersList.trackers;
      whitelistButton.style.display = "block"
      seeDetailsButton.style.display = "block";

      for (var key in trackL) {
        var trackerCount = trackL[key].cookie_blocked + trackL[key].bad_qs
        if(trackerCount > 0) {
          trackersListElement.innerHTML += "<li>" +
              "<span class='cqz-title'> "  + key  + "</span>" +
              "<span  class='cqz-number'>("  + trackerCount + ")</span>"
          "</li>"
        }
      }
    }else {
      whitelistButton.style.display = "none"
      seeDetailsButton.style.display = "none"
    }

    //Check if site is in the whitelist
    if(data.isWhitelisted) {
      whitelistButton.style.display = "block"
    }

    expandPopUp('reset');
    localizeDocument();
  });
}

enableButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleAttrack" }, populateDOM);
}, false);

seeDetailsButton.addEventListener("click", function () {
  expandPopUp('toggle');
}, false);

whitelistButton.addEventListener("click", function () {
  chrome.runtime.sendMessage({ functionName: "toggleWhiteList", args: {hostname: hostname} }, populateDOM);
}, false);

function expandPopUp (command) {
  var height;

  if(command == 'reset') {
    height = 200;
    attPopUp.classList.remove('cqz-show-details');
  } else {
    attPopUp.classList.toggle('cqz-show-details');
    height = attPopUp.classList.contains('cqz-show-details') ? 485 : 200;
  }

  chrome.runtime.sendMessage({
    functionName: "updateHeight",
    args: [ height]
  }, function () {});
}

populateDOM();
