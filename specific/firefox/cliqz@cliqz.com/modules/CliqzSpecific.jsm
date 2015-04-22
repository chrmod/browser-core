'use strict';
var EXPORTED_SYMBOLS = ['CliqzSpecific'];

Components.utils.import('resource://gre/modules/Services.jsm');

var _log = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService),
    PREF_STRING = 32,
    PREF_INT    = 64,
    PREF_BOOL   = 128;

var CliqzSpecific = {
    genericPrefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService),
    cliqzPrefs: Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.'),
    log: function(msg, key){
        _log.logStringMessage(
          'CLIQZ ' + (new Date()).toISOString() + (key? ' ' + key : '') + ': ' +
          (typeof msg == 'object'? JSON.stringify(msg): msg)
        );
    },
    getPref: function(pref, notFound){
        try {
            var prefs = CliqzSpecific.cliqzPrefs;
            switch(prefs.getPrefType(pref)) {
                case PREF_BOOL: return prefs.getBoolPref(pref);
                case PREF_STRING: return prefs.getCharPref(pref);
                case PREF_INT: return prefs.getIntPref(pref);
                default: return notFound;
            }
        } catch(e) {
          return notFound;
        }
    },
    getPrefs: function(){
        var prefs = {},
            cqz = CliqzSpecific.cliqzPrefs.getChildList('');
        for(var i=0; i<cqz.length; i++){
            var pref = cqz[i];
            prefs[pref] = CliqzSpecific.getPref(pref);
        }
        return prefs;
    },
    setPref: function(pref, val){
        switch (typeof val) {
            case 'boolean': CliqzSpecific.cliqzPrefs.setBoolPref(pref, val); break;
            case 'number': CliqzSpecific.cliqzPrefs.setIntPref(pref, val); break;
            case 'string': CliqzSpecific.cliqzPrefs.setCharPref(pref, val); break;
          }
    },
    httpHandler: function(method, url, callback, onerror, timeout, data){
        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        req.open(method, url, true);
        req.overrideMimeType('application/json');
        req.onload = function(){
            if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
                callback && callback(req);
            } else {
                CliqzSpecific.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzSpecific.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CliqzSpecific){
                CliqzSpecific.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CliqzSpecific.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CliqzSpecific){ //might happen after disabling the extension
                CliqzSpecific.log( "timeout for " + url, "CliqzSpecific.httpHandler");
                onerror && onerror();
            }
        }

        if(callback){
            if(timeout){
                req.timeout = parseInt(timeout)
            } else {
                req.timeout = (method == 'POST'? 10000 : 1000);
            }
        }

        req.send(data);
        return req;
    }
}