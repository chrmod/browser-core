System.import("mobile-ui/UI").then(function(UI){
  window.CLIQZ.UI = UI.default;
  window.CLIQZ.UI.init();
})

/* APIs for native */
// TODO: move into a different file

// search entry point
function search_mobile(e, location_enabled, latitude, longitude) {
  CLIQZEnvironment.search(e, location_enabled, latitude, longitude);
}

function setDefaultSearchEngine(engine) {
  CLIQZEnvironment.setDefaultSearchEngine(engine);
}

function getCardUrl() {
  var NOT_SHAREABLE_SIGNAL = '-1';
  if(CLIQZEnvironment.lastResults && CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage]) {
    osBridge.shareCard(CLIQZEnvironment.lastResults[CLIQZEnvironment.currentPage].url || NOT_SHAREABLE_SIGNAL);
  } else {
    osBridge.shareCard(NOT_SHAREABLE_SIGNAL);
  }
};
