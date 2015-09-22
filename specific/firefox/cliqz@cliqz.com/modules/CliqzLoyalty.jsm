'use strict';
var EXPORTED_SYMBOLS = ['CliqzLoyalty'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');


/**-----------------------------------------------------------------------//
 //---------------------------- HELPER FUNCTIONS --------------------------//
 //-----------------------------------------------------------------------//
 */

if (!String.format) {
  String.format = function (format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
        ;
    });
  };
}

/**
 //---------------------------------- CORE - to work with browser ----------------------------------//
 //----------------------------we try to decouple the Loyalty from the extension, thus whenever possible
 --- we extract extension's functionality to the core of loyalty ----------------------------------------//
 */

var CORE = {
  Services: null,
  loyaltyDntPrefs: Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqzLoyalty.'),
  PREF_STRING: 32,
  PREF_INT: 64,
  PREF_BOOL: 128,

  getPref: function (pref, notFound) {
    try {
      switch (CORE.loyaltyDntPrefs.getPrefType(pref)) {
        case CORE.PREF_BOOL:
          return CORE.loyaltyDntPrefs.getBoolPref(pref);
        case CORE.PREF_STRING:
          return CORE.loyaltyDntPrefs.getCharPref(pref);
        case CORE.PREF_INT:
          return CORE.loyaltyDntPrefs.getIntPref(pref);
        default:
          return notFound;
      }
    } catch (e) {
      return notFound;
    }
  },

  setPref: function (pref, val) {
    switch (typeof val) {
      case 'boolean':
        CORE.loyaltyDntPrefs.setBoolPref(pref, val);
        break;
      case 'number':
        CORE.loyaltyDntPrefs.setIntPref(pref, val);
        break;
      case 'string':
        CORE.loyaltyDntPrefs.setCharPref(pref, val);
        break;
    }
  },

  iterateWindows: function(func, arg) {
    CORE.Services = CORE.Services || CliqzUtils.getWindow().Services;
    var enumerator = CORE.Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      try {
        func.apply(null, [win].concat(arg))
      } catch (e) {
      }
    }
  },

  refreshCliqzStarButtons: function (iconUrl) {
    CORE.iterateWindows(function(win, iconUrl){
      var button = win.document.getElementById(ICONS.BTN_ID);
      button.setAttribute('image', iconUrl);
    },
    [iconUrl]);
  },

  unload: function () {
    CORE.iterateWindows(function(win){
      var btn;
      if (btn = win.document.getElementById(ICONS.BTN_ID)) {
        btn.parentNode.removeChild(btn);
      }
    },
    []);
  }
};

/**-----------------------------------------------------------------------//
 //-----------------------------------------------------------------------//
 */

var META_KEY = "loyalty_m",
  CUR_TERM_Y = "cty", // current year term
  CUR_TERM_YEAR = "cy", // current year
  NOTIFY_KEY = "loyalty_notf",
  NOTIFY_NORM_MSG = "nms",
  NOTIFY_INFO = "nf",
  NOTIFY_FLAG = "fl",// if notify flag is on, use notify icon for the browser
  NOTIFY_FLAG_MSG = "fms",// notify message, "" means no msg. Only set to "" when user close this msg or when unload Loyalty
  NOTIFY_BADGES = "b",
  ALERT_THRESHOLD_UPDATE_FAIL = 2;

function setMetaPref(curTerm, curYear) {
  var m = {};
  m[CUR_TERM_Y] = curTerm;
  m[CUR_TERM_YEAR] = curYear;
  CORE.setPref(META_KEY, JSON.stringify(m));
}

function buildNotifyInfo(isNotify, notifyMsg) {
  /*
   * @para notifyMsg: a string
   *               + leave null to use current value in ref.
   */
  var info = {};
  info[NOTIFY_FLAG] = isNotify;
  if (notifyMsg === null) {
    var tmp = JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false));
    info[NOTIFY_FLAG_MSG] = tmp[NOTIFY_INFO][NOTIFY_FLAG_MSG] || "";
  }
  else
    info[NOTIFY_FLAG_MSG] = notifyMsg;

  return info;
}

function updateNotifyPref(val, notify) {
  if (!val) {
    val = {};
    val[NOTIFY_NORM_MSG] = CliqzStatsGlobal.messageAll.map(function (msgObj) {
      return msgObj["id"] || 0;
    });
    val[NOTIFY_BADGES] = CliqzLLogic.badges.curBadges || {};
  }

  val[NOTIFY_INFO] = notify;

  CORE.setPref(NOTIFY_KEY, JSON.stringify(val));
}

/**
 * //---------------------------------- LISTENING TO CHANGES IN PREF OF CLIQZ EXTENSION ----------------------------//
 * in the attempt to detach the Loyalty Program from the Extension code, we use Preference listener to observe changes in the pref. of the Cliqz Extension.
 * By doing this, we avoid situations such as: force to add an event listener when user changes configuration, e.g. activate/deactivate human web.
 * for more info. on how this works.
 * https://developer.mozilla.org/en-US/Add-ons/Code_snippets/Preferences#Using_preference_observers
 *--------------------------------------------------------------------------------------//
 */

/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get
  // garbage collected.
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);
  this._branch = prefService.getBranch(branch_name);
  this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  this._callback = callback;
}

PrefListener.prototype.observe = function (subject, topic, data) {
  if (topic == 'nsPref:changed')
    this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function (trigger) {
  this._branch.addObserver('', this, false);
  if (trigger) {
    var that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name) {
        that._callback(that._branch, pref_leaf_name);
      });
  }
};

PrefListener.prototype.unregister = function () {
  if (this._branch)
    this._branch.removeObserver('', this);
};

var CLIQZ_OBSERVER = {
  clzListener: null,
  init: function () {
    CLIQZ_OBSERVER.clzListener = new PrefListener(
      "extensions.cliqz.",
      function (branch, name) {
        if (name === "dnt") CliqzLLogic.notify.update("hw");
      }
    );

    CLIQZ_OBSERVER.clzListener.register(false);
  },
  unload: function () {
    CLIQZ_OBSERVER.clzListener.unregister();
  }
};

