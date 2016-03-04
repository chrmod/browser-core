var CliqzFreshTabNews = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/news").default;
var CliqzFreshTab = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/main").default;
var xingNews = CliqzFreshTabNews.getNews();
CliqzFreshTabNews.init();

function log(){
  //console.log(arguments);
}

function closeOnboarding() {
  CliqzFreshTab.cliqzOnboarding = false;
  $('#optinContainer').css('display', 'none')
}

function navigateOnboarding(screen, currentScreenId) {
  var curScreen = $('#screen' + currentScreenId),
      background = $('.optinBackground'),
      allScreens = $('.screen');

    $.each(allScreens, function() {
      $(this).addClass('hidden');
    });

    curScreen.removeClass('hidden');

    telemetry({
      type: "onboarding",
      product: "cliqz",
      action: "click",
      action_target: "navigation",
      action_index: currentScreenId,
      version: "2.0"
    });
}

$(document).ready(function() {

   var urlbar  = CliqzUtils.getWindow().document.getElementById("urlbar"),
      $urlbar = $("#urlbar"),
      cliqzOnboarding = CliqzHandlebars.compile($("#partial-cliqzOnboarding").html());

  document.getElementById('cliqzOnboarding').innerHTML = cliqzOnboarding();

  if(CliqzUtils.getParameterByName('cliqzOnboarding', location) === "1" && !CliqzUtils.hasPref('browserOnboarding')) {
    CliqzUtils.setPref('browserOnboarding', true);

    var onBoardingSliderTpl  = CliqzHandlebars.compile($('#onBoardingNavigation').html());
    $('.onboardingNav').html(onBoardingSliderTpl);

    $('#optinContainer').css('display', 'block');
    telemetry({
      type: "onboarding",
      product: "cliqz",
      action: "show",
      version: "2.0"
    });
  }

  $('.cqz-optin-btn').on('click', function(e) {
    var curScreen = $(this).closest('.screen'),
        currentScreenId = parseInt($(curScreen).attr('id').slice(-1), 10),
        nextScreenId = parseInt(currentScreenId, 10) + 1;
        nextScreen = $('#screen' + nextScreenId),
        background = $('.optinBackground');

    if(currentScreenId === 3) {
      closeOnboarding();
    } else {
      curScreen.addClass('hidden');
      nextScreen.removeClass('hidden');
    }

    if(nextScreenId === 3) {
      background.fadeOut(700, function() {
        background.fadeIn(400);
        $(this).delay(100).toggleClass('transparent').removeClass('bgImage');
      });
    }

    telemetry({
      type: "onboarding",
      product: "cliqz",
      action: "click",
      action_target: "confirm",
      action_index: currentScreenId,
      version: "2.0"
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
      "version": "2.0",
    });
  });

  $('.cliqzLearnMore').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "more",
      "version": "2.0",
    });
  });

  $('.search').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "suggestions",
      "version": "2.0",
    });
  });

  $('.privacy').on('click', function() {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "privacy",
      "version": "2.0",
    });
  });

  $('.homescreen').on('click', function(e) {
    telemetry({
      "type": "onboarding",
      "product": "cliqz",
      "action": "click",
      "action_target": "homescreen",
      "version": "2.0",
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
