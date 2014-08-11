'use strict';
var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ToolbarButtonManager',
  'chrome://cliqzmodules/content/extern/ToolbarButtonManager.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.5.04');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
    'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.5.04');

var Extension = {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'session': '',
        'messageUpdate': '0', // last update message timestamp
        'messageInterval': 60 * 60 * 1e3, // interval between messages - 1H
        'showQueryDebug': false, // show query debug information next to results
        'showDebugLogs': false, // show debug logs in console
        'popupHeight': 290, // popup/dropdown height in pixels
        'dnt': false, // if set to true the extension will not send any tracking signals
        'hideQuickSearch': true, // hides quick search
        'inPrivateWindows': true, // enables extension in private mode
    },
    init: function(){
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

        // open changelog on update
        if(upgrade && CliqzUtils.getPref('showChangelog', false)){
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
                win.CLIQZ.Core.showUninstallMessage(version);
            } catch(e){}
        }

        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        Services.ww.unregisterNotification(Extension.windowWatcher);
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
        Services.scriptloader.loadSubScript(Extension.BASE_URI + src + '.js?v=0.5.04', win);
    },
    loadIntoWindow: function(win) {
        if (!win) return;

        if(CliqzUtils.shouldLoad(win)){
            for (let src of ['core', 'UI', 'libs/handlebars-v1.3.0'])
                Extension.addScript(src, win);

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
        var BTN_ID = 'cliqz-button',
            SHARE_BTN_ID = 'cliqz-share-button',
            firstRunPref = 'extensions.cliqz.firstStartDone',
            firstRunSharePref = 'extensions.cliqz.firstStartDoneShare',
            doc = win.document;

        if (!win.Application.prefs.getValue(firstRunPref, false)) {
            win.Application.prefs.setValue(firstRunPref, true);

            ToolbarButtonManager.setDefaultPosition(BTN_ID, 'nav-bar', 'downloads-button');
        }

        if (!win.Application.prefs.getValue(firstRunSharePref, false)) {
            win.Application.prefs.setValue(firstRunSharePref, true);

            ToolbarButtonManager.setDefaultPosition(SHARE_BTN_ID, 'nav-bar', 'downloads-button');
        }

        // cliqz button
        let button = win.document.createElement('toolbarbutton');
        button.setAttribute('id', BTN_ID);
        button.setAttribute('type', 'menu-button');
        button.setAttribute('label', 'Cliqz');
        button.setAttribute('tooltiptext', 'Cliqz');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz_btn.jpg)';

        var menupopup = Extension.createMenu(win)
        button.appendChild(menupopup);

        button.addEventListener('click', function(ev) {
            ev.button == 0 && menupopup.openPopup(button,"after_start", 0, 0, false, true);
        }, false);

        ToolbarButtonManager.restorePosition(doc, button);

        //share btn
        let shareButton = win.document.createElement('toolbarbutton');
        shareButton.setAttribute('id', SHARE_BTN_ID);
        shareButton.setAttribute('label', 'Cliqz Share');
        shareButton.setAttribute('tooltiptext', 'Cliqz Share');
        shareButton.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        shareButton.style.listStyleImage = 'url(chrome://cliqzres/content/skin/share_btn.png)';

        shareButton.addEventListener('click', function(ev) {
            if(ev.button == 0) {
                try{
                    var doc =  win.document.getElementById('content').selectedTab.linkedBrowser.contentDocument;
                    win.location.href = 'mailto:?subject=Via cliqz: ' + encodeURI(doc.title) +
                                        '&body=' + encodeURI(doc.URL + ' \r\n \r\n -- \r\n Cliqz Beta - http://cliqz.com');
                } catch(e){}
            }
        }, false);

        ToolbarButtonManager.restorePosition(doc, shareButton);
    },
    createMenu: function(win){
        var doc = win.document,
            menupopup = doc.createElement('menupopup');
        menupopup.setAttribute('id', 'cliqz_menupopup');
        menupopup.addEventListener('command', function(event) {

        }, false);

        var menuitem1 = doc.createElement('menuitem');
        menuitem1.setAttribute('id', 'cliqz_menuitem1');
        menuitem1.setAttribute('label', 'Feedback');
        menuitem1.addEventListener('command', function(event) {
            win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version
                Extension.openTab(doc, 'http://beta.cliqz.com/feedback/' + beVersion);
            });
        }, false);

        var menuitem2 = doc.createElement('menuitem');
        menuitem2.setAttribute('id', 'cliqz_menuitem2');
        menuitem2.setAttribute('label', 'FAQ');
        menuitem2.addEventListener('command', function(event) {
            Extension.openTab(doc, 'http://beta.cliqz.com/faq');
        }, false);

        var menuitem4 = doc.createElement('menuitem');
        menuitem4.setAttribute('id', 'cliqz_menuitem4');
        menuitem4.setAttribute('label', 'Datenschutz');
        menuitem4.addEventListener('command', function(event) {
            Extension.openTab(doc, 'http://beta.cliqz.com/datenschutz.html');
        }, false);


        menupopup.appendChild(menuitem1);
        menupopup.appendChild(menuitem2);
        menupopup.appendChild(menuitem4);
        menupopup.appendChild(Extension.createSearchOptions(doc));

        return menupopup;
    },
    createSearchOptions: function(doc){
        var menu = doc.createElement('menu'),
            menupopup = doc.createElement('menupopup'),
            engines = ResultProviders.getSearchEngines(),
            def = Services.search.currentEngine.name;

        menu.setAttribute('label', 'Standard-Suchmaschine');

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
                CliqzUtils.setTimeout(Extension.refreshButtons, 0);
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
                    btn.children.cliqz_menupopup.lastChild.remove();
                    btn.children.cliqz_menupopup.appendChild(Extension.createSearchOptions(doc));
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
                if(win.document.getElementById('cliqz-button')){
                    win.document.getElementById('cliqz-button').remove();
                }
                if(win.document.getElementById('cliqz-share-button')){
                    win.document.getElementById('cliqz-share-button').remove();
                }
            }
            win.CLIQZ.Core.destroy();
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
