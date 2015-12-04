//opens tutorial page on first install or at reinstall if reinstall is done through onboarding
window.CLIQZ.COMPONENTS.push({

  name: "onboarding",

  version: "1.1",

  _tutorialTimeout: null,

  init: function (settings) {
    var tutorialUrl, tutorialVersion;
    var showNewOnboarding = isVersionHigherThan("36.0");

    if (showNewOnboarding) {
      tutorialUrl = modulePath(this.name, "onboarding.html");
      tutorialVersion = this.version; //CliqzTour.VERSION;
    } else {
      tutorialUrl = CliqzUtils.TUTORIAL_URL;
      tutorialVersion = "0.0"
    }

    CliqzUtils.setPref('onboarding_versionShown', tutorialVersion);
    CliqzUtils.setPref('onboarding_finishedWatching', false);

    if (!settings.onInstall) { return; }

    this._tutorialTimeout = setTimeout(function() {
      openTab(tutorialUrl);
    }, 100);
  },

  unload: function () {
    clearTimeout(this._tutorialTimeout);
  },

  button: function () { },
});
