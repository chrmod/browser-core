import Ember from "ember";

export default Ember.Component.extend({
  topNews: Ember.computed.filterBy("model", "personalized", false),
  yourNews: Ember.computed.filterBy("model", "personalized", true),
});