/**
 //---------------------------------------- GETTING INFO FROM BACKEND ----------------------------------//
 //------------------------------------------------------------------------------------------------------------//
 */

var CliqzStatsGlobal = {
  LOYALTY_DATA_PROVIDER: "http://newbeta.cliqz.com/api/v1/rich-header?path=/cl",
  // ------------ DEFAULT values from the backend -------------//
  MemberSystem: {"MEMBER": 0, "Buddy": 100, "Hero": 250, "LEGEND": 750},
  CliqzUsage: {  // user Cliqz Usage stat for comparison
    metric: [
      {"val": 10000, "name": "Rekordmarke", "img": "images/cup.svg"}
    ],
    name: "Total Cliqz-Used"
  },

  CliqzLatestVersion: "1.0.25",

  messageAll: [
    { "msg": "..., dass das CLIQZ-Team gegenwärtig aus 28 Nationalitäten besteht?",
      "icon": "globe.svg",
      "id": "NM1"
    },
    { "msg": "..., dass fast genauso viele Liter Bier wie Energy-Drinks bei CLIQZ konsumiert werden? :)",
      "icon": "globe.svg",
      "id": "NM2"
    },
    { "msg": "...,dass jeder Mitarbeiter, der einen Totalausfall hervorruft, eine Flasche Champagner bekommt?",
      "icon": "clock.svg",
      "id": "NM3"
    }
  ],

  // ------------ END DEFAULT values from the backend -------------//
  requestTimeout: 5 * 1e3,  // 10 sec
//    updateTime : 30*1e3,  // 63 minutes
  updateTime: 63 * 60 * 1e3,  // 63 minutes
  failConnectHandler: {
    updateTime: 60 * 1e3,  // 1 minutes
    retryCount: 0,
    retryLim: 10, // reckomment: to avoid concurrent update, make sure updateTime*retryLim < updateTime
    setTimeOutID: null
  },

//  get_usage_TopRecord: function() {
//    return CliqzStatsGlobal.CliqzUsage.metric[CliqzStatsGlobal.CliqzUsage.metric.length - 1].val;
//  },

  getLegendBenchMark: function () {
    return CliqzStatsGlobal.MemberSystem.LEGEND;
  },

  fetchData: function () {
    CliqzUtils.log("THuy--- fetch data");
    CliqzUtils.httpGet(CliqzStatsGlobal.LOYALTY_DATA_PROVIDER,
      function (res) {

        CliqzStatsGlobal.updateFailRetry = 0;
        if (CliqzStatsGlobal.updateTimeOut) {
          clearTimeout(CliqzStatsGlobal.updateTimeOut);
          CliqzStatsGlobal.updateTimeOut = null;
        }

        if (res && res.response) {
          try {
            CliqzUtils.log("THuy--- fetch data OK");
            var data = JSON.parse(res.response);
            CliqzTERM.updateTime(data["GMTime"]);
            CliqzStatsGlobal.CliqzUsage = data["CliqzUsage"] || CliqzStatsGlobal.CliqzUsage;
            CliqzStatsGlobal.CliqzUsage.metric = [CliqzStatsGlobal.CliqzUsage.metric[CliqzStatsGlobal.CliqzUsage.metric.length - 1]];
            CliqzStatsGlobal.CliqzLatestVersion = data["CliqzLatestVersion"] || CliqzStatsGlobal.CliqzLatestVersion;
            CliqzStatsGlobal.messageAll = data["message_all"] || CliqzStatsGlobal.messageAll;
            CliqzStatsGlobal.MemberSystem = data["MemberSystem"] || CliqzStatsGlobal.MemberSystem;

            Object.keys(CliqzStatsGlobal.MemberSystem).forEach(function (sttName) {
              var tmp = CliqzStatsGlobal.MemberSystem[sttName];
              delete CliqzStatsGlobal.MemberSystem[sttName];
              CliqzStatsGlobal.MemberSystem[sttName.toUpperCase()] = tmp;
            });

            CliqzLLogic.updateData(CliqzStatsGlobal);
            CliqzLLogic.notify.update("be");

          } catch (e) {
            CliqzUtils.telemetry({'type': 'CliqzStatsGlobal.parseData', 'action': 'update_backend_data', 'status': 'exception'});
          }
        }
      },
      function () {
        CliqzTERM.updateTime(null);
        CliqzUtils.telemetry({'type': 'CliqzStatsGlobal.BackEndConnect', 'action': 'fetch_backend_data', 'status': 'Request error'});

        if (CliqzStatsGlobal.failConnectHandler.retryCount < CliqzStatsGlobal.failConnectHandler.retryLim) {
          CliqzStatsGlobal.failConnectHandler.retryCount += 1;
          CliqzStatsGlobal.failConnectHandler.setTimeOutID = CliqzUtils.setTimeout(CliqzStatsGlobal.fetchData, CliqzStatsGlobal.failConnectHandler.updateTime)
        } else {
          CliqzStatsGlobal.failConnectHandler.retryCount = 0;
          CliqzStatsGlobal.failConnectHandler.setTimeOutID = null;
        }
      },
      CliqzStatsGlobal.requestTimeout
    );
  },

  cron: function () {
    CliqzStatsGlobal.timer = CliqzUtils.setInterval(CliqzStatsGlobal.fetchData, CliqzStatsGlobal.updateTime); // please remember to destroy the thread when unload
  }
};

/**
 * //-------------------------------------- ALL LOGIC ON AWARDING IN LOYALTY --------------------------------//
 *------------------------------------------------------------------------//
 */

