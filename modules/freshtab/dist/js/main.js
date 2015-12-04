Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzFreshTabNews.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzFreshTab.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import("resource://gre/modules/Services.jsm");

CliqzFreshTabNews.init();
Components.utils.import("chrome://cliqzmodules/content/CliqzHandlebars.jsm");

function log(){
  //console.log(arguments);
}

$(document).ready(function() {
  var urlbar            = CliqzUtils.getWindow().document.getElementById("urlbar"),
      history           = $('#historySource'),
      styles            = $('link[media=screen]'),
      topNews           = CliqzHandlebars.compile($("#topNews").html()),
      yourNews          = CliqzHandlebars.compile($("#yourNews").html()),
      $urlbar           = $("#urlbar");

  function telemetrySignals() {
    var action = {
      type: CliqzFreshTab.signalType,
      action: 'display',
      tab_index: CliqzUtils.getWindow().gBrowser.tabContainer.selectedIndex
    };
    CliqzUtils.telemetry(action);

    $urlbar.attr("placeholder",urlbar.placeholder).on('keydown', function(){
      urlbar.focus();
      var action = {
        type: CliqzFreshTab.signalType,
        action: 'search_keystroke'
      };
      CliqzUtils.telemetry(action);
    });

    $urlbar.on('focus', function() {
      var action = {
        type: CliqzFreshTab.signalType,
        action: 'search_focus'
      };
      CliqzUtils.telemetry(action);
    });

    $urlbar.on('blur', function() {
      var action = {
        type: CliqzFreshTab.signalType,
        action: 'search_blur'
      };
      CliqzUtils.telemetry(action);
    });
  }

  function getNews() {
    log("Start getting news");
    return CliqzFreshTabNews.getNews().then(function(news) {

      var hb_news = news.hb_news,
          top_news = news.top_h_news;

      if (hb_news) {
        for (var domain in hb_news) {
          hb_news[domain].logo = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(hb_news[domain][0].url))
        }
        log("Personalized news", hb_news)
        document.getElementById('yourNewsBox').innerHTML = yourNews(hb_news);
      } else {
        $('.newsBox').addClass('onlyTopNews');
      }
      log('top news', top_news)
      top_news = top_news.map(function(r){
        return {
          title: r.title,
          short_title: r.short_title,
          displayUrl: CliqzUtils.getDetailsFromUrl(r.url).domain || r.title,
          url: r.url
        }
      });
      document.getElementById('topNewsBox').innerHTML = topNews(top_news);
      $('.topNewsLink').on('click', function() {
        var action = {
          type: CliqzFreshTab.signalType,
          action: 'click',
          target_type: 'topnews',
          target_index: $(this).attr('data-index')
        };
        CliqzUtils.telemetry(action);
      });
    })
    .catch(function(reason) {
      log("CliqzFreshTabNews.getNews exception: " + reason);
    });
  }

  getNews();
  telemetrySignals();

  // show onboarding news for first 24 hours
  var now = Date.now(),
      ONE_MINUTE = 60 * 1000,
      ONE_DAY = 24 * 60 * 60 * 1000,
      PREF_ONBOARDING = 'freshtabOnboarding'

  // set the first start time of freshTab for showing the onboarding
  if (parseInt(CliqzUtils.getPref(PREF_ONBOARDING, '0')) == 0){
    CliqzUtils.setPref(PREF_ONBOARDING, '' + now);
  }

  // if its still within the first day of installation -> show onboarding
  if (parseInt(CliqzUtils.getPref(PREF_ONBOARDING, '0')) +  ONE_DAY > now){
    hideQuestionMark();
    displayFirstTimeOnboarding();
  }

  function displayFirstTimeOnboarding() {
    $('#firstTimeOnboarding')
      .removeClass('hidden')
      .addClass('visible');
  }

  function hideQuestionMark() {
    $('#learnMore')
      .removeClass('visible')
      .addClass('hidden');
  }

  $('.moreBtn').on('click', function(e) {
    var action = {
        type: CliqzFreshTab.signalType,
        action: 'click',
        target_type: 'onboarding_more'
      };
      CliqzUtils.telemetry(action);
  });


  $('.revertBtn').on('click', function(e) {
    e.preventDefault();
    CliqzFreshTab.toggleState();
    var action = {
        type: CliqzFreshTab.signalType,
        action: 'click',
        target_type: 'onboarding_revert'
      };
      CliqzUtils.telemetry(action);
    CliqzUtils.getWindow().CLIQZ.Core.refreshButtons();
    try{
      window.location = 'about:home';
    } catch(e){
      window.location = 'about:blank';
    }
  });

  CliqzUtils.localizeDoc(document);

  $urlbar.on({
    "contextmenu": function(e) {
        console.log("ctx menu button:", e.which);

        // Stop the context menu
        e.preventDefault();
    }
  });
});


