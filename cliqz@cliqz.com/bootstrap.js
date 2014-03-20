//'use strict';

var Cu = Components.utils;
//Cu.import('chrome://cliqz/content/utils.js');

var BASE_URI = 'chrome://cliqz/content/';
var {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
// LOADING scripts

var addScript = function(src, win) {
    Services.scriptloader.loadSubScript(BASE_URI + src + '.js', win);
};
/*devel__)*/


function loadIntoWindow(win, isNew) {
    /*devel__)*/
    for each (var src in ['core', 'historyManager', 'utils', /*'cliqz-results'*/]) 
        addScript(src, win)

    try {
        win.CLIQZ.Core.init();
    } catch(e) {Cu.reportError(e)}
}

function unloadFromWindow(win){
    try {
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
        type: 'action',
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