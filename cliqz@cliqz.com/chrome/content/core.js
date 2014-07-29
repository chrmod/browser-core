'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm?v=0.5.02');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');


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
    lastQueryInTab:{},
    init: function(){
        CliqzUtils.init();
        CLIQZ.UI.init();

        var css = CliqzUtils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/browser.css?v=0.5.02');
        CLIQZ.Core.elem.push(css);
        css = CliqzUtils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/logo.css?v=0.5.02');
        CLIQZ.Core.elem.push(css);

        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = document.getElementById('PopupAutoCompleteRichResult');

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', /*'urlinline */'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResult');

        CLIQZ.Core._onpopuphiding = CLIQZ.Core.popup.getAttribute('onpopuphiding');
        CLIQZ.Core.popup.setAttribute('onpopuphiding',
            'CLIQZ.Core.popupEvent(false) ' + CLIQZ.Core.popup.getAttribute('onpopuphiding'));


        var searchContainer = document.getElementById('search-container');
        if(searchContainer){
            CLIQZ.Core._searchContainer = searchContainer.getAttribute('class');
            if (CliqzUtils.cliqzPrefs.getBoolPref('hideQuickSearch')){
                searchContainer.setAttribute('class', CLIQZ.Core._searchContainer + ' hidden');
            }
        }

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.addEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var urlbarIcons = document.getElementById('urlbar-icons');
        // add cliqz last search
        var cliqzLastSearch = document.createElement('hbox');
        // FIXME: We should find another way to deal with events that take time
        // to finish, like a disk read. A 250ms wait is not a good solution.
        setTimeout(function () {
            cliqzLastSearch.textContent = CliqzUtils.getLocalizedString('urlBarLastSearch');
        }, 250);

        cliqzLastSearch.className = 'hidden';  // Hide on start
        cliqzLastSearch.addEventListener('click', CLIQZ.Core.returnToLastSearch);

        urlbarIcons.parentNode.insertBefore(cliqzLastSearch, urlbarIcons);
        CLIQZ.Core.urlbarCliqzLastSearchContainer = cliqzLastSearch;
        CLIQZ.Core.elem.push(cliqzLastSearch);

        // browser handlers
        gBrowser.tabContainer.addEventListener("TabSelect", CLIQZ.Core.tabChange, false);
        gBrowser.tabContainer.addEventListener("TabClose", CLIQZ.Core.tabRemoved, false);
        // preferences
        CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        CLIQZ.Core.popup.style.maxHeight = CliqzUtils.getPref('popupHeight', 190) + 'px';

        CliqzAutocomplete.init();

        CliqzTimings.init();

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            CliqzLanguage.init(window);
            window.gBrowser.addProgressListener(CliqzLanguage.listener);
        }

        CLIQZ.Core.whoAmI(true); //startup
        CliqzUtils.log('Initialized', 'CORE');
    },
    checkSession: function(){
        var prefs = CliqzUtils.cliqzPrefs;
        if (!prefs.prefHasUserValue('session') || prefs.getCharPref('session') == ''){
            CliqzUtils.httpGet('chrome://cliqz/content/source.json?v=0.5.02',
                function success(req){
                    var source = JSON.parse(req.response).shortName;
                    prefs.setCharPref('session', CLIQZ.Core.generateSession(source));
                },
                function error(){
                    prefs.setCharPref('session', CLIQZ.Core.generateSession());
                }
            );


            CLIQZ.Core.showTutorial(true);
        } else {
            CLIQZ.Core.showTutorial(false);
        }
    },
    generateSession: function(source){
        return Math.random().toString().split('.')[1]
               + '|' +
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    returnToLastSearch: function (ev) {
        CLIQZ.Core.urlbar.mInputField.focus();
        CLIQZ.Core.urlbar.mInputField.setUserInput(ev.target.query);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.track(action);
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    showTutorial: function(onInstall){
        setTimeout(function(){
            var onlyReuse = onInstall ? false: true;
            CLIQZ.Core.openOrReuseTab(CliqzUtils.TUTORIAL_URL, CliqzUtils.INSTAL_URL, onlyReuse);
        }, 100);
    },
    // force component reload at install/uninstall
    reloadComponent: function(el) {
        return el && el.parentNode && el.parentNode.insertBefore(el, el.nextSibling)
    },
    // restoring
    destroy: function(){
        for(var i in CLIQZ.Core.elem){
            var item = CLIQZ.Core.elem[i];
            item && item.parentNode && item.parentNode.removeChild(item);
        }

        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', CLIQZ.Core._autocompletesearch);
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', CLIQZ.Core._autocompletepopup);
        CLIQZ.Core.popup.setAttribute('onpopuphiding', CLIQZ.Core._onpopuphiding);

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

        // remove listners
        if ('gBrowser' in window) {
            window.gBrowser.removeProgressListener(CliqzLanguage.listener);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
    },
    restart: function(){
        CLIQZ.Core.destroy();
        CLIQZ.Core.init();
    },
    tabChange: function(ev){
        //clean last search to avoid conflicts
        CliqzAutocomplete.lastSearch = '';

        if(CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel])
            CLIQZ.Core.showLastQuery(CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel]);
        else CLIQZ.Core.hideLastQuery();
    },
    tabRemoved: function(ev){
        delete CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel];
    },
    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        CliqzUtils.track(action);
    },
    isAutocomplete: function(base, candidate){
        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
    lastQuery: function(){
        var val = CLIQZ.Core.urlbar.value.trim(),
            lastQ = CliqzAutocomplete.lastSearch.trim();

        if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !CLIQZ.Core.isAutocomplete(val, lastQ) )){
            CLIQZ.Core.showLastQuery(lastQ);
            CLIQZ.Core.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
        } else {
            // remove last query if the user ended his search session
            if(CliqzUtils.isUrl(lastQ))
                delete CLIQZ.Core.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
        }
    },
    hideLastQuery: function(){
        CLIQZ.Core.urlbarCliqzLastSearchContainer.className = 'hidden';
    },
    showLastQuery: function(q){
        var lastQContainer = CLIQZ.Core.urlbarCliqzLastSearchContainer;
        lastQContainer.className = 'cliqz-urlbar-Last-search';
        lastQContainer.textContent = q;
        lastQContainer.tooltipText = q;
        lastQContainer.query = q;
    },
    urlbarfocus: function() {
        CLIQZ.Core.hideLastQuery();
        CLIQZ.Core.urlbarEvent('focus');
    },
    urlbarblur: function(ev) {
        CLIQZ.Core.lastQuery();
        CLIQZ.Core.urlbarEvent('blur');
    },
    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CliqzUtils.track(action);
    },
    whoAmI: function(startup){
        // schedule another signal
        setTimeout(function(){ CLIQZ.Core.whoAmI(); }, CLIQZ.Core.INFO_INTERVAL);

        CLIQZ.Core.handleTimings();
        CliqzABTests.check();

        var start = (new Date()).getTime();
        CliqzHistoryManager.getStats(function(history){
            Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                var info = {
                    type: 'environment',
                    agent: navigator.userAgent,
                    language: navigator.language,
                    version: beVersion,
                    history_days: history.days,
                    history_urls: history.size,
                    startup: startup? true: false,
                    prefs: CliqzUtils.getPrefs()
                };

                CliqzUtils.track(info);
            });
        });

        if(startup && CliqzUtils.getPref('analysis', false) == false){
            CliqzUtils.setPref('analysis', true);
            if(CliqzUtils.getPref('session','').charCodeAt(0) % 10 === 0){
                setTimeout(function(){ CliqzHistoryManager.analyze(); }, 60000);
            }
        }
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

        if(lastUninstallVersion != currentVersion){
            CliqzUtils.setPref(UNINSTALL_PREF, currentVersion);
            gBrowser.selectedTab = gBrowser.addTab(CliqzUtils.UNINSTALL);
        }
    },
    urlbarkeydown: function(ev){
        CLIQZ.Core._lastKey = ev.keyCode;
        var cancel = CLIQZ.UI.keyDown(ev);
        cancel && ev.preventDefault();
    },
    // autocomplete query inline
    autocompleteQuery: function(firstResult){
        if(CLIQZ.Core._lastKey === KeyEvent.DOM_VK_BACK_SPACE ||
           CLIQZ.Core._lastKey === KeyEvent.DOM_VK_DELETE ||
           CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart){
            return;
        }

        let urlBar = CLIQZ.Core.urlbar,
            endPoint = urlBar.value.length;

        if(firstResult.indexOf('://') !== -1){
           firstResult = firstResult.split('://')[1];
        }

        firstResult = firstResult.replace('www.', '');

        if(firstResult.indexOf(urlBar.value) === 0) {
            urlBar.value += firstResult.substr(endPoint);
            urlBar.setSelectionRange(endPoint, urlBar.value.length);
        }
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
    }
};
