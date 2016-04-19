CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}

CliqzUtils.initPlatform(System);
CliqzUtils.init(window);

System.import("core/startup").then(function (startupModule) {
  return startupModule.default(window, [
    "core",
    "mobile-ui",
    "mobile-dev",
    "mobile-freshtab",
    "static"
  ]);
}).then(function () {
  osAPI.init();
  CLIQZEnvironment.initHomepage(true);
});
