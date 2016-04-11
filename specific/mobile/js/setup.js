System.baseURL = "modules/"
CLIQZ.System = System;

function init() {
  CliqzUtils.initPlatform(System);
  try{
    
  } catch(e) {
    console.error(e);
  }
};

window.addEventListener('load', init);
