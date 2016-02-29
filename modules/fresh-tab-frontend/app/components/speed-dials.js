import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),
  actions: {
    remove(speedDial) {
      this.get("model").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial);
    }
  }
});
