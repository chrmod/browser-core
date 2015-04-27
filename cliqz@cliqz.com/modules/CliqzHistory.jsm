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
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryAnalysis',
  'chrome://cliqzmodules/content/CliqzHistoryAnalysis.jsm');



var CliqzHistory = {
  prefExpire: (60 * 60 * 24 * 1000), // 24 hours
  tabData: [],
  lastActivePanel: null,
  lastVisit: [],
  lastVisitTransition: [],
  lastAction: Date.now(),
  listener: {
    QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

    onLocationChange: function(aBrowser, aWebProgress, aRequest, aLocation, aFlags) {
      if (CliqzUtils.getPref('categoryAssessment', false)) {
        CliqzCategories.assess(aBrowser.currentURI.spec);
      }
      var url = CliqzHistoryPattern.simplifyUrl(aBrowser.currentURI.spec);
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      // Skip if already saved or on any about: pages
      if (url.substring(0, 6) == "about:" || CliqzHistory.getTabData(panel, "url") == url ||
        CliqzHistory.getTabData(panel, "lock") || CliqzHistory.lastVisit.indexOf(url) == -1) {
        return;
      }
      var transition = CliqzHistory.lastVisitTransition[CliqzHistory.lastVisit.indexOf(url)];
      while(CliqzHistory.lastVisit.indexOf(url) != -1) {
        CliqzHistory.lastVisit.splice(CliqzHistory.lastVisit.indexOf(url), 1);
        CliqzHistory.lastVisitTransition.splice(CliqzHistory.lastVisit.indexOf(url), 1);
      }

      if (!CliqzHistory.getTabData(panel, "type")) {
        CliqzHistory.setTabData(panel, "type", "link");
      }
      // Query is not set for bookmarks (opened from new tab page) or when a link is opened in a new window
      if (!CliqzHistory.getTabData(panel, "query") || transition == 3 /* Bookmark */ ||
        (transition == 2 && CliqzHistory.getTabData(panel, "type") == "link") /* other urls form menu*/ ||
        CliqzHistory.getTabData(panel, "external")) {
        CliqzHistory.setTabData(panel, "query", url);
        CliqzHistory.setTabData(panel, "queryDate", new Date().getTime());
        if (CliqzHistory.getTabData(panel, "external")) CliqzHistory.setTabData(panel, "type", "link");
        else CliqzHistory.setTabData(panel, "type", "bookmark");
        CliqzHistory.setTabData(panel, "external", false);
      }
      CliqzHistory.setTabData(panel, 'url', url);
      CliqzHistory.addHistoryEntry(aBrowser);
      CliqzHistory.setTabData(panel, 'type', "link");
      CliqzHistory.setTabData(panel, "inactive", 0);
    },
    onStateChange: function(aBrowser, aWebProgress, aRequest, aStateFlags, aStatus) {
      var url = CliqzHistoryPattern.simplifyUrl(aBrowser.currentURI.spec);
      var tab = CliqzHistory.getTabForContentWindow(aBrowser.contentWindow);
      var panel = tab.linkedPanel;
      if (aStateFlags == 786448 /* Finished */ && url == CliqzHistory.getTabData(panel, 'url') &&
        url != CliqzHistory.getTabData(panel, "lastThumb")) {
        CliqzHistory.reattachListeners(aBrowser, panel);
        CliqzHistory.updateOpenGraphData(aBrowser, panel);
        CliqzHistory.checkThumbnail(url, function() {
          CliqzHistory.generateThumbnail(aBrowser, panel, url);
        });
        // Force history at this point
        // Back events are not triggered by history observer
        CliqzHistory.lastVisit.push(url);
        CliqzHistory.lastVisitTransition.push(0);
      }
    },
    onStatusChange: function(aBrowser, aWebProgress, aRequest, aStatus, aMessage) {
      CliqzHistory.listener.onLocationChange(aBrowser, aWebProgress, aRequest, null, null);
    }
  },
  reattachListeners: function(aBrowser, panel) {
    aBrowser.contentDocument.removeEventListener("click", CliqzHistory.getTabData(panel, "click"));
    aBrowser.contentDocument.removeEventListener("click", CliqzHistory.getTabData(panel, "linkClick"));
    aBrowser.contentDocument.removeEventListener("keydown", CliqzHistory.getTabData(panel, "key"));
    aBrowser.contentDocument.removeEventListener("scroll", CliqzHistory.getTabData(panel, "scroll"));

    aBrowser.contentDocument.addEventListener("click", CliqzHistory.getTabData(panel, "click"), false);
    aBrowser.contentDocument.addEventListener("click", CliqzHistory.getTabData(panel, "linkClick"), false);
    aBrowser.contentDocument.addEventListener("keydown", CliqzHistory.getTabData(panel, "key"), false);
    aBrowser.contentDocument.addEventListener("scroll", CliqzHistory.getTabData(panel, "scroll"), false);
  },
  updateOpenGraphData: function(aBrowser, panel) {
    var metaData = aBrowser.contentDocument.querySelectorAll('meta');
    if (!metaData) return;
    var data = {};
    for (var key in metaData) {
      if (!metaData[key].getAttribute) continue;
      var content = metaData[key].getAttribute("content");
      var prop = metaData[key].getAttribute("property");
      if (prop && prop.indexOf("og:") == 0) {
        var attr = prop.substr(3);
        if (data[attr] && data[attr] == content) continue;
        else if (data[attr] && typeof(data[attr]) == "string") {
          data[attr] = [data[attr]];
          data[attr].push(content);
        } else if (data[attr]) data[attr].push(content);
        else data[attr] = content;
      }
    }
    CliqzHistory.setTabData(panel, "opengraph", data);
    CliqzHistory.writeOpenGraphData(panel);
  },
  writeOpenGraphData: function(panel) {
    var data = JSON.stringify(CliqzHistory.getTabData(panel, "opengraph"));
    var dbData = CliqzHistory.getTabData(panel, "dbOpengraphData");
    var dbUrl = CliqzHistory.getTabData(panel, "dbOpengraphUrl");
    var url = CliqzHistory.getTabData(panel, "url");
    if ((data != dbData || dbUrl != url) && data.length > 2) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO opengraph VALUES(:url, :data)", null, null, {
        url: url,
        data: data
      });
      CliqzHistory.setTabData(panel, "dbOpengraphData", data);
      CliqzHistory.setTabData(panel, "dbOpengraphUrl", url);
    }
  },
  generateThumbnail: function(aBrowser, panel, url) {
    var elm = aBrowser.contentDocument,
      doc = elm,
      win = aBrowser.contentWindow;

    function findPosX(obj) {
      var curleft = 0;
      if (obj.offsetParent) {
        while (1) {
          curleft += obj.offsetLeft;
          if (!obj.offsetParent) break;
          obj = obj.offsetParent;
        }
      } else if (obj.x) curleft += obj.x;
      return curleft;
    }

    function findPosY(obj) {
      var curtop = 0;
      if (obj.offsetParent) {
        while (1) {
          curtop += obj.offsetTop;
          if (!obj.offsetParent) break;
          obj = obj.offsetParent;
        }
      } else if (obj.y) curtop += obj.y;
      return curtop;
    }

    var x = findPosX(elm);
    var y = findPosY(elm);
    var width = win.innerWidth;
    var height = win.innerHeight;
    var filename = CliqzHistory.MD5(url);

    if (width < height) {
      var ratio = height / width;
      width = 208;
      height = width * ratio;
    } else {
      var ratio = width / height;
      height = 208;
      width = height * ratio;
    }

    var cnvs = doc.createElement('canvas')
    cnvs.width = width;
    cnvs.height = height;
    var ctx = cnvs.getContext("2d");

    ctx.scale(width / win.innerWidth, width / win.innerWidth);
    ctx.drawWindow(win, 0, 0, win.innerWidth, win.innerHeight, "rgb(255,255,255)");
    cnvs.toBlob(CliqzHistory.blobCallback(filename, panel, url), "image/jpeg", 0.8);
  },
  blobCallback: function(filename, panel, url) {
    return function(b) {
      var r = new CliqzUtils.getWindow().FileReader();
      r.onloadend = function() {
        Cu.import('resource://gre/modules/osfile.jsm');
        var writePath = FileUtils.getFile("ProfD", ["cliqz_thumbnails", filename + ".jpeg"]).path;
        OS.File.writeAtomic(writePath, new Uint8Array(r.result), {
          tmpPath: writePath + '.tmp'
        });
      };
      if (b.size > 2000) {
        r.readAsArrayBuffer(b);
        CliqzHistory.SQL("INSERT OR REPLACE INTO thumbnails VALUES(:url, :filename, :date)", null, null, {
          url: url,
          filename: filename + ".jpeg",
          date: Date.now()
        });
        CliqzHistory.setTabData(panel, "lastThumb", url);
      }
    }
  },
  checkThumbnail: function(url, callback) {
    // Only update thumbnail when older than one hour
    CliqzHistory.SQL("SELECT date FROM thumbnails WHERE url=:url AND (:date-date)<(60*60*1000)", null, function(n) {
      if (n == 0) callback();
    }, {
      url: url,
      date: Date.now()
    });
  },
  linkClickListener: function(event) {
    var panel = event.panel;
    var origTarget = event.target,
      aTarget = origTarget;

    while (aTarget.parentNode && aTarget.nodeName.toLowerCase() != "a")
      aTarget = aTarget.parentNode;

    if (aTarget.nodeName.toLowerCase() == "a" &&
      aTarget.getAttribute("href") && (event.button == 0 || event.button == 1)) {
      var url = CliqzHistory.getTabData(panel, "url");
      if (!url || url.length == 0) return;
      var linkUrl = CliqzHistoryPattern.simplifyUrl((aTarget.getAttribute("href") || ""));
      // URLs like //www.google.com/...
      if (linkUrl.indexOf("//") == 0) {
        linkUrl = url.substr(0, url.indexOf("//")) + linkUrl;
        // Relative URLs
      } else if (linkUrl[0] == "/") {
        var start = url.indexOf("/", url.indexOf("://") + 3);
        linkUrl = url.substr(0, start) + linkUrl;
      }
      // Try title attribute of A element first
      var title = aTarget.getAttribute("title");
      // Next -> NodeValue of A element
      while (!title && origTarget.hasChildNodes()) {
        origTarget = origTarget.childNodes[0];
        title = origTarget.nodeValue;
      }

      // Check siblings for titles
      var target = aTarget.childNodes[0];
      if (!title || title.trim().length == 0)
        do {
          var tmpTarget = target;
          while (tmpTarget.hasChildNodes()) tmpTarget = tmpTarget.childNodes[0];
          title = tmpTarget.nodeValue;
          if (title && title.trim().length > 0) break;
          target = target.nextSibling;
        } while (target);

      // Update title in db
      CliqzHistory.updateTitle(linkUrl, null, title);
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
      CliqzHistory.setTabData(panel, "prevVisit", CliqzHistory.getTabData(panel, "visitDate"));

      // Create new session when external search engine query changes
      var externalQuery = CliqzHistoryPattern.extractQueryFromUrl(url);
      if (externalQuery && CliqzHistory.getTabData(panel, "extQuery") != externalQuery) {
        CliqzHistory.setTabData(panel, "queryDate", now);
        CliqzHistory.setTabData(panel, "extQuery", externalQuery);
        CliqzHistory.setTabData(panel, "query", externalQuery);
        query = externalQuery;
        queryDate = now;
        type = "google";
      }

      // Insert history entry
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ", prev_visit)\
              VALUES (:url, :now, :query, :queryDate, 1, :prevVisit)",
        null, null, {
          url: url,
          query: query,
          now: now,
          queryDate: queryDate,
          prevVisit: CliqzHistory.getTabData(panel, "prevVisit") || ""
        });
      CliqzHistory.updateInteractionData(panel);
      CliqzHistory.setTabData(panel, "visitDate", now);
    } else if (!PrivateBrowsingUtils.isWindowPrivate(CliqzUtils.getWindow()) && customPanel) {
      var url = CliqzHistory.getTabData(customPanel, 'url');
      var type = "link";
      var query = CliqzHistory.getTabData(customPanel, 'query');
      var queryDate = CliqzHistory.getTabData(customPanel, 'queryDate');
      var now = new Date().getTime();
      CliqzHistory.setTabData(panel, "prevVisit", CliqzHistory.getTabData(newPanel, "visitDate"));
      CliqzHistory.SQL("INSERT INTO visits (url,visit_date,last_query,last_query_date," + type + ", prev_visit)\
              VALUES (:url, :now, :query, :queryDate, 1, :prevVisit)",
        null, null, {
          url: CliqzHistory.url,
          query: CliqzHistory.query,
          now: now,
          queryDate: queryDate,
          prevVisit: CliqzHistory.getTabData(panel, "prevVisit") || ""
        });
      CliqzHistory.setTabData(panel, "visitDate", now);
      CliqzHistory.updateInteractionData(panel);
    }
  },
  updateTitle: function(url, title, linkTitle) {
    if (title && !linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, :title, (select linkTitle from urltitles where url=:url))", null, null, {
        url: url,
        title: title
      });
    } else if (!title && linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, (select title from urltitles where url=:url), :linkTitle)", null, null, {
        url: url,
        linkTitle: linkTitle
      });
    } else if (title && linkTitle) {
      CliqzHistory.SQL("INSERT OR REPLACE INTO urltitles (url, title, linkTitle)\
                VALUES (:url, :title, :linkTitle)", null, null, {
        url: url,
        title: title,
        linkTitle: linkTitle.trim()
      });
    }
  },
  lastMouseMove: 0,
  mouseMove: function(e, gBrowser) {
    var now = Date.now();
    if (now - CliqzHistory.lastMouseMove > 2000) {
      CliqzHistory.lastMouseMove = now;
      var activeTab = gBrowser.selectedTab;
      if (activeTab.linkedPanel == CliqzHistory.lastActivePanel)
        CliqzHistory.updateInteractionData(activeTab.linkedPanel, true);
      else
        CliqzHistory.tabSelect({
          target: activeTab
        });
    }
  },
  updateInteractionData: function(panel, useCurrent) {
    var lastUpdate = CliqzHistory.getTabData(panel, 'lastUpdate');
    lastUpdate = lastUpdate ? Date.now() - lastUpdate : 0;
    var prevVisit = CliqzHistory.getTabData(panel, "prevVisit");
    var clicks = CliqzHistory.getTabData(panel, "clickCount");
    var scrolls = CliqzHistory.getTabData(panel, "scrollCount");
    var keys = CliqzHistory.getTabData(panel, "keyCount");
    var inactive = CliqzHistory.getTabData(panel, "inactive") || 0;

    if (useCurrent) prevVisit = CliqzHistory.getTabData(panel, "visitDate");
    // Tab is active but there has been no interaction (including mouse movement) in the last five minutes
    // TODO: Improve time limit, probably less?
    if (panel == CliqzHistory.lastActivePanel && lastUpdate > 5 * 60 * 1000) {
      inactive = inactive + (lastUpdate - 60 * 1000);
      CliqzHistory.setTabData(panel, "inactive", inactive);
    }
    // Remove time that was spent on other tabs
    var timeSpent = Date.now() - prevVisit - inactive;
    if (timeSpent < 0) timeSpent = 0;

    if (prevVisit) {
      CliqzHistory.SQL("UPDATE visits \
                SET time_spent=:time, click_interaction=click_interaction+:clicks, \
                scroll_interaction=scroll_interaction+:scrolls, keyboard_interaction=keyboard_interaction+:keys \
                WHERE visit_date=:prev", null, null, {
        time: timeSpent || 0,
        clicks: clicks,
        scrolls: scrolls,
        keys: keys,
        prev: prevVisit
      });
      CliqzHistory.resetInteraction(panel);
      CliqzHistory.setTabData(panel, 'lastUpdate', Date.now());
    }
  },
  updateAllTabs: function() {
    for (var key in CliqzHistory.tabData) {
      CliqzHistory.updateInteractionData(key, true);
    }
  },
  updateLastActivePanel: function() {
    var tab = CliqzUtils.getWindow().gBrowser.selectedTab.linkedPanel;
    CliqzHistory.lastActivePanel = tab;
  },
  tabOpen: function(e) {
    var browser = CliqzUtils.getWindow().gBrowser,
      curPanel = /*browser.selectedTab.linkedPanel ||*/ CliqzHistory.lastActivePanel,
      newPanel = e.target.linkedPanel;

    CliqzHistory.setTabData(newPanel, "inactiveSince", Date.now());
    CliqzHistory.updateInteractionData(curPanel, true);

    // If the user opens a new tab within Firefox, this timer is VERY small (below 10 ms)
    // However, if an external link is opened, this value is a lot higher
    var inactive = Date.now() - CliqzHistory.lastAction;
    // Threshold of one second
    if (inactive > 3000) {
      //var url = e.target.tab.linkedBrowser.contentWindow.location.href;
      CliqzHistory.setTabData(newPanel, "external", true);
    }

    CliqzHistory.setTabData(newPanel, "lock", true);
    var checkUrl = function(p) {
      var url = p.tab.linkedBrowser.contentWindow.location.href;
      if (url == "about:blank") {
        CliqzUtils && CliqzUtils.setTimeout(checkUrl, 100, p);
        return;
      } else if (url != "about:newtab") {
        CliqzHistory.setTabData(p.newPanel, "query", CliqzHistory.getTabData(p.curPanel, 'query'));
        CliqzHistory.setTabData(p.newPanel, "queryDate", CliqzHistory.getTabData(p.curPanel, 'queryDate'));
        CliqzHistory.setTabData(p.newPanel, "linkUrl", CliqzHistory.getTabData(p.curPanel, 'linkUrl'));
        CliqzHistory.setTabData(p.newPanel, "linkTitle", CliqzHistory.getTabData(p.curPanel, 'linkTitle'));
        CliqzHistory.setTabData(p.newPanel, "visitDate", CliqzHistory.getTabData(p.curPanel, 'visitDate'));
      }
      CliqzHistory.setTabData(p.newPanel, "lock", false);
    };
    checkUrl({
      tab: e.target,
      curPanel: curPanel,
      newPanel: newPanel
    });
  },
  tabClose: function(e) {
    var panel = e.target.linkedPanel;
    CliqzHistory.updateInteractionData(panel, true);
    CliqzHistory.tabData.splice(CliqzHistory.tabData.indexOf(panel), 1);
  },
  tabSelect: function(e) {
    var curPanel = CliqzHistory.lastActivePanel,
      newPanel = e.target.linkedPanel;
    CliqzHistory.updateLastActivePanel();
    CliqzHistory.updateInteractionData(curPanel, true);

    var now = Date.now();
    var inactiveSince = CliqzHistory.getTabData(newPanel, "inactiveSince");
    CliqzHistory.setTabData(curPanel, "inactiveSince", now);
    CliqzHistory.setTabData(newPanel, 'lastUpdate', Date.now());
    if (inactiveSince) {
      var cur = CliqzHistory.getTabData(newPanel, "inactive") || 0;
      var inactive = now - inactiveSince;
      CliqzHistory.setTabData(newPanel, "inactive", cur + inactive);
      CliqzHistory.updateInteractionData(newPanel, true);
    }
    CliqzHistory.setTabData(newPanel, "inactiveSince", null);
  },
  getTabData: function(panel, attr) {
    if (!CliqzHistory || !CliqzHistory.tabData[panel]) {
      return undefined;
    } else {
      return CliqzHistory.tabData[panel][attr];
    }
  },
  setTabData: function(panel, attr, val) {
    if (!CliqzHistory) return;

    if (!CliqzHistory.tabData[panel]) {
      CliqzHistory.tabData[panel] = [];
      CliqzHistory.resetInteraction(panel);
      CliqzHistory.tabData[panel]['click'] = function() {
        CliqzHistory.setTabData(panel, "clickCount", CliqzHistory.getTabData(panel, "clickCount") + 1);
      };
      CliqzHistory.tabData[panel]['key'] = function() {
        CliqzHistory.setTabData(panel, "keyCount", CliqzHistory.getTabData(panel, "keyCount") + 1);
      };
      CliqzHistory.tabData[panel]['scroll'] = function() {
        CliqzHistory.setTabData(panel, "scrollCount", CliqzHistory.getTabData(panel, "scrollCount") + 1);
      };
      CliqzHistory.tabData[panel]['linkClick'] = function(e) {
        e.panel = panel;
        CliqzHistory && CliqzHistory.linkClickListener(e);
      };
    }
    CliqzHistory.tabData[panel][attr] = val;
  },
  resetInteraction: function(panel) {
    CliqzHistory.setTabData(panel, "clickCount", 0);
    CliqzHistory.setTabData(panel, "keyCount", 0);
    CliqzHistory.setTabData(panel, "scrollCount", 0);
  },
  action: function() {
    CliqzUtils.setTimeout(function() {
      CliqzHistory.lastAction = Date.now();
    }, 1000);
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
    if (!CliqzHistory.dbConn)
      CliqzHistory.dbConn = Services.storage.openDatabase(file);

    var statement = CliqzHistory.dbConn.createAsyncStatement(sql);

    for (var key in parameters) {
      statement.params[key] = parameters[key];
    }

    CliqzHistory._SQL(CliqzHistory.dbConn, statement, onRow, callback);
  },
  _SQL: function(dbConn, statement, onRow, callback) {
    statement.executeAsync({
      resultCount: 0,
      handleResult: function(aResultSet) {
        for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
          this.resultCount++;
          if (onRow) {
            var values = [];
            var tmp = row.getResultByIndex(0);
            try {
              for (var i = 0;; tmp = row.getResultByIndex(i), i++) values[i] = tmp;
            } catch (e) {}
            onRow(values);
          }
        }
      },

      handleError: function(aError) {
        CliqzUtils.log("Error (" + aError.result + "):" + aError.message, "CliqzHistory._SQL");
        if (callback) {
          callback(0);
        }
      },
      handleCompletion: function(aReason) {
        if (callback) {
          callback(this.resultCount);
        }
      }
    });
    statement.finalize();
  },
  initDB: function() {
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
            bookmark BOOLEAN DEFAULT 0,\
            prev_visit DATE,\
            time_spent INTEGER DEFAULT 0,\
            click_interaction INTEGER DEFAULT 0,\
            scroll_interaction INTEGER DEFAULT 0,\
            keyboard_interaction INTEGER DEFAULT 0\
            )";
    var titles = "create table urltitles(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            title VARCHAR(255),\
            linktitle VARCHAR(255)\
        )";

    var opengraph = "create table opengraph(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            data VARCHAR(2048)\
        )";

    var thumbnails = "create table thumbnails(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            file VARCHAR(255),\
            date DATE\
        )";

    if (FileUtils.getFile("ProfD", ["cliqz.db"]).exists()) {
      CliqzHistory.addColumn("urltitles", "linktitle", "VARCHAR(255)");
      CliqzHistory.addColumn("visits", "prev_visit", "DATE");
      CliqzHistory.addColumn("visits", "time_spent", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "click_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "scroll_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.addColumn("visits", "keyboard_interaction", "INTEGER DEFAULT 0");
      CliqzHistory.SQL("SELECT name FROM sqlite_master WHERE type='table' AND name='opengraph'", null, function(n) {
        if (n == 0) CliqzHistory.SQL(opengraph);
      });
      CliqzHistory.SQL("SELECT name FROM sqlite_master WHERE type='table' AND name='thumbnails'", null, function(n) {
        if (n == 0) CliqzHistory.SQL(thumbnails);
      });
    } else {
      CliqzHistory.SQL(visits);
      CliqzHistory.SQL(titles);
      CliqzHistory.SQL(opengraph);
      CliqzHistory.SQL(thumbnails);
    }
    // Make sure thumbnail directory exists
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true);

    //Analyse data
    CliqzHistoryAnalysis.initData(function() {
      CliqzUtils.log("URL");
      CliqzHistoryAnalysis.analyseRevisits(1);
      CliqzHistoryAnalysis.analyseRevisits(2);
      CliqzHistoryAnalysis.analyseRevisits(3);
      CliqzHistoryAnalysis.analyseRevisits(4);
    });
    CliqzHistoryAnalysis.initData(function() {
      CliqzUtils.log("Query");
      CliqzHistoryAnalysis.analyseRevisits(1);
      CliqzHistoryAnalysis.analyseRevisits(2);
      CliqzHistoryAnalysis.analyseRevisits(3);
      CliqzHistoryAnalysis.analyseRevisits(4);
    }, true);
  },
  addColumn: function(table, col, type) {
    CliqzHistory.SQL("SELECT * FROM sqlite_master WHERE tbl_name=:table AND sql like :col", null,
      function(n) {
        if (n == 0) CliqzHistory.SQL("alter table " + table + " add column " + col + " " + type);
      }, {
        table: table,
        col: "% " + col + " %"
      });
  },
  deleteVisit: function(url) {
    // TODO: Delete complete sessions?
    CliqzHistory.SQL("delete from visits where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from urltitles where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from thumbnails where url = :url", null, null, {
      url: url
    });
    CliqzHistory.SQL("delete from opengraph where url = :url", null, null, {
      url: url
    });
    CliqzHistory.deleteThumbnail(url);
  },
  deleteThumbnail: function(url) {
    var thumbnail = FileUtils.getFile("ProfD", ["cliqz_thumbnails", CliqzHistory.MD5(url) + ".jpeg"]);
    if (thumbnail.exists()) thumbnail.remove(true);
  },
  deleteTimeFrame: function() {
    // TODO: Delete complete sessions?
    CliqzHistoryPattern.historyTimeFrame(function(min, max) {
      CliqzHistory.SQL("select url from visits where visit_date < :min OR visit_date > :max", function(r) {
        // TODO: this deletes all occurrences of the url, better: only in timeframe
        CliqzHistory.deleteVisit(r[0]);
      }, null, {
        min: min,
        max: max
      });
    });
  },
  clearHistory: function() {
    CliqzHistory.SQL("delete from visits");
    CliqzHistory.SQL("delete from urltitles");
    CliqzHistory.SQL("delete from thumbnails");
    CliqzHistory.SQL("delete from opengraph");
    // Delete thumbnails and recreate directory
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true); // Make sure it exists
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true).remove(true);
    FileUtils.getDir("ProfD", ["cliqz_thumbnails"], true); // Recreate
  },
  historyObserver: {
    onBeginUpdateBatch: function() {},
    onEndUpdateBatch: function() {
      CliqzHistory.deleteTimeFrame();
    },
    onVisit: function(aURI, aVisitID, aTime, aSessionID, aReferringID, aTransitionType) {
      var url = CliqzHistoryPattern.simplifyUrl(aURI.spec);
      CliqzHistory.lastVisit.push(url);
      CliqzHistory.lastVisitTransition.push(aTransitionType);
    },
    onTitleChanged: function(aURI, aPageTitle) {
      var url = CliqzHistoryPattern.simplifyUrl(aURI.spec);
      if (url.length > 0 && aPageTitle.length > 0)
        CliqzHistory.updateTitle(url, aPageTitle)
    },
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
  MD5: function(str) {
    var converter =
      Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
    createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    converter.charset = "UTF-8";
    var result = {};
    var data = converter.convertToByteArray(str, result);
    var ch = Components.classes["@mozilla.org/security/hash;1"]
      .createInstance(Components.interfaces.nsICryptoHash);
    ch.init(ch.MD5);
    ch.update(data, data.length);
    var hash = ch.finish(false);

    function toHexString(charCode) {
      return ("0" + charCode.toString(16)).slice(-2);
    }
    return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
  }
}
