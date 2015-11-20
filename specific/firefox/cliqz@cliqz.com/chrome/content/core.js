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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryCluster',
  'chrome://cliqzmodules/content/CliqzHistoryCluster.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzDemo',
  'chrome://cliqzmodules/content/CliqzDemo.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHandlebars',
  'chrome://cliqzmodules/content/CliqzHandlebars.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzExtOnboarding',
  'chrome://cliqzmodules/content/CliqzExtOnboarding.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSearchHistory',
  'chrome://cliqzmodules/content/CliqzSearchHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRedirect',
  'chrome://cliqzmodules/content/CliqzRedirect.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHumanWeb',
  'chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCategories',
  'chrome://cliqzmodules/content/CliqzCategories.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTour',
  'chrome://cliqzmodules/content/CliqzTour.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAntiPhishing',
  'chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZEnvironment',
  'chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

var gBrowser = gBrowser || CliqzUtils.getWindow().gBrowser;
var Services = Services || CliqzUtils.getWindow().Services;

if(window.CLIQZ === undefined)
    Object.defineProperty( window, 'CLIQZ', {configurable:true, value:{}});
else {
    try{
        //faulty uninstall of previous version
        window.CLIQZ = window.CLIQZ || {};
    } catch(e){}
}

window.CLIQZ.COMPONENTS = []; //plug and play components
window.CLIQZ.Core = {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keypress'],
    _messageOFF: true, // no message shown
    _updateAvailable: false,
    genericPrefs: Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefBranch),

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

            if(CliqzUtils.getPref("humanWeb", false)){
                //Also need to add for Humanweb
                hs.addObserver(CliqzHumanWeb.historyObserver, false);
            }
          } catch(e) {}
        }



        CliqzRedirect.addHttpObserver();
        CliqzUtils.init(window);
        CliqzHistory.initDB();

        if(CliqzUtils.getPref('categoryAssessment', false)){
            CliqzCategories.init();
        }

        if (CliqzUtils.getPref('newsTopsitesAssessment', false) &&
            !CliqzUtils.getPref('newsTopsitesAssessmentDone', false)) {
            CliqzCategories.assessNewsTopsites();
        }
        CliqzSpellCheck.initSpellCorrection();

        CLIQZ.Core.addCSS(document,'chrome://cliqzres/content/styles/css/extension.css');


        //create a new panel for cliqz to avoid inconsistencies at FF startup
        var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
        popup.setAttribute("type", 'autocomplete-richlistbox');
        popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
        popup.setAttribute("noautofocus", 'true');
        CLIQZ.Core.elem.push(popup);
        document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

        CLIQZ.Core.urlbar = document.getElementById('urlbar');

        CLIQZ.Core.popup = popup;

        CLIQZ.UI.init(CLIQZ.Core.urlbar);

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', 'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/
        CLIQZ.Core.urlbar.setAttribute('pastetimeout', 0)

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

        CLIQZ.COMPONENTS.forEach(function(c){
          c.init && c.init();
        });

        var urlBarGo = document.getElementById('urlbar-go-button');
        CLIQZ.Core._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
        urlBarGo.setAttribute('onclick', "CLIQZ.Core.urlbarGoClick(); " + CLIQZ.Core._urlbarGoButtonClick);

        // preferences
        //CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        //CLIQZ.Core.popup.style.maxHeight = CliqzUtils.getPref('popupHeight', 190) + 'px';

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        CLIQZ.Core.historyDropMarker = document.getAnonymousElementByAttribute(CLIQZ.Core.urlbar, "anonid", "historydropmarker")

        // Add search history dropdown
        var searchHistoryContainer = CliqzSearchHistory.insertBeforeElement(null, window);
        CLIQZ.Core.elem.push(searchHistoryContainer);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            CliqzLanguage.init(window);
            CliqzDemo.init(window);
            if(CliqzUtils.getPref("humanWeb", false) && !CliqzUtils.getPref("dnt", false) && !CliqzUtils.isPrivate(window)){
                CliqzHumanWeb.init(window);
                window.gBrowser.addProgressListener(CliqzHumanWeb.listener);
            }

            // Update CLIQZ history data
            CliqzHistory.tabOpen({
              target: window.gBrowser.selectedTab
            });
            CliqzHistory.tabSelect({
              target: window.gBrowser.selectedTab
            });
            // CLIQZ history listener
            window.addEventListener('close', CliqzHistory.updateAllTabs);
            window.addEventListener('mousemove', CliqzHistory.mouseMove(window.gBrowser));
            window.addEventListener('click', CliqzHistory.action);
            window.addEventListener('keydown', CliqzHistory.action);
            window.gBrowser.addTabsProgressListener(CliqzHistory.listener);
            window.gBrowser.tabContainer.addEventListener("TabOpen", CliqzHistory.tabOpen, false);
            window.gBrowser.tabContainer.addEventListener("TabClose", CliqzHistory.tabClose, false);
            window.gBrowser.tabContainer.addEventListener("TabSelect", CliqzHistory.tabSelect, false);

            window.gBrowser.addTabsProgressListener(CliqzLanguage.listener);

            CliqzEvents.pub('core_window_added', window);
        }

        window.addEventListener("keydown", CLIQZ.Core.handleKeyboardShortcuts);
        CLIQZ.Core.urlbar.addEventListener("drop", CLIQZ.Core.handleUrlbarTextDrop);
        CLIQZ.Core.urlbar.addEventListener('paste', CLIQZ.Core.handlePasteEvent);

        CliqzExtOnboarding.init(window);
        CLIQZEnvironment.updateGeoLocation();
        //CLIQZ.Core.whoAmI(true); //startup
        //CliqzUtils.log('Initialized', 'CORE');

        // antiphishing listener
        //gBrowser.addEventListener("load", CliqzAntiPhishing._loadHandler, true);

        /*
            dataCollectionMessageState
                    0 - not shown
                    1 - shown
                    2 - ignored
                    3 - learn more
        */
        if(CliqzUtils.getPref('dataCollectionMessageState', 0) == 0){
          //CLIQZ.Core._dataCollectionTimer = setTimeout(CLIQZ.Core.showDataCollectionMessage, 1000);
        }
    },
    showDataCollectionMessage: function(){
      function updateDataCollectionState(state){
        CliqzUtils.telemetry({
          type: 'dataCollectionMessage',
          state: state
        });

        CliqzUtils.setPref('dataCollectionMessageState', state);
      }

      var buttons = [{
        label: CliqzUtils.getLocalizedString("learnMore"),
        callback: function(){
          // we only have the website localized in english end german
          var lang = CliqzUtils.getLanguage(window) == 'de' ? '' : 'en/',
              learnMoreUrl = 'chrome://cliqz/content/humanweb.html';

          gBrowser.selectedTab  = gBrowser.addTab(learnMoreUrl);
          updateDataCollectionState(3);
        }
      }];

      document.getElementById("global-notificationbox").appendNotification(
        CliqzUtils.getLocalizedString("dataCollection"),
        null,
        null,
        document.getElementById("global-notificationbox").PRIORITY_INFO_HIGH,
        buttons,
        function(){
          // notification hides if the user closes it or presses learn more
          if(CliqzUtils.getPref('dataCollectionMessageState', 0) < 2){
            updateDataCollectionState(2);
          }
        }
      );

      updateDataCollectionState(1);
    },
    responsiveClasses: function(){}, //tmp 15.09.2015 - some older version do not correctly deregister a resize handler
    addCSS: function(doc, path){
        //add this element into 'elem' to be sure we remove it at extension shutdown
        CLIQZ.Core.elem.push(
            CLIQZ.Core.addStylesheetToDoc(doc, path)
        );
    },
    addStylesheetToDoc: function(doc, path) {
        var stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = path;
        stylesheet.type = 'text/css';
        stylesheet.style.display = 'none';
        doc.documentElement.appendChild(stylesheet);

        return stylesheet;
    },
    checkSession: function(){
        var prefs = CliqzUtils.cliqzPrefs;
        if (!prefs.prefHasUserValue('session') || prefs.getCharPref('session') == ''){
            CliqzUtils.httpGet('chrome://cliqz/content/source.json',
                function success(req){
                    var source = JSON.parse(req.response).shortName;
                    var session = CLIQZ.Core.generateSession(source);
                    prefs.setCharPref('session', session);
                    CLIQZ.Core.showTutorial(true, session);
                },
                function error(){
                    var session = CLIQZ.Core.generateSession();
                    prefs.setCharPref('session', session);
                    CLIQZ.Core.showTutorial(true, session);
                }
            );
        } else {
            CLIQZ.Core.showTutorial(false);
        }
    },
    generateSession: function(source){
        CliqzUtils.setSupportInfo()

        return CliqzUtils.rand(18) + CliqzUtils.rand(6, '0123456789')
               + '|' +
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    _tutorialTimeout:null,
    showTutorial: function(onInstall, session){
        var showNewOnboarding = false;


        try {
            var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
                .getService(Components.interfaces.nsIXULAppInfo);
            var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
                .getService(Components.interfaces.nsIVersionComparator);

            showNewOnboarding = (versionChecker.compare(appInfo.version, "36.0") >= 0);
        } catch (e) {
            CliqzUtils.log('error checking browser version: ' + e, "Cliqz Onboarding");
        }

        var tutorialUrl = showNewOnboarding ?
            CliqzUtils.NEW_TUTORIAL_URL : CliqzUtils.TUTORIAL_URL;
        CliqzUtils.setPref('onboarding_versionShown',
            showNewOnboarding ? CliqzTour.VERSION : "0.0");
        CliqzUtils.setPref('onboarding_finishedWatching', false);

        if (onInstall) {
            CLIQZ.Core._tutorialTimeout = setTimeout(function() {
                gBrowser.selectedTab = gBrowser.addTab(tutorialUrl);
            }, 100);
        }
    },
    // trigger component reload at install/uninstall
    reloadComponent: function(el) {
        return el && el.parentNode && el.parentNode.insertBefore(el, el.nextSibling)
    },
    // restoring
    unload: function(soft){
        clearTimeout(CLIQZ.Core._tutorialTimeout);
        clearTimeout(CLIQZ.Core._whoAmItimer);
        clearTimeout(CLIQZ.Core._dataCollectionTimer);

        CLIQZ.UI.unload();

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

        CliqzRedirect.unload();
        CliqzExtOnboarding.unload(window);


        // remove listeners
        if ('gBrowser' in window) {
            window.gBrowser.removeTabsProgressListener(CliqzLanguage.listener);
            window.gBrowser.removeTabsProgressListener(CliqzHistory.listener);

            window.removeEventListener('close', CliqzHistory.updateAllTabs);
            window.removeEventListener('mousemove', CliqzHistory.mouseMove(window.gBrowser));
            window.removeEventListener('click', CliqzHistory.action);
            window.removeEventListener('keydown', CliqzHistory.action);
            window.gBrowser.tabContainer.removeEventListener("TabClose", CliqzHistory.tabClose, false);
            window.gBrowser.tabContainer.removeEventListener("TabSelect", CliqzHistory.tabSelect, false);
            window.gBrowser.tabContainer.removeEventListener("TabOpen", CliqzHistory.tabOpen);
            CliqzHistory.removeAllListeners();
            CliqzDemo.unload(window);
            CLIQZ.COMPONENTS.forEach(function(c){
              c.unload && c.unload();
            })

            if(CliqzUtils.getPref("humanWeb", false) && !CliqzUtils.getPref("dnt", false) && !CliqzUtils.isPrivate(window) ){
                window.gBrowser.removeProgressListener(CliqzHumanWeb.listener);

                var numTabs = window.gBrowser.tabContainer.childNodes.length;
                for (var i=0; i<numTabs; i++) {
                  var currentTab = gBrowser.tabContainer.childNodes[i];
                  var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                  currentBrowser.contentDocument.removeEventListener("keypress", CliqzHumanWeb.captureKeyPressPage);
                  currentBrowser.contentDocument.removeEventListener("mousemove", CliqzHumanWeb.captureMouseMovePage);
                  currentBrowser.contentDocument.removeEventListener("mousedown", CliqzHumanWeb.captureMouseClickPage);
                  currentBrowser.contentDocument.removeEventListener("scroll", CliqzHumanWeb.captureScrollPage);
                  currentBrowser.contentDocument.removeEventListener("copy", CliqzHumanWeb.captureCopyPage);
                }
            }
            CliqzEvents.pub('core_window_removed', window);
            // antiphishing listener
            // gBrowser.removeEventListener("load", CliqzAntiPhishing._loadHandler, true);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        window.removeEventListener("keydown", CLIQZ.Core.handleKeyboardShortcuts);
        CLIQZ.Core.urlbar.removeEventListener("drop", CLIQZ.Core.handleUrlbarTextDrop);
        CLIQZ.Core.urlbar.removeEventListener('paste', CLIQZ.Core.handlePasteEvent);


        if (!CliqzUtils.isPrivate(window)) {
            try {
                var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
                hs.removeObserver(CliqzHistory.historyObserver);

                if(CliqzUtils.getPref("humanWeb", false) ){
                    //Also, remove from Humanweb
                    hs.removeObserver(CliqzHumanWeb.historyObserver);
                }
            } catch(e) {}
        }



        if(!soft){
            delete window.CliqzUtils;
            delete window.CliqzHistoryManager;
            delete window.CliqzAutocomplete;
            delete window.CliqzLanguage;
            delete window.CliqzDemo;
            delete window.CliqzExtOnboarding;
            delete window.CliqzResultProviders;
            delete window.CliqzCategories;
            delete window.CliqzSearchHistory;
            delete window.CliqzRedirect;
            delete window.CliqzHumanWeb;
            delete window.CliqzHistory;
            delete window.CliqzHistoryCluster;
            delete window.CliqzHandlebars;
            delete window.CliqzTour;
            delete window.CliqzAntiPhishing;
        }
    },
    restart: function(soft){
        CLIQZ.Core.unload(soft);
        CLIQZ.Core.init();
    },
    popupOpen: function(){
        CliqzAutocomplete.isPopupOpen = true;
        CLIQZ.Core.popupEvent(true);
        CLIQZ.UI.popupClosed = false;
    },
    popupClose: function(e){
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

        if (open) {
            action['width'] = CLIQZ.Core.popup ?
                Math.round(CLIQZ.Core.popup.width) : 0;
        }

        CliqzUtils.telemetry(action);
    },
    urlbarfocus: function() {
        //try to 'heat up' the connection
        CliqzUtils.pingCliqzResults();

        CliqzAutocomplete.lastFocusTime = Date.now();
        CliqzSearchHistory.hideLastQuery();
        CLIQZ.Core.triggerLastQ = false;
        CliqzUtils.setSearchSession(CliqzUtils.rand(32));
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

        CliqzEvents.pub('core_urlbar_' + ev);
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
        var screenWidth = {value: 0}, screenHeight = {value: 0};
        try {
            var screenMan = Components.classes["@mozilla.org/gfx/screenmanager;1"]
                .getService(Components.interfaces.nsIScreenManager);
            screenMan.primaryScreen.GetRect({}, {}, screenWidth, screenHeight);
        } catch(e) { }

        CliqzHistoryManager.getStats(function(history){
            var info = {
                type: 'environment',
                agent: navigator.userAgent,
                language: navigator.language,
                width: window.document.width,
                height: window.document.height,
                screen_width: screenWidth.value,
                screen_height: screenHeight.value,
                version: CliqzUtils.extensionVersion,
                history_days: history.days,
                history_urls: history.size,
                startup: startup? true: false,
                prefs: CliqzUtils.getPrefs(),
                defaultSearchEngine: defaultSearchEngine,
                private_window: CliqzUtils.isPrivate(window)
            };

            CliqzUtils.telemetry(info);
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
    // autocomplete query inline
    autocompleteQuery: function(firstResult, firstTitle, data){
        var urlBar = CLIQZ.Core.urlbar;
        if (urlBar.selectionStart !== urlBar.selectionEnd) {
            // TODO: temp fix for flickering,
            // need to make it compatible with auto suggestion
            urlBar.mInputField.value = urlBar.mInputField.value.slice(0, urlBar.selectionStart);
        }
        if(CliqzAutocomplete._lastKey  === KeyEvent.DOM_VK_BACK_SPACE ||
           CliqzAutocomplete._lastKey  === KeyEvent.DOM_VK_DELETE){
            if (CliqzAutocomplete.selectAutocomplete) {
                CLIQZ.UI.selectAutocomplete();
            }
            CliqzAutocomplete.selectAutocomplete = false;
            return;
        }
        CliqzAutocomplete.selectAutocomplete = false;

        // History cluster does not have a url attribute, therefore firstResult is null
        var lastPattern = CliqzAutocomplete.lastPattern,
            fRes = lastPattern ? lastPattern.filteredResults() : null;
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
          CliqzUtils.generalizeUrl(firstResult) != CliqzUtils.generalizeUrl(results[0].url)) {
            var newResult = [];
            newResult.url = firstResult;
            newResult.title = firstTitle;
            newResult.query = [];
            results.unshift(newResult);
        }
        if (!CliqzUtils.isUrl(results[0].url)) return;

        // Detect autocomplete
        var autocomplete = CliqzHistoryCluster.autocompleteTerm(urlBar.value, results[0], true);
        if(!autocomplete.autocomplete && results.length > 1 &&
          CliqzUtils.generalizeUrl(results[0].url) != CliqzUtils.generalizeUrl(urlBar.value)) {
          autocomplete = CliqzHistoryCluster.autocompleteTerm(urlBar.value, results[1], true);
          CLIQZ.UI.autocompleteEl = 1;
        } else {
          CLIQZ.UI.autocompleteEl = 0;
        }

        // No autocomplete
        if(!autocomplete.autocomplete ||
           !CLIQZ.Core.genericPrefs.getBoolPref("browser.urlbar.autoFill") || // user has disabled autocomplete
           (autocomplete.type != "url" && !CliqzUtils.getPref('newAutocomplete', false)) || // types other than 'url' are experimental
           (CLIQZ.UI.autocompleteEl == 1 && autocomplete.autocomplete && JSON.stringify(data).indexOf(autocomplete.full_url) == -1)){
            CLIQZ.UI.clearAutocomplete();
            CliqzAutocomplete.lastAutocomplete = null;
            CliqzAutocomplete.lastAutocompleteType = null;
            CliqzAutocomplete.selectAutocomplete = false;
            return;
        }

        // Apply autocomplete
        CliqzAutocomplete.lastAutocompleteType = autocomplete.type;
        CliqzAutocomplete.lastAutocompleteLength = autocomplete.full_url.length;
        CliqzAutocomplete.lastAutocompleteUrlbar = autocomplete.urlbar;
        CliqzAutocomplete.lastAutocompleteSelectionStart = autocomplete.selectionStart;
        urlBar.mInputField.value = autocomplete.urlbar;
        urlBar.setSelectionRange(autocomplete.selectionStart, urlBar.mInputField.value.length);
        CliqzAutocomplete.lastAutocomplete = autocomplete.full_url;
        CLIQZ.UI.cursor = autocomplete.selectionStart;

        // Highlight first entry in dropdown
        if (autocomplete.highlight) {
            CliqzAutocomplete.selectAutocomplete = true;
            CLIQZ.UI.selectAutocomplete();
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
    getQuerySession: function() {
        return _querySession;
    },
    handleKeyboardShortcuts: function(ev) {
        if(ev.keyCode == KeyEvent.DOM_VK_K && !CLIQZ.Core.urlbar.focused){
            if((CliqzUtils.isMac(window)  &&  ev.metaKey && !ev.ctrlKey && !ev.altKey) ||  // CMD-K
               (!CliqzUtils.isMac(window) && !ev.metaKey &&  ev.ctrlKey && !ev.altKey)){   // CTRL-K
                CLIQZ.Core.urlbar.focus();
                CLIQZ.Core.handleKeyboardShortcutsAction(ev.keyCode);
                ev.preventDefault();
                ev.stopPropagation();
            }
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
            // ensure the lastSearch value is always correct although paste event has 1 second throttle time.
            CliqzAutocomplete.lastSearch = ev.target.value;
            CliqzUtils.telemetry({
                type: 'activity',
                action: 'paste',
                current_length: ev.target.value.length
            });
        }, 0);
    },
    refreshButtons: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext()

            try{
                var btn = win.document.getElementById('cliqz-button')
                CLIQZ.Core.createQbutton(win, btn.children.cliqz_menupopup);
            } catch(e){}
        }
    },
    createQbutton: function(win, menupopup){
        var doc = win.document,
            lang = CliqzUtils.getLanguage(win);

        //clean it
        while(menupopup.lastChild)
          menupopup.removeChild(menupopup.lastChild);

        function feedback_FAQ(){
            CliqzUtils.httpGet('chrome://cliqz/content/source.json',
                function success(req){
                    var source = JSON.parse(req.response).shortName;
                    CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/' + lang + '/feedback/' + CliqzUtils.extensionVersion + '-' + source);
                },
                function error(){
                    CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/' + lang + '/feedback/' + CliqzUtils.extensionVersion);
                }
            );
        }

        //feedback and FAQ
        menupopup.appendChild(CLIQZ.Core.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnFeedbackFaq'), feedback_FAQ, 'feedback'));
        menupopup.appendChild(CLIQZ.Core.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnTipsTricks'), function(){
          CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/home/cliqz-triqz');
        }, 'triqz'));
        menupopup.appendChild(doc.createElement('menuseparator'));

      if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
        menupopup.appendChild(CLIQZ.Core.createSearchOptions(doc));
        menupopup.appendChild(CLIQZ.Core.createAdultFilterOptions(doc));
        menupopup.appendChild(CLIQZ.Core.createLocationPermOptions(win));

        CLIQZ.COMPONENTS.forEach(function(c){
          var btn = c.button && c.button(win);
          if(btn) menupopup.appendChild(btn);
        });
      }
      else {
        menupopup.appendChild(CLIQZ.Core.createActivateButton(doc));
      }
      menupopup.appendChild(CLIQZ.Core.createHumanMenu(win));
    },
    createSearchOptions: function(doc){
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup'),
            engines = CliqzResultProviders.getSearchEngines(),
            def = Services.search.currentEngine.name;

        menu.setAttribute('label', CliqzUtils.getLocalizedString('btnDefaultSearchEngine'));

        for(var i in engines){

            var engine = engines[i],
                item = doc.createElement('menuitem');
            item.setAttribute('label', '[' + engine.prefix + '] ' + engine.name);
            item.setAttribute('class', 'menuitem-iconic');
            item.engineName = engine.name;
            if(engine.name == def){
                item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
            }
            item.addEventListener('command', function(event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
            }, false);

            menupopup.appendChild(item);
        }

        menu.appendChild(menupopup);

        return menu;
    },
    createAdultFilterOptions: function(doc) {
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup');

        menu.setAttribute('label', CliqzUtils.getLocalizedString('result_filter'));

        var filter_levels = CliqzUtils.getAdultFilterState();

        for(var level in filter_levels) {
          var item = doc.createElement('menuitem');
          item.setAttribute('label', filter_levels[level].name);
          item.setAttribute('class', 'menuitem-iconic');

          if(filter_levels[level].selected){
            item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
          }

          item.filter_level = new String(level);
          item.addEventListener('command', function(event) {
            CliqzUtils.setPref('adultContentFilter', this.filter_level.toString());
            CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
          }, false);

          menupopup.appendChild(item);
        };
        menu.appendChild(menupopup);
        return menu;
    },

    createLocationPermOptions: function(win) {
      var doc = win.document,
          menu = doc.createElement('menu'),
          menupopup = doc.createElement('menupopup');

      menu.setAttribute('label', CliqzUtils.getLocalizedString('share_location'));

      var filter_levels = CLIQZ.Core.getLocationPermState();

      for(var level in filter_levels) {
        var item = doc.createElement('menuitem');
        item.setAttribute('label', filter_levels[level].name);
        item.setAttribute('class', 'menuitem-iconic');


        if(filter_levels[level].selected){
          item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';

        }

        item.filter_level = new String(level);
        item.addEventListener('command', function(event) {
            CLIQZEnvironment.setLocationPermission(window, this.filter_level.toString());
        }, false);

        menupopup.appendChild(item);
      };

      var learnMore = CLIQZ.Core.createSimpleBtn(
          doc,
          CliqzUtils.getLocalizedString('learnMore'),
          function(){
            var lang = CliqzUtils.getLanguage(win) == 'de' ? '' : 'en/';
            CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/' + lang + 'privacy');
          },
          'location_learn_more'
      );
      learnMore.setAttribute('class', 'menuitem-iconic');
      menupopup.appendChild(doc.createElement('menuseparator'));
      menupopup.appendChild(learnMore);

      menu.appendChild(menupopup);
      return menu;
    },

    createSimpleBtn: function(doc, txt, func, action){
        var item = doc.createElement('menuitem');
        item.setAttribute('label', txt);
        item.setAttribute('action', action);
        if(func)
            item.addEventListener(
                'command',
                function() {
                    CliqzUtils.telemetry({
                        type: 'activity',
                        action: 'cliqz_menu_button',
                        button_name: action
                    });
                    func();
                },
                false);
        else
            item.setAttribute('disabled', 'true');

        return item
    },
    createCheckBoxItem: function(doc, key, label, activeState, onChange){
      function optInOut(){
          return CliqzUtils.getPref(key, false) == (activeState == 'undefined' ? true : activeState)?
                           'url(chrome://cliqzres/content/skin/opt-in.svg)':
                           'url(chrome://cliqzres/content/skin/opt-out.svg)';
      }

      var btn = doc.createElement('menuitem');
      btn.setAttribute('label', label || key);
      btn.setAttribute('class', 'menuitem-iconic');
      btn.style.listStyleImage = optInOut();
      btn.addEventListener('command', function(event) {
          if(onChange){
            onChange();
          } else {
            CliqzUtils.setPref(key, !CliqzUtils.getPref(key, false));
          }

          btn.style.listStyleImage = optInOut();
      }, false);

      return btn;
    },
    //TODO: move inside HumanWeb
    changeHumanWebState: function(){
        Components.utils.import('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

        if(CliqzUtils.getPref("humanWeb", false) && !CliqzUtils.getPref('dnt', false)){
          CliqzHumanWeb.unloadAtBrowser();
        } else {
          CliqzHumanWeb.initAtBrowser();
        }

        CliqzUtils.extensionRestart(function(){
          CliqzUtils.setPref('dnt', !CliqzUtils.getPref('dnt', false));
        });
    },
    //TODO: move inside HumanWeb
    createHumanMenu: function(win){
      var doc = win.document,
          menu = doc.createElement('menu'),
          menuPopup = doc.createElement('menupopup');


      menu.setAttribute('label', 'Human Web');

      // HumanWeb checkbox
      menuPopup.appendChild(
        CLIQZ.Core.createCheckBoxItem(
          doc,
          'dnt',
          CliqzUtils.getLocalizedString('btnSafeSearch'),
          false,
          CLIQZ.Core.changeHumanWebState)
      );

      // HumanWeb learn more button
      menuPopup.appendChild(
        CLIQZ.Core.createSimpleBtn(
          doc,
          CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
          function(){
            CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/privacy#humanweb');
          },
          'safe_search_desc')
      );

      menu.appendChild(menuPopup)
      return menu
    },
    createActivateButton: function(doc) {
      var button = doc.createElement('menuitem');
      button.setAttribute('label', CliqzUtils.getLocalizedString('btnActivateCliqz'));
      button.addEventListener('command', function(event) {
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            win.CLIQZ.Core.init();
        }
        CliqzUtils.setPref("cliqz_core_disabled", false);
        CLIQZ.Core.refreshButtons();

        CliqzUtils.telemetry({
          type: 'setting',
          setting: 'international',
          value: 'activate'
        });
      });
      return button;
    },
    getLocationPermState: function(){
        var data = {
          'yes': {
                  name: CliqzUtils.getLocalizedString('always'),
                  selected: false
          },
          'ask': {
                  name: CliqzUtils.getLocalizedString('always_ask'),
                  selected: false
          },
          'no': {
              name: CliqzUtils.getLocalizedString('never'),
              selected: false
          }
        };

        data[CliqzUtils.getPref('share_location', 'ask')].selected = true;

        return data;
    }
};
