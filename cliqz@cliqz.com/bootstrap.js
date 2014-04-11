'use strict';
function startup(aData, aReason) {
    Components.utils.import('chrome://cliqz/content/extension.js?r=' + Math.random());
    CLIQZExtension.init();
    CLIQZExtension.load(aReason == ADDON_UPGRADE);
}

function shutdown(aData, aReason) {
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    CLIQZExtension.unload();
}

function eventLog(ev){
    var action = {
        type: 'activity',
        action: ev
    };

    CLIQZExtension.track(action, true);
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}