var ICONS = {
  iconsStatus: {
    "noNotify": {
      "MEMBER": {url: "chrome://cliqzres/content/content/loyalty/images/Medals/trophy-member.svg", color: "#ABC8E2"},
      "BUDDY": {url: "chrome://cliqzres/content/content/loyalty/images/Medals/trophy-buddy.svg", color: "#5EA3F9"},
      "HERO": {url: "chrome://cliqzres/content/content/loyalty/images/Medals/trophy-hero.svg", color: "#733090"},
      "LEGEND": {url: "chrome://cliqzres/content/content/loyalty/images/Medals/trophy-legend.svg", color: "#FFC802"}
    }
  },

  iconsBrowser: {
    "noNotify": {
      "MEMBER": "chrome://cliqzres/content/content/loyalty/images/browser_icons/member-browser.svg",
      "BUDDY": "chrome://cliqzres/content/content/loyalty/images/browser_icons/buddy-browser.svg",
      "HERO": "chrome://cliqzres/content/content/loyalty/images/browser_icons/hero-browser.svg",
      "LEGEND": "chrome://cliqzres/content/content/loyalty/images/browser_icons/legend-browser.svg"
    },
    'notify': {
      "MEMBER": "chrome://cliqzres/content/content/loyalty/images/browser_icons/member-notification.svg",
      "BUDDY": "chrome://cliqzres/content/content/loyalty/images/browser_icons/buddy-notification.svg",
      "HERO": "chrome://cliqzres/content/content/loyalty/images/browser_icons/hero-notification.svg",
      "LEGEND": "chrome://cliqzres/content/content/loyalty/images/browser_icons/legen-notification.svg"
    }
  },

  BTN_ID: "cliqz-star-button",

  getIconBrowser: function (hasJoined, statusName, isNotify) {
    if (!hasJoined)
      return ICONS.iconsBrowser.notify["MEMBER"];

    var t = isNotify ? ICONS.iconsBrowser.notify : ICONS.iconsBrowser.noNotify;
    var icon = t[statusName];
    if (!icon)
      icon = t["MEMBER"];
    return icon;
  },

  getIconMemberStt: function (status) {
    var t = ICONS.iconsStatus["noNotify"];
    return status === null ? t : t[status] || "";
  }
};

