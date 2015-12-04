'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

function startup(aData, aReason) {
    //ensure clean uninstall of an eventual old extension
    Cu.unload('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
    Cu.unload('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
    try{
      //resets the old FreshTab in case it had problems uninstlling
      Cu.import("chrome://cliqzres/content/freshtab/page/js/FreshTab.jsm");
      FreshTab.shutdown(aData, aReason);
      Cu.unload('chrome://cliqzres/content/freshtab/page/js/FreshTab.jsm');
    } catch(e){}


    Cu.import('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
    Cu.import('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
    Cu.import('chrome://cliqzmodules/content/Extension.jsm');

    Extension.load(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);
}

function shutdown(aData, aReason) {
    Cu.import('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
    Cu.import('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
    Cu.import('chrome://cliqzmodules/content/Extension.jsm');

    CliqzHumanWeb.unload();
    try{ CliqzFreshTab.shutdown(aData, aReason); } catch(e){}

    if (aReason == APP_SHUTDOWN){
        CliqzLoyalty.unload();
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);
    Cu.unload('chrome://cliqzmodules/content/CliqzLoyalty.jsm');
    Cu.unload('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
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
