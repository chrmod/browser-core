import Ember from "ember";

export default Ember.Component.extend({
  actions: {
    remove(el) {
      this.get("model").removeObject(el);
    }
  }
});
