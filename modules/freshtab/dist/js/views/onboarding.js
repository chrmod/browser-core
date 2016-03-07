var CliqzFreshTab = CliqzUtils.getWindow().CLIQZ.System.get("freshtab/main").default;

function renderOnboarding() {
  var now = Date.now(),
      ONE_MINUTE = 60 * 1000,
      ONE_DAY = 24 * 60 * 60 * 1000,
      PREF_ONBOARDING = 'freshtabOnboarding',
      onboarding = CliqzHandlebars.compile($("#partial-onboarding").html());

  document.getElementById('onboarding').innerHTML = onboarding();

  var isUserFirstTimeAtFreshTab = parseInt(CliqzUtils.getPref(PREF_ONBOARDING, '0')) === 0;
  if (isUserFirstTimeAtFreshTab){
    CliqzUtils.setPref(PREF_ONBOARDING, '' + now);
  }

  if (CliqzFreshTab.isBrowser) {
    $('.revertBtn').css('display', 'none');
  }

  var isFirstDayAfterInstallation = parseInt(CliqzUtils.getPref(PREF_ONBOARDING, '0')) +  ONE_DAY > now;
  if (isFirstDayAfterInstallation) {
    $('#learnMore').removeClass('visible')
                   .addClass('hidden');
    $('#firstTimeOnboarding').removeClass('hidden')
                             .addClass('visible');
  }

  $('.moreBtn').on('click', function(e) {
    telemetry({
      action: 'click',
      target_type: 'onboarding_more'
    });
  });

  $('.revertBtn').on('click', function(e) {
    e.preventDefault();

    CliqzFreshTab.toggleState();
    CliqzUtils.getWindow().CLIQZ.Core.refreshButtons();

    telemetry({
      action: 'click',
      target_type: 'onboarding_revert'
    });

    try{
      window.location = 'about:home';
    } catch(e){
      window.location = 'about:blank';
    }
  });
}
