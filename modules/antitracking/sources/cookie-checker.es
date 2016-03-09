export function cookieChecker() {
  this.contextFromEvent = null;
}

// from human web
cookieChecker.prototype.setContextFromEvent = function(ev) {
  try {
    var tar = ev.target;
    var found = false;
    var count = 0;
    var def_html = null;

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
        ts: (new Date()).getTime()
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


export function limitedLinks(html) {
  var links = html.split(/https{0,1}:\/\//);
  if (links.length <= 4) {
    return true;
  } else {
    var dms = new Set();
    links = links.slice(1);
    links.forEach(function(e) {
      dms.add(e.split('/')[0]);
    });
    if (dms.length <= 3) {
      return true;
    }
  }
  return false;
};
