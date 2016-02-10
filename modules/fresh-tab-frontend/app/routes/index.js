import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return {
      speedDials: this.get('cliqz').getSpeedDials(),
      news: []
    };
  }
});
