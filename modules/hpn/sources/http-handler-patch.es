import messageContext from "hpn/message-context";
import JsonFormatter, { createHttpUrl, getRouteHash } from "hpn/utils";
import CliqzSecureMessage from 'hpn/main';


export function overRideCliqzResults(){
  // do not patch anything if the AB test is off
  // TODO: implement a smarter way to handle this AB test
  if(CliqzUtils.getPref("proxyNetwork", true) == false) return;

  if(!CLIQZEnvironment._httpHandler) CLIQZEnvironment._httpHandler = CLIQZEnvironment.httpHandler;
  CLIQZEnvironment.httpHandler = function(method, url, callback, onerror, timeout, data, sync){
    if(url.indexOf(CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER) > -1 && CliqzUtils.getPref('hpn-query', false)) {
      var _q = url.replace((CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER),"")
      var mc = new messageContext({"action": "extension-query", "type": "cliqz", "ver": "1.5", "payload":_q });
      var proxyIP = CliqzSecureMessage.queryProxyIP;
      mc.aesEncrypt()
      .then(function(enxryptedQuery){
        return mc.signKey();
      })
      .then(function(){
        var data = {"mP":mc.getMP()}
        CliqzSecureMessage.stats(proxyIP, "queries-sent", 1);
        return CliqzSecureMessage.httpHandler(proxyIP)
        .post(JSON.stringify(data), "instant")
      })
      .then(function(response){
        return mc.aesDecrypt(JSON.parse(response)["data"]);
      })
      .then(function(res){
        CliqzSecureMessage.stats(proxyIP, "queries-recieved", 1);
        callback && callback({"response":res});
      })
      .catch(function(err){
        CliqzUtils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "queries-error", 1);
      })
      return null;
    } else if(false && url.indexOf(CliqzUtils.RESULTS_PROVIDER_LOG) > -1 && CliqzUtils.getPref('hpn-telemetry', false)) {
      var _q = url.replace((CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER),"")
      var mc = new messageContext({"action": "extension-result-telemetry", "type": "cliqz", "ver": "1.5", "payload":_q });
      var proxyIP = CliqzSecureMessage.queryProxyIP;
      mc.aesEncrypt()
      .then(function(enxryptedQuery){
        return mc.signKey();
      })
      .then(function(){
        var data = {"mP":mc.getMP()}
        CliqzSecureMessage.stats(proxyIP, "queries-sent", 1);
        return CliqzSecureMessage.httpHandler(proxyIP)
        .post(JSON.stringify(data), "instant")
      })
      .catch(function(err){
        CliqzUtils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
        CliqzSecureMessage.stats(proxyIP, "result-telemetry-error", 1);
      })
      return null;
    }
    else if(url == CliqzUtils.SAFE_BROWSING && CliqzUtils.getPref('hpn-telemetry', false)){
      var batch = JSON.parse(data);
      if(batch.length > 0){
        batch.forEach(function(eachMsg){
          CliqzSecureMessage.telemetry(eachMsg);
        })
      }
      callback && callback({"response":'{"success":true}'});
    }
    else{
      return CLIQZEnvironment._httpHandler.apply(CLIQZEnvironment, arguments);
    }
  }
}
