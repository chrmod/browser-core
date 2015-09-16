var events = {
  click: {
      "cqz_location_yes": function(ev) {
        ev.preventDefault();
        CLIQZEnvironment.setLocationPermission(window, "yes");
        loadLocalResults(ev.target);

      },
      "cqz_location_once": function(ev) {
        ev.preventDefault();
        loadLocalResults(ev.target);
      },
      "cqz_location_no": function(ev) {
        var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
        var el = ev.target;
        /* Show a message to confirm user"s decision*/
        var confirm_no_id = el.getAttribute("location_confirm_no_msg");
        if (!confirm_no_id) {
            confirm_no_id = "00"; // Default to the generic message
        }
        container.innerHTML = CliqzHandlebars.tplCache["confirm_no_" + confirm_no_id]({
            "friendly_url": el.getAttribute("bm_url")
        });
      },
      "cqz_location_never": function(ev) {
        CLIQZEnvironment.setLocationPermission(window, "no");
        displayMessageForNoPermission();
      },
      "cqz_location_not_now": function(ev) {
        displayMessageForNoPermission();
      },
      "cqz_location_yes_confirm": function(ev) {
        CLIQZEnvironment.setLocationPermission(window, "yes");
        var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
        if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
          "display_msg": "location-thank-you"
        });
      }
  }
};




function loadLocalResults(el) {
  CLIQZ.Core.popup.cliqzBox.querySelector(".location_permission_prompt").classList.add("loading");
  CLIQZEnvironment.getGeo(true, function (loc) {
      CliqzUtils.httpGet(CliqzUtils.RICH_HEADER +
          "&q=" + CLIQZ.Core.urlbar.value +
          CliqzUtils.encodeLocation(true, loc.lat, loc.lng) +
          "&bmresult=" + el.getAttribute("bm_url"),
          handleNewLocalResults(el));
  }, function () {
      failedToLoadResults(el);
      CliqzUtils.log("Unable to get user's location", "CliqzUtils.getGeo");
  });
}


function handleNewLocalResults(el) {
  return function(req) {
    //CliqzUtils.log(req, "RESPONSE FROM RH");
    var resp;
    try {
      resp = JSON.parse(req.response);
      CliqzUtils.log(resp, "RH RESPONSE");
    } catch (ex) {
      failedToLoadResults(el);
      return;
    }
    var container = el;
    /* Find the cqz-result-box container to place the new local content */
    while (container && !CliqzUtils.hasClass(container, "cqz-result-box")) {
      container = container.parentElement;
      if (!container || container.id == "cliqz-results") return;
    }

    if (resp.results && resp.results.length > 0) {
      var r = resp.results[0];
      if(r.data.superTemplate && CliqzUtils.TEMPLATES.hasOwnProperty(r.data.superTemplate)) {
        r.data.template = r.data.superTemplate;
      }
      CLIQZ.UI.enhanceSpecificResult(r.data);
      r.logo = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.url));

      if (container) container.innerHTML = CliqzHandlebars.tplCache[r.data.template](r);
    } else {
      failedToLoadResults(el);
    }
  };
}


function failedToLoadResults(el) {
  var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
  if (el.id === "cqz_location_yes") {
      container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
        "display_msg": "location-sorry"
      });
  } else if (el.id == "cqz_location_once") {
      container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
        "display_msg": "location-permission-ask"
      });
  }
}

function displayMessageForNoPermission() {
  var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container");
  if (container) container.innerHTML = CliqzHandlebars.tplCache["partials/no-locale-data"]({
    "display_msg": "location-no"
  });
}
