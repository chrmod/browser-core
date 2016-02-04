'use strict';
const { utils: Cu } = Components;

function startup(aData, aReason) {
    // try to cleanup an eventual broken shutdown
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');

    Cu.import('chrome://cliqzmodules/content/Extension.jsm');
    Extension.load(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);
}

function shutdown(aData, aReason) {
    Cu.import('chrome://cliqzmodules/content/Extension.jsm');
    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);

    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
}

function eventLog(ev){
    var action = {
        type: 'activity',
        action: ev
    };

    Extension.telemetry(action, true);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
