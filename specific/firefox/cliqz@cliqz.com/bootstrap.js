'use strict';
const { utils: Cu } = Components;

var TELEMETRY_SIGNAL = {};
TELEMETRY_SIGNAL[APP_SHUTDOWN] = 'browser_shutdown';
TELEMETRY_SIGNAL[ADDON_DISABLE] = 'addon_disable';
TELEMETRY_SIGNAL[ADDON_UNINSTALL] = 'addon_uninstall';

function startup(aData, aReason) {
    // try to cleanup an eventual broken shutdown
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');

    Cu.import('chrome://cliqzmodules/content/Extension.jsm');
    Extension.load(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);
}

function shutdown(aData, aReason) {
    Cu.import('chrome://cliqzmodules/content/Extension.jsm');

    Extension.telemetry({
        type: 'activity',
        action: TELEMETRY_SIGNAL[aReason]
    }, true /* force push */);

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);

    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
