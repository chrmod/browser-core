import Ember from 'ember';
export default Ember.Component.extend({
  actions: {
    showPanel() {
      this.toggleProperty('showPanel');
    }
  }
});
