import Ember from 'ember'

export default Ember.Component.extend({
  store: Ember.inject.service(),
  notifications: Ember.inject.service(),

  isActive: Ember.computed(function() {
    const model = this.get('model');
    return model.get('hasActiveNotifications')
  }),

  actions: {
    toggle() {
      const isActive = this.get('isActive');
      const store = this.get('store');
      let gmail = store.peekRecord('speed-dial', 'mail.google.com');
      console.log(gmail)
      if(isActive) {
        this.get('notifications').disableNotifications(gmail);
      } else {
        this.get('notifications').enableNotifications(gmail);
      }
      this.toggleProperty('isActive');
    }
  }
});
