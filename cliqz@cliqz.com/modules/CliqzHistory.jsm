'use strict';
const {
  classes: Cc,
  interfaces: Ci,
  utils: Cu
} = Components;

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
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCategories',
  'chrome://cliqzmodules/content/CliqzCategories.jsm');




var CliqzHistory = {
  prefExpire: (60 * 60 * 24 * 1000), // 24 hours
  tabData: [],
  listener: {
    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

    onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
      if(CliqzUtils.getPref('categoryAssessment', false)){
        CliqzCategories.assess(aBrowser.currentURI.spec);
      }
      var url = aBrowser.currentURI.spec;
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      CliqzHistory.setTabData(panel, 'title', "");
      // Skip if already saved or on any about: pages
      if (url.substring(0, 6) == "about:" || CliqzHistory.getTabData(panel, "url") == url
          || CliqzHistory.getTabData(panel,"lock")) {
        return;
      }

      if (!CliqzHistory.getTabData(panel, "type")) {
        CliqzHistory.setTabData(panel, "type", "link");
      }
      // Query is not set for bookmarks (opened from new tab page) or when a link is opened in a new window
      if (!CliqzHistory.getTabData(panel, "query")) {
        CliqzHistory.setTabData(panel, "query", url);
        CliqzHistory.setTabData(panel, "queryDate", new Date().getTime());
        CliqzHistory.setTabData(panel, "type", "bookmark");
      }
      CliqzHistory.setTabData(panel, 'url', url);
      CliqzHistory.addHistoryEntry(aBrowser);
      CliqzHistory.setTabData(panel, 'type', "link");
    },
    onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
      var url = aBrowser.currentURI.spec;
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      var title = aBrowser.contentDocument.title || "";
      if (title != CliqzHistory.getTabData(panel, "title")) {
        CliqzHistory.setTabData(panel, 'url', url);
        CliqzHistory.setTabData(panel, 'title', title);
        CliqzHistory.updateTitle(panel);
      }
      if(aStateFlags == 786448 /*Page finished*/ && url && url.length > 0) {
        aBrowser.contentDocument.addEventListener("click", function(e) {
          e.panel = panel;
          CliqzHistory && CliqzHistory.linkClickListener(e);
        }, false);
      }
    },
    onStatusChange: function(aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
      CliqzHistory.listener.onLocationChange(aBrowser, aWebProgress, aRequest, null, null);
    }
  },
  linkClickListener: function(event) {
    var panel = event.panel;
    var origTarget = event.target, aTarget = origTarget;

    while(aTarget.parentNode && aTarget.nodeName.toLowerCase() != "a")
      aTarget = aTarget.parentNode;

    if(aTarget.nodeName.toLowerCase() == "a" && (event.button == 0 || event.button == 1)) {
      var url = CliqzHistory.getTabData(panel, "url");
      if(!url || url.length == 0) return;
      var linkUrl = aTarget.getAttribute("href") || "";
      // URLs like //www.google.com/...
      if(linkUrl.indexOf("//") == 0) {
        linkUrl = url.substr(0, url.indexOf("//")) + linkUrl;
      // Relative URLs
      } else if(linkUrl.length > 0 && linkUrl[0] == "/") {
        var start = url.indexOf("/", url.indexOf("://")+3);
        linkUrl = url.substr(0, start) + linkUrl;
      }
      // Try title attribute of A element first
      var title = aTarget.getAttribute("title");
      // Next -> NodeValue of A element
      while(!title && origTarget.hasChildNodes()) {
        origTarget = origTarget.childNodes[0];
        title = origTarget.nodeValue;
      }

      // Check siblings for titles
      var target = aTarget.childNodes[0];
      if(!title || title.trim().length == 0) do {
        var tmpTarget = target;
        while(tmpTarget.hasChildNodes()) tmpTarget = tmpTarget.childNodes[0];
        title = tmpTarget.nodeValue;
        if(title && title.trim().length > 0) break;
        target = target.nextSibling;
      } while(target);

      CliqzHistory.setTabData(panel, 'linkTitle', title);
      CliqzHistory.setTabData(panel, 'linkUrl', linkUrl);
      CliqzHistory.updateTitle(panel);
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

      if (!url ||
        (type != "typed" && type != "link" && type != "result" && type != "autocomplete" && type != "google" && type != "bookmark")) return;
      if (!query) query = "";
      if (!queryDate) queryDate = now;
      CliqzHistory.updateTitle(panel);

      if (type == "typed") {
        if (query.indexOf('://') == -1) {
          query = "http://" + query;
        }
        CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
                    VALUES (:query, :now, :query, :queryDate, 1)",
                    null, null, {
                      query: CliqzHistory.escapeSQL(query),
                      now: now,
                      queryDate: queryDate
                    });
        type = "link";
        now += 1;
      }

      // Insert history entry
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
              VALUES (:url, :now, :query, :queryDate, 1)",
              null, null, {
                url: CliqzHistory.escapeSQL(url),
                query: CliqzHistory.escapeSQL(query),
                now: now,
                queryDate: queryDate
              });
    } else if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && customPanel) {
      var url = CliqzHistory.getTabData(customPanel, 'url');
      var type = "link";
      var query = CliqzHistory.getTabData(customPanel, 'query');
      var queryDate = CliqzHistory.getTabData(customPanel, 'queryDate');
      var now = new Date().getTime();
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ")\
              VALUES (:url, :now, :query, :queryDate, 1)",
              null, null, {
                url: CliqzHistory.escapeSQL(url),
                query: CliqzHistory.escapeSQL(query),
                now: now,
                queryDate: queryDate
              });
    }
  },
  updateTitle: function(panel) {
    var url = CliqzHistory.getTabData(panel, "url");
    var title = CliqzHistory.getTabData(panel, "title") || "";
    var linkUrl = CliqzHistory.getTabData(panel, "linkUrl");
    var linkTitle = CliqzHistory.getTabData(panel, "linkTitle");
    var dbTitle = CliqzHistory.getTabData(panel, "dbTitle");
    var dbLinkTitle = CliqzHistory.getTabData(panel, "dbLinkTitle");

    if(url && title && title != dbTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, :title, (select linkTitle from urltitles where url=:url))", null, null, {
                  url: CliqzHistory.escapeSQL(url),
                  title: CliqzHistory.escapeSQL(title)
                });
      CliqzHistory.setTabData(panel, "dbTitle", title);
    }
    if(url && linkTitle && linkUrl == url&& linkTitle != dbLinkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, (select title from urltitles where url=:url), :linkTitle)", null, null, {
                  url: CliqzHistory.escapeSQL(url),
                  linkTitle: CliqzHistory.escapeSQL(linkTitle).trim()
                });
      CliqzHistory.setTabData(panel, "dbLinkTitle", linkTitle);
    }
  },
  tabOpen: function(e){
      var browser = CliqzUtils.getWindow().gBrowser,
          curPanel = browser.selectedTab.linkedPanel,
          newPanel = e.target.linkedPanel;

      CliqzHistory.setTabData(newPanel, "lock", true);
      var checkUrl = function(p) {
        var url = p.tab.linkedBrowser.contentWindow.location.href;
        if(url == "about:blank") {
          CliqzUtils && CliqzUtils.setTimeout(checkUrl, 100, p);
          return;
        } else if(url != "about:newtab") {
          if(!CliqzHistory) return;
          CliqzHistory.setTabData(p.newPanel, "query", CliqzHistory.getTabData(p.curPanel, 'query'));
          CliqzHistory.setTabData(p.newPanel, "queryDate", CliqzHistory.getTabData(p.curPanel, 'queryDate'));
          CliqzHistory.setTabData(p.newPanel, "linkUrl", CliqzHistory.getTabData(p.curPanel, 'linkUrl'));
          CliqzHistory.setTabData(p.newPanel, "linkTitle", CliqzHistory.getTabData(p.curPanel, 'linkTitle'));
        }
        CliqzHistory.setTabData(p.newPanel, "lock", false);
      };
      checkUrl({tab: e.target, curPanel: curPanel, newPanel: newPanel});
  },
  getTabData: function(panel, attr) {
    if (!CliqzHistory || !CliqzHistory.tabData[panel]) {
      return undefined;
    } else {
      return CliqzHistory.tabData[panel][attr];
    }
  },
  setTabData: function(panel, attr, val) {
    if(!CliqzHistory) return;

    if (!CliqzHistory.tabData[panel]) {
      CliqzHistory.tabData[panel] = [];
    }
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
  dbConn: null,
  SQL: function(sql, onRow, callback, parameters) {
    let file = FileUtils.getFile("ProfD", ["cliqz.db"]);
    if(!CliqzHistory.dbConn)
      CliqzHistory.dbConn = Services.storage.openDatabase(file);

    var statement = CliqzHistory.dbConn.createAsyncStatement(sql);

    for(var key in parameters) {
      statement.params[key] = parameters[key];
    }

    CliqzHistory._SQL(CliqzHistory.dbConn, statement, onRow, callback);
  },
  _SQL: function(dbConn, statement, onRow, callback) {
    statement.executeAsync({
      onRow: onRow,
      callback: callback,
      handleResult: function(aResultSet) {
        var resultCount = 0;
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          resultCount++;
          if (this.onRow) {
            this.onRow(statement.row);
          }
        }
        if (this.callback) {
          this.callback(resultCount);
        }
      },

      handleError: function(aError) {
        CliqzUtils.log("Error (" + aError.result + "):" + aError.message, "CliqzHistory._SQL");
        if (this.callback) {
          this.callback(0);
        }
      },
      handleCompletion: function(aReason) {
        // Always called when done
      }
    });
    statement.finalize();
  },
  initDB: function() {
    if (FileUtils.getFile("ProfD", ["cliqz.db"]).exists()) {
      // Add Linktitle column
      CliqzHistory.SQL("PRAGMA table_info(urltitles)", null, function(n) {
        if(n == 2) CliqzHistory.SQL("alter table urltitles add column linktitle VARCHAR(255)");
      });
      return;
    }
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
            title VARCHAR(255),\
            linktitle VARCHAR(255)\
        )";
    CliqzHistory.SQL(visits);
    CliqzHistory.SQL(titles);
  },
  deleteVisit: function(url) {
    CliqzHistory.SQL("delete from visits where url = :url", null, null, {
      url: CliqzHistory.escapeSQL(url)
    });
    CliqzHistory.SQL("delete from urltitles where url = :url", null, null, {
      url: CliqzHistory.escapeSQL(url)
    });
  },
  deleteTimeFrame: function() {
    CliqzHistoryPattern.historyTimeFrame(function(min, max) {
      CliqzHistory.SQL("delete from visits where visit_date < :min", null, null, {
        min: min
      });
      CliqzHistory.SQL("delete from visits where visit_date > :max", null, null, {
        max: max
      });
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
  getTabForContentWindow: function(window) {
    let browser;
    try {
      browser = window.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShell)
        .chromeEventHandler;
    } catch (e) {}

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
    } else if ('BrowserApp' in chromeWindow) {
      return getTabForWindow(window);
    }
    return null;
  },
  getURI: function(tab) {
    if (tab.browser)
      return tab.browser.currentURI.spec;
    return tab.linkedBrowser.currentURI.spec;
  },
  escapeSQL: function(str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
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
