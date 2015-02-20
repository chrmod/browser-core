'use strict';
/*
 * This module handles the loading and the unloading of the extension
 * It injects all the needed scripts into the chrome context
 *
 */

var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
    'chrome://cliqzmodules/content/ResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzNewTab',
    'chrome://cliqz-tab/content/CliqzNewTab.jsm');

var BTN_ID = 'cliqz-button',
    SHARE_BTN_ID = 'cliqz-share-button',
    SEARCH_BAR_ID = 'search-container',
    firstRunPref = 'extensions.cliqz.firstStartDone',
    firstRunSharePref = 'extensions.cliqz.firstStartDoneShare',
    dontHideSearchBar = 'extensions.cliqz.dontHideSearchBar',
    //toolbar
    searchBarPosition = 'extensions.cliqz.defaultSearchBarPosition',
    //next element in the toolbar
    searchBarPositionNext = 'extensions.cliqz.defaultSearchBarPositionNext',
    timerRef;


var Extension = {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'session': '',
        'showQueryDebug': false, // show query debug information next to results
        'showDebugLogs': false, // show debug logs in console
        'popupHeight': 290, // popup/dropdown height in pixels
        'dnt': false, // if set to true the extension will not send safe browsing signals
        'telemetry': true //statistics
//      'inPrivateWindows': true, // enables extension in private mode
    },
    init: function(){
        Extension.unloadModules();

        Cu.import('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.import('resource://gre/modules/Services.jsm');

        Extension.setDefaultPrefs();
        CliqzUtils.init();
        this.track = CliqzUtils.track;

        CliqzClusterHistory.init();
    },
    load: function(upgrade){
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

        // open changelog on update
        if(true || upgrade /*&& CliqzUtils.getPref('showChangelog', false)*/){
            var clURL = CliqzUtils.cliqzPrefs.prefHasUserValue('changelogURL') ?
                            CliqzUtils.getPref('changelogURL') :
                            CliqzUtils.CHANGELOG;
            CliqzUtils.openOrReuseAnyTab(clURL, CliqzUtils.UPDATE_URL, false);
        }
    },
    unload: function(version, uninstall){
        if(uninstall){
            var win  = Services.wm.getMostRecentWindow("navigator:browser");

            try{
                Extension.restoreSearchBar(win);
                CliqzUtils.resetOriginalPrefs();
                CliqzNewTab.showCliqzNewTab(false);
                win.CLIQZ.Core.showUninstallMessage(version);
            } catch(e){}
        }

        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }
        Extension.unloadModules();

        Services.ww.unregisterNotification(Extension.windowWatcher);
    },
    restoreSearchBar: function(win){
        var toolbarId;
        win.Application.prefs.setValue(dontHideSearchBar, false);
        if(toolbarId = win.Application.prefs.getValue(searchBarPosition, '')){
            var toolbar = win.document.getElementById(toolbarId);
            if(toolbar){
                if(toolbar.currentSet.indexOf(SEARCH_BAR_ID) === -1){
                    var next = win.Application.prefs.getValue(searchBarPositionNext, '');
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
                    win.Application.prefs.setValue(dontHideSearchBar, true);
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
        Cu.unload('chrome://cliqzmodules/content/CliqzLanguage.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSearchHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzTimings.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzBundesliga.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCalculator.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzClusterHistory.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzClusterSeries.jsm');
        Cu.unload('chrome://cliqzmodules/content/Filter.jsm');
        Cu.unload('chrome://cliqzmodules/content/Mixer.jsm');
        Cu.unload('chrome://cliqzmodules/content/Result.jsm');
        Cu.unload('chrome://cliqzmodules/content/ResultProviders.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzSpellCheck.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzUCrawl.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqz-tab/content/CliqzNewTab.jsm');

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
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(Extension.BASE_URI + src + '.js', win);
    },
    cleanPossibleOldVersions: function(win){
        //temporary method
        delete win.CliqzUtils;
        delete win.CliqzHistoryManager;
        delete win.CliqzAutocomplete;
        delete win.CliqzLanguage;
        delete win.ResultProviders;
        delete win.CliqzTimings;
        delete win.CliqzABTests;
        delete win.CliqzSearchHistory;
    },
    loadIntoWindow: function(win) {
        if (!win) return;

        if(CliqzUtils.shouldLoad(win)){
            Extension.addScript('core', win);
            Extension.addScript('UI', win);
            Extension.addScript('libs/handlebars-v1.3.0', win);

            Extension.addButtons(win);

            try {
                win.CLIQZ.Core.init();
            } catch(e) {Cu.reportError(e); }
        }
        else {
            CliqzUtils.log('private window -> halt', 'CORE');
        }
    },
    addButtons: function(win){
        var doc = win.document;
        if (!win.Application.prefs.getValue(firstRunPref, false)) {
            win.Application.prefs.setValue(firstRunPref, true);

            ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!win.Application.prefs.getValue(firstRunSharePref, false)) {
            win.Application.prefs.setValue(firstRunSharePref, true);

            ToolbarButtonManager.setDefaultPosition(SHARE_BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!win.Application.prefs.getValue(dontHideSearchBar, false)) {
            //try to hide quick search
            try{
                var [toolbarID, nextEl] = ToolbarButtonManager.hideToolbarElement(doc, SEARCH_BAR_ID);
                if(toolbarID){
                    win.Application.prefs.setValue(searchBarPosition, toolbarID);
                }
                if(nextEl){
                    win.Application.prefs.setValue(searchBarPositionNext, nextEl);
                }
                win.Application.prefs.setValue(dontHideSearchBar, true);
            } catch(e){}
        }

        // cliqz button
        let button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', BTN_ID);
        button.setAttribute('type', 'menu-button');
        button.setAttribute('label', 'CLIQZ');
        button.setAttribute('tooltiptext', 'CLIQZ');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz_btn.png)';

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

        //share btn
        let shareButton = win.document.createElement('toolbarbutton');
        shareButton.setAttribute('id', SHARE_BTN_ID);
        shareButton.setAttribute('label', 'CLIQZ Share');
        shareButton.setAttribute('tooltiptext', 'CLIQZ Share');
        shareButton.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        shareButton.style.listStyleImage = 'url(chrome://cliqzres/content/skin/share_btn.png)';

        // localization mechanism might take a while to load.
        // TODO: find better sollution
        CliqzUtils.setTimeout(function(){
            if(CliqzUtils){
                shareButton.setAttribute('label', CliqzUtils.getLocalizedString('btnShare'));
                shareButton.setAttribute('tooltiptext', CliqzUtils.getLocalizedString('btnShare'));
            }
        }, 2000);

        shareButton.addEventListener('command', function(ev) {
            try{
                var doc =  win.document.getElementById('content').selectedTab.linkedBrowser.contentDocument;
                win.location.href = 'mailto:?subject=' + encodeURIComponent('Via CLIQZ: ' + doc.title) +
                                    '&body=' + encodeURIComponent(doc.URL + ' \r\n \r\n -- \r\n CLIQZ Beta - http://cliqz.com');
            } catch(e){}
        }, false);

        ToolbarButtonManager.restorePosition(doc, shareButton);
    },
    // creates the menu items at first click
    createMenuifEmpty: function(win, menupopup){
        if(menupopup.children.length > 0) return;

        var doc = win.document,
            lang = CliqzUtils.getLanguage(win);


        function feedback_FAQ(){
            win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                CliqzUtils.httpGet('chrome://cliqz/content/source.json',
                    function success(req){
                        var source = JSON.parse(req.response).shortName;
                        Extension.openTab(doc, 'http://beta.cliqz.com/' + lang + '/feedback/' + beVersion + '-' + source);
                    },
                    function error(){
                        Extension.openTab(doc, 'http://beta.cliqz.com/' + lang + '/feedback/' + beVersion);
                    }
                );
            });
        }

        function simpleBtn(txt, func){
            var item = doc.createElement('menuitem');
            item.setAttribute('label', txt);
            if(func)
                item.addEventListener('command', func, false);
            else
                item.setAttribute('disabled', 'true');

            return item
        }

        function optInOut(){
            return CliqzUtils.getPref('dnt', false)?
                             'url(chrome://cliqzres/content/skin/opt-in.svg)':
                             'url(chrome://cliqzres/content/skin/opt-out.svg)';
        }

        //feedback and FAQ
        menupopup.appendChild(simpleBtn('Feedback & FAQ', feedback_FAQ));
        menupopup.appendChild(doc.createElement('menuseparator'));

        //safe search
        menupopup.appendChild(simpleBtn('HUMAN WEB'));

        var safeSearchBtn = doc.createElement('menuitem');
        safeSearchBtn.setAttribute('label', CliqzUtils.getLocalizedString('btnSafeSearch'));
        safeSearchBtn.setAttribute('class', 'menuitem-iconic');
        safeSearchBtn.style.listStyleImage = optInOut();
        safeSearchBtn.addEventListener('command', function(event) {
            CliqzUtils.setPref('dnt', !CliqzUtils.getPref('dnt', false));
            safeSearchBtn.style.listStyleImage = optInOut();
        }, false);
        menupopup.appendChild(safeSearchBtn);


        menupopup.appendChild(
            simpleBtn(
                CliqzUtils.getLocalizedString('btnSafeSearchDesc'),
                function(){
                        Extension.openTab(doc, 'https://beta.cliqz.com/support/#common-questions');
                    }
            )
        );

        menupopup.appendChild(doc.createElement('menuseparator'));
        menupopup.appendChild(simpleBtn(CliqzUtils.getLocalizedString('settings')));

        /*
        var menuitem5 = doc.createElement('menuitem');
        menuitem5.setAttribute('id', 'cliqz_menuitem5');
        menuitem5.setAttribute('label',
            CliqzUtils.getLocalizedString('btnShowCliqzNewTab' + (CliqzNewTab.isCliqzNewTabShown()?"Enabled":"Disabled"))
        );

        menuitem5.addEventListener('command', function(event) {
            var newvalue = !CliqzNewTab.isCliqzNewTabShown();

            CliqzNewTab.showCliqzNewTab(newvalue);

            menuitem5.setAttribute('label',
                CliqzUtils.getLocalizedString('btnShowCliqzNewTab' + (newvalue?"Enabled":"Disabled"))
            );
        }, false);
        */



        //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIBrowserSearchService#moveEngine()
        //FF16+
        if(Services.search.init != null){
            Services.search.init(function(){
                menupopup.appendChild(CliqzUtils.createSearchOptions(doc));
                menupopup.appendChild(CliqzUtils.createAdultFilterOptions(doc));
            });
        } else {
            menupopup.appendChild(CliqzUtils.createSearchOptions(doc));
            menupopup.appendChild(CliqzUtils.createAdultFilterOptions(doc));
        }
    },
    openTab: function(doc, url){
        var tBrowser = doc.getElementById('content');
        var tab = tBrowser.addTab(url);
        tBrowser.selectedTab = tab;
    },
    unloadFromWindow: function(win){
        try {
            if(win && win.document){
                var btn;
                if(btn = win.document.getElementById('cliqz-button')){
                    btn.parentNode.removeChild(btn);
                }
                if(btn = win.document.getElementById('cliqz-share-button')){
                    btn.parentNode.removeChild(btn);
                }
            }
            win.CLIQZ.Core.destroy(false);
            delete win.CLIQZ.Core;
            win.CLIQZ = null;
            win.CLIQZResults = null;
        }catch(e){Cu.reportError(e); }
    },
    windowWatcher: function(win, topic) {
        if (topic == 'domwindowopened') {
            win.addEventListener('load', function loader() {
                win.removeEventListener('load', loader, false);
                if (win.location.href == 'chrome://browser/content/browser.xul')
                    Extension.loadIntoWindow(win, true);
            }, false);
        }
    }
};

Extension.init();
