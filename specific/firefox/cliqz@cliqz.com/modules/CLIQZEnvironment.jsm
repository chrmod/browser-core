'use strict';
var EXPORTED_SYMBOLS = ['CLIQZEnvironment'];

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/NewTabUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var _log = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
    PREF_STRING = 32,
    PREF_INT    = 64,
    PREF_BOOL   = 128,
    // references to all the timers to avoid garbage collection before firing
    // automatically removed when fired
    _timers = [],
    _setTimer = function(func, timeout, type, param) {
        var timer = Components.classes['@mozilla.org/timer;1'].createInstance(Components.interfaces.nsITimer);
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
        QueryInterface: XPCOMUtils.generateQI([ Components.interfaces.nsIAutoCompleteSearch ]),
    };

var CLIQZEnvironment = {
    LOCALE_PATH: 'chrome://cliqzres/content/locale/',
    TEMPLATES_PATH: 'chrome://cliqzres/content/templates/',
    cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),
    OS: Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULRuntime).OS.toLowerCase(),
    init: function(){
        CLIQZEnvironment.loadSearch();
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
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
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
    openLink: function(url, newTab){
        // make sure there is a protocol (this is required
        // for storing it properly in Firefoxe's history DB)
        if(url.indexOf("://") == -1)
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

        CLIQZ.Core.triggerLastQ = true;
        if(newTab) gBrowser.addTab(url);
        else {
            //clean selected text to have a valid last Query
            //if(CliqzAutocomplete.lastSearch != CLIQZ.Core.urlbar.value)
            //    CLIQZ.Core.urlbar.value = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);

            // Set urlbar value to url immediately
            CLIQZ.Core.urlbar.value = url;
            openUILink(url);
        }
    },
    tldExtractor: function(host){
        var eTLDService = Components.classes["@mozilla.org/network/effective-tld-service;1"]
                                    .getService(Components.interfaces.nsIEffectiveTLDService);

        return eTLDService.getPublicSuffixFromHost(host);
    },
    isPrivate: function(window) {
        if(window.cliqzIsPrivate === undefined){
            try {
                // Firefox 20+
                Components.utils.import('resource://gre/modules/PrivateBrowsingUtils.jsm');
                window.cliqzIsPrivate = PrivateBrowsingUtils.isWindowPrivate(window);
            } catch(e) {
                // pre Firefox 20
                try {
                  window.cliqzIsPrivate = Components.classes['@mozilla.org/privatebrowsing;1'].
                                          getService(Components.interfaces.nsIPrivateBrowsingService).
                                          privateBrowsingEnabled;
                } catch(ex) {
                  Components.utils.reportError(ex);
                  window.cliqzIsPrivate = 5;
                }
            }
        }

        return window.cliqzIsPrivate
    },
    setInterval: function(func, timeout, param) {
        return _setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE, param);
    },
    setTimeout: function(func, timeout, param) {
        return _setTimer(func, timeout, Components.interfaces.nsITimer.TYPE_ONE_SHOT, param);
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
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                         .getService(Components.interfaces.nsIWindowMediator),
            win = wm.getMostRecentWindow("navigator:browser");
          win.Application.getExtensions(function(extensions) {
                callback(extensions.get('cliqz@cliqz.com').version);
          });
    },
    getWindow: function(){
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                            .getService(Components.interfaces.nsIWindowMediator);
        return wm.getMostRecentWindow("navigator:browser");
    },
    getWindowID: function(){
        var win = CLIQZEnvironment.getWindow();
        var util = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
        return util.outerWindowID;
    },
    openTabInWindow: function(win, url){
        var tBrowser = win.document.getElementById('content');
        var tab = tBrowser.addTab(url);
        tBrowser.selectedTab = tab;
    },

    // from CliqzAutocomplete
    loadSearch: function(){
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(FFcontract.contractID),
                reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
            )
        }catch(e){}

        debugger;
        //extend prototype
        for(var k in FFcontract) CliqzAutocomplete.CliqzResults.prototype[k] = FFcontract[k];

        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

    },
    unloadSearch: function(){
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(FFcontract.contractID),
            reg.getClassObjectByContractID(FFcontract.contractID, Ci.nsISupports)
          );
        }catch(e){}
    },
    getSearchEngines: function(){
        return Services.search.getEngines();
    },
    initWindow: function(win){
        var popup = win.CLIQZ.Core.popup;
        //patch this method to avoid any caching FF might do for components.xml
        popup._appendCurrentResult = function(){
            if(popup._matchCount > 0 && popup.mInput){
              //try to break the call stack which cause 'too much recursion' exception on linux systems
              win.setTimeout(function(){ win.CLIQZ.UI.handleResults.apply(win); }, 0);
            }
        }

        popup._openAutocompletePopup = function(){
            (function(aInput, aElement){
              if (!win.CliqzAutocomplete.isPopupOpen){
                this.mInput = aInput;
                this._invalidate();

                var width = aElement.getBoundingClientRect().width;
                this.setAttribute("width", width > 500 ? width : 500);
                this.openPopup(aElement, "after_start", 0, 0, false, true);
              }
            }).apply(popup, arguments)
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
