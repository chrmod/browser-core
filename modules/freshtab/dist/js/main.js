var CliqzFreshTabNews = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/news").default;
var CliqzFreshTab = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/main").default;
var xingNews = CliqzFreshTabNews.getNews();
CliqzFreshTabNews.init();

function log(){
  //console.log(arguments);
}

$(document).ready(function() {

   var urlbar  = CliqzUtils.getWindow().document.getElementById("urlbar"),
      $urlbar = $("#urlbar"),
      cliqzOnboarding = CliqzHandlebars.compile($("#partial-cliqzOnboarding").html());

  document.getElementById('cliqzOnboarding').innerHTML = cliqzOnboarding();

  if(CliqzUtils.getParameterByName('cliqzOnboarding', location) === "1" && !CliqzUtils.hasPref('browserOnboarding')) {
    CliqzUtils.setPref('browserOnboarding', true);
    $('#optinContainer').css('display', 'block');
    telemetry({
      type: "onboarding",
      product: "cliqz",
      action: "show",
      version: "1.0"
    });
  }

  $('.cqz-optin-btn').on('click', function() {
    CliqzFreshTab.cliqzOnboarding = false;
    $('#optinContainer').css('display', 'none');
    telemetry({
      type: "onboarding",
      product: "cliqz",
      action: "click",
      action_target: "confirm",
      version: "1.0"
    });
  });

  $('.fullTour').on('click', function(e) {
    e.preventDefault();

    var onboardingWindow = CliqzUtils.getWindow().CLIQZ.System.get("onboarding/window").default;
    new onboardingWindow({settings: {}, window: CliqzUtils.getWindow()}).fullTour();

    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "tour",
      "version": 1.0,
    });
  });

  $('.cliqzLearnMore').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "more",
      "version": 1.0,
    });
  });

  $('.suggestions').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "suggestions",
      "version": 1.0,
    });
  });

  $('.privacy').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "privacy",
      "version": 1.0,
    });
  });

  var dialUps = History.getTopUrls(5).then(function(results){
    renderDialUps(results);
    return results;
  }).catch(function(results){
    console.log('err', arguments);
  });

  var news = xingNews.then(function(news){
    log("Start getting news");
    renderNews(news);
    return news;
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

  Promise.all([dialUps, news]).then(function (values) {
    var hbNews = [];
    if(values[1] && values[1].hb_news) {
      Object.keys(values[1].hb_news).forEach(function(key) {
        hbNews.push(values[1].hb_news[key].length);
      });
    }

    telemetry({
      action: 'display',
      tab_index: CliqzUtils.getWindow().gBrowser.tabContainer.selectedIndex,
      topsites: values[0] && values[0].length || 0,
      topnews: values[1] && values[1].top_h_news.length || 0,
      topnews_version: values[1] && values[1].top_news_version || 0,
      yournews:  hbNews
    });

    CliqzUtils.localizeDoc(document);
  })
});
