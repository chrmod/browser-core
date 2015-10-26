'use strict';

var EXPORTED_SYMBOLS = ['FreshTab'];

const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

var CLIQZ_NEW_TAB = "about:cliqz",
    DEF_HOMEPAGE = "browser.startup.homepage",
    DEF_NEWTAB = "browser.newtab.url",
    DEF_STARTUP = "browser.startup.page",
    BAK_HOMEPAGE = "extensions.cliqz.backup.homepage",
    BAK_NEWTAB = "extensions.cliqz.backup.newtab",
    BAK_STARTUP = "extensions.cliqz.backup.startup",
    FRESH_TAB_DONE = "extensions.cliqz.freshtabdone",
    pref = Services.prefs;

Cm.QueryInterface(Ci.nsIComponentRegistrar);
function AboutURL() {}
var AboutURLFactory;

var FreshTab = {
    startup: function(freshTabUrl){
        AboutURL.prototype = {
            QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
            classDescription: CLIQZ_NEW_TAB,
            classID: Components.ID("{D5889F72-0F01-4aee-9B88-FEACC5038C34}"),
            contractID: "@mozilla.org/network/protocol/about;1?what=cliqz",

            newChannel: function(uri) {
                var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
                var html =  ["data:text/html,<!DOCTYPE html><html><head><meta charset=\"UTF-8\">",
                            "<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>",
                            "</head><body><iframe src=\"" + freshTabUrl + "\"></iframe></body></html>"].join('')

                var securityManager = Cc["@mozilla.org/scriptsecuritymanager;1"].getService(Ci.nsIScriptSecurityManager);
                var channel = ioService.newChannel(html, null, null);
                channel.originalURI = uri;
                channel.owner = securityManager.getSystemPrincipal();

                return channel;
            },

            getURIFlags: function(uri) { return Ci.nsIAboutModule.ALLOW_SCRIPT; }
        }

        AboutURLFactory = XPCOMUtils.generateNSGetFactory([AboutURL])(AboutURL.prototype.classID);

        Cm.registerFactory(
            AboutURL.prototype.classID,
            AboutURL.prototype.classDescription,
            AboutURL.prototype.contractID,
            AboutURLFactory
        );

        if(!pref.prefHasUserValue(FRESH_TAB_DONE)){
            pref.setBoolPref(FRESH_TAB_DONE,  true);
            if(Services.prefs.getPrefType(DEF_NEWTAB) == 0){ //FF 41+
                // newtab.url should be changed in the browser itself in FF 41
                // https://dxr.mozilla.org/mozilla-central/source/browser/modules/NewTabURL.jsm
                pref.setIntPref(BAK_STARTUP, pref.getIntPref(DEF_STARTUP));
            } else { //FF 40 or older
                pref.setCharPref(BAK_NEWTAB, pref.getCharPref(DEF_NEWTAB));
            }
            pref.setCharPref(BAK_HOMEPAGE, pref.getCharPref(DEF_HOMEPAGE));
        }

        pref.setCharPref(DEF_HOMEPAGE, CLIQZ_NEW_TAB);
        if(Services.prefs.getPrefType(DEF_NEWTAB) == 0){
            pref.setIntPref(DEF_STARTUP, "1"); // set the startup page to be the homepage
        } else {
            pref.setCharPref(DEF_NEWTAB, CLIQZ_NEW_TAB);
        }

        var enumerator = Services.wm.getEnumerator('navigator:browser');
        while (enumerator.hasMoreElements()) {
            initNewTab(enumerator.getNext())
        }
        Services.ww.registerNotification(initNewTab);
    },
    shutdown: function(aData, aReason){
        if(aReason == 2 /*APP_SHUTDOWN*/) return;

        Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
        Services.ww.unregisterNotification(initNewTab);

        pref.setCharPref(DEF_HOMEPAGE, pref.getCharPref(BAK_HOMEPAGE));
        if(Services.prefs.getPrefType(DEF_NEWTAB) == 0){ // FF41+
            pref.setIntPref(DEF_STARTUP, "1"); // set the startup page to be the homepage
        }
        else {//FF40 and older
            pref.setCharPref(BAK_NEWTAB, pref.getCharPref(DEF_NEWTAB));
        }

    }
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
