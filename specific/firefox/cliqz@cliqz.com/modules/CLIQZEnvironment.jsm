'use strict';
var EXPORTED_SYMBOLS = ['CLIQZEnvironment'];
const {
  classes:    Cc,
  interfaces: Ci,
  utils:      Cu,
  manager:    Cm
} = Components;

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/NewTabUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var GEOLOC_WATCH_ID;

var _log = Cc['@mozilla.org/consoleservice;1'].getService(Ci.nsIConsoleService),
    PREF_STRING = 32,
    PREF_INT    = 64,
    PREF_BOOL   = 128,
    // references to all the timers to avoid garbage collection before firing
    // automatically removed when fired
    _timers = [],
    _setTimer = function(func, timeout, type, param) {
        var timer = Cc['@mozilla.org/timer;1'].createInstance(Ci.nsITimer);
        _timers.push(timer);
        var event = {
            notify: function (timer) {
                func(param);
                _removeTimerRef(timer);
            }
        };
        timer.initWithCallback(event, timeout, type);
        return timer;
    },
    _removeTimerRef = function(timer){
        var i = _timers.indexOf(timer);
        if (i >= 0) {
            _timers.splice(_timers.indexOf(timer), 1);
        }
    },
    FFcontract = {
        classID: Components.ID('{59a99d57-b4ad-fa7e-aead-da9d4f4e77c8}'),
        classDescription : 'Cliqz',
        contractID : '@mozilla.org/autocomplete/search;1?name=cliqz-results',
        QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ]),
    };

