'use strict';
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzHistory'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


var CliqzHistory = {
    domWindow: null,
    lastQuery: new Array(),
    currentURL: null,
	listener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            if (CliqzHistory.currentURL == aURI.spec ||
                aURI.spec.substring(0,6) == "about:") {
                return;
            }               
            CliqzHistory.addHistoryEntry(aURI.spec, "link");
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },
    // type: typed / link_click / cliqz_result_click / cliqz_autocomplete
    addHistoryEntry: function(url, type) {
        CliqzHistory.domWindow = CliqzUtils.getWindow();
        CliqzHistory.currentURL = url;
        // Timeout because title cannot be read immediately
        CliqzHistory.domWindow.setTimeout(
                (function(url, type, panel) {
                    return function() {
                        CliqzHistory._addHistoryEntryToDB(url, type, panel);
                    }
                })(CliqzHistory.currentURL, type, CliqzHistory.domWindow.gBrowser.selectedTab.linkedPanel), 1000);
    },
    _addHistoryEntryToDB: function(url, type, panel) {
        if (!url ||
            (type != "typed" && type != "link" && type != "result" && type != "autocomplete" && type != "google")) {
            return;
        }
        var res = CliqzHistory.SQL("SELECT * FROM urltitles WHERE url = '"+url+"'");
        var title = CliqzHistory.domWindow.gBrowser.selectedBrowser.contentDocument.title;
        var query = CliqzHistory.lastQuery[panel];
        if (!query) {
            query = "";
        }

        // Insert/Update website title (only when still on that page after timeout)
        if (url == CliqzHistory.currentURL && res.length == 0 && CliqzHistory.domWindow) {           
            CliqzHistory.SQL("INSERT INTO urltitles (url, title)\
                VALUES ('"+url+"','"+title+"')");
        } else if(url == CliqzHistory.currentURL && CliqzHistory.domWindow) {
            CliqzHistory.SQL("UPDATE urltitles SET title='"+title+"'\
                WHERE url='"+url+"'");
        }
        // Insert history entry
        CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,"+type+")\
                VALUES ('"+url+"', "+(new Date().getTime())+",'"+query+"',1)");
    },
    SQL: function (sql) {
        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        var dbConn = Services.storage.openDatabase(file);
        var statement = dbConn.createStatement(sql);
        var result = new Array();
        try {
            while (statement.step()) {
                result.push(statement.row);
            }
        }
        finally {
            statement.reset();
            return result;
        }
    }
}