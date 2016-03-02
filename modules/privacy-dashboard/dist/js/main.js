/**
 * thuy@cliqz.com on 25/02/16.
 */

Components.utils.import("chrome://cliqzmodules/content/CliqzHandlebars.jsm");
Components.utils.import("chrome://cliqzmodules/content/CliqzUtils.jsm");
Components.utils.import("chrome://cliqzmodules/content/CliqzEvents.jsm");

CliqzPrivacyRep = CliqzUtils.getWindow().CLIQZ.System.get("privacy-dashboard/main").default;

(function () {
  var TEMPLATE_NAMES = ['data_list'];
  var TEMPLATE_CACHE = {};

  function fetchTemplate(name) {
    var url = "chrome://cliqz/content/privacy-dashboard/template/" + name + ".hbs";
    return new Promise(function (resolve, reject) {
      try {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", url, false);
        xmlHttp.overrideMimeType("text/plain");
        xmlHttp.send(null);
        resolve({ name: name, html: xmlHttp.responseText});
      } catch (err) {
        reject(err);
      }
    });
  }

  function compileTemplate() {
    return Promise.all(TEMPLATE_NAMES.map(fetchTemplate)).then(function (templates) {
      templates.map(function (tpl) {
        TEMPLATE_CACHE[tpl.name] = CliqzHandlebars.compile(tpl.html)
      });
      return Promise.resolve();
    });
  }

  function renderDashboard() {
    var signals = CliqzPrivacyRep.getCurrentData();

    document.getElementById('searchData').innerHTML = TEMPLATE_CACHE["data_list"](signals.ql);
    document.getElementById('telemetryData').innerHTML = TEMPLATE_CACHE["data_list"](signals.tel);
    document.getElementById('humanwebData').innerHTML = TEMPLATE_CACHE["data_list"](signals.hw);
  }

  function init() {
    compileTemplate().then(renderDashboard);
    CliqzPrivacyRep.registerStream();
    CliqzEvents.sub("PRIVACY_DASHBOARD_NEWDATA", onUpdateData);
    window.addEventListener( "unload", onWindowUnload)
  }

  function onUpdateData(sigType) {
    var divID = sigType === "tel" ? "telemetryData" : (sigType === "hw" ? "humanwebData" : "searchData"),
      signals = CliqzPrivacyRep.getCurrentData();
    document.getElementById(divID).innerHTML = TEMPLATE_CACHE["data_list"](signals[sigType]);
  }

  function onWindowUnload() {
    CliqzPrivacyRep.unregisterStream();
  }

  $(document).ready(init);

}());
