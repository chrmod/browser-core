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
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

var CliqzHistory = {
    prefExpire: (60*60*24*1000), // 24 hours
    tabData: new Array(),
	listener: {
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
            var url = aBrowser.currentURI.spec;
            var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
            var panel = tab.linkedPanel;
            // Skip if already saved or on any about: pages
            if (url.substring(0,6) == "about:" || CliqzHistory.getTabData(panel, "url") == url) {
                return;
            }

            if (!CliqzHistory.getTabData(panel, "type")) {
                CliqzHistory.setTabData(panel, "type", "link");
            };
            if (!CliqzHistory.getTabData(panel, "query")) {
                CliqzHistory.setTabData(panel, "query", url);
                CliqzHistory.setTabData(panel, "queryDate", new Date().getTime());
                CliqzHistory.setTabData(panel, "type", "bookmark");
            };
            CliqzHistory.setTabData(panel, 'url', url);
            CliqzHistory.addHistoryEntry(aBrowser);
            CliqzHistory.setTabData(panel, 'type', "link");
        },
        onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
            var url = aBrowser.currentURI.spec;
            var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
            var panel = tab.linkedPanel;
            var title = aBrowser.contentDocument.title || "";
            // Reset tab data if on a new tab
            if (url == "about:newtab" && CliqzHistory.getTabData(panel, "newTab") != true) {
                //CliqzHistory.setTabData(panel, 'query', null);
                //CliqzHistory.setTabData(panel, 'queryDate', null);
                //CliqzHistory.setTabData(panel, 'newTab', true);
            } else if (title != CliqzHistory.getTabData(panel, "title")) {
                CliqzHistory.setTitle(url, title);
                CliqzHistory.setTabData(panel, 'title', title);
           };
        },
        onStatusChange: function(aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
            //CliqzHistory.listener.onStateChange(aBrowser, aWebProgress, aRequest, null, aStatus);
        }
    },
    addHistoryEntry: function(browser, customPanel) {
        Components.utils.import("resource://gre/modules/PrivateBrowsingUtils.jsm");
        if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && browser) {
            var tab = CliqzHistory.getTabForContentWindow(browser.contentWindow);
            var panel = tab.linkedPanel;
            var title = browser.contentDocument.title || "";
            var url = CliqzHistory.getTabData(panel, 'url');
            var type = CliqzHistory.getTabData(panel, 'type');
            var query = CliqzHistory.getTabData(panel, 'query');
            var queryDate = CliqzHistory.getTabData(panel, 'queryDate');
            var now = new Date().getTime();
            CliqzUtils.log(panel+query,"PANEL");
            if (!url ||
                (type != "typed" && type != "link" && type != "result" && type != "autocomplete" && type != "google" && type != "bookmark")) {
                return;
            }

            if (!query) {
                query = "";
            }
            if (!queryDate) {
                queryDate = now;
            }
            CliqzHistory.setTitle(url, title);
            if (type == "typed") {
                if (query.indexOf('://') == -1) {
                    query = "http://" + query;
                }
                CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date,"+type+")\
                    VALUES ('"+CliqzHistory.escapeSQL(query)+"', "+now+",'"+CliqzHistory.escapeSQL(query)+"',"+queryDate+",1)");
                type = "link";
                now += 1;
            }

            // Insert history entry
            CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date,"+type+")\
              VALUES ('"+CliqzHistory.escapeSQL(url)+"', "+now+",'"+CliqzHistory.escapeSQL(query)+"',"+queryDate+",1)");
        } else if(!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && customPanel) {
            var url = CliqzHistory.getTabData(customPanel, 'url');
            var type = "link";
            var query = CliqzHistory.getTabData(customPanel, 'query');
            var queryDate = CliqzHistory.getTabData(customPanel, 'queryDate');
            var now = new Date().getTime();
            CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date,"+type+")\
              VALUES ('"+CliqzHistory.escapeSQL(url)+"', "+now+",'"+CliqzHistory.escapeSQL(query)+"',"+queryDate+",1)");
        }
    },
    setTitle: function(url, title) {
        var res = CliqzHistory.SQL("SELECT * FROM urltitles WHERE url = '"+CliqzHistory.escapeSQL(url)+"'");
        if (res == 0) {
            CliqzHistory.SQL("INSERT INTO urltitles (url, title)\
                VALUES ('"+CliqzHistory.escapeSQL(url)+"','"+CliqzHistory.escapeSQL(title)+"')");
        } else {
            CliqzHistory.SQL("UPDATE urltitles SET title='"+CliqzHistory.escapeSQL(title)+"'\
                WHERE url='"+CliqzHistory.escapeSQL(url)+"'");
        }
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
    SQL: function (sql, onRow) {
        let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
        var dbConn = Services.storage.openDatabase(file);
        var statement = dbConn.createStatement(sql);
        var resultCount = 0;
        try {
            while (statement.executeStep()) {
                resultCount++;
                if (onRow) {
                    onRow(statement.row);
                };
            }
        }
        finally {
            statement.reset();
            return resultCount;
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
            google BOOLEAN DEFAULT 0,\
            bookmark BOOLEAN DEFAULT 0\
            )";
        var titles = "create table urltitles(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            title VARCHAR(255)\
        )";
        CliqzHistory.SQL(visits);
        CliqzHistory.SQL(titles);
    },
    deleteVisit: function(url) {
      CliqzHistory.SQL("delete from visits where url = '"+CliqzHistory.escapeSQL(url)+"'");
      CliqzHistory.SQL("delete from urltitles where url = '"+CliqzHistory.escapeSQL(url)+"'");
    },
    deleteTimeFrame: function() {
      CliqzHistoryPattern.historyTimeFrame(function(min,max) {
        CliqzHistory.SQL("delete from visits where visit_date < " + min);
        CliqzHistory.SQL("delete from visits where visit_date > " + max);
      });
    },
    clearHistory: function() {
      CliqzHistory.SQL("delete from visits");
      CliqzHistory.SQL("delete from urltitles");
    },
    historyObserver: {
      onBeginUpdateBatch: function() {},
      onEndUpdateBatch: function() {
        CliqzHistory.deleteTimeFrame();
      },
      onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {},
      onTitleChanged: function(aURI, aPageTitle) {},
      onBeforeDeleteURI: function(aURI) {},
      onDeleteURI: function(aURI) {
        CliqzHistory.deleteVisit(aURI.spec);
      },
      onClearHistory: function() {
        CliqzHistory.clearHistory();
      },
      onPageChanged: function(aURI, aWhat, aValue) {},
      onDeleteVisits: function() {},
      QueryInterface: XPCOMUtils.generateQI([Ci.nsINavHistoryObserver])
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
    },
    getURI: function (tab) {
      if (tab.browser)
        return tab.browser.currentURI.spec;
      return tab.linkedBrowser.currentURI.spec;
    },
    escapeSQL: function(str) {
        return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "'":
                return "''";
            default:
                return char;
            /*case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; */
            }
        });
    }
}
