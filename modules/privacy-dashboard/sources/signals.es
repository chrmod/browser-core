"use strict";

/*
  Functions to handle collecting to selecting / preparing signals for the dashboard
  thuy@cliqz.com
  26Feb2016
 */

import { utils, events } from "core/cliqz";
import CliqzHumanWeb from "human-web/human-web";  // todo: can this in try catch?

var streamMode = false;

function lastElementArray (arr) {
  var tmp = arr || [];
  return tmp.length > 0 ? tmp[tmp.length - 1] : null;
}

function reformatSignalsFlat (sig, ignoreKeys=[], send="allowed") {
  var info = [];
  Object.keys(sig || []).forEach(function (name) {
      if (ignoreKeys.indexOf(name) === -1) {
        info.push({
          "name": name,
          "val": (sig[name] && typeof(sig[name]) === "object" ? JSON.stringify(sig[name]) : sig[name]).toString(),
          "send": send,
          "des": ""  // todo: fill in descriptions
        });
      }
    });
  return info;
}

var QUERY_LOG_PARAM = {
  "q": "query",
  "a": "queryAutocompleted",
  "i": "resultIndex",
  "u": "resultUrl",
  "o": "resultOrder",
  "e": "extra",
  "s": "searchSession",
  "n": "sessionSequence",
  "qc": "queryCount"
};

var SignalListener = {
  telemetryOrigin: utils.telemetry,
  httpGetOrigin: utils.httpGet, // used for fetching result and query log telemetry
  hwOrigin: CliqzHumanWeb.telemetry,  // todo: handle the case hw is inited AFTER this module

  SigCache: {
    "hw": {"sig": null, "timestamp": 0},
    "tel": {"sig": [], "timestamp": 0},
    "ql": {"sig": null, "timestamp": 0}
  },

  telSigAggregatePeriod: 10, // miliseconds, telemetry signal will be aggregate within this window (non-everlap)

  fireNewDataEvent: function (sigType) {
    if (streamMode === true) {
      events.pub("PRIVACY_DASHBOARD_NEWDATA", sigType);
    }
  },

  monkeyPatchHmw: function () {
    SignalListener.hwOrigin.apply(this, arguments);
    SignalListener.SigCache.hw = {"sig": lastElementArray(CliqzHumanWeb.trk), "timestamp": Date.now()};
    SignalListener.fireNewDataEvent("hw");
  },

  monkeyPatchTelemetry: function () {
    SignalListener.telemetryOrigin.apply(this, arguments);

    // aggregate data within the predefined aggregation window
    // To use ONLY the LAST SIGNAL, use this line below instead of the if block, OR set SignalListener.telSigAggregatePeriod = 0

    SignalListener.SigCache.tel = {"sig": [lastElementArray(utils.trk)], "timestamp": Date.now()};
    /*
    var timeNow = Date.now();
    if (timeNow - SignalListener.SigCache.tel.timestamp < SignalListener.telSigAggregatePeriod) {
      SignalListener.SigCache.tel.sig.push(lastElementArray(utils.trk));
    } else {
      SignalListener.SigCache.tel.sig = [lastElementArray(utils.trk)];
      SignalListener.SigCache.tel.timestamp = timeNow;
    }
    */

    SignalListener.fireNewDataEvent("tel");
  },

  monkeyPatchHttpGet: function () {
    var queryLog = {}, arg = arguments;
    SignalListener.httpGetOrigin.apply(this, arguments);

    var url = arguments[0];
    if(url.indexOf(utils.RESULTS_PROVIDER) == 0 || url.indexOf(utils.RESULTS_PROVIDER_LOG) == 0){
      var qs = utils.getDetailsFromUrl(url).query;
      var qsParams = utils.parseQueryString(qs);
      Object.keys(qsParams).forEach(function(key){
        if(qsParams[key]){
          queryLog[QUERY_LOG_PARAM[key] || key] = qsParams[key];
        }
      });

      SignalListener.SigCache.ql = {"sig": queryLog, "timestamp": Date.now()};
      SignalListener.fireNewDataEvent("ql");
    }
  },

  init: function () {
    utils.telemetry = SignalListener.monkeyPatchTelemetry;
    utils.httpGet = SignalListener.monkeyPatchHttpGet;
    CliqzHumanWeb.telemetry = SignalListener.monkeyPatchHmw;
  }
};

