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

function reformatSignalsFlat (sig, ignoreKeys=[], send=true) {
  var info = [];
  Object.keys(sig || []).forEach(function (name) {
      if (ignoreKeys.indexOf(name) === -1) {
        info.push({
          "name": name,
          "val": typeof(sig[name]) === "object" ? JSON.stringify(sig[name]) : sig[name] || " ",
          "send": send,
          "des": ""  // todo: fill in descriptions
        });
      }
    });
  return info;
}

var QUERY_LOG_PARAM = ["query", "queryAutocompleted", "resultIndex", "resultUrl", "resultOrder", "extra"];

var SignalListener = {
  telemetryOrigin: utils.telemetry,
  resultTelemetryOrigin: utils.resultTelemetry,
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

    // SignalListener.SigCache.tel = {"sig": [lastElementArray(utils.trk)], "timestamp": Date.now()};
    var timeNow = Date.now();
    if (timeNow - SignalListener.SigCache.tel.timestamp < SignalListener.telSigAggregatePeriod) {
      SignalListener.SigCache.tel.sig.push(lastElementArray(utils.trk));
    } else {
      SignalListener.SigCache.tel.sig = [lastElementArray(utils.trk)];
      SignalListener.SigCache.tel.timestamp = timeNow;
    }

    SignalListener.fireNewDataEvent("tel");
  },

  monkeyPatchResultTelemetry: function () {
    var queryLog = {}, arg = arguments;
    SignalListener.resultTelemetryOrigin.apply(this, arguments);

    QUERY_LOG_PARAM.forEach(function (param, idx) {
      if (arg[idx] !== null) {
        queryLog[param] = arg[idx];
      }
    });
    SignalListener.SigCache.ql = {"sig": queryLog, "timestamp": Date.now()};
    SignalListener.fireNewDataEvent("ql");
  },

  init: function () {
    utils.telemetry = SignalListener.monkeyPatchTelemetry;
    utils.resultTelemetry = SignalListener.monkeyPatchResultTelemetry;
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
  sigExpireTime: 5*60*1000, // miliseconds, if a signal is older than this, it's expired

  init: function () {
    SignalListener.init();
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
        "IP": "your IP",
        "GPS": "your location",
        "query": "what you search"
      }, [], false));
    }
    if (sigType === "ql") {
      info = reformatSignalsFlat(sig)
        .concat(reformatSignalsFlat({
          "your identity": "your IP/IDs",
          "GPS": "your location",
          "when you search": "time stamp"
        }, [], false));
    }
    if (sigType === "hw") {
      info = HumanwebSignal.reformatSignals(sig)
        .concat(reformatSignalsFlat({
          "your personal information": "ID/IP/Password/name/etc."
        }, [], false));
      utils.log(info, "THUY reformatSignals, info = ");
    }

    return info;
  },

  getSignalsToDashboard: function () {
    var info = {};
    Object.keys(SignalListener.SigCache).forEach(function (sigType) {
      info[sigType] = Date.now() - SignalListener.SigCache[sigType].timestamp < Signals.sigExpireTime ?
        Signals.reformatSignals(SignalListener.SigCache[sigType].sig, sigType) : [];
    });
    return info;
  }
};

export default Signals;
