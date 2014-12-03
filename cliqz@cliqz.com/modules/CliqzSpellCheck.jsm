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
    check: function(q) {
        var words = q.split(" ");
        var correctBack = {}
        for (var i = 0; i < words.length; i++) {
            if (words[i] == "") continue;
            if (words[i] in CliqzAutocomplete.spellCorrectionDict) {
                var correct = CliqzAutocomplete.spellCorrectionDict[words[i]];
                CliqzUtils.log(correct + " " + words[i] + " " + i + " " + words.length, "spellcorr");
                CliqzUtils.log(correct.slice(0, words[i].length), 'spellcorr');
                if (correct.length > words[i].length &&
                    correct.slice(0, words[i].length) == words[i] &&
                    i == words.length - 1) continue;
                if (correct.length < words[i].length &&
                    words[i].slice(0, correct.length) == correct &&
                    i == words.length - 1) continue;
                CliqzUtils.log("replace", "spellcorr");
                correctBack[correct] = words[i]
                words[i] = correct;
            }
        }
        return [words.join(" "), correctBack];
    },
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
        if (CliqzUtils.getPref("localSpellCheck", false)) {
            CliqzUtils.loadResource('chrome://cliqzres/content/content/spell_check.list', CliqzSpellCheck.loadRecords)
        }
    }
}

