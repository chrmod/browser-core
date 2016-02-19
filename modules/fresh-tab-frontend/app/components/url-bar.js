import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),
  keyDown(ev) {
    this.get('cliqz').getUrlbar(ev.key);
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'search_keystroke'
    });
    Ember.run.later( () => {
      this.$('input').val("")
    })
  },
  actions: {
    focus() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_focus'
      });
    },
    blur() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_blur'
      });
    },
  }
});
