'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Extension',
  'chrome://cliqzmodules/content/Extension.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHumanWeb',
  'chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CUcrawl',
  'chrome://cliqzmodules/content/CUcrawl.jsm');




function startup(aData, aReason) {
    Extension.load(aReason == ADDON_UPGRADE, aData.oldVersion, aData.version);

    try{
        Cu.import("chrome://cliqzres/content/freshtab/page/js/FreshTab.jsm");
        FreshTab.startup('chrome://cliqzres/content/freshtab/page/freshtab.html')
    } catch(e){}
}

function shutdown(aData, aReason) {
    CliqzHumanWeb.unload();
    CUcrawl.destroy();
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);
    Cu.unload('chrome://cliqzmodules/content/CliqzHumanWeb.jsm');
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');
    Cu.unload('chrome://cliqzmodules/content/CUcrawl.jsm');

    try{ FreshTab.shutdown(aData, aReason); } catch(e){}
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
