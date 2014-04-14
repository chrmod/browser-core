'use strict';

var EXPORTED_SYMBOLS = ['CLIQZExtension'],
      Cu = Components.utils;

var CLIQZExtension = CLIQZExtension || {
    BASE_URI: 'chrome://cliqz/content/',
    PREFS: {
        'UDID': '',
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
        'inPrivate': false, // enables extension in private mode
        'bwFonts': false, // uses only black and white fonts for titles
        'scale': 3, // 1-xsmall, 2-small, 3-normal, 4-large, 5-xlarge
        'logoPosition': 1, // -1-left, 0-none, 1-right
    },
    init: function(){
        Cu.import('resource://gre/modules/Services.jsm');
        Cu.import('chrome://cliqz/content/utils.js?r='+ Math.random());

        CLIQZExtension.setDefaultPrefs();
        CLIQZ.Utils.init();

        this.track = CLIQZ.Utils.track;
    },
    load: function(upgrade){
        // Load into any existing windows
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            CLIQZExtension.loadIntoWindow(win);
        }
        // Load into all new windows
        Services.ww.registerNotification(CLIQZExtension.windowWatcher);

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
            CLIQZExtension.unloadFromWindow(win);
        }

        Services.ww.unregisterNotification(CLIQZExtension.windowWatcher);
    },
    restart: function(){
        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            //win.CLIQZ.Core.restart();
            win.CLIQZ.Core.destroy();
            win.CLIQZ.Core.init();
        }
    },
    setDefaultPrefs: function() {
      let branch = CLIQZ.Utils.cliqzPrefs;
      for (let [key, val] in new Iterator(CLIQZExtension.PREFS)) {
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
    addScript: function(src, win) {
        Services.scriptloader.loadSubScript(CLIQZExtension.BASE_URI + src + '.js?r='+Math.random(), win);
    },
    loadIntoWindow: function(win) {
        for (let src of ['core', 'historyManager', 'utils'])
            CLIQZExtension.addScript(src, win);

        CLIQZExtension.addButtons(win);

        try {
            win.CLIQZ.Core.init();
        } catch(e) {Cu.reportError(e); }
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
        button.setAttribute('type', 'menu-button');
        button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
        button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz.ico)';
      
        var menupopup = doc.createElement('menupopup');

        CLIQZExtension.addButtonToMenu(doc, menupopup, 'Feedback', function() {
            win.Application.getExtensions(function(extensions) {
                    var beVersion = extensions.get('cliqz@cliqz.com').version;
                    CLIQZExtension.openTab(doc, 'http://beta.cliqz.com/feedback/' + beVersion);
            });
        });

        CLIQZExtension.addButtonToMenu(doc, menupopup,'FAQ', function() {
            CLIQZExtension.openTab(doc, 'http://beta.cliqz.com/faq');
        });

        CLIQZExtension.addButtonToMenu(doc, menupopup, 'Tutorial', function() {
            CLIQZExtension.openTab(doc, 'http://beta.cliqz.com/tutorial');
        });

        var priv = 'Privatsph' + String.fromCharCode('0228') + 're';
        CLIQZExtension.addButtonToMenu(doc, menupopup, priv, function() {
            CLIQZExtension.openTab(doc, 'http://beta.cliqz.com/img/privacy.jpg');
        });

        menupopup.appendChild(doc.createElement('menuseparator'));
        CLIQZExtension.addButtonToMenu(doc, menupopup, 'Einstellungen', function() {
            win.openDialog('chrome://cliqz/content/options.xul', 'Cliqz Einstellungen', 'chrome,modal');
        });

        menupopup.appendChild(doc.createElement('menuseparator'));
        CLIQZExtension.addButtonToMenu(doc, menupopup, 'Update Suchen', function() {
            win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                win.CLIQZ.Core.updateCheck(beVersion, true);
            });
        });

        button.appendChild(menupopup);


        button.addEventListener('click', function() {
            menupopup.openPopup(button,'after_start', 0, 0, false, true);
        }, false);

        //anchor.parentNode.insertBefore(button, anchor);
        navBar.appendChild(button);
    },
    openTab: function(doc, url){
        var tBrowser = doc.getElementById('content');
        var tab = tBrowser.addTab(url);
        tBrowser.selectedTab = tab;
    },
    unloadFromWindow: function(win){
        try {
            win.document.getElementById('cliqz-button').remove();
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
                    CLIQZExtension.loadIntoWindow(win, true);
            }, false);
        }
    }
};

CLIQZExtension.init();
