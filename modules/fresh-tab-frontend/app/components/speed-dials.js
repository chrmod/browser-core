import Ember from 'ember';

export default Ember.Component.extend({
  cliqz: Ember.inject.service('cliqz'),

  displayAddBtn: Ember.computed('model.custom', function() {
    return this.get('model.custom').length < 5;
  }),

  actions: {
    remove(speedDial) {
      this.get("model").removeObject(speedDial);
      this.get('cliqz').removeSpeedDial(speedDial);
      console.log(speedDial);
    },
    addSpeedDial() {
      var url = this.get('newSpeedDial') && this.get('newSpeedDial').trim(),
          speedDials = this.get('model').toArray(),
          isPresent = false;

      if (!url) { return; }
      console.log(url);

      speedDials.some(function(dial) {

        if (dial.url === url) {
          console.log(dial.url === url, "Equal");
          isPresent = true;
          return true;
        }
      });

      function isValidUrl(url) {
        var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
        return regexp.test(url);
      }

      if (isPresent) {
        this.set('showNotification', true);
        return;
      }

      if(!isValidUrl(url)) {
        this.set('notValidUrl', true);
        return;
      }

      /*var obj = {
        url: url,
        title: "haha",
        displayTitle: url,
        custom: true
      };*/
      var self = this;
      this.get('cliqz').addSpeedDial(url).then(function(obj) {
        self.get("model").pushObject(obj);
        self.set('newSpeedDial', '');
        self.set('showAddForm', false);
        self.set('hideAddBtn', false);
      })

    },

    showAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      setTimeout(function() {
        Ember.$('.addUrl').focus();

      }, 300);
    },

    hideAddForm() {
      this.toggleProperty('hideAddBtn');
      this.toggleProperty('showAddForm');
      this.set('newSpeedDial', '');
      this.set('showNotification', false);
      this.set('notValidUrl', false);
    }
  }
});
