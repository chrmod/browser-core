import Ember from "ember";

export default Ember.Route.extend({
  cliqz: Ember.inject.service('cliqz'),

  model() {
    return {
      speedDials: this.get('cliqz').getSpeedDials(),
      news: this.get('cliqz').getNews(),
      //topNews: this.get('cliqz').getNews(),
      customDials: [1,2, 4]
    };
  }
});
