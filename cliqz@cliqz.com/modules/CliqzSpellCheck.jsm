'use strict';
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
                                  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var EXPORTED_SYMBOLS = ["CliqzSpellCheck"];

var CliqzSpellCheck = {
    loadRecords: function(req) {
        var content = req.response.split("\n");
        for (var i=0; i < content.length; i++) {
            var words = content[i].split("\t");
            var wrong = words[0];
            var right = words[1];
            CliqzAutocomplete.spellCorrectionDict[wrong] = right;
        }
    },
    initSpellCorrection: function() {
        CliqzUtils.loadResource('chrome://cliqzres/content/content/spell_check.list', CliqzSpellCheck.loadRecords)
    }
}

