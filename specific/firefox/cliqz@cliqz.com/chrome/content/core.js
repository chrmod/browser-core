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

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZEnvironment',
  'chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

var gBrowser = gBrowser || CliqzUtils.getWindow().gBrowser;
var Services = Services || CliqzUtils.getWindow().Services;

var locationListener = {
  QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

  onLocationChange: function(aBrowser, aRequest, aURI) {
    CliqzEvents.pub("core.location_change", aBrowser.currentURI.spec);
  }
};

var tabsProgressListener = {
  QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

  onLocationChange: function (aBrowser, aProgress, aRequest, aURI) {
    CliqzEvents.pub("core.tab_location_change", { url: aURI && aURI.spec });
  },

  onStateChange: function (aBrowser, aWebProgress, aRequest, aStateFlag, aStatus) {
    CliqzEvents.pub("core.tab_state_change", {
      url: aRequest && aRequest.name,
      isValid: (aStateFlag & Components.interfaces.nsIWebProgressListener.STATE_START) && !aStatus,
    });
  }
}

window.CLIQZ.Core = {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keypress'],
    _messageOFF: true, // no message shown
    _updateAvailable: false,
    windowModules: [],
    eventListeners: [],
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

        CliqzSpellCheck.initSpellCorrection();

        this.addCSS(document, 'chrome://cliqz/content/static/styles/styles.css');

        //create a new panel for cliqz to avoid inconsistencies at FF startup
        var popup = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "panel");
        popup.setAttribute("type", 'autocomplete-richlistbox');
        popup.setAttribute("noautofocus", 'true');
        popup.setAttribute("onpopuphiding", "CLIQZ.UI.closeResults(event)");
        popup.setAttribute("id", 'PopupAutoCompleteRichResultCliqz');
        this.elem.push(popup);
        document.getElementById('PopupAutoCompleteRichResult').parentElement.appendChild(popup);

        this.urlbar = document.getElementById('urlbar');

        this.popup = popup;

        CLIQZ.UI.init(this.urlbar);

        this.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        var windowModuleConfig = {
          onInstall: !this.checkSession(),
          settings: CLIQZ.config.settings,
          window: window,
        };

        this._autocompletesearch = this.urlbar.getAttribute('autocompletesearch');
        this.urlbar.setAttribute('autocompletesearch', 'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/
        this.urlbar.setAttribute('pastetimeout', 0)

        this._autocompletepopup = this.urlbar.getAttribute('autocompletepopup');
        this.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResultCliqz');

        this.popup.addEventListener('popuphiding', this.popupEventHandlers.popupClose);
        this.popup.addEventListener('popupshowing', this.popupEventHandlers.popupOpen);

        for(var i in this.urlbarEvents){
            var ev = this.urlbarEvents[i];
            this.urlbar.addEventListener(ev, this.urlbarEventHandlers[ev]);
        }

        this.tabChange = CliqzSearchHistory.tabChanged.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabSelect", this.tabChange, false);

        gBrowser.addProgressListener(locationListener);
        gBrowser.addTabsProgressListener(tabsProgressListener);

        this.tabRemoved = CliqzSearchHistory.tabRemoved.bind(CliqzSearchHistory);
        gBrowser.tabContainer.addEventListener("TabClose", this.tabRemoved, false);

        // windowModules should be in same order as config.modules
        this.windowModules = new Array(CLIQZ.config.modules.length);

        var windowModulePromises = CLIQZ.config.modules.map(function (moduleName, moduleIndex) {
          return CLIQZ.System.import(moduleName+"/window").then(function (Module) {
            var mod = new Module.default(windowModuleConfig);
            mod.init();
            this.windowModules[moduleIndex] = mod;
            return mod;
          }.bind(this)).catch(function (e) {
            console.log("CLIQZ core.js", "Error loading module: "+moduleName, e);
          });
        }.bind(this));

        return Promise.all(windowModulePromises).then(function () {
          var urlBarGo = document.getElementById('urlbar-go-button');
          this._urlbarGoButtonClick = urlBarGo.getAttribute('onclick');
          urlBarGo.setAttribute('onclick', "CLIQZ.Core.urlbarGoClick(); " + this._urlbarGoButtonClick);

          // preferences
          //this._popupMaxHeight = this.popup.style.maxHeight;
          //this.popup.style.maxHeight = CliqzUtils.getPref('popupHeight', 190) + 'px';

          this.reloadUrlbar(this.urlbar);

          this.historyDropMarker = document.getAnonymousElementByAttribute(this.urlbar, "anonid", "historydropmarker")

          // Add search history dropdown
          var searchHistoryContainer = CliqzSearchHistory.insertBeforeElement(null, window);
          this.elem.push(searchHistoryContainer);

          // detecting the languages that the person speak
          if ('gBrowser' in window) {
              CliqzLanguage.init(window);
              CliqzDemo.init(window);

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

              // CliqzEvents listeners
              this.propagateEvents("core:page_load", window.gBrowser, "load", true);
              this.propagateEvents("core:tab_select", window.gBrowser.tabContainer, "TabSelect");
          }

          window.addEventListener("keydown", this.miscHandlers.handleKeyboardShortcuts);
          this.urlbar.addEventListener("drop", this.urlbarEventHandlers.handleUrlbarTextDrop);
          this.urlbar.addEventListener('paste', this.urlbarEventHandlers.handlePasteEvent);

          CliqzExtOnboarding.init(window);
          CLIQZEnvironment.updateGeoLocation();
          //this.whoAmI(true); //startup
          //CliqzUtils.log('Initialized', 'CORE');

        }.bind(this));
    },
    responsiveClasses: function(){}, //tmp 15.09.2015 - some older version do not correctly deregister a resize handler
    addCSS: function(doc, path){
        var stylesheet = doc.createElementNS('http://www.w3.org/1999/xhtml', 'h:link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = path;
        stylesheet.type = 'text/css';
        stylesheet.style.display = 'none';
        doc.documentElement.appendChild(stylesheet);

        //add this element into 'elem' to be sure we remove it at extension shutdown
        this.elem.push(stylesheet);
    },
    checkSession: function() {
        if (!CliqzUtils.hasPref('session')) {
            var source = CLIQZ.config.settings.channel;
            CliqzUtils.setPref('session', CLIQZ.Core.generateSession(source));
            return false;
        }
        // Session is set already
        return true;
    },
    generateSession: function(source){
        CliqzUtils.setSupportInfo()

        return CliqzUtils.rand(18) + CliqzUtils.rand(6, '0123456789')
               + '|' +
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    // trigger component reload at install/uninstall
    reloadUrlbar: function(el) {
        var oldVal = el.value;
        if(el && el.parentNode) {
          el.parentNode.insertBefore(el, el.nextSibling);
          el.value = oldVal;
        }
    },
    // restoring
    unload: function(soft){
        this.windowModules.slice(0).reverse().forEach(function (mod, index) {
          var moduleIndex = CLIQZ.config.modules.length - 1 - index;
          var moduleName = CLIQZ.config.modules[moduleIndex];
          try {
            mod.unload();
          } catch(e) {
            console.log("CLIQZ core.js:", "error on unload module " + moduleName, e);
          }
        });

        clearTimeout(this._whoAmItimer);

        CLIQZ.UI.unload();

        for(var i in this.elem){
            var item = this.elem[i];
            item && item.parentNode && item.parentNode.removeChild(item);
        }

        this.urlbar.setAttribute('autocompletesearch', this._autocompletesearch);
        this.urlbar.setAttribute('autocompletepopup', this._autocompletepopup);
        this.popup.removeEventListener('popuphiding', this.popupEventHandlers.popupClose);
        this.popup.removeEventListener('popupshowing', this.popupEventHandlers.popupOpen);

        for(var i in this.urlbarEvents){
            var ev = this.urlbarEvents[i];
            this.urlbar.removeEventListener(ev, this.urlbarEventHandlers[ev]);
        }

        var searchContainer = document.getElementById('search-container');
        if(this._searchContainer){
            searchContainer.setAttribute('class', this._searchContainer);
        }

        gBrowser.tabContainer.removeEventListener("TabSelect", this.tabChange, false);
        gBrowser.tabContainer.removeEventListener("TabClose", this.tabRemoved, false);

        gBrowser.removeProgressListener(locationListener);
        gBrowser.removeTabsProgressListener(tabsProgressListener);

        document.getElementById('urlbar-go-button').setAttribute('onclick', this._urlbarGoButtonClick);

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

            this.eventListeners.forEach(function(listener) {
              listener.target.removeEventListener(listener.type, listener.func, listener.propagate);
            });
        }
        this.reloadUrlbar(this.urlbar);

        window.removeEventListener("keydown", this.miscHandlers.handleKeyboardShortcuts);
        this.urlbar.removeEventListener("drop", this.urlbarEventHandlers.handleUrlbarTextDrop);
        this.urlbar.removeEventListener('paste', this.urlbarEventHandlers.handlePasteEvent);


        if (!CliqzUtils.isPrivate(window)) {
            try {
                var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
                hs.removeObserver(CliqzHistory.historyObserver);
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
            delete window.CliqzSearchHistory;
            delete window.CliqzRedirect;
            delete window.CliqzHistory;
            delete window.CliqzHistoryCluster;
            delete window.CliqzHandlebars;
            delete window.CliqzEvents;
        }
    },
    restart: function(soft){
        this.unload(soft);
        this.init();
    },

    popupEventHandlers: {
        // Here, every |this| means CLIQZ.Core. Binding is done at the end of this script.

        popupOpen: function(){
            CliqzAutocomplete.isPopupOpen = true;
            this.popupEvent(true);
            CLIQZ.UI.popupClosed = false;
        },

        popupClose: function(e){
              CliqzAutocomplete.isPopupOpen = false;
              CliqzAutocomplete.markResultsDone(null);
              this.popupEvent(false);
              CLIQZ.UI.popupClosed = true;
        }
    },

    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        if (open) {
            action['width'] = this.popup ?
                Math.round(this.popup.width) : 0;
        }

        CliqzUtils.telemetry(action);
    },

    urlbarEventHandlers: {
        // Here, every |this| means CLIQZ.Core. Binding is done at the end of this script.

        focus: function(ev) {
            //try to 'heat up' the connection
            CliqzUtils.pingCliqzResults();

            CliqzAutocomplete.lastFocusTime = Date.now();
            CliqzSearchHistory.hideLastQuery();
            this.triggerLastQ = false;
            CliqzUtils.setSearchSession(CliqzUtils.rand(32));
            this.urlbarEvent('focus');

            if(CliqzUtils.getPref('newUrlFocus') == true && this.urlbar.value.trim().length > 0) {
                var urlbar = this.urlbar.mInputField.value;
                var search = urlbar;
                if (CliqzUtils.isUrl(search)) {
                  search = search.replace("www.", "");
                    if(search.indexOf("://") != -1) search = search.substr(search.indexOf("://")+3);
                    if(search.indexOf("/") != -1) search = search.split("/")[0];
                }
                this.urlbar.mInputField.setUserInput(search);
                this.popup._openAutocompletePopup(this.urlbar, this.urlbar);
                this.urlbar.mInputField.value = urlbar;
            }
        },

        blur: function(ev) {
            CliqzAutocomplete.resetSpellCorr();

            if(this.triggerLastQ)
                CliqzSearchHistory.lastQuery();

            this.urlbarEvent('blur');

            CliqzAutocomplete.lastFocusTime = null;
            CliqzAutocomplete.resetSpellCorr();
            CLIQZ.UI.sessionEnd();
        },

        keypress: function(ev) {
            if (!ev.ctrlKey && !ev.altKey && !ev.metaKey) {
                var urlbar = this.urlbar;
                if (urlbar.mInputField.selectionEnd !== urlbar.mInputField.selectionStart &&
                    urlbar.mInputField.value[urlbar.mInputField.selectionStart] == String.fromCharCode(ev.charCode)) {
                    // prevent the redraw in urlbar but send the search signal
                    var query = urlbar.value,
                        old = urlbar.mInputField.value,
                        start = urlbar.mInputField.selectionStart;
                    query = query.slice(0, urlbar.selectionStart) + String.fromCharCode(ev.charCode);
                    urlbar.mInputField.setUserInput(query);
                    urlbar.mInputField.value = old;
                    urlbar.mInputField.setSelectionRange(start+1, urlbar.mInputField.value.length);
                    ev.preventDefault();
                }
            }
        },

        handleUrlbarTextDrop: function(ev){
            var dTypes = ev.dataTransfer.types;
            if (dTypes.indexOf && dTypes.indexOf("text/plain") !== -1 ||
                dTypes.contains && dTypes.contains("text/plain") !== -1){
                // open dropdown on text drop
                var inputField = this.urlbar.mInputField, val = inputField.value;
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
    },

    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CliqzEvents.pub('core:urlbar_' + ev);
        CliqzUtils.telemetry(action);
    },

    urlbarGoClick: function(){
        //we somehow break default FF -> on goclick the autocomplete doesnt get considered
        this.urlbar.value = this.urlbar.mInputField.value;

        var action = {
            type: 'activity',
            position_type: ['inbar_' + (CliqzUtils.isUrl(this.urlbar.mInputField.value)? 'url': 'query')],
            autocompleted: CliqzAutocomplete.lastAutocompleteType,
            action: 'urlbar_go_click'
        };
        CliqzUtils.telemetry(action);
    },
    _whoAmItimer: null,
    whoAmI: function(startup){
        // schedule another signal
        this._whoAmItimer = setTimeout(function(){
            if(CLIQZ && CLIQZ.Core) CLIQZ.Core.whoAmI();
        }, this.INFO_INTERVAL);

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
                prefs: CLIQZEnvironment.getCliqzPrefs(),
                defaultSearchEngine: defaultSearchEngine,
                private_window: CliqzUtils.isPrivate(window),
                distribution: CliqzUtils.getPref('distribution', '')
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
    // autocomplete query inline
    autocompleteQuery: function(firstResult, firstTitle, data){
        var urlBar = this.urlbar;
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
        if (this.cleanUrlBarValue(urlBar.value).toLowerCase() != urlBar.value.toLowerCase()) {
            urlBar.mInputField.value = this.cleanUrlBarValue(urlBar.value).toLowerCase();
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
           !CliqzUtils.getPref("browser.urlbar.autoFill", false, '') || // user has disabled autocomplete
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
    miscHandlers: {
        // Here, every |this| means CLIQZ.Core. Binding is done at the end of this script.

        handleKeyboardShortcuts: function(ev) {
            if(ev.keyCode == KeyEvent.DOM_VK_K && !this.urlbar.focused){
                if((CliqzUtils.isMac(window)  &&  ev.metaKey && !ev.ctrlKey && !ev.altKey) ||  // CMD-K
                   (!CliqzUtils.isMac(window) && !ev.metaKey &&  ev.ctrlKey && !ev.altKey)){   // CTRL-K
                    this.urlbar.focus();
                    this.handleKeyboardShortcutsAction(ev.keyCode);
                    ev.preventDefault();
                    ev.stopPropagation();
                }
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

    refreshButtons: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext()

            try{
                var btn = win.document.getElementById('cliqz-button')
                win.CLIQZ.Core.createQbutton(btn.children.cliqz_menupopup);
            } catch(e){}
        }
    },

    createQbutton: function(menupopup){
        var win = window,
            doc = win.document,
            lang = CliqzUtils.getLanguage(win);

        //clean it
        while(menupopup.lastChild)
          menupopup.removeChild(menupopup.lastChild);

        function feedback_FAQ(){
          var feeedbackUrl = 'https://cliqz.com/' + lang + '/feedback/',
              feedbackParams =  CliqzUtils.extensionVersion + '-' + CLIQZ.config.settings.channel;

          //TODO - use the original channel instead of the current one (it will be changed at update)
          CLIQZEnvironment.openTabInWindow(win, feeedbackUrl + feedbackParams);
        }

        //feedback and FAQ
        menupopup.appendChild(this.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnFeedbackFaq'), feedback_FAQ, 'feedback'));
        menupopup.appendChild(this.createSimpleBtn(doc, CliqzUtils.getLocalizedString('btnTipsTricks'), function(){
          CLIQZEnvironment.openTabInWindow(win, 'https://cliqz.com/home/cliqz-triqz');
        }, 'triqz'));
        menupopup.appendChild(doc.createElement('menuseparator'));

      if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
        menupopup.appendChild(this.createSearchOptions(doc));
        menupopup.appendChild(this.createAdultFilterOptions(doc));
        menupopup.appendChild(this.createLocationPermOptions(win));

        this.windowModules.forEach(function (mod) {
          var buttonItem = mod.createButtonItem && mod.createButtonItem(win);
          if (buttonItem) { menupopup.appendChild(buttonItem); }
        });
      }
      else {
        menupopup.appendChild(this.createActivateButton(doc));
      }
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
                item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
            }
            // TODO: Where is this listener removed?
            item.addEventListener('command', (function(event) {
                CliqzResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                CliqzUtils.setTimeout(CLIQZ.Core.refreshButtons, 0);
            }).bind(this), false);

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
            item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';
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

      var filter_levels = this.getLocationPermState();

      for(var level in filter_levels) {
        var item = doc.createElement('menuitem');
        item.setAttribute('label', filter_levels[level].name);
        item.setAttribute('class', 'menuitem-iconic');


        if(filter_levels[level].selected){
          item.style.listStyleImage = 'url(' + CLIQZEnvironment.SKIN_PATH + 'checkmark.png)';

        }

        item.filter_level = new String(level);
        item.addEventListener('command', function(event) {
            CLIQZEnvironment.setLocationPermission(window, this.filter_level.toString());
        }, false);

        menupopup.appendChild(item);
      };

      var learnMore = this.createSimpleBtn(
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
               'url(' + CLIQZEnvironment.SKIN_PATH + 'opt-in.svg)':
               'url(' + CLIQZEnvironment.SKIN_PATH + 'opt-out.svg)';
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
    createActivateButton: function(doc) {
      var button = doc.createElement('menuitem');
      button.setAttribute('label', CliqzUtils.getLocalizedString('btnActivateCliqz'));
      button.addEventListener('command', (function(event) {
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            win.this.init();
        }
        CliqzUtils.setPref("cliqz_core_disabled", false);
        CLIQZ.Core.refreshButtons();

        CliqzUtils.telemetry({
          type: 'setting',
          setting: 'international',
          value: 'activate'
        });
      }).bind(this));
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
    },
    /** Adds a listener to eventTarget for events of type eventType, and republishes them
     *  through CliqzEvents with id eventPubName.
     *  Listeners registered through this function are automatically unsubscribed when core.js
     *  is unloaded.
     */
    propagateEvents: function(eventPubName, eventTarget, eventType, propagate) {
      var publishEvent = function() {
        // call CliqzEvents.pub with arguments [eventPubName, ...arguments].
        // this causes clients listening to eventPubName get mirrored arguments from the original event
        CliqzEvents.pub.bind(CliqzEvents, eventPubName).apply(CliqzEvents, arguments);
      };

      CliqzUtils.log("Propagating "+ eventType +" events to CliqzEvents as "+ eventPubName, "CliqzEvents");
      this.eventListeners.push({ target: eventTarget, type: eventType, func: publishEvent, propagate: propagate || false });
      eventTarget.addEventListener(eventType, publishEvent, propagate || false);
    }
};

// Bind Core event handler functions to proper object.
CliqzUtils.bindObjectFunctions(CLIQZ.Core.popupEventHandlers, CLIQZ.Core);
CliqzUtils.bindObjectFunctions(CLIQZ.Core.urlbarEventHandlers, CLIQZ.Core);
CliqzUtils.bindObjectFunctions(CLIQZ.Core.miscHandlers, CLIQZ.Core);