var CliqzLLogic = {
  init: function () {
    // NOTE: call this after CliqzStats.cliqzUsageCached is initialized
    // Call this before running fetching  back-end data

    CliqzUtils.loadResource('chrome://cliqzres/content/content/loyalty/locale/de.json',
      function (req) {
        if (CliqzUtils) {
          var data = JSON.parse(req.response);
          CliqzLLogic.badges.update(data);
          CliqzLLogic.memStatus.update(data);
        }
      }
    );

    CliqzLLogic.currentStatus = CliqzLLogic.memStatus.calStatus(CliqzStats.cliqzUsageCached);

    var notify_meta = JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false));
    if (notify_meta) {
      CliqzLLogic.notify.isNotify = (notify_meta[NOTIFY_INFO] || {})[NOTIFY_FLAG];
      CliqzLLogic.notify.notifyMsg = (notify_meta[NOTIFY_INFO] || {})[NOTIFY_FLAG_MSG] || "";
      CliqzLLogic.badges.curBadges = notify_meta[NOTIFY_BADGES];
    }
  },

  memStatus: {
    statusName: ["MEMBER", "BUDDY", "HERO", "LEGEND"],  // !!! NOT ALLOWING CHANGING NAMES FROM THE BACK_END (because other data in de.json uses these keys)
    status_description: {"MEMBER": "1st level", "BUDDY": "2nd level", "HERO": "3rd level", "LEGEND": "Highest level"},
    statusTodo: {"MEMBER": "Join the Glory program", "BUDDY": "...", "HERO": "...", "LEGEND": "..."},
    statusBenchmark: {"MEMBER": 0, "BUDDY": 100, "HERO": 250, "LEGEND": 750},
    statusCongratsMsg: {},

    currentStatus: "",

    calStatus: function (point) {
      var statusLevel = 0;
      while (statusLevel < CliqzLLogic.memStatus.statusName.length - 1) {
        if (point < CliqzLLogic.memStatus.statusBenchmark[CliqzLLogic.memStatus.statusName[statusLevel + 1]])
          break;
        statusLevel += 1;
      }
      var sttName = CliqzLLogic.memStatus.statusName[statusLevel];
      return {'status': sttName, 'status_level': statusLevel, 'icon': ICONS.getIconMemberStt(sttName)};
    },

    update: function (data) {
      var mem_s = data['MemberSystem'];
      if (mem_s) {
        Object.keys(mem_s).forEach(function (m) {
          var tmp = m.toUpperCase(); //mem_s[m];
          if (CliqzLLogic.memStatus.statusBenchmark.hasOwnProperty(tmp)) {
            CliqzLLogic.memStatus.statusBenchmark[tmp] = mem_s[m];
          }
        });
      }

      //--------- update status_description
      var mem_des = data["MEM_STATUS_DES"];
      if (mem_des) {
        Object.keys(mem_des).forEach(function (stt_code) {
          CliqzLLogic.memStatus.status_description[stt_code] = mem_des[stt_code];
        })
      }

      //--------- update statusTodo (what to do to get this status)
      var mem_todo = data["MEM_STATUS_TODO"];
      if (mem_todo) {
        Object.keys(mem_todo).forEach(function (stt_code) {
          CliqzLLogic.memStatus.statusTodo[stt_code] = mem_todo[stt_code];
        })
      }

      //--------- update status_congrats_messages
      var status_congrats_msg = data["MEM_STATUS_CONGRATS_MSG"];
      if (status_congrats_msg) {
        Object.keys(status_congrats_msg).forEach(function (stt_code) {
          CliqzLLogic.memStatus.statusCongratsMsg[stt_code] = status_congrats_msg[stt_code];
        })
      }
    }
  },

  badges: {
    curBadges: null,
    // list of Badges this extension counts (we may have more from the backend, but is not supported by this version)
    badgeCode: [ "HMW", // human web
      "LV", // latest version
      "FU", // Frequent User - user cliqz frequently
      "CLE" // Cliqz Expert level
    ],

    HMW: {
      isAchieved: function (data) {
        return data.hmw ? true : false;
      },
      img: 'images/Mad scientist_icn.svg',
      name: "HumanWeb",
      des: ["", ""]
    },
    LV: {
      isAchieved: function (data) {
        return data.version.current >= data.version.latest;
      },
      img: 'images/Early adopter_icn.svg',
      name: "Latest CLIQZ",
      des: ["", ""]
    },
    FU: {
      isAchieved: function (data) {
        return data.freqCliqzUse.current >= data.freqCliqzUse.threshold;
      },
      img: 'images/Loyal_icn.svg',
      name: "Loyal Friend",
      des: ["", ""]
    },
    CLE: {
      isAchieved: function (data) {
        return data.totalCliqzUse.current >= data.totalCliqzUse.Legend;
      },
      img: 'images/magnifier.svg',
      name: "CLIQZ Expert",
      des: ["", ""],
      buildDes: function (self, data) {
        return [self.des[0], String.format(self.des[1], data.totalCliqzUse.Legend.toString())];
      }
    },

    update: function (data) {
//      CliqzUtils.log(data, "THUY ---------------- badges update");
      var bs = data["CliqzBadges"];
      CliqzLLogic.badges.badgeCode.forEach(function (b_code) {
        var b = CliqzLLogic.badges[b_code];
        if (b) {
          b.img = bs[b_code]["img"] || b.img;
          b.name = bs[b_code]["name"] || b.name;
          b.des = bs[b_code]["des"] || b.des;
        }
      });
    },

    calBadges: function (data) {
      var awards = {}, nAward = 0;
      CliqzLLogic.badges.badgeCode.forEach(function (badge) {
        var achieve = CliqzLLogic.badges[badge].isAchieved(data);
        nAward += achieve ? 1 : 0;
        awards[badge] = achieve;
      });
      return {"awardList": awards, "nAward": nAward, "totalAwards": CliqzLLogic.badges.badgeCode.length};
    },

    prepCalBadges: function (user_stat, hmw_) {
      var hmw = (hmw_ === null) ? (CliqzUtils.getPref('dnt', false) ? 0 : 1) : hmw_,
        freqCliqzUse, totalSearch;

      totalSearch = user_stat.resultsCliqz.total + user_stat.resultsGoogle;
      freqCliqzUse = Math.round(100 * user_stat.resultsCliqz.total / totalSearch);
      return {
        hmw: hmw,
        version: {current: CliqzUtils.extensionVersion || "1.0.25", latest: CliqzStatsGlobal.CliqzLatestVersion},
        freqCliqzUse: {current: freqCliqzUse, threshold: 80}, // todo: define threshold from the backend
        totalCliqzUse: {current: user_stat.resultsCliqz.resultsCliqzTotal, Legend: CliqzStatsGlobal.getLegendBenchMark()}
      }
    },

    getBadgesInfo: function (data) {
      var badges = {};
      CliqzLLogic.badges.badgeCode.forEach(function (badge) {
        var b = CliqzLLogic.badges[badge];
        badges[badge] = {img: b.img, name: b.name, des: b.buildDes ? b.buildDes(b, data) : b.des};
      });
      return badges;
    },

    isBadgesUpdated: function (new_b, cur_b) {
      if (new_b && !cur_b)
        return true;
      if (new_b["nAward"] !== cur_b["nAward"] || new_b["totalAwards"] !== cur_b["totalAwards"])
        return true;
      var is_new = false;
      Object.keys(new_b["awardList"]).forEach(function (b_code) {
        is_new = is_new || (new_b["awardList"][b_code] !== cur_b["awardList"][b_code]);
      });
      return is_new;
    }
  },

  notify: {  // control when notification mode is on
    // Cases we have notification:
    // 1. user has new status
    // 2. we send new msg from the back-end in Did You Know section
    // 3. When user gets a new badge
    isNotify: null,
    notifyMsg: "",

    // new status only happens while using the extension
    checkUpdateStatus: function () {
      var latestStt = CliqzLLogic.memStatus.calStatus(CliqzStats.cliqzUsageCached);

      if (!CliqzLLogic.memStatus.currentStatus.status_level)
        CliqzLLogic.memStatus.currentStatus = latestStt;
      if (CliqzLLogic.memStatus.currentStatus.status_level !== latestStt.status_level) {
        CliqzLLogic.memStatus.currentStatus = latestStt;
        return {
          "val": latestStt,
          "is_new": true,
          "notifyMsg": CliqzLLogic.memStatus.statusCongratsMsg[latestStt["status"]] || ""
        };
      }
      return {"val": latestStt, "is_new": false, "notifyMsg": ""
      };
    },

    checkUpdateMsg: function () {
      var notifyMeta = JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false)),
        msgIDListCur = notifyMeta[NOTIFY_NORM_MSG] || [],
        newMsg = false;
      CliqzStatsGlobal.messageAll.forEach(function (msgObj) {
        newMsg = newMsg || !(msgObj["id"] in msgIDListCur);
      });
      return newMsg;
    },

    checkUpdateBadges: function () {
      /**
       * @para: trigger_by: see update()
       */
      var awards = CliqzLLogic.badges.calBadges(CliqzLLogic.badges.prepCalBadges(CliqzStats.get(), null));
      var changed = CliqzLLogic.badges.isBadgesUpdated(awards, CliqzLLogic.badges.curBadges);
      CliqzLLogic.badges.curBadges = awards;
      return changed;
    },

    update: function (triggerBy) {
      /*
       * @para: trigger_by: what triggers this update function. Val:
       *      + "be" (back-end update)
       *      + "br": when browser stats
       *      + "s": search event
       *      + "hw": user activate/deactivate human web
       * NOTE: depends when what triggers this, different checks are required
       * THIS FUNCTION only turns the notification on if applicable. It does not turn the notification off!
       */
      var latestSttInfo = CliqzLLogic.notify.checkUpdateStatus(),
        latestStt = latestSttInfo["val"],
        msgUpdate = triggerBy in ["be"] ? CliqzLLogic.notify.checkUpdateMsg() : false,
        badgesUpdate = CliqzLLogic.notify.checkUpdateBadges(),
        isNotify = CliqzLLogic.notify.isNotify || false,
        notifyMsg = CliqzLLogic.notify.notifyMsg || "";

      if (triggerBy === "hw" || latestSttInfo["is_new"] || msgUpdate || badgesUpdate) {
        CORE.refreshCliqzStarButtons(ICONS.getIconBrowser(true, latestStt["status"], true));
        CliqzLLogic.notify.isNotify = true;
        isNotify = true;
        if (latestSttInfo["is_new"]) {
          notifyMsg = latestSttInfo["notifyMsg"] || "";
          CliqzLLogic.notify.notifyMsg = notifyMsg;
        }
      }

      updateNotifyPref(null, buildNotifyInfo(isNotify, notifyMsg));
    },

    updateOnOpenProgramPage: function () {  // turn off notification
      var latestStt = CliqzLLogic.memStatus.calStatus(CliqzStats.cliqzUsageCached);
      CliqzLLogic.notify.isNotify = false;
      updateNotifyPref(JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false)), buildNotifyInfo(false, CliqzLLogic.notify.notifyMsg));
      CORE.refreshCliqzStarButtons(ICONS.getIconBrowser(true, latestStt["status"], false));
    },

    getNotifyInfo: function () {
      var tmp = JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false));
      return {
        "isNotify": (tmp[NOTIFY_INFO] || {})[NOTIFY_FLAG],
        "notifyMsg": (tmp[NOTIFY_INFO] || {})[NOTIFY_FLAG_MSG]
      }
    },

    onUnload: function () {
      // reset notify msg to empty
      if (CliqzLLogic.notify.notifyMsg && !CliqzLLogic.notify.isNotify)
        updateNotifyPref(null, buildNotifyInfo(false, ""));
      CliqzLLogic.notify.notifyMsg = "";
    }
  },

  updateData: function (data) {
    CliqzLLogic.memStatus.update(data);
//        CliqzLLogic.badges.update(data);
  },

  calPoint: function (nCliqzUse) {
    return nCliqzUse || 0;
  },

  onUnload: function () {
    CliqzLLogic.notify.onUnload();
  }
};

