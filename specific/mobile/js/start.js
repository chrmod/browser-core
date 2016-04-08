System.import("mobile-ui/UI").then(function(UI){
  window.CLIQZ.UI = UI.default;
  window.CLIQZ.UI.init();
})

// search entry point
function search_mobile(e, location_enabled, latitude, longitude) {
  CLIQZEnvironment.search(e, location_enabled, latitude, longitude);
}
