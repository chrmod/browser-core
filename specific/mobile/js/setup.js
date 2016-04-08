System.baseURL = "modules/"
CLIQZ.System = System;

function init() {
  CliqzUtils.initPlatform(System);
  try{
    CLIQZEnvironment.initHomepage(true);
    osBridge.isReady();
  } catch(e) {
    console.error(e);
  }
};

window.addEventListener('load', init);
