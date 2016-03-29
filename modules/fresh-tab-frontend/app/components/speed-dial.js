import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  click() {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: 'topsites',
      target_source: this.get('source'),
      target_index: this.get('index')
    });
  },
  actions: {
    remove() {
      this.sendAction("removeAction", this.get('model'), this.get('source'));
    }
  }
});