/**
 //---------------------------------- TERM (Loyalty follows 3month terms) -------------------------------------//
 //------------------------------------------------------------------------------------//
 */

var CliqzTERM = {
  numConnFailTimeChk: ALERT_THRESHOLD_UPDATE_FAIL,
  calTermOfYear: function (m) {
    // @para m: 0,1,...11
    return Math.floor(m / 3);
  },
  getMonthsOfTerm: function (term) {
    // @para: term: 0, 1, 2, 3 ()  - month in a year
    // NOTE: return monsth counting from 0 (to 11)
    return [0, 1, 2].map(function (c) {
      return 3 * term + c;
    })
  },
  isNewTerm: function (time_) {
    /*
     @para m: month, 0,1,...11
     @para update: = true (default): update the pref if it's a new term
     */
    var meta = JSON.parse(CORE.getPref(META_KEY, '{}', false)),
      t = CliqzTERM.calTermOfYear(time_.m);
    return t > meta[CUR_TERM_Y] || (!t && meta[CUR_TERM_Y]);
  },
  updateTime: function (BackendTime) { // backend time
    var t = BackendTime;
    if (!BackendTime && CliqzTERM.numConnFailTimeChk > ALERT_THRESHOLD_UPDATE_FAIL) {
      t = CliqzTERM.getTimeLocal();
      CliqzTERM.numConnFailTimeChk = 0;
    }
    if (t) {
      if (CliqzTERM.isNewTerm(t))
        CliqzStats.prepNewTerm(t);
    } else CliqzTERM.numConnFailTimeChk += 1
  },
  /*
   * in case can't get time from the back-end, we use device time as the fall-back option
   */
  getTimeLocal: function () {
    var t = new Date();
    return {
      'y': t.getUTCFullYear(),
      'm': t.getUTCMonth(),
      'd': t.getUTCDate(),
      'h': t.getUTCHours()
    }
  }

};

/**
 //---------------------------------- LOYALTY STAT (store user data)-------------------------------//
 //------------------------------------------------------------------------//
 */

var dbWrapper = function (func, callBack) {
  return function () {
    var db = JSON.parse(CORE.getPref(STATS_KEY, '{}', false)),
      day = CliqzUtils.getDay();

    // call the original method
    var args = [db, day].concat(Array.prototype.slice.call(arguments));
    var ret = func.apply(null, args);

    setPersistent(db);

    if (callBack) {
      callBack();
    }

    return ret;
  }
};

var STATS_KEY = 'loyalty',
  QUERIES = 'q',
  G_SELECTED = 'gSel', /* Google selected results */
  C_SELECTED = 'cSel', /* Cliqz selected results object {} */
  TOTAL = 'cTotal', /* Total Cliqz selected results ( click + enter + autocomplete) */
  RESULT_CLICK = 'cClick', /* Cliqz click results */
  RESULT_ENTER = 'cEnter', /* Cliqz enter results */
  AUTO_COMPLETED = 'cAuto', /* Cliqz autocomplete results */
  ACTIVE_SELECT = 'cActiveSel', /* Cliqz active selections (cTotal - cAuto) */
  HISTORY = 'cHistory',
  BIGMACHINE = 'cBM',
  EZ = 'cEZ';

