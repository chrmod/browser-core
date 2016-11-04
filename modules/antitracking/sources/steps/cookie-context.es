import { getGeneralDomain } from 'antitracking/domain';
import { URLInfo } from 'antitracking/url';
import { utils } from 'core/cliqz';
import { cleanTimestampCache } from 'antitracking/utils';
import pacemaker from 'antitracking/pacemaker';

// moved from cookie-checker
function currentGD() {
  const currwin = utils.getWindow();
  let gd = null;
  if (currwin && currwin.gBrowser) {
    const url = currwin.gBrowser.selectedBrowser.currentURI.spec;
    gd = getGeneralDomain(URLInfo.get(url).hostname);
  }
  return gd;
}

export default class {
  constructor() {
    this.visitCache = {};
    this.contextFromEvent = null;
    this.timeAfterLink = 5*1000;
    this.timeCleaningCache = 180*1000;
    this.timeActive = 20*1000;
  }

  init() {
    this._pmclean = pacemaker.register(function clean_caches(currTime) {
      // visit cache
      cleanTimestampCache(this.visitCache, this.timeCleaningCache, currTime);
    }.bind(this), 2 * 60 * 1000);
  }

  unload() {
    pacemaker.deregister(this._pmclean);
  }

  checkVisitCache(state) {
    state.hostGD = getGeneralDomain(state.urlParts.hostname);
    state.sourceGD = getGeneralDomain(state.sourceUrlParts.hostname);
    const diff = Date.now() - (this.visitCache[state.hostGD] || 0);
    if (diff < this.timeActive && this.visitCache[state.sourceGD]) {
      state.incrementStat('cookie_allow_visitcache');
      return false;
    }
    return true;
  }

  checkContextFromEvent(state) {
    if (this.contextFromEvent) {
      const time = Date.now();
      const url = state.url;

      var diff = time - (this.contextFromEvent.ts || 0);
      if (diff < this.timeAfterLink) {

          const hostGD = getGeneralDomain(state.urlParts.hostname);
          if (hostGD === this.contextFromEvent.cGD) {
              this.visitCache[state.hostGD] = time;
              var src = null;
              state.incrementStat('cookie_allow_userinit_same_context_gd');
              return false;
          }
          var pu = url.split(/[?&;]/)[0];
          if (this.contextFromEvent.html.indexOf(pu)!=-1) {
              // the url is in pu
              if (url_parts && url_parts.hostname && url_parts.hostname!='') {
                  this.visitCache[state.hostGD] = time;
                  state.incrementStat('cookie_allow_userinit_same_gd_link');
                  return false;
              }
          }
      }
    }
    return true;
  }

  setContextFromEvent(ev, contextHTML) {
    try {
      if (contextHTML) {
        // don't log the event if it's not 3rd party
        const cGD = getGeneralDomain(URLInfo.get(ev.target.baseURI).hostname);
        const pageGD = currentGD();
        if (!pageGD || cGD === pageGD) {
          return;
        }
        this.contextFromEvent = {
          html: contextHTML,
          ts: Date.now(),
          cGD,
          pageGD,
        };
      }
    } catch (ee) {
      this.contextFromEvent = null;
    }
  }
}