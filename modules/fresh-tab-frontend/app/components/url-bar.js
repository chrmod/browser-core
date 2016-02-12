import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  actions: {
    focus() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_focus'
      })
    },
    blur() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_blur'
      });
    },
    keyDown() {
      this.get('cliqz').getUrlbar();
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_keystroke'
      });
    }
  }
});