var CliqzStats = {
  curDBTerm: -1,
  maxStoreTerm: 20,
  cliqzUsageCached: 0,
  cliqzDBCurTermCached: null,

  initMin: function () {
    CliqzStats.migrateDataV0();
    CliqzStats.curDBTerm = CliqzStats.countTerm() - 1;

    // to avoid access to often to the db, we cache certain info here
    var userDB = CliqzStats.get();
    CliqzStats.cliqzUsageCached = userDB["resultsCliqz"]["total"];
  },

  //subscribe to events
  init: function () {
    CliqzEvents.sub('alternative_search', CliqzStats.googleSelectedResults);
    CliqzEvents.sub('autocomplete', CliqzStats.cliqzSelectedResults);
    CliqzEvents.sub('result_click', CliqzStats.cliqzSelectedResults);
    CliqzEvents.sub('result_enter', CliqzStats.cliqzSelectedResults);

    CliqzStats.initMin();

    CliqzStats.migrateDataV0();
    CliqzStats.curDBTerm = CliqzStats.countTerm() - 1;

    // to avoid access to often to the db, we cache certain info here
    var userDB = CliqzStats.get();
    CliqzStats.cliqzUsageCached = userDB["resultsCliqz"]["total"];
  },

  formatTermDataForExternal: function (s) {
    return {
      resultsGoogle: s.resultsGoogle,
      resultsCliqz: {
        click: s.resultsCliqzClick,
        enter: s.resultsCliqzEnter,
        auto: s.resultsCliqzAuto,
        active: s.resultsCliqzActive,
        total: s.resultsCliqzTotal,
        history: s.resultsHistory,
        bigMachine: s.resultsBM,
        ez: s.resultsEZ
      }
    };
  },

  get: function (term) {
    // @para: term 0,1,2... where 0 is the first term the user start using loyalty. Leave term = null for default: current term
    var t = term === undefined ? CliqzStats.curDBTerm : term, s;
    if (t === CliqzStats.curDBTerm && CliqzStats.cliqzDBCurTermCached)
      s = CliqzStats.cliqzDBCurTermCached;
    else {
      var db = JSON.parse(CORE.getPref(STATS_KEY, '{}', false));
      s = computeTerm(db, t);
      if (t === CliqzStats.curDBTerm)
        CliqzStats.cliqzDBCurTermCached = s;
    }
    return CliqzStats.formatTermDataForExternal(s);
  },

  getAllTerms: function () {
//    getAllTerms: dbWrapper(function(db){
    var db = JSON.parse(CORE.getPref(STATS_KEY, '{}', false));
    var s = computeTerm(db, -1);
    var data = CliqzStats.formatTermDataForExternal(s["current"] || {});
    data["previous"] = {};
    Object.keys(s["previous"] || {}).forEach(function (term) {
      data["previous"][term] = CliqzStats.formatTermDataForExternal(s["previous"][term]);
      data["previous"][term]["meta"] = s["previous"][term]["meta"] || {};
    });
    return data;
  },

  countTerm: function () {
    var db = JSON.parse(CORE.getPref(STATS_KEY, '{}', false));
    return Object.keys(db).length;
  },
//    countTerm: dbWrapper(function(db){return Object.keys(db).length; }),

  /*
   * Increment google selected results + total queries
   */
  googleSelectedResults: dbWrapper(function (db, day) {
    CliqzStats.cliqzDBCurTermCached = null;
    var t = CliqzStats.curDBTerm;
    db[t][day] = db[t][day] || {};
    db[t][day][G_SELECTED] = (db[t][day][G_SELECTED] || 0) + 1;
    //increment total number of searches
    db[t][day][QUERIES] = (db[t][day][QUERIES] || 0) + 1;

//        return [CliqzLLogic.notify.update]; // call back

  }, CliqzLLogic.notify.update),
  /*
   * Increment cliqz selected results + total queries
   * Cliqz selected results = (autocompleted + click + enter)
   */
  cliqzSelectedResults: dbWrapper(function (db, day, signal, meta) {  // todo: rethink on how to organize all this encodeResultType, VERTICAL_ENCODINGS, etc
    CliqzStats.cliqzDBCurTermCached = null;
    var t = CliqzStats.curDBTerm;
    db[t][day] = db[t][day] || {};

    db[t][day][C_SELECTED] = db[t][day][C_SELECTED] || {};
    db[t][day][C_SELECTED][TOTAL] = (db[t][day][C_SELECTED][TOTAL] || 0) + 1;
    CliqzStats.cliqzUsageCached += 1;

    if (typeof signal.autocompleted !== 'undefined') {
      db[t][day][C_SELECTED][AUTO_COMPLETED] = (db[t][day][C_SELECTED][AUTO_COMPLETED] || 0) + 1;
    } else {  // todo: decide if we want to track Bookmark and custom search
      if (isHistoryResult(signal)) db[t][day][C_SELECTED][HISTORY] = (db[t][day][C_SELECTED][HISTORY] || 0) + 1;
      else if (isBMResult(signal, meta)) db[t][day][C_SELECTED][BIGMACHINE] = (db[t][day][C_SELECTED][BIGMACHINE] || 0) + 1;
      else if (isEZResult(signal)) db[t][day][C_SELECTED][EZ] = (db[t][day][C_SELECTED][EZ] || 0) + 1;
    }
    //cliqz active results
    db[t][day][C_SELECTED][ACTIVE_SELECT] = db[t][day][C_SELECTED][TOTAL] - (db[t][day][C_SELECTED][AUTO_COMPLETED] || 0);

    //increment total number of searches
    db[t][day][QUERIES] = (db[t][day][QUERIES] || 0) + 1;
  }, CliqzLLogic.notify.update),

  /*
   * Re-organizing the db when starting a new term
   */
  prepNewTerm: dbWrapper(function (db, day, time_) {
    var meta = JSON.parse(CORE.getPref(META_KEY, '{}', false));

    if (CliqzStats.curDBTerm >= 0) {
      db[CliqzStats.curDBTerm] = computeTerm(db, CliqzStats.curDBTerm);
      db[CliqzStats.curDBTerm]["meta"] = calMetaTerm(meta[CUR_TERM_YEAR], meta[CUR_TERM_Y]);

      setMetaPref(CliqzTERM.calTermOfYear(time_.m), time_.y);
    }
    CliqzStats.curDBTerm += 1;
    db[CliqzStats.curDBTerm] = {};

    // cleaning up db if it contains too many terms
    var termsID = Object.keys(db);
    if (termsID.length > CliqzStats.maxStoreTerm) {

      var lowBound = CliqzStats.curDBTerm - CliqzStats.maxStoreTerm + 1;
      termsID.forEach(function (id) {
        if (parseInt(id) < lowBound)
          delete db[id];
      });
    }

    CliqzStats.cliqzDBCurTermCached = null;
  }),

  /*
   * Migrate old db structure to the new one
   */
  migrateDataV0: dbWrapper(function (db, day) {
    if (db && db[CliqzStats.countTerm() - 1] === undefined) {
      var date_ = new Date(),
        N = date_.getUTCMonth() % 3 === 0 ? 7 : 30,
        td = {},
        term = CliqzTERM.calTermOfYear(date_.getUTCMonth());
      setMetaPref(term, date_.getUTCFullYear());
      CliqzStats.curDBTerm = 0;
      for (var i = day; i > day - N; i--) {
        var d = db[i];
        if (!d)continue;
        td[i] = d;
        delete db[i];
      }
      Object.keys(db).forEach(function (d) {
        delete db[d];
      });
      db["0"] = td;
    }
  })
};

