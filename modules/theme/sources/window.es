export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    var CLIQZ = this.window.CLIQZ,
        document = this.window.document,
        themeUrl;

    if(CliqzUtils.isWindows()) {
      themeUrl = 'chrome://cliqz/content/theme/theme-win.css';
    } else if (CliqzUtils.isMac()) {
      themeUrl = 'chrome://cliqz/content/theme/theme-mac.css';
    } else if (CliqzUtils.isLinux()) {
      themeUrl = 'chrome://cliqz/content/theme/theme-linux.css';
    }

    CLIQZ.Core.addCSS(document, themeUrl);

    // Change location of forward button
    CLIQZ.Core.frwBtn = document.getElementById('forward-button');
    CLIQZ.Core.urlbarContainer = document.getElementById('urlbar-container');
    CLIQZ.Core.urlbarWrapper = document.getElementById('urlbar-wrapper');
    CLIQZ.Core.urlbarContainer.insertBefore(CLIQZ.Core.frwBtn, CLIQZ.Core.urlbarWrapper);
  }

}
