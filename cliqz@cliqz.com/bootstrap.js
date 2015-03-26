'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Extension',
  'chrome://cliqzmodules/content/Extension.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUCrawl',
  'chrome://cliqzmodules/content/CliqzUCrawl.jsm');

function startup(aData, aReason) {
    Extension.load(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);
}

function shutdown(aData, aReason) {
    CliqzUCrawl.destroy();
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
    Cu.unload('chrome://cliqzmodules/content/CliqzUCrawl.jsm');
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
