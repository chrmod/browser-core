var attPopUp = document.querySelector(".cqz-antitracking-popup"),
    enableButton = document.querySelector("#cqz-antrc-power-btn"),
    whitelistButton = document.querySelector("#cqz-whitelist-btn"),
    seeDetailsButton = document.querySelector("#cqz-see-details"),
    trackersListElement = document.querySelector(".cqz-trackers-blocked"),
    hostname;

function setBodyClass(options) {
  if (options.enabled) {
    document.body.classList.add("cqz-attrack-enabled");
    document.body.classList.remove("cqz-attrack-disabled");
  } else {
    document.body.classList.add("cqz-attrack-disabled");
    document.body.classList.remove("cqz-attrack-enabled");
  }

  if (options.whitelisted) {
    document.body.classList.add("cqz-domain-in-whitelist");
  } else {
    document.body.classList.remove("cqz-domain-in-whitelist");
  }

  // If ATT enabled and there is no site
  if (!options.url && options.enabled) {
    document.body.classList.add("cqz-no-site");
  } else {
    document.body.classList.remove("cqz-no-site");
  }

  //If thare are ANY tracker
  if (!options.have_trackers) {
    document.body.classList.add("cqz-have-no-trackers");
  } else {
    document.body.classList.remove("cqz-have-no-trackers");
  }

  //If thare are BAD tracker
  if (options.have_bad_trackers) {
    document.body.classList.add("cqz-have-bad-trackers");
  } else {
    document.body.classList.remove("cqz-have-bad-trackers");
  }

  //If thare are NO BAD tracker
  if (options.have_trackers && !options.have_bad_trackers) {
    document.body.classList.add("cqz-have-no-bad-trackers");
  } else {
    document.body.classList.remove("cqz-have-no-bad-trackers");
  }

  // Turn on - off fix
  if( options.reload ) {
    document.body.classList.add("cqz-att-reload");
  } else {
    document.body.classList.remove("cqz-att-reload");
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
    var have_bad_trackers_bool = general_trackers_count > 0;
    var have_any_trackers_bool = Object.keys(data.trakersList.trackers).length > 0;

    ////Display Trackers list
    var counterTrackers = 0;
    if(general_trackers_count > 0 && data.trakersList && data.trakersList.trackers ) {
      var trackL = data.trakersList.trackers;

      //Populate Tracking List
      trackersListElement.innerHTML = "";
      for (var key in trackL) {
        var trackerCount = (trackL[key].cookie_blocked || 0) + (trackL[key].bad_qs || 0)
        if(trackerCount > 0) {
          trackersListElement.innerHTML += "" +
            "<li>" +
                "<span class='cqz-title'> "  + key  + "</span>" +
                "<span  class='cqz-number'><i>"  + trackerCount + "</i></span>"
            "</li>";

          counterTrackers++;
        }
      }

      expandPopUp('big');
    } else {
      expandPopUp('small');
    }

    document.querySelector(".cqz-general-domain-msg").innerHTML = data.url;
    general_msg_trnsl.dataset.i18n = [
      general_msg_trnsl.dataset.i18n,
      counterTrackers,
      general_trackers_count
    ].join(',');

    //Check if site is in the whitelist
    if(data.isWhitelisted) {
      whitelistButton.style.display = "block"
    }

    setBodyClass({
      enabled: data.enabled,
      whitelisted: data.isWhitelisted,
      url: data.url,
      reload: data.reload,
      have_bad_trackers: have_bad_trackers_bool,
      have_trackers: have_any_trackers_bool
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

  height = attPopUp.classList.contains('cqz-big-popup') ? 510 : 240;

  chrome.runtime.sendMessage({
    functionName: "updateHeight",
    args: [ height]
  }, function () {});
}

populateDOM();
