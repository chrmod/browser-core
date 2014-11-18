'use strict';
const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
                                  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var EXPORTED_SYMBOLS = ['CliqzSQL'];

var CliqzSQL = {
    SQL: function(sql, dbConn) {
        var statement = dbConn
    },
    connDB: function(fileName) {
        let file = FileUtils.getFile("ProfD", [fileName]);
        let dbConn = Services.storage.openDatabase(file);
        return dbConn;
    },
    spellInit: function() {
        let file = FileUtils.getFile("ProfD", ['spell.sqlite']);
        let dbConn = Services.storage.openDatabase(file);
        dbConn.executeSimpleSQL("CREATE TABLE spell (wrong VARCHAR(255) PRIMARY KEY NOT NULL, correct VARCHAR(255) NULL)");
        dbConn.executeSimpleSQL('INSERT INTO spell (wrong, correct) VALUES ("redit", "reddit")');
    },
    spellQuery: function(word, dbConn) {
        var statement = dbConn.createStatement("SELECT correct FROM spell WHERE wrong = :wrong_word");
        statement.params.wrong_word = word;
        statement.executeAsy
    }
}
