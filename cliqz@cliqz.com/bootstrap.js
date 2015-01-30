'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

Cm.QueryInterface(Ci.nsIComponentRegistrar);

XPCOMUtils.defineLazyModuleGetter(this, 'Extension',
  'chrome://cliqzmodules/content/Extension.jsm');

function startup(aData, aReason) {
    Extension.load(aReason == ADDON_UPGRADE);

    Cm.registerFactory(
        AboutURL.prototype.classID,
        AboutURL.prototype.classDescription,
        AboutURL.prototype.contractID,
        AboutURLFactory
    );

    if (aReason == ADDON_ENABLE || aReason == ADDON_INSTALL)
        CliqzUtils.setOurOwnPrefs();
}

function shutdown(aData, aReason) {
    if (aReason == APP_SHUTDOWN){
        eventLog('browser_shutdown');
        return;
    }
    if (aReason == ADDON_DISABLE) eventLog('addon_disable');
    if (aReason == ADDON_UNINSTALL) eventLog('addon_uninstall');

    Extension.unload(aData.version, aReason == ADDON_DISABLE || aReason == ADDON_UNINSTALL);
    Cu.unload('chrome://cliqzmodules/content/Extension.jsm');

    Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
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

// ********************************************************************************************* //
// new tab page
const CLIQZ_TAB_URL = "chrome://cliqz-tab/content/page/newtab.html";

function AboutURL() {}
AboutURL.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
    classDescription: "about:cliqz",
    classID: Components.ID("{D5889F72-0F01-4aee-9B88-FEACC5038C34}"),
    contractID: "@mozilla.org/network/protocol/about;1?what=cliqz",

    newChannel: function(uri) {
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var html = "data:text/html,<!DOCTYPE html><html><head><meta charset=\"UTF-8\">" +
                    "<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>" +
                    "</head><body><iframe src=\"" + CLIQZ_TAB_URL + "\"></iframe></body></html>";

        var securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
        var channel = ioService.newChannel(html, null, null);
        channel.originalURI = uri;
        channel.owner = securityManager.getSystemPrincipal();

        return channel;
    },

    getURIFlags: function(uri) { return Ci.nsIAboutModule.ALLOW_SCRIPT; }
}

const AboutURLFactory = XPCOMUtils.generateNSGetFactory([AboutURL])(AboutURL.prototype.classID);
// ********************************************************************************************* //
