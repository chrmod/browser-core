var messages = {
  "movies": {
    'trans_str': {
      'message': 'movies_confirm_no',
      'yes': 'yes',
      'no': 'show_local_movies'
    }
  },
  "cinemas": {
    'trans_str': {
      'message': 'cinemas_confirm_no',
      'yes': 'yes',
      'no': 'show_local_cinemas'
    }
  },
  "default": {
    'trans_str': {
      'message': 'location_confirm_no',
      'yes': 'yes',
      'no': 'show_local_results'
    }
  }
},
events = {
  click: {
      "cqz_location_yes": function(ev) {
        ev.preventDefault();
        CLIQZEnvironment.setLocationPermission(window, "yes");
        loadLocalResults(ev.target);

      },
      "cqz_location_once": function(ev) {
        ev.preventDefault ();
        loadLocalResults(ev.target);
      },
      "cqz_location_no": function(ev) {
        var container = CLIQZ.Core.popup.cliqzBox.querySelector(".local-sc-data-container"),
            el = ev.target,
            localType = el.getAttribute("local_sc_type") || "default";

        container.innerHTML = CliqzHandlebars.tplCache["partials/missing_location_step_2"]({
            friendly_url: el.getAttribute("bm_url"),
            trans_str: messages[localType].trans_str
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
    var resp,
        container = el,
        r;

    try {
      resp = JSON.parse(req.response);
      CliqzUtils.log(resp, "RH RESPONSE");
    } catch (ex) {
    }
    if (resp && resp.results && resp.results.length > 0) {
      while (container && !CliqzUtils.hasClass(container, "cqz-result-box")) {
        container = container.parentElement;
        if (!container || container.id == "cliqz-results") return;
      }      
      CLIQZ.UI.enhanceResults(resp);
      r = resp.results[0];
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
