function init() {
  CLIQZEnvironment.getNews();
  osBridge.getTopSites("CLIQZEnvironment.displayTopSites", 5);
};

window.addEventListener('load', init);

CliqzUtils.getLocalStorage = function(url) {
    return localStorage;
}