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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

//XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
//  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSearchHistory',
  'chrome://cliqzmodules/content/CliqzSearchHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRedirect',
  'chrome://cliqzmodules/content/CliqzRedirect.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCategories',
  'chrome://cliqzmodules/content/CliqzCategories.jsm');

var gBrowser = gBrowser || CliqzUtils.getWindow().gBrowser;
var Services = Services || CliqzUtils.getWindow().Services;

var CLIQZ = CLIQZ || {};
CLIQZ.Core = CLIQZ.Core || {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keydown', 'keypress'],
    _messageOFF: true, // no message shown
    _lastKey:0,
    _updateAvailable: false,

    init: function(){
        // TEMP fix 20.01.2015 - try to remove all CliqzHistory listners
        var listners = window.gBrowser.mTabsProgressListeners;
        for(var i=0; i<listners.length; i++){
            var l = listners[i];
            if(l["QueryInterface"] &&
               l["onLocationChange"] &&
               l["onStateChange"] &&
               l["onStatusChange"]){

                //if this listner matches the signature of CliqzHistory - remove it
                window.gBrowser.removeTabsProgressListener(l);
                break;
            }
        }
        // end TEMP fix

        XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
            'chrome://cliqzmodules/content/CliqzHistory.jsm');

        if (!CliqzUtils.isPrivate(window)) {
          try {
            var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            hs.addObserver(CliqzHistory.historyObserver, false);
          } catch(e) {}
        }

        CliqzRedirect.addHttpObserver();
        CliqzUtils.init(window);
        CliqzHistory.initDB();

        //CliqzHistoryPattern.preloadColors();
        if(CliqzUtils.getPref('categoryAssessment', false)){
            CliqzCategories.init();
        }

        CliqzSpellCheck.initSpellCorrection();

        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/browser.css');
        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/browser_progress.css');
        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/skin/brands.css');


        //create a new panel for cliqz to avoid inconsistencies at FF startup
        var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
        popup.setAttribute("type", 'autocomplete-richlistbox');
        popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
        popup.setAttribute("noautofocus", 'true');
        CLIQZ.Core.elem.push(popup);
        document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = popup;

        CLIQZ.UI.init();

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', 'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

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

        var urlBarGo = document.getElementById('urlbar-go-button');
        CLIQZ.Core._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
        urlBarGo.setAttribute('onclick', "CLIQZ.Core.urlbarGoClick(); " + CLIQZ.Core._urlbarGoButtonClick);

        // preferences
        //CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        //CLIQZ.Core.popup.style.maxHeight = CliqzUtils.getPref('popupHeight', 190) + 'px';

        CliqzAutocomplete.init();

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        // Add search history dropdown
        var searchHistoryContainer = CliqzSearchHistory.insertBeforeElement();
        CLIQZ.Core.elem.push(searchHistoryContainer);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            CliqzLanguage.init(window);
            window.gBrowser.addProgressListener(CliqzLanguage.listener);
            window.gBrowser.addTabsProgressListener(CliqzHistory.listener);
            window.gBrowser.tabContainer.addEventListener("TabOpen", function(){
                var tabs = window.gBrowser.tabs;
                var curPanel = window.gBrowser.selectedTab.linkedPanel;
                var maxId = -1, newPanel = "";
                for (var i = 0; i < tabs.length; i++) {
                    var id = tabs.item(i).linkedPanel.split("-");
                    id = parseInt(id[id.length-1]);
                    if (id > maxId) {
                        newPanel = tabs.item(i).linkedPanel;
                        maxId = id;
                    };
                };
                CliqzHistory.setTabData(newPanel, "query", CliqzHistory.getTabData(curPanel, 'query'));
                CliqzHistory.setTabData(newPanel, "queryDate", CliqzHistory.getTabData(curPanel, 'queryDate'));
            }, false);
        }

        window.addEventListener("keydown", CLIQZ.Core.handleKeyboardShortcuts);
        CLIQZ.Core.urlbar.addEventListener("drop", CLIQZ.Core.handleUrlbarTextDrop);
        CLIQZ.Core.urlbar.addEventListener('paste', CLIQZ.Core.handlePasteEvent);

        //CLIQZ.Core.whoAmI(true); //startup
        //CliqzUtils.log('Initialized', 'CORE');
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
    // trigger component reload at install/uninstall
    reloadComponent: function(el) {
        return el && el.parentNode && el.parentNode.insertBefore(el, el.nextSibling)
    },
    // restoring
    unload: function(soft){
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

        document.getElementById('urlbar-go-button').setAttribute('onclick', CLIQZ.Core._urlbarGoButtonClick);

        CliqzAutocomplete.unload();
        CliqzRedirect.unload();

        // remove listners
        if ('gBrowser' in window) {
            window.gBrowser.removeProgressListener(CliqzLanguage.listener);
            window.gBrowser.removeTabsProgressListener(CliqzHistory.listener);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        window.removeEventListener("keydown", CLIQZ.Core.handleKeyboardShortcuts);
        CLIQZ.Core.urlbar.removeEventListener("drop", CLIQZ.Core.handleUrlbarTextDrop);
        CLIQZ.Core.urlbar.removeEventListener('paste', CLIQZ.Core.handlePasteEvent);


        try {
            var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            hs.removeObserver(CliqzHistory.historyObserver);
        } catch(e) {}

        if(!soft){
            delete window.CliqzUtils;
            delete window.CliqzHistoryManager;
            delete window.CliqzAutocomplete;
            delete window.CliqzLanguage;
            delete window.CliqzResultProviders;
            delete window.CliqzCategories;
            delete window.CliqzABTests;
            delete window.CliqzSearchHistory;
            delete window.CliqzRedirect;
        }
    },
    restart: function(soft){
        CLIQZ.Core.unload(soft);
        CLIQZ.Core.init();
    },
    popupOpen: function(){
        CliqzAutocomplete.isPopupOpen = true;
        CLIQZ.Core.popupEvent(true);
    },
    popupClose: function(){
        CliqzAutocomplete.isPopupOpen = false;
        CliqzAutocomplete.markResultsDone(null);
        CLIQZ.Core.popupEvent(false);
        CLIQZ.UI.popupClosed = true;
    },
    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        CliqzUtils.telemetry(action);
    },
    urlbarfocus: function() {
        //try to 'heat up' the connection
        CliqzUtils.pingCliqzResults();

        CliqzAutocomplete.lastFocusTime = Date.now();
        CliqzSearchHistory.hideLastQuery();
        CLIQZ.Core.triggerLastQ = false;
        CliqzUtils.setQuerySession(CliqzUtils.rand(32));
        CLIQZ.Core.urlbarEvent('focus');

        if(CliqzUtils.getPref('newUrlFocus') == true && CLIQZ.Core.urlbar.value.trim().length > 0) {
            var urlbar = CLIQZ.Core.urlbar.mInputField.value;
            var search = urlbar;
            if (CliqzUtils.isUrl(search)) {
              search = search.replace("www.", "");
                if(search.indexOf("://") != -1) search = search.substr(search.indexOf("://")+3);
                if(search.indexOf("/") != -1) search = search.split("/")[0];
            }
            CLIQZ.Core.urlbar.mInputField.setUserInput(search);
            CLIQZ.Core.popup._openAutocompletePopup(CLIQZ.Core.urlbar, CLIQZ.Core.urlbar);
            CLIQZ.Core.urlbar.mInputField.value = urlbar;
        }
    },
    urlbarblur: function(ev) {
        CliqzAutocomplete.resetSpellCorr();

        if(CLIQZ.Core.triggerLastQ)
            CliqzSearchHistory.lastQuery();

        CLIQZ.Core.urlbarEvent('blur');

        CliqzAutocomplete.lastFocusTime = null;
        CliqzAutocomplete.resetSpellCorr();
        CLIQZ.UI.sessionEnd();
    },
    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CliqzUtils.telemetry(action);
    },
    urlbarGoClick: function(){
        //we somehow break default FF -> on goclick the autocomplete doesnt get considered
        CLIQZ.Core.urlbar.value = CLIQZ.Core.urlbar.mInputField.value;

        var action = {
            type: 'activity',
            position_type: ['inbar_' + (CliqzUtils.isUrl(CLIQZ.Core.urlbar.mInputField.value)? 'url': 'query')],
            autocompleted: CliqzAutocomplete.lastAutocompleteType,
            action: 'urlbar_go_click'
        };
        CliqzUtils.telemetry(action);
    },
    _whoAmItimer: null,
    whoAmI: function(startup){
        // schedule another signal
        CLIQZ.Core._whoAmItimer = setTimeout(function(){
            if(CLIQZ && CLIQZ.Core) CLIQZ.Core.whoAmI();
        }, CLIQZ.Core.INFO_INTERVAL);

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
                        width: window.document.width,
                        height: window.document.height,
                        version: beVersion,
                        history_days: history.days,
                        history_urls: history.size,
                        startup: startup? true: false,
                        prefs: CliqzUtils.getPrefs(),
                        defaultSearchEngine: defaultSearchEngine
                    };

                CliqzUtils.telemetry(info);
            });
        });
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
        CliqzAutocomplete._lastKey = ev.keyCode;
        var cancel = CLIQZ.UI.keyDown(ev);
        cancel && ev.preventDefault();
    },
    urlbarkeypress: function(ev) {
        if (!ev.ctrlKey && !ev.altKey && !ev.metaKey) {
            var urlbar = CLIQZ.Core.urlbar;
            if (urlbar.mInputField.selectionEnd !== urlbar.mInputField.selectionStart &&
                urlbar.mInputField.value[urlbar.mInputField.selectionStart] == String.fromCharCode(ev.charCode)) {
                // prevent the redraw in urlbar but send the search signal
                var query = urlbar.value,
                    old = urlbar.mInputField.value,
                    start = urlbar.mInputField.selectionStart;
                query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(ev.charCode);
                /* CliqzUtils.log('prevent default', 'Cliqz AS');
                if (!CliqzAutosuggestion.active) {
                    urlbar.mInputField.setUserInput(query);
                    CliqzUtils.log('set new search to: ' + query, 'Cliqz AS');
                } */
                urlbar.mInputField.setUserInput(query);
                urlbar.mInputField.value = old;
                urlbar.mInputField.setSelectionRange(start+1, urlbar.mInputField.value.length);
                ev.preventDefault();
            } /* else {
                CliqzAutosuggestion.active = false;
            } */
        } /* else {
           CliqzAutosuggestion.active = false;
        } */
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
    // autocomplete query inline
    autocompleteQuery: function(firstResult, firstTitle){
        var urlBar = CLIQZ.Core.urlbar;
        if (urlBar.selectionStart !== urlBar.selectionEnd) {
            // TODO: temp fix for flickering,
            // need to make it compatible with auto suggestion
            urlBar.mInputField.value = urlBar.mInputField.value.slice(0, urlBar.selectionStart);
        }
        if(CLIQZ.Core._lastKey === KeyEvent.DOM_VK_BACK_SPACE ||
           CLIQZ.Core._lastKey === KeyEvent.DOM_VK_DELETE){
            if (CliqzAutocomplete.highlightFirstElement) {
                CLIQZ.UI.selectFirstElement();
            }
            CliqzAutocomplete.highlightFirstElement = false;
            return;
        }
        CliqzAutocomplete.highlightFirstElement = false;

        // History cluster does not have a url attribute, therefore firstResult is null
        var lastPattern = CliqzAutocomplete.lastPattern, fRes = lastPattern.filteredResults();
        if(!firstResult && lastPattern && fRes.length > 1)
          firstResult = fRes[0].url;

        var r, endPoint = urlBar.value.length;
        var lastPattern = CliqzAutocomplete.lastPattern;
        var results = lastPattern ? fRes : [];

        // try to update misspelings like ',' or '-'
        if (CLIQZ.Core.cleanUrlBarValue(urlBar.value).toLowerCase() != urlBar.value.toLowerCase()) {
            urlBar.mInputField.value = CLIQZ.Core.cleanUrlBarValue(urlBar.value).toLowerCase();
        }
        // Use first entry if there are no patterns
        if (results.length === 0 || lastPattern.query != urlBar.value ||
            firstResult != results[0].url) {
            results[0] = [];
            results[0].url = firstResult;
            results[0].title = firstTitle;
            results[0].query = [];
        }
        if (!CliqzUtils.isUrl(results[0].url)) return;

        // Detect autocomplete
        var autocomplete = CliqzHistoryPattern.autocompleteTerm(urlBar.value, results[0], true);

        // If new style autocomplete and it is not enabled, ignore the autocomplete
        if(autocomplete.type != "url" && !CliqzUtils.getPref('newAutocomplete', false)){
            return;
        }

        // Apply autocomplete
        CliqzAutocomplete.lastAutocompleteType = autocomplete.type;
        if (autocomplete.autocomplete) {
            urlBar.mInputField.value = autocomplete.urlbar;
            urlBar.setSelectionRange(autocomplete.selectionStart, urlBar.mInputField.value.length);
            CliqzAutocomplete.lastAutocomplete = autocomplete.full_url;
            CLIQZ.UI.cursor = autocomplete.selectionStart;

        }
        // Highlight first entry in dropdown
        if (autocomplete.highlight) {
            // Cut urlbar to max 80 characters
            // Error-prone, disabled for now
            /*if (urlBar.mInputField.value.length > 80) {
              urlBar.mInputField.value = urlBar.mInputField.value.substr(0,80) + "...";
              urlBar.setSelectionRange(autocomplete.selectionStart, urlBar.mInputField.value.length);
            }*/
            CliqzAutocomplete.highlightFirstElement = true;
            CLIQZ.UI.selectFirstElement();
        }
},
    cleanUrlBarValue: function(val){
        var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
            host = cleanParts[0],
            pathLength = 0,
            SYMBOLS = /,|\./g;

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
    },
    handleKeyboardShortcuts: function(ev) {
        if(ev.keyCode == KeyEvent.DOM_VK_K && (ev.ctrlKey || ev.metaKey)){
            CLIQZ.Core.urlbar.focus();
            CLIQZ.Core.handleKeyboardShortcutsAction(ev.keyCode)

            ev.preventDefault();
            ev.stopPropagation();
        }
    },
    handleKeyboardShortcutsAction: function(val){
        CliqzUtils.telemetry({
            type: 'activity',
            action: 'keyboardShortcut',
            value: val
        });
    },
    handleUrlbarTextDrop: function(ev){
        var dTypes = ev.dataTransfer.types;
        if (dTypes.indexOf && dTypes.indexOf("text/plain") !== -1 ||
            dTypes.contains && dTypes.contains("text/plain") !== -1){
            // open dropdown on text drop
            var inputField = CLIQZ.Core.urlbar.mInputField, val = inputField.value;
            inputField.setUserInput('');
            inputField.setUserInput(val);

            CliqzUtils.telemetry({
                type: 'activity',
                action: 'textdrop'
            });
        }
    },
    handlePasteEvent: function(ev){
        //wait for the value to change
        setTimeout(function(){
            CliqzUtils.telemetry({
                type: 'activity',
                action: 'paste',
                current_length: ev.target.value.length
            });
        }, 0);
    }
};
