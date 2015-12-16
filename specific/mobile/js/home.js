console.log("localStorage", localStorage);
if(localStorage.length == 0) {
  window.addEventListener('load', function() {
    window.document.getElementById('freshstart').innerHTML = 'HELLO';

  });
}
window.addEventListener('load', function() {
  CLIQZEnvironment.getNews();
  osBridge.getTopSites("CLIQZEnvironment.displayTopSites", 5);
});