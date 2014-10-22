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
    tabData: new Array(),
	listener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
            CliqzUtils.log(aRequest.name, "DEBUG");
            var url = aBrowser.currentURI.spec;
            var panel = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow).linkedPanel;
            // Reset tab data if on a new tab
            if (url == "about:newtab" && CliqzHistory.getTabData(panel, "newTab") != true) {
                CliqzHistory.setTabData(panel, 'url', null);
                CliqzHistory.setTabData(panel, 'query', null);
                CliqzHistory.setTabData(panel, 'queryDate', null);  
                CliqzHistory.setTabData(panel, 'type', null);
                CliqzHistory.setTabData(panel, 'newTab', true);
                return;
            }
            // Skip if url already saved before or on any about: pages
            if (CliqzHistory.getTabData(panel, "url") == url ||
                url.substring(0,6) == "about:") {
                return;
            }   
            
            if (!CliqzHistory.getTabData(panel, "type")) {
                CliqzHistory.setTabData(panel, "type", "link");
            };
            CliqzHistory.setTabData(panel, 'url', url);         
            CliqzHistory.addHistoryEntry(aBrowser);
            CliqzHistory.setTabData(panel, 'type', "link");
            CliqzHistory.setTabData(panel, 'newTab', false);
        }
    },
    addHistoryEntry: function(browser) {
        var tab = CliqzHistory.getTabForContentWindow(browser.contentWindow);
        var panel = tab.linkedPanel;
        var title = browser.contentDocument.title;
        var url = CliqzHistory.getTabData(panel, 'url');    
        var type = CliqzHistory.getTabData(panel, 'type');
        var query = CliqzHistory.getTabData(panel, 'query');
        var queryDate = CliqzHistory.getTabData(panel, 'queryDate'); 

        if (!url ||
            (type != "typed" && type != "link" && type != "result" && type != "autocomplete" && type != "google")) {
            return;
        }      

        var res = CliqzHistory.SQL("SELECT * FROM urltitles WHERE url = '"+url+"'");

        if (!query) {
            query = "";
        }
        if (!queryDate) {
            queryDate = new Date().getTime();
        }

        // Insert website title or update if already in DB
        if (res.length == 0) {           
            CliqzHistory.SQL("INSERT INTO urltitles (url, title)\
                VALUES ('"+url+"','"+title+"')");
        } else {
            CliqzHistory.SQL("UPDATE urltitles SET title='"+title+"'\
                WHERE url='"+url+"'");
        }
        // Insert history entry
        CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date,"+type+")\
                VALUES ('"+url+"', "+(new Date().getTime())+",'"+query+"',"+queryDate+",1)");
    },
    getTabData: function(panel, attr) {
        if (!CliqzHistory.tabData[panel]) {
            return undefined;
        } else {
            return CliqzHistory.tabData[panel][attr];
        }
    },
    setTabData: function(panel, attr, val) {
        if (!CliqzHistory.tabData[panel]) {
            CliqzHistory.tabData[panel] = new Array();
        };
        CliqzHistory.tabData[panel][attr] = val;
    },
    updateQuery: function(query) {
        var date = new Date().getTime();
        var panel = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
        var last = CliqzHistory.getTabData(panel, 'query');
        if (last != query) {
            CliqzHistory.setTabData(panel, 'query', query);
            CliqzHistory.setTabData(panel, 'queryDate', date);
        }
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
    },
    initDB: function() {
        if ( FileUtils.getFile("ProfD", ["cliqz.db"]).exists() ) {return};
        var visits = "create table visits(\
            id INTEGER PRIMARY KEY NOT NULL,\
            url VARCHAR(255) NOT NULL,\
            visit_date DATE,\
            last_query VARCHAR(255),\
            last_query_date DATE,\
            typed BOOLEAN DEFAULT 0,\
            link BOOLEAN DEFAULT 0,\
            result BOOLEAN DEFAULT 0,\
            autocomplete BOOLEAN DEFAULT 0,\
            google BOOLEAN DEFAULT 0\
            )";
        var titles = "create table urltitles(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            title VARCHAR(255)\
        )";
        CliqzHistory.SQL(visits);
        CliqzHistory.SQL(titles);
    },
    getTabForContentWindow: function (window) {
      let browser;
      try {
        browser = window.QueryInterface(Ci.nsIInterfaceRequestor)
                        .getInterface(Ci.nsIWebNavigation)
                        .QueryInterface(Ci.nsIDocShell)
                        .chromeEventHandler;
      } catch(e) {
      }

      if (!browser) {
        return null;
      }

      let chromeWindow = browser.ownerDocument.defaultView;

      if ('gBrowser' in chromeWindow && chromeWindow.gBrowser &&
          'browsers' in chromeWindow.gBrowser) {
        let browsers = chromeWindow.gBrowser.browsers;
        let i = browsers.indexOf(browser);
        if (i !== -1)
          return chromeWindow.gBrowser.tabs[i];
        return null;
      }
      else if ('BrowserApp' in chromeWindow) {
        return getTabForWindow(window);
      }
      return null;
    }
}