function calMetaTerm(y, t) {
  /*
   * @para y: year (full)
   * @para t: term of the year (0,1,2,3)
   */
  return {
    'y': y,  // year
    'ty': t,  // term of the year
    'ms': CliqzTERM.getMonthsOfTerm(t)// months in the term
  };
}

var VERTICALS = Object.keys(CliqzUtils.VERTICAL_TEMPLATES);

function isBMResult(signal, meta) {
  return signal.position_type && signal.position_type[0] && (signal.position_type[0][0] === 'm' || (meta && (VERTICALS || []).indexOf(signal.position_type[0][0]) >= 0));
}

function isHistoryResult(signal) {  // please refer to CliqzUtils.encodeResultType() for up-to-date codes
  return signal.position_type && signal.position_type[0] && ['C', 'H'].indexOf(signal.position_type[0][0]) >= 0;
}

function isEZResult(signal) {
  return signal.position_type && signal.position_type[0] && signal.position_type[0][0] === 'X';
}

function computeTerm(db, termIdx) {
  /*
   *   @para: termIdx int, (used in the db as string), leave termIdx = -1 to get all terms in the db
   */
  var c = db[termIdx] || {};
  var summary = {};
  if (termIdx === CliqzStats.curDBTerm) {
    summary = {
      resultsGoogle: 0,
      resultsCliqzTotal: 0,
      resultsCliqzEnter: 0,
      resultsCliqzClick: 0,
      resultsCliqzAuto: 0,
      resultsCliqzActive: 0,
      resultsHistory: 0,
      resultsBM: 0,
      resultsEZ: 0
    };
    Object.keys(c).forEach(function (d) {
      var dd = c[d] || {};
      summary.resultsGoogle += dd[G_SELECTED] || 0;
      if (dd[C_SELECTED]) {
        summary.resultsCliqzTotal += dd[C_SELECTED][TOTAL] || 0;
        summary.resultsCliqzEnter += dd[C_SELECTED][RESULT_ENTER] || 0;
        summary.resultsCliqzClick += dd[C_SELECTED][RESULT_CLICK] || 0;
        summary.resultsCliqzAuto += dd[C_SELECTED][AUTO_COMPLETED] || 0;
        summary.resultsCliqzActive += dd[C_SELECTED][ACTIVE_SELECT] || 0;
        summary.resultsHistory += dd[C_SELECTED][HISTORY] || 0;
        summary.resultsBM += dd[C_SELECTED][BIGMACHINE] || 0;
        summary.resultsEZ += dd[C_SELECTED][EZ] || 0;
      }
    })
  } else {
    if (termIdx === -1) {
      summary["current"] = computeTerm(db, CliqzStats.curDBTerm);
      summary["previous"] = {};
      Object.keys(db).forEach(function (d) {
        if (d !== CliqzStats.curDBTerm + "")
          summary["previous"][d] = db[d];
      })
    }
  }
  return summary;
}

function setPersistent(val) {
  CORE.setPref(STATS_KEY, JSON.stringify(val));
}

/**
 //---------------------------------- MAIN CLASS - LOYALTY STAT ----------------------------------//
 //---------------Note: this class encapsulates all others,---------------//
 // -----------------and is the only one exposed to outside---------------//
 //-----------------------------------------------------------------------//
 */

var CliqzLoyalty = {
  VERSION: "TTAM15",

  initMin: function () {
    CliqzStats.initMin();
    CliqzLLogic.init();
  },

  init: function () {
    CliqzStats.init();
    CliqzLLogic.init();
    CLIQZ_OBSERVER.init();

    CliqzStatsGlobal.fetchData();
    CliqzStatsGlobal.cron();
  },

  unload: function () {
    CliqzLLogic.onUnload();
    if (CliqzStatsGlobal.timer)
      CliqzUtils.clearTimeout(CliqzStatsGlobal.timer);
    CLIQZ_OBSERVER.unload();
    CORE.unload();
  },

  onBrowserIconClick: function () {
    // disable notification icon
    CliqzLLogic.notify.updateOnOpenProgramPage();
  },

  // ----------- serving data to the UI -----------------//
  prepareDataForUI: function (userStat) {
    var stat,
      hmw = CliqzUtils.getPref('dnt', false) ? 0 : 1,
      point, awards, status;

    awards = CliqzLLogic.badges.calBadges(CliqzLLogic.badges.prepCalBadges(userStat, hmw));

    point = CliqzLLogic.calPoint(userStat.resultsCliqz.total) || 0;
    status = CliqzLLogic.memStatus.calStatus(point);
    userStat['hmw'] = hmw;
    stat = {
      joined: CliqzLoyalty.hasJoined(),
      data: userStat,
      membership: {
        point: point,
        status: status,
        awards: awards
      },
      meterTotalUse: {
        metric: CliqzStatsGlobal.CliqzUsage.metric,
        name: CliqzStatsGlobal.CliqzUsage.name
      },
      msgAll: CliqzStatsGlobal.messageAll,
      msgNotify: CliqzLLogic.notify.getNotifyInfo()
    };

//    CliqzUtils.log(stat, "THUY--------- stat for Loyalty");
    return stat;
  },

  getAllStatCurrentTerm: function () {
    return CliqzLoyalty.prepareDataForUI(CliqzStats.get());
  },

  getAllStat: function () {
    return CliqzLoyalty.prepareDataForUI(CliqzStats.getAllTerms());
  },

  getBadgesInfo: function () {
    return CliqzLLogic.badges.getBadgesInfo(CliqzLLogic.badges.prepCalBadges(CliqzStats.get(), null));
//        return CliqzStatsGlobal.CliqzBadges;
  },

  getBadgeCode: function () {
    return CliqzLLogic.badges.badgeCode;
  },

  getMemStatus: function () {
    /*
     * return null: have not joined the program
     */
    var stt = null;
    if (CliqzLoyalty.hasJoined()) {
      var user_stat = CliqzStats.get(),
        point = CliqzLLogic.calPoint(user_stat.resultsCliqz.total);
      stt = CliqzLLogic.memStatus.calStatus(point);
    }
    return stt;
  },

  getMemStatusMeta: function () {
//        statusName : ["MEMBER", "BUDDY", "HERO", "LEGEND"],
//        status_description: {"MEMBER": "1st level", "BUDDY": "2nd level", "HERO": "3rd level", "LEGEND": "Highest level"},
//        statusBenchmark: {"MEMBER": 0, "BUDDY": 100, "HERO": 250, "LEGEND": 750},

    var m = CliqzLLogic.memStatus,
      icons = ICONS.getIconMemberStt(null);

    return m.statusName.map(function (stt_name) {
      return {
        "name": stt_name,
        "des": m.status_description[stt_name] || "",
        "do": m.statusTodo[stt_name] || "",
        "bench_mark": m.statusBenchmark[stt_name] || "_",
        "icon": icons[stt_name] || {}
      }
    });
  },

  hasJoined: function () {
    return CORE.getPref('participateLoyalty') === true
  },

  getBrowserButtonID: function () {
    return ICONS.BTN_ID;
  },

  // identify which icon to used for the browser
  getBrowserIcon: function (is_notifier) {
    /*
     * @para is_notifier: true if we want a notifier, else false (default)
     */

    var status = CliqzLoyalty.getMemStatus();
    if (status) {
      var tmp = JSON.parse(CORE.getPref(NOTIFY_KEY, '{}', false));
      is_notifier = (tmp[NOTIFY_INFO] || {} )[NOTIFY_FLAG] || false;
    }

    return status ? ICONS.getIconBrowser(true, status["status"], is_notifier) : ICONS.getIconBrowser(false);
  },

  test: function (f_name) {
    return CliqzLLogic.memStatus;
  },

  setPref: function (pref, val) {
    CORE.setPref(pref, val)
  },

  getPref: function (pref, notFound) {
    return CORE.getPref(pref, notFound)
  }
};

