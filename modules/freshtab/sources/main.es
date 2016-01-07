const { classes: Cc, interfaces: Ci, utils: Cu, manager: Cm } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Cu.import('chrome://cliqzmodules/content/CliqzABTests.jsm');

var CLIQZ_NEW_TAB = "about:cliqz",
    CLIQZ_NEW_TAB_URL = "chrome://cliqz/content/freshtab/freshtab.html",
    DEF_HOMEPAGE = "browser.startup.homepage",
    DEF_NEWTAB = "browser.newtab.url",
    DEF_STARTUP = "browser.startup.page",
    BAK_HOMEPAGE = "extensions.cliqz.backup.homepage",
    BAK_NEWTAB = "extensions.cliqz.backup.newtab",
    BAK_STARTUP = "extensions.cliqz.backup.startup",
    FRESH_TAB_AB = "extensions.cliqz.freshTabAB", // true = AB test active
    FRESH_TAB_STATE = "extensions.cliqz.freshTabState", // true = active
    FRESH_TAB_BACKUP_DONE = "extensions.cliqz.freshTabBackupDone", // true = active
    OLD_FRESH_TAB = "extensions.cliqz.freshtabdone",
    pref = Services.prefs,
    HAS_BUTTON = true,
    FF41_OR_ABOVE = false;

try{
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
  var versionChecker = Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

  if(versionChecker.compare(appInfo.version, "41.0") >= 0){
    FF41_OR_ABOVE = true;
    Cu.import("resource:///modules/NewTabURL.jsm");
  }
} catch(e){}


Cm.QueryInterface(Ci.nsIComponentRegistrar);
function AboutURL() {}
var AboutURLFactory;

var FreshTab = {
    signalType: "home",
    initialized: false,

    startup: function(abTest, hasButton){
        var disable = false;

        HAS_BUTTON = hasButton;

        // exit if not in the AB test
        if(abTest && (!pref.prefHasUserValue(FRESH_TAB_AB) || pref.getBoolPref(FRESH_TAB_AB) == false)) disable = true;

        // disable the AB test if the user doesnt have FF41 or above
        if(!FF41_OR_ABOVE){
          CliqzABTests.disable("1056_B");
          disable = true;
        }

        if(disable){
          //in case 'about:cliqz' remained set as default homepage - reset it
          if(pref.getCharPref(DEF_HOMEPAGE) == CLIQZ_NEW_TAB){
            //in case we did a backup - use it
            if(pref.prefHasUserValue(BAK_HOMEPAGE)){
              pref.setCharPref(DEF_HOMEPAGE, pref.getCharPref(BAK_HOMEPAGE));
            } else {
              //otherwise simply reset
              pref.clearUserPref(DEF_HOMEPAGE);
            }
          }
          return;
        }

        // first start
        if(HAS_BUTTON && !pref.prefHasUserValue(FRESH_TAB_STATE)){
          pref.setBoolPref(FRESH_TAB_STATE,  false); //opt-in
        }
        AboutURL.prototype = {
            QueryInterface: XPCOMUtils.generateQI([Ci.nsIAboutModule]),
            classDescription: CLIQZ_NEW_TAB,
            classID: Components.ID("{D5889F72-0F01-4aee-9B88-FEACC5038C34}"),
            contractID: "@mozilla.org/network/protocol/about;1?what=cliqz",

            newChannel: function(uri) {
                var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
                var html =  ["data:text/html,<!DOCTYPE html><html><head><meta charset=\"UTF-8\">",
                            "<style>* {margin:0;padding:0;width:100%;height:100%;overflow:hidden;border: 0}</style>",
                            "</head><body><iframe src=\"" + CLIQZ_NEW_TAB_URL + "\"></iframe></body></html>"].join('')

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

        // reset preferences in case of inconsistency
        if(pref.prefHasUserValue(OLD_FRESH_TAB) || //  old FreshTab settings
           (pref.prefHasUserValue(BAK_HOMEPAGE) && pref.getCharPref(BAK_HOMEPAGE) == CLIQZ_NEW_TAB)  // inconsistency
          ){

          pref.clearUserPref(OLD_FRESH_TAB);
          pref.clearUserPref(DEF_HOMEPAGE);
          pref.clearUserPref(DEF_NEWTAB);
          pref.clearUserPref(DEF_STARTUP);
          pref.clearUserPref(BAK_HOMEPAGE);
          pref.clearUserPref(BAK_NEWTAB);
          pref.clearUserPref(BAK_STARTUP);
          pref.clearUserPref(FRESH_TAB_BACKUP_DONE);
        }

        FreshTab.updateState();
        FreshTab.initialized = true;
    },

    shutdown: function(){
        if(!FreshTab.initialized) return;

        Cm.unregisterFactory(AboutURL.prototype.classID, AboutURLFactory);
        Services.ww.unregisterNotification(initNewTab);

        deactivate();
    },
    toggleState: function(){
      pref.setBoolPref(FRESH_TAB_STATE, !pref.getBoolPref(FRESH_TAB_STATE));
      FreshTab.updateState();
    },
    updateState: function(){
      if(isActive()){
        activate();
      } else {
        deactivate();
      }
  }
}

function isActive(){
  //always active if the user doesn't have the activator button
  return !HAS_BUTTON || pref.getBoolPref(FRESH_TAB_STATE);
}

function activate(){
  // save the backup state only once
  var backupDone = true;
  if(!pref.prefHasUserValue(FRESH_TAB_BACKUP_DONE)){
    pref.setBoolPref(FRESH_TAB_BACKUP_DONE, true);
    backupDone = false
  }

  if(FF41_OR_ABOVE){
      // newtab.url needs to be changed in the browser itself in FF 41
      // https://dxr.mozilla.org/mozilla-central/source/browser/modules/NewTabURL.jsm
      !backupDone && pref.setIntPref(BAK_STARTUP, pref.getIntPref(DEF_STARTUP));
      pref.setIntPref(DEF_STARTUP, "1"); // set the startup page to be the homepage
      NewTabURL.override(CLIQZ_NEW_TAB);
  } else { //FF 40 or older
      !backupDone && pref.setCharPref(BAK_NEWTAB, pref.getCharPref(DEF_NEWTAB));
      pref.setCharPref(DEF_NEWTAB, CLIQZ_NEW_TAB);
  }

  !backupDone && pref.setCharPref(BAK_HOMEPAGE, pref.getCharPref(DEF_HOMEPAGE));
  pref.setCharPref(DEF_HOMEPAGE, CLIQZ_NEW_TAB);
}

function deactivate(){
  if(!pref.prefHasUserValue(FRESH_TAB_BACKUP_DONE)) return;

  pref.setCharPref(DEF_HOMEPAGE, pref.getCharPref(BAK_HOMEPAGE));
  if(FF41_OR_ABOVE){ // FF41+
      NewTabURL.reset();
      pref.setIntPref(DEF_STARTUP, pref.getIntPref(BAK_STARTUP)); // set the startup page to be the homepage
  }
  else {//FF40 and older
      pref.setCharPref(DEF_NEWTAB, pref.getCharPref(BAK_NEWTAB));
  }
}

export default FreshTab;
