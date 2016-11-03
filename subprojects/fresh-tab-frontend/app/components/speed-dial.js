import Ember from 'ember';

export default Ember.Component.extend({

  cliqz: Ember.inject.service(),
  notifications: Ember.inject.service(),

  classNameBindings: ['model.hasNewNotifications:new-notifications'],

  click(ev) {
    this.get('cliqz').sendTelemetry({
      type: 'home',
      action: 'click',
      target_type: this.get('type'),
      target_index: this.get('index')
    });
  },

  actions: {
    enableNotifications() {
      const model = this.get('model');
      this.get('notifications').enableNotifications(model);
    },

    disableNotifications() {
      const model = this.get('model');
      this.get('notifications').disableNotifications(model);
    },

    remove() {
      this.sendAction("removeAction", this.get('model'));
    },

    resetAll() {
      this.sendAction("resetAllAction");
    },

    searchAlias() {
      this.get('cliqz').setUrlbar('');
      this.get('cliqz').setUrlbar(this.get('alias') + ' ');
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: this.get('type') + '_search',
        target_index: this.get('index')
      });
      return false;
    }
  }
});
