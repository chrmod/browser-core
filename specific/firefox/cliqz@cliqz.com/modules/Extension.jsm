'use strict';
/*
 * This module handles the loading and the unloading of the extension
 * It injects all the needed scripts into the chrome context
 *
 */

var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import("resource://gre/modules/AddonManager.jsm")

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
    'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

var BTN_ID = 'cliqz-button',
    SEARCH_BAR_ID = 'search-container',
    firstRunPref = 'firstStartDone',
    dontHideSearchBar = 'dontHideSearchBar',
    //toolbar
    searchBarPosition = 'defaultSearchBarPosition',
    //next element in the toolbar
    searchBarPositionNext = 'defaultSearchBarPositionNext';


function newMajorVersion(oldV, newV){
    var o = oldV.split('.'), n = newV.split('.');
    if(o.length == 3 && n.length == 3){ //only trigger for production versions
        try{
            if(parseInt(o[1]) < parseInt(n[1]))
                return true;
        } catch(e){}
    }
    return false;
}

var Extension = {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'session': ''
    },
    init: function(){
        Extension.unloadModules();

        // Cu.import('chrome://cliqzmodules/content/CliqzExceptions.jsm'); //enabled in debug builds

        Cu.import('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
        Cu.import('chrome://cliqzmodules/content/CUcrawl.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzCategories.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');
        Cu.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzABTests.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzLoyalty.jsm');

        Cu.import('resource://gre/modules/Services.jsm');

        Extension.setDefaultPrefs();
        CliqzUtils.init();
        CLIQZEnvironment.init();
        CliqzABTests.init();
        this.telemetry = CliqzUtils.telemetry;

        if(CliqzLoyalty.hasJoined()) {
            CliqzLoyalty.init();
        }else{
            CliqzLoyalty.setPref('participateLoyalty', false);
            CliqzLoyalty.initMin();
        }

        CliqzClusterHistory.init();
    },
    load: function(upgrade, oldVersion, newVersion){
        AddonManager.getAddonByID("cliqz@cliqz.com", function (addon) {
            CliqzUtils.extensionVersion = addon.version

            if (upgrade) CliqzUtils.setSupportInfo()
            else {
                Extension._SupportInfoTimeout = CliqzUtils.setTimeout(function(){
                    CliqzUtils.setSupportInfo()
                },1000)
            }
        });

        // Ensure prefs are set to our custom values
        Extension.setOurOwnPrefs();

        // Load into any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();

            // check if there are any conflicting addons
            // win.Application.getExtensions(function(extensions) {
            //    for(var i in extensions.all)win.console.log(extensions.all[i].id)
            // });

            Extension.loadIntoWindow(win);
        }
        // Load into all new windows
        Services.ww.registerNotification(Extension.windowWatcher);

        if(CliqzUtils.getPref("humanWeb", false)){
            CliqzHumanWeb.initAtBrowser();
        }

        if(CliqzUtils.getPref("safeBrowsingMozTest", false)){
           CUcrawl.initAtBrowser();
        }

        // open changelog on update

        if(upgrade && newMajorVersion(oldVersion, newVersion)){
            CliqzUtils.setPref('changeLogState', 1);
        }
    },
    unload: function(version, uninstall){
        CliqzLoyalty.unload();
        CliqzUtils.clearTimeout(Extension._SupportInfoTimeout)

        if(uninstall){
            CliqzUtils.setSupportInfo("disabled")

            var win  = Services.wm.getMostRecentWindow("navigator:browser");

            try{
                Extension.restoreSearchBar(win);
                Extension.resetOriginalPrefs();
                win.CLIQZ.Core.showUninstallMessage(version);
            } catch(e){}
        }

        if(CliqzUtils.getPref("humanWeb", false)){
            CliqzHumanWeb.unloadAtBrowser();
        }

        if(CliqzUtils.getPref("safeBrowsingMozTest", false)){
            CUcrawl.destroyAtBrowser();
        }
        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        CliqzCategories.unload();
        CLIQZEnvironment.unload();
        CliqzABTests.unload();
        Extension.unloadModules();

        Services.ww.unregisterNotification(Extension.windowWatcher);
    },
    restoreSearchBar: function(win){
        var toolbarId;
        CliqzUtils.setPref(dontHideSearchBar, false);
        if(toolbarId = CliqzUtils.getPref(searchBarPosition, '')){
            var toolbar = win.document.getElementById(toolbarId);
            if(toolbar){
                if(toolbar.currentSet.indexOf(SEARCH_BAR_ID) === -1){
                    var next = CliqzUtils.getPref(searchBarPositionNext, '');
                    if(next){
                        var set = toolbar.currentSet.split(","),
                            idx = set.indexOf(next);

                        if (idx != -1)
                            set.splice(idx, 0, SEARCH_BAR_ID);
                        else set.push(SEARCH_BAR_ID);

                        toolbar.currentSet = set.join(",");
                    }
                    // no next element, append it to the end
                    else toolbar.currentSet += ',' + SEARCH_BAR_ID;
                } else {
                    //the user made it visible
                    CliqzUtils.setPref(dontHideSearchBar, true);
                }
            }
        }
    },
    unloadModules: function(){
        //unload all cliqz modules
        Cu.unload('chrome://cliqzmodules/content/extern/math.min.jsm');
        Cu.unload('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzABTests.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryManager.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryAnalysis.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzLanguage.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCalculator.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/Filter.jsm');
        Cu.unload('chrome://cliqzmodules/content/Mixer.jsm');
        Cu.unload('chrome://cliqzmodules/content/Result.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzResultProviders.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSpellCheck.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
        Cu.unload('chrome://cliqzmodules/content/CUcrawl.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCategories.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSmartCliqzCache.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHandlebars.jsm');
        Cu.unload('chrome://cliqzmodules/content/extern/handlebars-v1.3.0.js');

        Cu.unload('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzEvents.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzAntiPhishing.jsm');
        Cu.unload('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzDemo.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzMsgCenter.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzTour.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzExtOnboarding.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRequestMonitor.jsm');
        // Cu.unload('chrome://cliqzmodules/content/CliqzExceptions.jsm'); //enabled in debug builds

        // Remove this observer here to correct bug in 0.5.57
        // - if you don't do this, the extension will crash on upgrade to a new version
        // - this can be safely removed after all 0.5.56 and 0.5.57 are upgraded
        try {
            var hs = Cc["@mozilla.org/browser/nav-history-service;1"].getService(Ci.nsINavHistoryService);
            CliqzHistory && hs.removeObserver(CliqzHistory.historyObserver);
        } catch(e) {}

        Cu.unload('chrome://cliqzmodules/content/CliqzHistory.jsm');
    },
    restart: function(){
        CliqzUtils.extensionRestart();
    },
    setDefaultPrefs: function() {
        var branch = CliqzUtils.cliqzPrefs;

        //basic solution for having consistent preferences between updates
        this.cleanPrefs(branch);

        for (let [key, val] in new Iterator(Extension.PREFS)) {
            if(!branch.prefHasUserValue(key)){
                switch (typeof val) {
                    case 'boolean':
                    branch.setBoolPref(key, val);
                    break;
                case 'number':
                    branch.setIntPref(key, val);
                    break;
                case 'string':
                    branch.setCharPref(key, val);
                    break;
                }
            }
        }
    },
    cleanPrefs: function(prefs){
        //0.5.02 - 0.5.04
        prefs.clearUserPref('analysis');
        prefs.clearUserPref('news-toggle-trending');
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(Extension.BASE_URI + src + '.js', win);
    },
    cleanPossibleOldVersions: function(win){
        //
    },
    loadIntoWindow: function(win) {
        if (!win) return;

        if(CliqzUtils.shouldLoad(win)){
            Extension.addScript('core', win);
            Extension.addScript('UI', win);
            Extension.addScript('ContextMenu', win);

            Extension.addButtons(win);

            // CliqzExceptions.attach(win); //enabled in debug builds

            try {
                if (!CliqzUtils.getPref("cliqz_core_disabled", false)) {
                  win.CLIQZ.Core.init();
                  CliqzUtils.log('Initialized', 'CORE');
                }
                // Always set urlbar and start whoAmI
                // We need the urlbar, so that we can activate cliqz from a different window that was already open at the moment of deactivation
                win.CLIQZ.Core.urlbar = win.document.getElementById('urlbar');
                win.CLIQZ.Core.whoAmI(true); //startup
                CliqzABTests.check();

            } catch(e) {Cu.reportError(e); }
        }
        else {
            CliqzUtils.log('private window -> halt', 'CORE');
        }
    },

    addCliqzStarButton: function(win, needPlaceHolder){
        var btn_id = CliqzLoyalty.getBrowserButtonID();
        if (needPlaceHolder)
            ToolbarButtonManager.setDefaultPosition(btn_id, 'nav-bar', BTN_ID);

        var button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', btn_id);
        button.setAttribute('tooltiptext', 'CLIQZ Star');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.setAttribute('image', CliqzLoyalty.getBrowserIcon(false));
        button.addEventListener("command",
            function(ev){
                CLIQZEnvironment.openTabInWindow(win, 'chrome://cliqz/content/loyalty/index.html');
                CliqzLoyalty.onBrowserIconClick();
            }
            , false);

        ToolbarButtonManager.restorePosition(win.document, button);
    },

    addButtons: function(win){
        var doc = win.document;
        if (!CliqzUtils.PREFERRED_LANGUAGE) {
          // Need locale when cliqz is disabled
          var nav = win.navigator;
          CliqzUtils.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en';
          CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
        }

        var firstRunPrefVal = CliqzUtils.getPref(firstRunPref, false);

        if (!firstRunPrefVal) {
            CliqzUtils.setPref(firstRunPref, true);
            ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!CliqzUtils.getPref(dontHideSearchBar, false)) {
            //try to hide quick search
            try{
                var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
                if(toolbarID){
                    CliqzUtils.setPref(searchBarPosition, toolbarID);
                }
                if(nextEl){
                    CliqzUtils.setPref(searchBarPositionNext, nextEl);
                }
                CliqzUtils.setPref(dontHideSearchBar, true);
            } catch(e){}
        }

        // cliqz button
        let button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', BTN_ID);
        button.setAttribute('type', 'menu-button');
        button.setAttribute('label', 'CLIQZ');
        button.setAttribute('tooltiptext', 'CLIQZ');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz_btn.svg)';

        var menupopup = doc.createElement('menupopup');
        menupopup.setAttribute('id', 'cliqz_menupopup');
        button.appendChild(menupopup);

        menupopup.addEventListener('popupshowing', function(){
            Extension.createMenuifEmpty(win, menupopup);
        });
        button.addEventListener('command', function(ev) {
            Extension.createMenuifEmpty(win, menupopup);
            button.children[0].openPopup(button,"after_start", 0, 0, false, true);
        }, false);

        ToolbarButtonManager.restorePosition(doc, button);

        Extension.addCliqzStarButton(win, firstRunPrefVal);
    },
    // creates the menu items at first click
    createMenuifEmpty: function(win, menupopup){
        if(menupopup.children.length > 0) return;
        //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIBrowserSearchService#moveEngine()
        //FF16+
        if(Services.search.init != null){
            Services.search.init(function(){
                win.CLIQZ.Core.createQbutton(win, menupopup);
            });
        } else {
            win.CLIQZ.Core.createQbutton(win, menupopup);
        }
    },

    unloadFromWindow: function(win){
        try {
            if(win && win.document){
                var btn;
                if(btn = win.document.getElementById('cliqz-button')){
                    btn.parentNode.removeChild(btn);
                }
            }
            win.CLIQZ.Core.unload(false);
            delete win.CLIQZ.Core;
            delete win.CLIQZ.UI;
            delete win.CLIQZ.ContextMenu;
            try{ delete win.CLIQZ; } catch(e){} //fails at updating from version < 0.6.11
        }catch(e){ Cu.reportError(e); }
    },
    windowWatcher: function(win, topic) {
        if (topic == 'domwindowopened') {
            win.addEventListener('load', function loader() {
                win.removeEventListener('load', loader, false);
                if (win.location.href == 'chrome://browser/content/browser.xul')
                    Extension.loadIntoWindow(win, true);
            }, false);
        }
    },
    /** Change some prefs for a better cliqzperience -- always do a backup! */
    setOurOwnPrefs: function() {
        var urlBarPref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
        if (!cliqzBackup || CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup") == 0) {
            CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup",
                urlBarPref.getIntPref("maxRichResults"));
            urlBarPref.setIntPref("maxRichResults", 30);
        }

        var unifiedComplete = urlBarPref.getPrefType("unifiedcomplete");
        if(unifiedComplete == 128 && urlBarPref.getBoolPref("unifiedcomplete") == true){
          CliqzUtils.setPref('unifiedcomplete', true);
          urlBarPref.setBoolPref("unifiedcomplete", false)
        }
    },
    /** Reset changed prefs on uninstall */
    resetOriginalPrefs: function() {
        var urlBarPref = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
        var cliqzBackup = CliqzUtils.cliqzPrefs.getPrefType("maxRichResultsBackup");
        if (cliqzBackup) {
            CliqzUtils.log("Loading maxRichResults backup...", "CliqzUtils.setOurOwnPrefs");
            urlBarPref.setIntPref("maxRichResults",
                CliqzUtils.cliqzPrefs.getIntPref("maxRichResultsBackup"));
            // deleteBranch does not work for some reason :(
            CliqzUtils.cliqzPrefs.setIntPref("maxRichResultsBackup", 0);
            CliqzUtils.cliqzPrefs.clearUserPref("maxRichResultsBackup");
        } else {
            CliqzUtils.log("maxRichResults backup does not exist; doing nothing.", "CliqzUtils.setOurOwnPrefs")
        }

        if(CliqzUtils.getPref('unifiedcomplete', false)){
          urlBarPref.setBoolPref("unifiedcomplete", true);
          CliqzUtils.setPref('unifiedcomplete', false);
        }
    }
};

Extension.init();
