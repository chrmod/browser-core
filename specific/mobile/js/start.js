System.baseURL = "modules/"
CLIQZ.System = System;

System.import("mobile-ui/UI").then(function(UI){
  window.CLIQZ.UI = UI.default
})
