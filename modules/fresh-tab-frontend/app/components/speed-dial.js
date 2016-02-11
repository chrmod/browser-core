import Ember from "ember";

export default Ember.Component.extend({
  cliqz: Ember.inject.service(),

  click() {
    this.get('cliqz').sendTelemetry({
      action: 'click',
      target_type: 'topsites',
      target_index: this.get('index')
    })
  },
  actions: {
    remove() {
      this.sendAction("removeAction", this.get('model'))
    }
  }
});
