var CliqzFreshTabNews = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/news").default;
var xingNews = CliqzFreshTabNews.getNews();
CliqzFreshTabNews.init();

function log(){
  //console.log(arguments);
}

$(document).ready(function() {

  var urlbar  = CliqzUtils.getWindow().document.getElementById("urlbar"),
      $urlbar = $("#urlbar");

  telemetry({
    action: 'display',
    tab_index: CliqzUtils.getWindow().gBrowser.tabContainer.selectedIndex
  });

  var dialUps = History.getTopUrls(5).then(function(results){
    renderDialUps(results);
  }).catch(function(results){
    console.log('err', arguments);
  });

  var news = xingNews.then(function(news){
    log("Start getting news");
    renderNews(news);
  }).catch(function(reason) {
    log("CliqzFreshTabNews.getNews exception: " + reason);
  });

  renderOnboarding();

  $urlbar.attr("placeholder", urlbar.placeholder);

  $urlbar.on('keydown', function(){
    urlbar.focus();
    telemetry({
      action: 'search_keystroke'
    });
  });

  $urlbar.on('focus', function() {
    telemetry({
      action: 'search_focus'
    });
  });

  $urlbar.on('blur', function() {
    telemetry({
      action: 'search_blur'
    });
  });

  $urlbar.on("contextmenu", function(e) {
    // Stop the context menu
    e.preventDefault();
  });

  Promise.all([news, dialUps]).then(function () {
    CliqzUtils.localizeDoc(document);
  })
});
