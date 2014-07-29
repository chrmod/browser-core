'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Extension',
  'chrome://cliqzmodules/content/Extension.jsm?v=0.5.03');

function startup(aData, aReason) {
    Extension.load(aReason == ADDON_UPGRADE);
}

function shutdown(aData, aReason) {
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm?v=0.5.03');
}

function eventLog(ev){
    var action = {
        type: 'activity',
        action: ev
    };

    Extension.track(action, true);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
