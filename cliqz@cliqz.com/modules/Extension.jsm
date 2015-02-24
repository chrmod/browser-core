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
        'dnt': false, // if set to true the extension will not send any tracking signals
//      'inPrivateWindows': true, // enables extension in private mode
    },
    init: function(){
        Extension.unloadModules();

        Cu.import('chrome://cliqzmodules/content/ToolbarButtonManager.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzUCrawl.jsm');
        Cu.import('chrome://cliqzmodules/content/CUcrawlTest.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.import('chrome://cliqzmodules/content/CliqzCategories.jsm');
        Cu.import('resource://gre/modules/Services.jsm');

        Extension.setDefaultPrefs();
        CliqzUtils.init();
        this.track = CliqzUtils.track;
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
        CUcrawlTest.initAtBrowser();

        // open changelog on update
        if(upgrade && CliqzUtils.getPref('showChangelog', false)){
            var clURL = CliqzUtils.cliqzPrefs.prefHasUserValue('changelogURL') ?
                            CliqzUtils.getPref('changelogURL') :
                            CliqzUtils.CHANGELOG;
            CliqzUtils.openOrReuseAnyTab(clURL, CliqzUtils.UPDATE_URL, false);
        }
    },
    unload: function(version, uninstall){
        CUcrawlTest.destroyAtBrowser();
        if(uninstall){
            var win  = Services.wm.getMostRecentWindow("navigator:browser");

            try{
                Extension.restoreSearchBar(win);
                CliqzUtils.resetOriginalPrefs();
                win.CLIQZ.Core.showUninstallMessage(version);
            } catch(e){}
        }

        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        CliqzCategories.destroy();
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
        Cu.unload('chrome://cliqzmodules/content/CUcrawlTest.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzRedirect.jsm');
        Cu.unload('chrome://cliqzmodules/content/CliqzCategories.jsm');

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
        //
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

        var menuitem1 = doc.createElement('menuitem');
        menuitem1.setAttribute('id', 'cliqz_menuitem1');
        menuitem1.setAttribute('label', 'Feedback');
        menuitem1.addEventListener('command', function(event) {
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
        }, false);

        var menuitem2 = doc.createElement('menuitem');
        menuitem2.setAttribute('id', 'cliqz_menuitem2');
        menuitem2.setAttribute('label', 'FAQ');
        menuitem2.addEventListener('command', function(event) {
            Extension.openTab(doc, 'http://beta.cliqz.com/faq_' + lang + '.html');
        }, false);

        var menuitem4 = doc.createElement('menuitem');
        menuitem4.setAttribute('id', 'cliqz_menuitem4');
        menuitem4.setAttribute('label', CliqzUtils.getLocalizedString('btnPrivacy'));
        menuitem4.addEventListener('command', function(event) {
            Extension.openTab(doc, 'http://beta.cliqz.com/datenschutz_' + lang + '.html');
        }, false);


        menupopup.appendChild(menuitem1);
        menupopup.appendChild(menuitem2);
        menupopup.appendChild(menuitem4);

        //https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIBrowserSearchService#moveEngine()
        //FF16+
        if(Services.search.init != null){
            Services.search.init(function(){
                menupopup.appendChild(Extension.createSearchOptions(doc));
                menupopup.appendChild(Extension.createLanguageOptions(doc));
            });
        } else {
            menupopup.appendChild(Extension.createSearchOptions(doc));
            menupopup.appendChild(Extension.createLanguageOptions(doc));
        }
    },
    createLanguageOptions: function (doc) {
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup');

        var languages = {
          '': { lang: CliqzUtils.getLocalizedString('country_code_'), selected: false},
          'BR': { lang: CliqzUtils.getLocalizedString('country_code_BR'), selected: false},
          'DE': { lang: CliqzUtils.getLocalizedString('country_code_DE'), selected: false},
          'EE': { lang: CliqzUtils.getLocalizedString('country_code_EE'), selected: false},
          'FR': { lang: CliqzUtils.getLocalizedString('country_code_FR'), selected: false},
          'GR': { lang: CliqzUtils.getLocalizedString('country_code_GR'), selected: false},
          'GB': { lang: CliqzUtils.getLocalizedString('country_code_GB'), selected: false},
          'ID': { lang: CliqzUtils.getLocalizedString('country_code_ID'), selected: false},
          'IT': { lang: CliqzUtils.getLocalizedString('country_code_IT'), selected: false},
          'CA': { lang: CliqzUtils.getLocalizedString('country_code_CA'), selected: false},
          'HR': { lang: CliqzUtils.getLocalizedString('country_code_HR'), selected: false},
          'AT': { lang: CliqzUtils.getLocalizedString('country_code_AT'), selected: false},
          'PS': { lang: CliqzUtils.getLocalizedString('country_code_PS'), selected: false},
          'RO': { lang: CliqzUtils.getLocalizedString('country_code_RO'), selected: false},
          'RU': { lang: CliqzUtils.getLocalizedString('country_code_RU'), selected: false},
          'RS': { lang: CliqzUtils.getLocalizedString('country_code_RS'), selected: false},
          'SG': { lang: CliqzUtils.getLocalizedString('country_code_SG'), selected: false},
          'ES': { lang: CliqzUtils.getLocalizedString('country_code_ES'), selected: false},
          'CH': { lang: CliqzUtils.getLocalizedString('country_code_CH'), selected: false},
          'TH': { lang: CliqzUtils.getLocalizedString('country_code_TH'), selected: false},
          'TR': { lang: CliqzUtils.getLocalizedString('country_code_TR'), selected: false},
          'HU': { lang: CliqzUtils.getLocalizedString('country_code_HU'), selected: false},
          'US': { lang: CliqzUtils.getLocalizedString('country_code_US'), selected: false},
          'VN': { lang: CliqzUtils.getLocalizedString('country_code_VN'), selected: false}
        };

        var location = CliqzUtils.getPref('config_location', 'DE').toUpperCase();
        // Append current location to Automatic string
        languages[''].lang += ' (' + languages[location].lang + ')';

        var countryCode = CliqzUtils.getPref('forceCountry', '');
        if(languages[countryCode])
          languages[countryCode].selected = true;

        menu.setAttribute('label', CliqzUtils.getLocalizedString('btnRegion'));
        for (var language in languages) {
          var item = doc.createElement('menuitem');
          item.setAttribute('label', languages[language].lang);
          item.setAttribute('class', 'menuitem-iconic');
          if (languages[language].selected) {
            item.style.listStyleImage = 'url(chrome://cliqzres/content/skin/checkmark.png)';
          }
          item.lang = new String(language);
          item.addEventListener('command', function(event) {
              CliqzUtils.setPref('forceCountry', this.lang.toString());
              timerRef = CliqzUtils.setTimeout(Extension.refreshButtons, 0);
          }, false);
          menupopup.appendChild(item);
          // Add seperator after Automatic item
          if (language === '')
            menupopup.appendChild(doc.createElement('menuseparator'));
        }

        menu.appendChild(menupopup);
        return menu;
    },
    createSearchOptions: function(doc){
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup'),
            engines = ResultProviders.getSearchEngines(),
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
                ResultProviders.setCurrentSearchEngine(event.currentTarget.engineName);
                // keep reference to timer to avoid garbage collection
                timerRef = CliqzUtils.setTimeout(Extension.refreshButtons, 0);
            }, false);

            menupopup.appendChild(item);
        }

        menu.appendChild(menupopup);

        return menu;
    },
    refreshButtons: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext(),
                doc = win.document;

            try{
                var btn = win.document.getElementById('cliqz-button')
                if(btn && btn.children && btn.children.cliqz_menupopup){
                    var languageOptions = btn.children.cliqz_menupopup.lastChild;
                    languageOptions.parentNode.removeChild(languageOptions);
                    var searchOptions = btn.children.cliqz_menupopup.lastChild;
                    searchOptions.parentNode.removeChild(searchOptions);
                    btn.children.cliqz_menupopup.appendChild(Extension.createSearchOptions(doc));
                    btn.children.cliqz_menupopup.appendChild(Extension.createLanguageOptions(doc));
                }
            } catch(e){}
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