var HumanwebSignal = {
  /*
    More info about humanweb data:
      1. https://github.com/cliqz/event-log/blob/ucrawl/README.md
      2. publication on humanweb -> contact josep@cliqz.com
   */
  dataKey: "payload",
  dataSubKey: ["c", "r"],
  dataSubKeyDes: {
    "r": "Search result",
    "c": "Visited page"
  },

  reformatDataKey: function (data) {
    var info = [], subKeyInfo = [];

    HumanwebSignal.dataSubKey.forEach(function (subKey) {
      if (data.hasOwnProperty(subKey)) {
        subKeyInfo = reformatSignalsFlat(data[subKey]);

        // add generic description
        if (HumanwebSignal.dataSubKeyDes.hasOwnProperty(subKey)) {
          subKeyInfo.forEach( function (item) {
            item["des"] = HumanwebSignal.dataSubKeyDes[subKey];
          });
        }

        info = info.concat(subKeyInfo);
      }
    });

    return info;
  },

  reformatSignals: function (sig) {
    return (sig !== null && sig.hasOwnProperty(HumanwebSignal.dataKey)) ?
      reformatSignalsFlat(sig, [HumanwebSignal.dataKey])
        .concat(HumanwebSignal.reformatDataKey(sig[HumanwebSignal.dataKey])) :
      reformatSignalsFlat(sig);
  }
};

var Signals = {
  sigExpireTime: 1*60*1000, // miliseconds, if a signal is older than this, it's expired
  IPs: "",
  initialized: false,
  init: function () {
    var dns = Components.classes["@mozilla.org/network/dns-service;1"]
                    .getService(Components.interfaces.nsIDNSService),
    myName = dns.myHostName,
    record = dns.resolve(myName, 0);

    while (record.hasMore()) Signals.IPs = Signals.IPs + " " + record.getNextAddrAsString();
  },
  // TODO: implement stop listening when no dashboards are active
  startListening: function() {
    if(!Signals.initialized){
      SignalListener.init();
      Signals.initialized = true;
    }
  },
  setStreaming: function (boolVal) {
    streamMode = boolVal;
  },

  reformatSignals: function (sig, sigType) {
    /*
      @param {str} sigType: hw (human web), query (query log), tel (telemetry)
      @param (json obj) or ([json obj] -> if sigType = tel) sig: content, e.g.  {"query": "find cliqz", "result": "1"}
      or [{"action": "key-stroke", "session": "dffdfhdh"}]
     */
    var info;

    // add data points that we have but we don't send
    if (sigType === "tel") {
      info = [];
      sig.forEach(function (s) {
        info = info.concat(reformatSignalsFlat(s));
      });
      info = info.concat(reformatSignalsFlat({
        "GPS": "your location",
        "query": "what you search"
      }, [], "blocked"));
    }
    if (sigType === "ql") {
      info = reformatSignalsFlat(sig)
        .concat(reformatSignalsFlat({
          "search history": "private URLs"
        }, [], "blocked"));

      if(sig.loc == undefined){
          info = info.concat(reformatSignalsFlat({
            "GPS": "your location"
          }, [], "blocked"));
      }
      if(utils.getPref("hpn-query") == true){
          info = info.concat(reformatSignalsFlat({
            "your identity": "your IP/IDs: " + Signals.IPs,
          }, [], "blocked"));
      }
    }
    if (sigType === "hw") {
      info = HumanwebSignal.reformatSignals(sig)
        .concat(reformatSignalsFlat({
          "your identity": "your IP/IDs: " + Signals.IPs,
        }, [], "blocked"));
      utils.log(info, "reformatSignals, info = ");
    }

    return info;
  },

  getSignalsToDashboard: function () {
    var info = {};
    Object.keys(SignalListener.SigCache).forEach(function (sigType) {
      if(sigType == "hw" && utils.getPref('dnt') == true){
        info[sigType] = [{
          "name": "",
          "val": "Human Web ist nicht aktiviert",
          "send": "inactive",
          "unique": true,
          "des": ""  // todo: fill in descriptions
        }];
      } else {
        info[sigType] = Date.now() - SignalListener.SigCache[sigType].timestamp < Signals.sigExpireTime ?
          Signals.reformatSignals(SignalListener.SigCache[sigType].sig, sigType) : [];
      }
    });
    return info;
  }
};

export default Signals;
