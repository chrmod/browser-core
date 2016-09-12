import { utils } from 'core/cliqz';

/**
* @namespace hpn
* @class Background
*/
export default {
  /**
  * @method init
  */
  init() {
    var FF41_OR_ABOVE = false;

    try {
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
        .getService(Components.interfaces.nsIXULAppInfo);
      var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
        .getService(Components.interfaces.nsIVersionComparator);

      if(versionChecker.compare(appInfo.version, "41.0") >= 0){
        FF41_OR_ABOVE = true;
      }
    } catch(e){}

    if(FF41_OR_ABOVE && CliqzUtils.getPref("proxyNetwork", true)){
          // We need to use this function, 'load' events do not seem to be firing...
          function waitInitWindow() {
              return new Promise((resolve, reject) => {
                  let _ = () => {
                      if (Services.appShell.hiddenDOMWindow.document.readyState === 'complete') {
                          resolve(Services.appShell.hiddenDOMWindow);
                      } else {
                          CliqzUtils.setTimeout(_, 50);
                      }
                  };
                  _();
              });
          }
          return waitInitWindow()
            .then((w) => {
                // A trick found in http://forums.mozillazine.org/viewtopic.php?f=19&t=256053,
                // haven't found a better way if we want to use hidden window
                var iframe = w.document.createElement('iframe');
                iframe.src = 'chrome://cliqz/content/hpnPeer/content/hiddenWindow.html';
                w.document.documentElement.appendChild(iframe);
                return waitInitWindow(iframe.contentWindow)
            })
            .then(w => {
              utils.importModule("hpn/main").then(CliqzSecureMessage => {
                this.CliqzSecureMessage = CliqzSecureMessage.default;
                this.CliqzSecureMessage.hiddenWindow = w;
                this.CliqzSecureMessage.crypto = w.crypto;
                this.CliqzSecureMessage.init();
              })
            })
    }
  },
  /**
  * @method unload
  */
  unload() {
    if(this.CliqzSecureMessage){
          let hiddenWindow = Services.appShell.hiddenDOMWindow;
          let iframes = hiddenWindow.document.getElementsByTagName('iframe');
          for (let i = 0; i < iframes.length; ++i) {
              if (iframes[i].contentWindow === CliqzSecureMessage.hiddenWindow) {
                  iframes[i].parentElement.removeChild(iframes[i]);
                  break;
              }
          }
      this.CliqzSecureMessage.unload();
    }
  }

};