//{"16609":{"cSel":{"cTotal":1500,"cEnter":1300,"cHistory":100,"cActiveSel":1300,"cEZ":100},"q":5,"gSel":50},"16612":{"cSel":{"cTotal":234,"cClick":10,"cActiveSel":13,"cBM":8,"cEnter":3,"cAuto":221},"q":16,"gSel":2},"16626":{"gSel":5,"q":10,"cSel":{"cTotal":5,"cEnter":3,"cBM":3,"cActiveSel":5,"cClick":2}},"16627":{"gSel":1,"q":1},"16630":{"cSel":{"cTotal":3,"cClick":3,"cActiveSel":3},"q":3},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1}}
//{"0":{"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16664":{"gSel":4,"q":105,"cSel":{"cTotal":101,"cAuto":101,"cActiveSel":0}}}}

// Buddy, needs 2 more to become Hero
//{"0":{"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16664":{"gSel":5,"q":177,"cSel":{"cTotal":172,"cAuto":101,"cActiveSel":71,"cHistory":1}}}}

//{"0":{"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16664":{"gSel":5,"q":179,"cSel":{"cTotal":174,"cAuto":101,"cActiveSel":73,"cHistory":2,"cBM":1}},"16666":{"gSel":3,"q":3}}}

// With 2 quarter, 3/4 badges (except the top record)
//{"0":{"resultsGoogle":15,"resultsCliqzTotal":76,"resultsCliqzEnter":0,"resultsCliqzClick":18,"resultsCliqzAuto":5,"resultsCliqzActive":71,"resultsHistory":15,"resultsBM":5,"resultsEZ":15,"meta":{"y":2015,"ty":2,"ms":[6,7,8]}},"1":{"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16664":{"gSel":5,"q":179,"cSel":{"cTotal":174,"cAuto":101,"cActiveSel":73,"cHistory":2,"cBM":1}},"16665":{"cSel":{"cTotal":2,"cEZ":1,"cActiveSel":2,"cBM":1},"q":4,"gSel":2},"16666":{"gSel":3,"q":3}}}

// with 2 quarters, no CliqzLoyalty badge
//{"0":{"resultsGoogle":15,"resultsCliqzTotal":76,"resultsCliqzEnter":0,"resultsCliqzClick":18,"resultsCliqzAuto":5,"resultsCliqzActive":71,"resultsHistory":15,"resultsBM":5,"resultsEZ":15,"meta":{"y":2015,"ty":2,"ms":[6,7,8]}},"1":{"16662":{"cSel":{"cTotal":1,"cAuto":1,"cActiveSel":0},"q":2,"gSel":1},"16661":{"cSel":{"cTotal":40,"cActiveSel":37,"cHistory":9,"cEZ":5,"cBM":5,"cAuto":3},"q":49,"gSel":9},"16660":{"cSel":{"cTotal":5,"cHistory":2,"cActiveSel":5},"q":7,"gSel":2},"16659":{"cSel":{"cTotal":1,"cEZ":1,"cActiveSel":1},"q":1},"16658":{"cSel":{"cTotal":28,"cClick":17,"cActiveSel":27,"cHistory":4,"cEZ":9,"cAuto":1},"q":29,"gSel":1},"16654":{"cSel":{"cTotal":1,"cClick":1,"cActiveSel":1},"q":2,"gSel":1},"16664":{"gSel":5,"q":179,"cSel":{"cTotal":174,"cAuto":101,"cActiveSel":73,"cHistory":2,"cBM":1}},"16665":{"cSel":{"cTotal":2,"cEZ":1,"cActiveSel":2,"cBM":1},"q":4,"gSel":2},"16666":{"gSel":3,"q":3},"16672":{"cSel":{"cTotal":17,"cBM":17,"cActiveSel":17},"q":36,"gSel":123}}}





