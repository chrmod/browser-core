//'use strict';

var Cu = Components.utils;
//Cu.import('chrome://cliqz/content/utils.js');

var BASE_URI = 'chrome://cliqz/content/';
var {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
// LOADING scripts

var addScript = function(src, win) {
    Services.scriptloader.loadSubScript(BASE_URI + src + '.js?r='+Math.random(), win);
};
/*devel__)*/


function loadIntoWindow(win, isNew) {
    /*devel__)*/
    for (let src of ['core', 'historyManager', 'utils', /*'cliqz-results'*/])
        addScript(src, win)

    addButtons(win);

    try {
        win.CLIQZ.Core.init();
    } catch(e) {Cu.reportError(e)}
}

function $(node, childId) {
  if (node.getElementById) {
    return node.getElementById(childId);
  } else {
    return node.querySelector('#' + childId);
  }
}

function addButtonToMenu(document, menu, label, cmd){
    var menuItem = document.createElement('menuitem');
    menuItem.setAttribute('label', label);
    menuItem.addEventListener('command', cmd, false);
    menu.appendChild(menuItem);
}

function addButtons(win){
    let doc = win.document,
        navBar = doc.getElementById('nav-bar');

    let button = doc.createElement('toolbarbutton');
    button.setAttribute('id', 'cliqz-button');
    button.setAttribute('type', 'menu-button');
    button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
    button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz.ico)';
  
    var menupopup = doc.createElement('menupopup');

    addButtonToMenu(doc, menupopup, 'Feedback', function() {
        win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                openTab(doc, 'http://beta.cliqz.com/feedback/' + beVersion);
        });
    });

    addButtonToMenu(doc, menupopup,'FAQ', function() {
        openTab(doc, 'http://beta.cliqz.com/faq');
    });

    addButtonToMenu(doc, menupopup, 'Tutorial', function() {
        openTab(doc, 'http://beta.cliqz.com/tutorial');
    });

    var priv = 'Privatsph' + String.fromCharCode('0228') + 're';
    addButtonToMenu(doc, menupopup, priv, function() {
        openTab(doc, 'http://beta.cliqz.com/img/privacy.jpg');
    });

    menupopup.appendChild(doc.createElement('menuseparator'));
    addButtonToMenu(doc, menupopup, 'Options', function() {
        win.openDialog('chrome://cliqz/content/options.xul', 'Cliqz Options', 'chrome,toolbar,modal');
    });

    menupopup.appendChild(doc.createElement('menuseparator'));
    addButtonToMenu(doc, menupopup, 'Update Suchen', function() {
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
}

function openTab(doc, url){
    var tBrowser = doc.getElementById('content');
    var tab = tBrowser.addTab(url);
    tBrowser.selectedTab = tab;
}

function unloadFromWindow(win){
    try {
        win.document.getElementById('cliqz-button').remove();
        win.CLIQZ.Core.destroy();
        delete win.CLIQZ;
    }catch(e){Cu.reportError(e)}
}

function windowWatcher(win, topic) {
    if (topic == 'domwindowopened') {
        win.addEventListener('load', function() {
            win.removeEventListener('load', arguments.callee, false);
            if (win.location.href == 'chrome://browser/content/browser.xul')
                loadIntoWindow(win, true)
        }, false);
    }
}

// DEFAULT BOOTSTRAP

function startup(aData, aReason) {
    Cu.import('chrome://cliqz/content/utils.js?r='+ Math.random());
    CLIQZ.Utils.init();

    setDefaultPrefs();
    // Load into any existing windows
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        loadIntoWindow(win);
    }
    // Load into all new windows
    Services.ww.registerNotification(windowWatcher);

    if(aReason == ADDON_UPGRADE){
        // open changelog on update
        CLIQZ.Utils.openOrReuseAnyTab(CLIQZ.Utils.CHANGELOG, CLIQZ.Utils.UPDATE_URL, false);
    }
}

function shutdown(aData, aReason) {

    // Firefox shut down
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }

    //
    if (aReason == ADDON_DISABLE ) {
        eventLog('addon_disable');
    }

    if (aReason == ADDON_UNINSTALL ) {
        eventLog('addon_uninstall');
    }

    // Unload from any existing windows
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        unloadFromWindow(win);
    }

    Services.ww.unregisterNotification(windowWatcher);
}

function eventLog(ev){
    var action = {
        type: 'activity',
        action: ev
    };

    CLIQZ.Utils.track(action, true);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}

// PREFERENCES
const PREF_BRANCH = 'extensions.cliqz.';
const PREFS = {
    'UDID': '',
    'url': 'www.cliqz.com',
    'messageUpdate': '0', // last update message timestamp
    'messageInterval': 60 * 60 * 1e3, // interval between messages - 1H
    'showQueryDebug': false, // show query debug information next to results
    'showDebugLogs': false, // show debug logs in console
    'popupHeight': 165, // popup/dropdown height in pixels 
    'betaGroup': false, // if set to true the extension gets all the updates. Else only the major ones 
    'dnt': false, // if set to true the extension will not send any tracking signals
    'enterLoadsFirst': false, // on enter the first result is loaded if none is selected
    'hideQuickSearch': true, // hides quick search
    'pagePreload': true, // hides quick search
    'inPrivate': false, // enables extension in private mode
    'bwFonts': false, // uses only black and white fonts for titles
    'scale': 3, // 1-xsmall, 2-small, 3-normal, 4-large, 5-xlarge
    'logoPosition': 1, // -1-left, 0-none, 1-right
};

function setDefaultPrefs() {
  let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
  for (let [key, val] in Iterator(PREFS)) {
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
}
