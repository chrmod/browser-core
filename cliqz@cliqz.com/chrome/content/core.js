'use strict';
/*
 * This is the core part of the extension.
 *  - it is injected into each browser window
 *  - loads all the additional modules needed
 *  - changes the default search provider
 *  - ovverides the default UI
 *
 */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSearchHistory',
  'chrome://cliqzmodules/content/CliqzSearchHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRedirect',
  'chrome://cliqzmodules/content/CliqzRedirect.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

var CLIQZ = CLIQZ || {};
CLIQZ.Core = CLIQZ.Core || {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keydown'],
    _messageOFF: true, // no message shown
    _lastKey:0,
    _updateAvailable: false,

    init: function(){
        CliqzRedirect.addHttpObserver();
        CliqzUtils.init(window);
        CLIQZ.UI.init();
        CliqzSpellCheck.initSpellCorrection();

        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/browser.css');
        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/browser_new.css');
        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/logo.css');
        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/generated.css');

        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = document.getElementById('PopupAutoCompleteRichResult');

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', /*'urlinline */'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResult');

        CLIQZ.Core.popup.addEventListener('popuphiding', CLIQZ.Core.popupClose);
        CLIQZ.Core.popup.addEventListener('popupshowing', CLIQZ.Core.popupOpen);

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.addEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        CLIQZ.Core.tabChange = CliqzSearchHistory.tabChanged.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabSelect", CLIQZ.Core.tabChange, false);

        CLIQZ.Core.tabRemoved = CliqzSearchHistory.tabRemoved.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabClose", CLIQZ.Core.tabRemoved, false);

        // preferences
        CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        CLIQZ.Core.popup.style.maxHeight = CliqzUtils.getPref('popupHeight', 190) + 'px';

        CliqzAutocomplete.init();

        CliqzTimings.init();

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        // Add search history dropdown
        var searchHistoryContainer = CliqzSearchHistory.insertBeforeElement();
        CLIQZ.Core.elem.push(searchHistoryContainer);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            CliqzLanguage.init(window);
            window.gBrowser.addProgressListener(CliqzLanguage.listener);
        }

        CLIQZ.Core.whoAmI(true); //startup
        CliqzUtils.log('Initialized', 'CORE');
    },
    addCSS: function(doc, path){
        //add this element into 'elem' to be sure we remove it at extension shutdown
        CLIQZ.Core.elem.push(
            CliqzUtils.addStylesheetToDoc(doc, path)
        );
    },
    checkSession: function(){
        var prefs = CliqzUtils.cliqzPrefs;
        if (!prefs.prefHasUserValue('session') || prefs.getCharPref('session') == ''){
            CliqzUtils.httpGet('chrome://cliqz/content/source.json',
                function success(req){
                    var source = JSON.parse(req.response).shortName;
                    prefs.setCharPref('session', CLIQZ.Core.generateSession(source));
                    CLIQZ.Core.showTutorial(true);
                },
                function error(){
                    prefs.setCharPref('session', CLIQZ.Core.generateSession());
                    CLIQZ.Core.showTutorial(true);
                }
            );
        } else {
            CLIQZ.Core.showTutorial(false);
        }
    },
    generateSession: function(source){
        return CliqzUtils.rand(18) + CliqzUtils.rand(6, '0123456789')
               + '|' +
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    _tutorialTimeout:null,
    showTutorial: function(onInstall){
        CLIQZ.Core._tutorialTimeout = setTimeout(function(){
            var onlyReuse = onInstall ? false: true;
            CLIQZ.Core.openOrReuseTab(CliqzUtils.TUTORIAL_URL, CliqzUtils.INSTAL_URL, onlyReuse);
        }, 100);
    },
    // force component reload at install/uninstall
    reloadComponent: function(el) {
        return el && el.parentNode && el.parentNode.insertBefore(el, el.nextSibling)
    },
    // restoring
    destroy: function(soft){
        clearTimeout(CLIQZ.Core._tutorialTimeout);
        clearTimeout(CLIQZ.Core._whoAmItimer);

        for(var i in CLIQZ.Core.elem){
            var item = CLIQZ.Core.elem[i];
            item && item.parentNode && item.parentNode.removeChild(item);
        }

        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', CLIQZ.Core._autocompletesearch);
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', CLIQZ.Core._autocompletepopup);
        CLIQZ.Core.popup.removeEventListener('popuphiding', CLIQZ.Core.popupClose);
        CLIQZ.Core.popup.removeEventListener('popupshowing', CLIQZ.Core.popupOpen);

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.removeEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var searchContainer = document.getElementById('search-container');
        if(CLIQZ.Core._searchContainer){
            searchContainer.setAttribute('class', CLIQZ.Core._searchContainer);
        }

        gBrowser.tabContainer.removeEventListener("TabSelect", CLIQZ.Core.tabChange, false);
        gBrowser.tabContainer.removeEventListener("TabClose", CLIQZ.Core.tabRemoved, false);

        // restore preferences
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Core._popupMaxHeight;

        CliqzAutocomplete.destroy();
        CliqzRedirect.destroy();

        // remove listners
        if ('gBrowser' in window) {
            window.gBrowser.removeProgressListener(CliqzLanguage.listener);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        if(!soft){
            delete window.CliqzUtils;
            delete window.CliqzHistoryManager;
            delete window.CliqzAutocomplete;
            delete window.CliqzLanguage;
            delete window.ResultProviders;
            delete window.CliqzTimings;
            delete window.CliqzABTests;
            delete window.CliqzSearchHistory;
            delete window.CliqzRedirect;
        }
    },
    restart: function(soft){
        CLIQZ.Core.destroy(soft);
        CLIQZ.Core.init();
    },
    popupOpen: function(){
        CliqzAutocomplete.isPopupOpen = true;
        CLIQZ.Core.popupEvent(true);
    },
    popupClose: function(){
        CliqzAutocomplete.isPopupOpen = false;
        CliqzAutocomplete.resetSpellCorr();
        CLIQZ.Core.popupEvent(false);
    },
    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        CliqzUtils.track(action);
    },
    urlbarfocus: function() {
        //try to 'heat up' the connection
        CliqzUtils.pingCliqzResults();

        CliqzAutocomplete.lastFocusTime = (new Date()).getTime();
        CliqzSearchHistory.hideLastQuery();
        CLIQZ.Core.triggerLastQ = false;
        CliqzUtils.setQuerySession(CliqzUtils.rand(32));
        CLIQZ.Core.urlbarEvent('focus');

        if(CliqzUtils.getPref("showPremiumResults", -1) == 1){
            //if test is active trigger it
            CliqzUtils.setPref("showPremiumResults", 2);
        }

        //if(CLIQZ.Core.urlbar.value.trim().length > 0)
        //    CLIQZ.Core.popup._openAutocompletePopup(CLIQZ.Core.urlbar, CLIQZ.Core.urlbar);
    },
    urlbarblur: function(ev) {
        CliqzAutocomplete.resetSpellCorr();
        if(CLIQZ.Core.triggerLastQ)
            CliqzSearchHistory.lastQuery();

        CLIQZ.Core.urlbarEvent('blur');

        if(CliqzUtils.getPref("showPremiumResults", -1) == 2){
            CliqzUtils.cliqzPrefs.clearUserPref("showPremiumResults");
        }

        if(CliqzUtils.getPref("showAdResults", -1) == 2){
            //if test is active trigger it
            CliqzUtils.cliqzPrefs.clearUserPref("showAdResults");
        }
        CliqzAutocomplete.lastFocusTime = null;
    },
    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CliqzUtils.track(action);
    },
    _whoAmItimer: null,
    whoAmI: function(startup){
        // schedule another signal
        CLIQZ.Core._whoAmItimer = setTimeout(function(){
            if(CLIQZ && CLIQZ.Core) CLIQZ.Core.whoAmI();
        }, CLIQZ.Core.INFO_INTERVAL);

        CLIQZ.Core.handleTimings();
        CliqzABTests.check();

        //executed after the services are fetched
        CliqzUtils.fetchAndStoreConfig(function(){
            // wait for search component initialization
            if(Services.search.init != null){
                Services.search.init(function(){
                    if(CLIQZ) CLIQZ.Core.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
                });
            } else {
                CLIQZ.Core.sendEnvironmentalSignal(startup, Services.search.currentEngine.name);
            }
        });
    },

    sendEnvironmentalSignal: function(startup, defaultSearchEngine){
        CliqzHistoryManager.getStats(function(history){
            Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                var info = {
                        type: 'environment',
                        agent: navigator.userAgent,
                        language: navigator.language,
                        width: CliqzUtils.getWindow().document.width,
                        height: CliqzUtils.getWindow().document.height,
                        version: beVersion,
                        history_days: history.days,
                        history_urls: history.size,
                        startup: startup? true: false,
                        prefs: CliqzUtils.getPrefs(),
                        defaultSearchEngine: defaultSearchEngine
                    };

                CliqzUtils.track(info);
            });
        });
    },
    // Reset collection of timing data at regular intervals, send log if pref set.
    handleTimings: function() {
        CliqzTimings.send_log("result", 1000);
        CliqzTimings.send_log("search_history", 200);
        CliqzTimings.send_log("search_cliqz", 1000);
        CliqzTimings.send_log("search_suggest", 500);
        CliqzTimings.send_log("send_log", 2000);
    },
    showUninstallMessage: function(currentVersion){
        var UNINSTALL_PREF = 'uninstallVersion',
            lastUninstallVersion = CliqzUtils.getPref(UNINSTALL_PREF, '');

        if(currentVersion && lastUninstallVersion != currentVersion){
            CliqzUtils.setPref(UNINSTALL_PREF, currentVersion);
            gBrowser.selectedTab = gBrowser.addTab(CliqzUtils.UNINSTALL);
        }
    },
    urlbarkeydown: function(ev){
        CLIQZ.Core._lastKey = ev.keyCode;
        var cancel = CLIQZ.UI.keyDown(ev);
        cancel && ev.preventDefault();
    },
    openLink: function(url, newTab){
        CLIQZ.Core.triggerLastQ = true;
        if(newTab) gBrowser.addTab(url);
        else {
            //clean selected text to have a valid last Query
            if(CliqzAutocomplete.lastSearch != CLIQZ.Core.urlbar.value)
                CLIQZ.Core.urlbar.value = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);
            openUILink(url);
        }
    },
    // autocomplete query inline
    autocompleteQuery: function(firstResult){
        if(CLIQZ.Core._lastKey === KeyEvent.DOM_VK_BACK_SPACE ||
           CLIQZ.Core._lastKey === KeyEvent.DOM_VK_DELETE ||
           CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart){
            return;
        }

        let urlBar = CLIQZ.Core.urlbar, r,
            endPoint = urlBar.value.length;

        // Remove protocol and 'www.' from first results
        firstResult = CliqzUtils.cleanUrlProtocol(firstResult, true);

        // try to update misspelings like ',' or '-'
        var cleanedUrlBar = CLIQZ.Core.cleanUrlBarValue(urlBar.value);

        // Remove protocol from typed query
        var query = CliqzUtils.cleanUrlProtocol(cleanedUrlBar, true);

        // Then add the matching part to the end of the current typed query and set is as selected.
        if(query && firstResult.indexOf(query) === 0) {
            urlBar.mInputField.value = cleanedUrlBar + firstResult.substr(query.length);
            urlBar.setSelectionRange(endPoint, urlBar.value.length);
        }
    },
    cleanUrlBarValue: function(val){
        var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
            host = cleanParts[0],
            pathLength = 0,
            SYMBOLS = /,|-|\./g;

        if(cleanParts.length > 1){
            pathLength = ('/' + cleanParts.slice(1).join('/')).length;
        }
        if(host.indexOf('www') == 0 && host.length > 4){
            // only fix symbols in host
            if(SYMBOLS.test(host[3]) && host[4] != ' ')
                // replace only issues in the host name, not ever in the path
                return val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
                       (pathLength? val.substr(-pathLength): '');
        }
        return val;
    },
    // redirects a tab in which oldUrl is loaded to newUrl
    openOrReuseTab: function(newUrl, oldUrl, onlyReuse) {
        // optimistic search
        if(gBrowser.selectedTab.linkedBrowser.contentWindow.location.href == oldUrl){
            gBrowser.selectedTab.linkedBrowser.contentWindow.location.href = newUrl;
            return;
        }

        // heavy hearch
        CliqzUtils.openOrReuseAnyTab(newUrl, oldUrl, onlyReuse);
    },
    getQuerySession: function() {
        return _querySession;
    }
};
