import { URLInfo } from 'antitracking/url';
import { getGeneralDomain } from 'antitracking/domain';

export function cookieChecker() {
  this.contextFromEvent = null;
}

// from human web
cookieChecker.prototype.setContextFromEvent = function(ev) {
  try {
    var tar = ev.target,
        found = false,
        count = 0,
        def_html = null,
        gDM = getGeneralDomain(URLInfo.get(tar.baseURI).hostname);

    while(!found) {
      var html = tar.innerHTML;

      if (html.indexOf('http://')!=-1 || html.indexOf('https://')!=-1) {
        found = true;
        def_html = html;
        break;
      }

      tar = tar.parentNode;
      count++;
      if (count > 4) break;
    }

    if (found && def_html) {
      this.contextFromEvent = {
        html: def_html,
        ts: (new Date()).getTime(),
        gDM: gDM
      };
    }
  }
  catch(ee) {
    this.contextFromEvent = null;
  }
};

cookieChecker.prototype.addListeners = function(win) {
  win.gBrowser.addEventListener('mousedown', this.setContextFromEvent.bind(this), true);
};

cookieChecker.prototype.removeListeners = function(win) {
  win.gBrowser.removeEventListener('mousedown', this.setContextFromEvent, true);
};