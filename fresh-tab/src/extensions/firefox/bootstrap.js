'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

var CLIQZ_NEW_TAB = "about:cliqz",
    DEF_HOMEPAGE = "browser.startup.homepage",
    DEF_NEWTAB = "browser.newtab.url",
    BAK_HOMEPAGE = "extensions.cliqz.backup.homepage",
    BAK_NEWTAB = "extensions.cliqz.backup.newtab",
    pref = Services.prefs;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

function startup(aData, aReason) {
    Cm.registerFactory(
        AboutURL.prototype.classID,
        AboutURL.prototype.classDescription,
        AboutURL.prototype.contractID,
        AboutURLFactory
    );

    if(!pref.prefHasUserValue(BAK_HOMEPAGE)){
        pref.setCharPref(BAK_HOMEPAGE, pref.getCharPref(DEF_HOMEPAGE));
        pref.setCharPref(BAK_NEWTAB, pref.getCharPref(DEF_NEWTAB));
    }

    pref.setCharPref(DEF_HOMEPAGE, CLIQZ_NEW_TAB);
    pref.setCharPref(DEF_NEWTAB, CLIQZ_NEW_TAB);

    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
        initNewTab(enumerator.getNext())
    }
    Services.ww.registerNotification(initNewTab);
}

function shutdown(aData, aReason) {
    if(aReason == APP_SHUTDOWN) return;

    Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
    Services.ww.unregisterNotification(initNewTab);

    pref.setCharPref(DEF_HOMEPAGE, pref.getCharPref(BAK_HOMEPAGE));
    pref.setCharPref(DEF_NEWTAB, pref.getCharPref(BAK_NEWTAB));
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}

function initNewTab(win){
    if (win.gInitialPages && win.gInitialPages.indexOf(CLIQZ_NEW_TAB)===-1)
        win.gInitialPages.push(CLIQZ_NEW_TAB);

    win.addEventListener('load', function loader() {
        win.removeEventListener('load', loader, false);
        if (win.gInitialPages && win.gInitialPages.indexOf(CLIQZ_NEW_TAB)===-1)
            win.gInitialPages.push(CLIQZ_NEW_TAB);
    }, false);
}

const CLIQZ_TAB_URL = "chrome://cliqztab/content/freshtab.html";

function AboutURL() {}
AboutURL.prototype = {
    QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
    classDescription: CLIQZ_NEW_TAB,
    classID: Components.ID("{D5889F72-0F01-4aee-9B88-FEACC5038C34}"),
    contractID: "@mozilla.org/network/protocol/about;1?what=cliqz",

    newChannel: function(uri) {
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        var html =  ["data:text/html,<!DOCTYPE html><html><head><meta charset=\"UTF-8\">",
                    "<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>",
                    "</head><body><iframe src=\"" + CLIQZ_TAB_URL + "\"></iframe></body></html>"].join('')

        var securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
        var channel = ioService.newChannel(html, null, null);
        channel.originalURI = uri;
        channel.owner = securityManager.getSystemPrincipal();

        return channel;
    },

    getURIFlags: function(uri) { return Ci.nsIAboutModule.ALLOW_SCRIPT; }
}

const AboutURLFactory = XPCOMUtils.generateNSGetFactory([AboutURL])(AboutURL.prototype.classID);
