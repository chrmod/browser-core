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
    checkQuery: function(query, callback) {
        var words = query.split(" ");
        words = CliqzSpellCheck.clearWords(words);
        CliqzUtils.log('start', 'spellcheck');
        for (var i = 0; i < words.length; i++) {
            var newWord = CliqzSpellCheck.dbQuery(words[i]);
            if (newWord) words[i] = newWord;
        }
        CliqzUtils.log('end', 'spellcheck');
        callback(words.join(" "), query);
    },
    clearWords: function(words) {
        var newWords = [];
        for (var i = 0; i < words.length; i++) {
            if (words[i].length != 0) {
                newWords.push(words[i]);
            }
        }
        return newWords;
    },
    dbInit: function() {
        let file = FileUtils.getFile("ProfD", ['spell.sqlite']);
        if (file.exists()) {
            let dbConn = Services.storage.openDatabase(file);
        } else {
            let dbConn = Services.storage.openDatabase(file);
            dbConn.executeSimpleSQL("CREATE TABLE spell (wrong VARCHAR(255) PRIMARY KEY NOT NULL, correct VARCHAR(255) NULL)");
            CliqzUtils.setPref('spellchecker', "-1");
        }
        CliqzSpellCheck.dbFlush();
    },
    loadRecords: function(req) {
        let file = FileUtils.getFile("ProfD", ['spell.sqlite']);
        let dbConn = Services.storage.openDatabase(file);
        CliqzUtils.log(req.response.substr(0, 100), "spellcheck");
        var content = req.response.split("\n");
        
        // check version
        var version = content[0];
        CliqzUtils.log("current spellchecker version: " + CliqzUtils.getPref("spellchecker", "-1"), "spellcheck");
        CliqzUtils.log("spellchecker version: " + version, "spellcheck");
        content = content.slice(1);
        if (CliqzUtils.getPref('spellchecker', "-1") != version) {
            CliqzUtils.log("brand new spellchecker, reload data", "spellcheck");
            dbConn.executeSimpleSQL("DROP TABLE spell");
            dbConn.executeSimpleSQL("CREATE TABLE spell (wrong VARCHAR(255) PRIMARY KEY NOT NULL, correct VARCHAR(255) NULL)");
            for (var i=0; i < content.length; i++) {
                CliqzUtils.setTimeout(function(words) {
                    var wrong = words[0];
                    var correct = words[1];
                    dbConn.executeSimpleSQL('INSERT INTO spell (wrong, correct) VALUES ("' + wrong + '", "' + correct + '")');
                }, i*3, content[i].split("\t"));
            }
            CliqzUtils.setTimeout(function() {
                dbConn.executeSimpleSQL('CREATE UNIQUE INDEX spell_index on spell');
            }, content.length * 3 + 5);
            CliqzUtils.setPref('spellchecker', version);
        }
    },
    dbFlush: function() {
        CliqzUtils.loadResource('chrome://cliqzres/content/content/spell_check.list', CliqzSpellCheck.loadRecords)
    },
    dbQuery: function(word) {
        let file = FileUtils.getFile("ProfD", ['spell.sqlite']);
        let dbConn = Services.storage.openDatabase(file);
        var statement = dbConn.createStatement("SELECT correct FROM spell WHERE wrong = :wrong_word");
        statement.params.wrong_word = word;
        while (statement.executeStep()) {
            return statement.row.correct;
        }
    }
}

