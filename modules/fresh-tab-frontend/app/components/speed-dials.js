import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  displayAddBtn: Ember.computed('model.custom', function() {
    return this.getWithDefault('model.custom.length', 0) < 5;
  }),

  topFiveHistory: Ember.computed('model.history', function() {
    return this.get('model.history').slice(0, 5)
  }),

  observeNewSpeedDial: Ember.observer("newSpeedDial", function () {
    var url = this.get("newSpeedDial"),
        re = /^((https?:\/\/.*)|((https?:\/)|(https?:)|(https?)|(htt)|(ht)|(h?))$)/;
      if(!re.test(url)) {
        this.set("newSpeedDial", "http://" + url);
      }
  }),

  actions: {
    remove(speedDial) {
      this.get("model").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        action_target: 'remove',
        target_type: 'topsites',
        target_source: arguments[1],
        target_index: this.get('index')
      });
    },
    addSpeedDial() {
      var url = this.get('newSpeedDial') && this.get('newSpeedDial').trim(),
          self = this;
      if (!url) { return; }

      this.get('cliqz').addSpeedDial(url).then((obj) => {
        if('error' in obj) {
          this.set('showNotification', true);
          return;
        } else {
          self.get("model").pushObject(obj);
          self.set('newSpeedDial', '');
          self.set('showAddForm', false);
          self.set('hideAddBtn', false);

          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'click',
            action_target: 'add',
            target_type: 'topsites'
          });
        }
      });
    },

    showAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      setTimeout(function() {
        Ember.$('.addUrl').focus();
      }, 300);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        action_target: 'show-add-form',
        target_type: 'topsites'
      });
    },

    hideAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      this.set('newSpeedDial', '');
      this.set('showNotification', false);
      this.set('notValidUrl', false);

      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        action_target: 'hide-add-form',
        target_type: 'topsites'
      });
    }
  }
});
