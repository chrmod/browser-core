window.SCRIPTS = {};
(function () {
  var PARTIALS = [
    "leftnav",
    "layout",
    "optin",
    "notifications-top",
    "views/index",
    "views/results-usage",
    "views/status_info"
  ];

  Components.utils.import('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
  Components.utils.import('chrome://cliqzmodules/content/CliqzHandlebars.jsm');

  function fetchPartial(name) {
    var partialPath = "chrome://cliqz/content/loyalty/partials/";
    var url = partialPath + name + '.html';
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

  function registerPartials() {
    return Promise.all(PARTIALS.map(fetchPartial)).then(function (partials) {
      partials.map(function (partial) {
        CliqzHandlebars.registerPartial(partial.name, partial.html)
      });
      return Promise.resolve();
    });
  }

  function renderLayout() {
    $("body").html(CliqzHandlebars.compile("{{> layout}}")(CliqzLoyalty.getAllStatCurrentTerm()));
    window.SCRIPTS["layout"]();
    return Promise.resolve();
  }

  function renderView(name) {
    if ((window.SCRIPTS[name] || {})["model"]) {  // todo: refactor this code
      window.SCRIPTS[name].model().then(function (data) {
        $(".cqz-loyalty-content").html(CliqzHandlebars.compile("{{> views/" + name + "}}")(data));
        window.SCRIPTS[name]["ready"](data);
      })
    } else {
      $(".cqz-loyalty-content").html(CliqzHandlebars.compile("{{> views/" + name + "}}"));
      window.SCRIPTS[name]["ready"]();
    }

    return Promise.resolve();
  }

  window.renderView = renderView;

  function findViewName() {
    return window.location.hash.split("/")[1] || "index";
  }

  function init() {
    var viewName = findViewName();
    registerPartials().then(function () {
      return renderLayout();
    }).then(function () {
      return renderView(viewName);
    });
  }

  $(document).ready(init);
}());