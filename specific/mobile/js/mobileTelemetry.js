// overloading of CliqzUtils.telemetry function
CliqzUtils.sendsTelemetry = true;
CliqzUtils.telemetry = function(msg) {
  if(!CliqzUtils || !CliqzUtils.sendsTelemetry) return; //might be called after the module gets unloaded
  var current_window = CliqzUtils.getWindow();
  if(msg.type != 'environment' &&
     current_window && CliqzUtils.isPrivate(current_window)) return; // no telemetry in private windows
  if(!CliqzUtils.getPref('telemetry', true))return;
  msg.session = CLIQZEnvironment.getPref('session');
  msg.ts = Date.now();
  CliqzUtils.telemetrySeq = (CliqzUtils.telemetrySeq + 1) % 2147483647;
  msg.seq = CliqzUtils.telemetrySeq
  osBridge.pushTelemetry(msg);
}