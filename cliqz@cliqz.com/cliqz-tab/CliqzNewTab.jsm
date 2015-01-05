'use strict';
/*
 * This module is responsible for New Tab displaying
 *
 */

var EXPORTED_SYMBOLS = ['CliqzNewTab'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/devtools/Console.jsm");

XPCOMUtils.defineLazyModuleGetter(this,'CliqzUtils','chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzNewTab = {
    STARTTAB_URL_DEFAULT: "about:home",
    NEWTAB_URL_CLIQZ: "about:cliqz",
    NEWTAB_URL_DEFAULT: "about:newtab",
    
    enabledByDefault: false,
    
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
        try {
            var show = Services.prefs.getBoolPref("extensions.cliqz.showCliqzNewTab");
            
            return show === null?this.enabledByDefault:show;
        }
        catch(ex) {
            return this.enabledByDefault;
        }
    },
    
    showCliqzNewTab: function(show){
        Services.prefs.setBoolPref("extensions.cliqz.showCliqzNewTab",show);
        
        this.applySettings();
    },
    
    applySettings: function(){
        if (this.isCliqzNewTabShown()) {
            var newtab = Services.prefs.getCharPref("browser.newtab.url"),
                startpage = Services.prefs.getCharPref("browser.startup.homepage");
            
            if (startpage != this.NEWTAB_URL_CLIQZ) Services.prefs.setCharPref("extensions.cliqz.backup.browser.startup.homepage",startpage);
            if (newtab != this.NEWTAB_URL_CLIQZ) Services.prefs.setCharPref("extensions.cliqz.backup.browser.newtab.url",newtab);
            Services.prefs.setCharPref("browser.startup.homepage",this.NEWTAB_URL_CLIQZ);
            Services.prefs.setCharPref("browser.newtab.url",this.NEWTAB_URL_CLIQZ);
        }
        else {
            var startpagebackup,newtabbackup
            
            try {
                startpagebackup = Services.prefs.getCharPref("extensions.cliqz.backup.browser.startup.homepage");
            }
            catch(ex) { var nostartpagebackup = true; }
            
            try {
                newtabbackup = Services.prefs.getCharPref("extensions.cliqz.backup.browser.newtab.url");
            }
            catch(ex) { var nonewtabbackup = true; }
            
            if (!nostartpagebackup && !nonewtabbackup) {
                Services.prefs.setCharPref("browser.startup.homepage",startpagebackup?startpagebackup:this.STARTTAB_URL_DEFAULT);
                Services.prefs.setCharPref("browser.newtab.url",newtabbackup?newtabbackup:this.NEWTAB_URL_DEFAULT);
                Services.prefs.setCharPref("extensions.cliqz.backup.browser.startup.homepage","");
                Services.prefs.setCharPref("extensions.cliqz.backup.browser.newtab.url","");
            }
        }
    }
};