var CLIQZEnvironment = {
    LOCALE_PATH: 'chrome://cliqzres/content/locale/',
    TEMPLATES_PATH: 'chrome://cliqzres/content/templates/',
    cliqzPrefs: Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefService).getBranch('extensions.cliqz.'),
    OS: Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS.toLowerCase(),
    init: function(){
        CLIQZEnvironment.loadSearch();
    },
    unload: function() {
        CLIQZEnvironment.unloadSearch();
        _timers.forEach(_removeTimerRef);

        CLIQZEnvironment.removeGeoLocationWatch();
    },
    log: function(msg, key){
        _log.logStringMessage(
          'CLIQZ ' + (new Date()).toISOString() + (key? ' ' + key : '') + ': ' +
          (typeof msg == 'object'? JSON.stringify(msg): msg)
        );
    },
    getPref: function(pref, notFound){
        try {
            var prefs = CLIQZEnvironment.cliqzPrefs;
            switch(prefs.getPrefType(pref)) {
                case PREF_BOOL: return prefs.getBoolPref(pref);
                case PREF_STRING: return prefs.getCharPref(pref);
                case PREF_INT: return prefs.getIntPref(pref);
                default: return notFound;
            }
        } catch(e) {
          return notFound;
        }
    },
    getPrefs: function(){
        var prefs = {},
            cqz = CLIQZEnvironment.cliqzPrefs.getChildList('');
        for(var i=0; i<cqz.length; i++){
            var pref = cqz[i];
            prefs[pref] = CLIQZEnvironment.getPref(pref);
        }
        return prefs;
    },
    setPref: function(pref, val){
        switch (typeof val) {
            case 'boolean': CLIQZEnvironment.cliqzPrefs.setBoolPref(pref, val); break;
            case 'number': CLIQZEnvironment.cliqzPrefs.setIntPref(pref, val); break;
            case 'string': CLIQZEnvironment.cliqzPrefs.setCharPref(pref, val); break;
          }
    },
    httpHandler: function(method, url, callback, onerror, timeout, data){
        var req = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        req.timestamp = + new Date();
        req.open(method, url, true);
        req.overrideMimeType('application/json');
        req.onload = function(){
            if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
                callback && callback(req);
            } else {
                CLIQZEnvironment.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CLIQZEnvironment){
                CLIQZEnvironment.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CLIQZEnvironment){ //might happen after disabling the extension
                CLIQZEnvironment.log( "timeout for " + url, "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }

        if(callback){
            if(timeout){
                req.timeout = parseInt(timeout)
            } else {
                req.timeout = (method == 'POST'? 10000 : 1000);
            }
        }

        req.send(data);
        return req;
    },
    openLink: function(win, url, newTab, newWindow, newPrivateWindow){
        // make sure there is a protocol (this is required
        // for storing it properly in Firefoxe's history DB)
        if(url.indexOf("://") == -1 && url.trim().indexOf('about:') != 0)
            url = "http://" + url;

        // Firefox history boosts URLs that are typed in the URL bar, autocompleted,
        // or selected from the history dropbdown; thus, mark page the user is
        // going to see as "typed" (i.e, the value Firefox would assign to such URLs)
        try {
            var historyService =
                Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            var ioService =
                Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var urlObject = ioService.newURI(url, null, null);
                historyService.markPageAsTyped(urlObject);
        } catch(e) { }

        win.CLIQZ.Core.triggerLastQ = true;
        if(newTab) {
            win.gBrowser.addTab(url);
        } else if(newWindow) {
            win.open(url, '_blank');
        } else if(newPrivateWindow) {
            win.openLinkIn(url, "window", { private: true });
        }
        else {
            //clean selected text to have a valid last Query
            //if(CliqzAutocomplete.lastSearch != CLIQZ.Core.urlbar.value)
            //    CLIQZ.Core.urlbar.value = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);

            // Set urlbar value to url immediately
            win.CLIQZ.Core.urlbar.value = url;
            win.openUILink(url);
        }
    },
    tldExtractor: function(host){
        var eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"]
                                    .getService(Ci.nsIEffectiveTLDService);

        return eTLDService.getPublicSuffixFromHost(host);
    },
    isPrivate: function(window) {
        if(window.cliqzIsPrivate === undefined){
            try {
                // Firefox 20+
                Cu.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
                window.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(window);
            } catch(e) {
                // pre Firefox 20
                try {
                  window.cliqzIsPrivate = Cc['@mozilla.org/privatebrowsing;1'].
                                          getService(Ci.nsIPrivateBrowsingService).
                                          privateBrowsingEnabled;
                } catch(ex) {
                  Cu.reportError(ex);
                  window.cliqzIsPrivate = 5;
                }
            }
        }

        return window.cliqzIsPrivate
    },
    setInterval: function(func, timeout, param) {
        return _setTimer(func, timeout, Ci.nsITimer.TYPE_REPEATING_PRECISE, param);
    },
    setTimeout: function(func, timeout, param) {
        return _setTimer(func, timeout, Ci.nsITimer.TYPE_ONE_SHOT, param);
    },
    clearTimeout: function(timer) {
        if (!timer) {
            return;
        }
        timer.cancel();
        _removeTimerRef(timer);
    },
    clearInterval: this.clearTimeout,
    getVersion: function(callback){
        var wm = Cc['@mozilla.org/appshell/window-mediator;1']
                         .getService(Ci.nsIWindowMediator),
            win = wm.getMostRecentWindow("navigator:browser");
          win.Application.getExtensions(function(extensions) {
                callback(extensions.get('cliqz@cliqz.com').version);
          });
    },
    getWindow: function(){
        var wm = Cc['@mozilla.org/appshell/window-mediator;1']
                            .getService(Ci.nsIWindowMediator);
        return wm.getMostRecentWindow("navigator:browser");
    },
    getWindowID: function(){
        var win = CLIQZEnvironment.getWindow();
        var util = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
        return util.outerWindowID;
    },
    openTabInWindow: function(win, url){
        var tBrowser = win.document.getElementById('content');
        var tab = tBrowser.addTab(url);
        tBrowser.selectedTab = tab;
    },

    // from CliqzAutocomplete
    loadSearch: function(){
        var reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(FFcontract.contractID),
                reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
            )
        }catch(e){}

        //extend prototype
        for(var k in FFcontract) CliqzAutocomplete.CliqzResults.prototype[k] = FFcontract[k];

        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

    },
    unloadSearch: function(){
        var reg = Cm.QueryInterface(Ci.nsIComponentRegistrar);
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(FFcontract.contractID),
            reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
          );
        }catch(e){}
    },
    //TODO: cache this
    getSearchEngines: function(){
        var defEngineName = Services.search.defaultEngine.name;

        return Services.search.getEngines()
                .filter(function(e){
                    return !e.hidden && e.iconURI != null;
                })
                .map(function(e){
                    var r = {
                        name: e.name,
                        default: e.name == defEngineName,
                        icon: e.iconURI.spec,
                        base_url: e.searchForm,
                        getSubmissionForQuery: function(q){
                            //TODO: create the correct search URL
                            return e.getSubmission(q).uri.spec;
                        }
                    }
                    return r;
                });
    },
    initWindow: function(win){
        var popup = win.CLIQZ.Core.popup;
        //patch this method to avoid any caching FF might do for components.xml
        popup._appendCurrentResult = function(){
            if(popup._matchCount > 0 && popup.mInput){
              //try to break the call stack which cause 'too much recursion' exception on linux systems
              CLIQZEnvironment.setTimeout(function(win){ win.CLIQZ.UI.handleResults.apply(win); }, 0, win);
            }
        };

        popup._openAutocompletePopup = function(){
            (function(aInput, aElement){
              if (!CliqzAutocomplete.isPopupOpen){
                this.mInput = aInput;
                this._invalidate();

                var width = aElement.getBoundingClientRect().width;
                this.setAttribute("width", width > 500 ? width : 500);
                // 0,0 are the distance from the topleft of the popup to aElement (the urlbar). If these values change, please adjust how mouse position is calculated for click event (in telemetry signal)
                this.openPopup(aElement, "after_start", 0, 0 , false, true);
              }
            }).apply(popup, arguments)
        };
    },
    getGeo: function(allowOnce, callback, failCB) {
        /*
        @param allowOnce:           If true, the location will be returned this one time without checking if share_location == "yes"
                                    This is used when the user clicks on Share Location "Just once".
        */
        if (!(allowOnce || CliqzUtils.getPref("share_location") == "yes")) {
          failCB("No permission to get user's location");
          return;
        }

        if (CLIQZEnvironment.USER_LAT && CLIQZEnvironment.USER_LNG) {
          callback({
            lat: CLIQZEnvironment.USER_LAT,
            lng: CLIQZEnvironment.USER_LNG
          });
        } else {
          var geoService = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);
          geoService.getCurrentPosition(function (p) {
            callback({ lat: p.coords.latitude, lng: p.coords.longitude});
          }, failCB);
        }
    },
    removeGeoLocationWatch: function() {
      var geoService = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);
      GEOLOC_WATCH_ID && geoService.clearWatch(GEOLOC_WATCH_ID);
    },
    updateGeoLocation: function() {
      var geoService = Components.classes["@mozilla.org/geolocation;1"].getService(Components.interfaces.nsISupports);
      CLIQZEnvironment.removeGeoLocationWatch();

      if (CLIQZEnvironment.getPref('share_location') == 'yes') {
        // Get current position
        geoService.getCurrentPosition(function(p) {
          CLIQZEnvironment.USER_LAT = JSON.stringify(p.coords.latitude);
          CLIQZEnvironment.USER_LNG =  JSON.stringify(p.coords.longitude);
        }, function(e) { CLIQZEnvironment.log(e, "Error updating geolocation"); });

        //Upate position if it changes
        GEOLOC_WATCH_ID = geoService.watchPosition(function(p) {
          // Make another check, to make sure that the user hasn't changed permissions meanwhile
          if (CLIQZEnvironment && GEOLOC_WATCH_ID && CLIQZEnvironment.getPref('share_location') == 'yes') {
            CLIQZEnvironment.USER_LAT = p.coords.latitude;
            CLIQZEnvironment.USER_LNG =  p.coords.longitude;
          }
        }, function(e) { CLIQZEnvironment && GEOLOC_WATCH_ID && CLIQZEnvironment.log(e, "Error updating geolocation"); });
      } else {
        CLIQZEnvironment.USER_LAT = null;
        CLIQZEnvironment.USER_LNG = null;
      }
    },
    setLocationPermission: function(window, newPerm) {
      if (newPerm == "yes" || newPerm == "no" || newPerm == "ask") {
        CLIQZEnvironment.setPref('share_location',newPerm);
        CLIQZEnvironment.setTimeout(window.CLIQZ.Core.refreshButtons, 0);
        CLIQZEnvironment.updateGeoLocation();
      }
    },
    // lazy init
    // callback called multiple times
    historySearch: (function(){
        var hist = {};

        XPCOMUtils.defineLazyServiceGetter(
            hist,
            'search',
            '@mozilla.org/autocomplete/search;1?name=history',
            'nsIAutoCompleteSearch');

        return function(q, callback, sessionStart){
            if(q.length == 0 && sessionStart){
                NewTabUtils.links.populateCache(function(){
                    callback(null, getTopSites());
                })
            }
            else {
                hist.search.startSearch(q, 'enable-actions', null, {
                    onSearchResult: function(ctx, result) {
                        var res = [];
                        for (var i = 0; result && i < result.matchCount; i++) {
                            res.push({
                                style:   result.getStyleAt(i),
                                value:   result.getValueAt(i),
                                image:   result.getImageAt(i),
                                comment: result.getCommentAt(i),
                                label:   result.getLabelAt(i)
                            });
                        }
                        callback({
                            query: q,
                            results: res,
                            ready:  result.searchResult != result.RESULT_NOMATCH_ONGOING &&
                                    result.searchResult != result.RESULT_SUCCESS_ONGOING
                        })
                    }
                });
            }
        }
    })()

    // END from CliqzAutocomplete
}

function getTopSites(){
    var results = NewTabUtils.links.getLinks().slice(0, 5);
    if(results.length>0){
        var top = Result.generic('cliqz-extra', '', null, '', null, '', null, JSON.stringify({topsites:true}));
        top.data.title = CliqzUtils.getLocalizedString('topSitesTitle');
        top.data.message = CliqzUtils.getLocalizedString('topSitesMessage');
        top.data.message1 = CliqzUtils.getLocalizedString('topSitesMessage1');
        top.data.cliqz_logo = 'chrome://cliqzres/content/skin/img/cliqz.svg';
        top.data.lastQ = CliqzUtils.getWindow().gBrowser.selectedTab.cliqz;
        top.data.url = results[0].url;
        top.data.template = 'topsites';
        top.data.urls = results.map(function(r, i){
            var urlDetails = CliqzUtils.getDetailsFromUrl(r.url),
                logoDetails = CliqzUtils.getLogoDetails(urlDetails);

            return {
              url: r.url,
              href: r.url.replace(urlDetails.path, ''),
              link: r.url.replace(urlDetails.path, ''),
              name: urlDetails.name,
              text: logoDetails.text,
              style: logoDetails.style,
              extra: "top-sites-" + i
            }
        });
        return top
    }
}
