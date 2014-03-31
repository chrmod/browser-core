//'use strict';

var Cu = Components.utils;
//Cu.import('chrome://cliqz/content/utils.js');

var BASE_URI = 'chrome://cliqz/content/';
var {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
// LOADING scripts

var addScript = function(src, win) {
    Services.scriptloader.loadSubScript(BASE_URI + src + '.js?rand='+Math.random(), win);
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

function addButtons(win){
    let document = win.document,
        navBar = win.document.getElementById('nav-bar');

    let button = win.document.createElement('toolbarbutton');
    button.setAttribute('id', 'cliqz-button');
    button.setAttribute('type', 'menu-button'); 
    button.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
    button.style.listStyleImage = 'url(chrome://cliqzres/content/skin/cliqz.ico)';
  
    var menupopup = document.createElement('menupopup');
    menupopup.setAttribute('id', 'menupopup');
    menupopup.addEventListener('command', function(event) {

    }, false);


    var menuitem1 = document.createElement('menuitem');
    menuitem1.setAttribute('id', 'menuitem1');
    menuitem1.setAttribute('label', 'Feedback');
    menuitem1.addEventListener('command', function(event) {
        win.Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version
                openTab(document, 'http://beta.cliqz.com/feedback/' + beVersion);
        });    
    }, false);

    var menuitem2 = document.createElement('menuitem');
    menuitem2.setAttribute('id', 'menuitem2');
    menuitem2.setAttribute('label', 'FAQ');
    menuitem2.addEventListener('command', function(event) {
        openTab(document, 'http://beta.cliqz.com/faq');    
    }, false);

    var menuitem3 = document.createElement('menuitem');
    menuitem3.setAttribute('id', 'menuitem3');
    menuitem3.setAttribute('label', 'Tutorial');
    menuitem3.addEventListener('command', function(event) {
        openTab(document, 'http://beta.cliqz.com/anleitung');    
    }, false);

    menupopup.appendChild(menuitem1);
    menupopup.appendChild(menuitem2);
    menupopup.appendChild(menuitem3);
    button.appendChild(menupopup);


    button.addEventListener('click', function() {
        //win.BrowserOpenTab('about:home');
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
    Cu.import('chrome://cliqz/content/utils.js');
    setDefaultPrefs();
    // Load into any existing windows
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        var win = enumerator.getNext();
        loadIntoWindow(win);
    }
    // Load into all new windows
    Services.ww.registerNotification(windowWatcher);
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
    Cu.unload('resource://cliqz/content/utils.js');
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
    'popupHeight': 165 // popup/dropdown height in pixels 
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
