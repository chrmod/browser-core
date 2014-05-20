'use strict';
var EXPORTED_SYMBOLS = ['Extension'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;


var Extension = Extension || {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'session': '',
        'messageUpdate': '0', // last update message timestamp
        'messageInterval': 60 * 60 * 1e3, // interval between messages - 1H
        'showQueryDebug': false, // show query debug information next to results
        'showDebugLogs': false, // show debug logs in console
        'popupHeight': 160, // popup/dropdown height in pixels
        'betaGroup': false, // if set to true the extension gets all the updates. Else only the major ones
        'dnt': false, // if set to true the extension will not send any tracking signals
        'enterLoadsFirst': false, // on enter the first result is loaded if none is selected
        'hideQuickSearch': true, // hides quick search
        'pagePreload': true, // hides quick search
        'inPrivateWindows': true, // enables extension in private mode
        'bwFonts': false, // uses only black and white fonts for titles
        'scale': 3, // 1-xsmall, 2-small, 3-normal, 4-large, 5-xlarge
        'logoPosition': 1, // -1-left, 0-none, 1-right
    },
    init: function(){
        Cu.import('resource://gre/modules/Services.jsm');
        Cu.import('chrome://cliqz/content/utils.js?r='+ Math.random());

        Extension.setDefaultPrefs();
        CLIQZ.Utils.init();

        this.track = CLIQZ.Utils.track;
    },
    load: function(upgrade){
        // Load into any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.loadIntoWindow(win);
        }
        // Load into all new windows
        Services.ww.registerNotification(Extension.windowWatcher);

        if(upgrade){
            // open changelog on update
            CLIQZ.Utils.openOrReuseAnyTab(CLIQZ.Utils.CHANGELOG, CLIQZ.Utils.UPDATE_URL, false);
        }
    },
    unload: function(){
        // Unload from any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            Extension.unloadFromWindow(win);
        }

        Services.ww.unregisterNotification(Extension.windowWatcher);
    },
    restart: function(){
        CLIQZ.Utils.extensionRestart();
    },
    setDefaultPrefs: function() {
        var branch = CLIQZ.Utils.cliqzPrefs;

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
        //0.4.07.003
        prefs.clearUserPref('inPrivate');
        //0.4.08.005
        if(prefs.prefHasUserValue('UDID')){
            prefs.setCharPref('session', prefs.getCharPref('UDID'));
            prefs.clearUserPref('UDID');
        }
    },
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(Extension.BASE_URI + src + '.js?r='+Math.random(), win);
    },
    loadIntoWindow: function(win) {
        if(CLIQZ.Utils.shouldLoad(win)){
            for (let src of ['core', 'utils', 'components'])
                Extension.addScript(src, win);

            Extension.addButtons(win);

            try {
                win.CLIQZ.Core.init();
            } catch(e) {Cu.reportError(e); }
        }
        else {
            CLIQZ.Utils.log('private window -> halt', 'CORE');
        }
    },
    addButtonToMenu: function(doc, menu, label, cmd){
        var menuItem = doc.createElement('menuitem');
        menuItem.setAttribute('label', label);
        menuItem.addEventListener('command', cmd, false);
        menu.appendChild(menuItem);
    },
    addButtons: function(win){
        let doc = win.document,
            navBar = doc.getElementById('nav-bar');

        let button = doc.createElement('toolbarbutton');
        button.setAttribute('id', 'cliqz-button');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz.ico)';

        button.addEventListener('click', function() {
             win.openDialog('chrome://cliqz/content/options.html', 'Cliqz Einstellungen', 'chrome,modal');
        }, false);

        navBar.appendChild(button);
    },
    openTab: function(doc, url){
        var tBrowser = doc.getElementById('content');
        var tab = tBrowser.addTab(url);
        tBrowser.selectedTab = tab;
    },
    unloadFromWindow: function(win){
        try {
            let doc = win.document,
                navBar = doc.getElementById('nav-bar'),
                btn = doc.getElementById('cliqz-button');

            navBar.removeChild(btn);
            win.CLIQZ.Core.destroy();
            delete win.CLIQZ.Core;
            delete win.CLIQZ.Utils;
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
