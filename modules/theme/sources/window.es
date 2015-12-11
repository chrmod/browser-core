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
    } else {
      themeUrl = 'chrome://cliqz/content/theme/theme-mac.css';
    }

    CLIQZ.Core.addCSS(document, themeUrl);

    // Change location of forward button
    CLIQZ.Core.frwBtn = document.getElementById('forward-button');
    CLIQZ.Core.urlbarContainer = document.getElementById('urlbar-container');
    CLIQZ.Core.urlbarWrapper = document.getElementById('urlbar-wrapper');
    CLIQZ.Core.urlbarContainer.insertBefore(CLIQZ.Core.frwBtn, CLIQZ.Core.urlbarWrapper);
  }

}
