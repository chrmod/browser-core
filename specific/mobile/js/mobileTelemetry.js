// overloading of CliqzUtils.telemetry function
CliqzUtils.telemetry = function(msg) {
  msg.ts = Date.now();
  osBridge.pushTelemetry(msg);
}