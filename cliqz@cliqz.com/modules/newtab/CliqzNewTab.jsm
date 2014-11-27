'use strict';
/*
 * This module is responsible for New Tab displaying
 *
 */

var EXPORTED_SYMBOLS = ['CliqzNewTab'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");

XPCOMUtils.defineLazyModuleGetter(this,'CliqzUtils','chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzNewTab = {
    STARTTAB_URL_CLIQZ: "chrome://cliqzmodules/content/newtab/CliqzNewTab.xul",
    STARTTAB_URL_DEFAULT: "about:home",
    NEWTAB_URL_CLIQZ: "chrome://cliqzmodules/content/newtab/CliqzNewTab.xul",
    NEWTAB_URL_DEFAULT: "about:newtab",
    
    init: function(window){
        // if in the context of XUL
        if (window.gInitialPages) {
            var gInitialPages = window.gInitialPages;

            if (gInitialPages.indexOf(this.NEWTAB_URL_CLIQZ) == -1) {
              gInitialPages.push(this.NEWTAB_URL_CLIQZ);
            }
        
            this.applySettings();
        }
    },
    
    isCliqzNewTabShown: function(){
        var value;

        try {
            value = Services.prefs.getBoolPref("extensions.cliqz.showCliqzNewTab");
        }
        catch(ex) {
            Services.prefs.setBoolPref("extensions.cliqz.showCliqzNewTab",true);
            value = true;
        }

        return value;
    },
    
    showCliqzNewTab: function(show){
        Services.prefs.setBoolPref("extensions.cliqz.showCliqzNewTab",show);
        this.applySettings();
    },
    
    applySettings: function(){
        Services.prefs.setCharPref("browser.startup.homepage",this.isCliqzNewTabShown()? 
                                                              this.STARTTAB_URL_CLIQZ:this.STARTTAB_URL_DEFAULT);
        Services.prefs.setCharPref("browser.newtab.url",this.isCliqzNewTabShown()? 
                                                        this.NEWTAB_URL_CLIQZ:this.NEWTAB_URL_DEFAULT);
    }
};