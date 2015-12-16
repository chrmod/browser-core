function telemetry(msg) {
  CliqzUtils.telemetry($.extend({
    type:  'home',
  }, msg));
}
