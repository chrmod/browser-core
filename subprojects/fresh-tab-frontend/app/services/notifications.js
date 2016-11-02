import Ember from 'ember';

export default Ember.Service.extend({
  store: Ember.inject.service(),
  cliqz: Ember.inject.service(),

  start() {
    Ember.run.later(this, 'getNotifications', 0);
  },

  stop() {
    Ember.run.cancel(this.get('nextCheck'));
  },

  getNotifications() {
    // clear next scheduled check
    Ember.run.cancel(this.get('nextCheck'));

    const cliqz = this.get('cliqz');
    const store = this.get('store');

    cliqz.getNotifications().then(notifications => {
      Object.keys(notifications).forEach(domain => {
        const speedDial = store.peekAll('speed-dial').forEach(dial => {
          if (dial.get('displayTitle') === domain) {
            dial.setProperties({
              notificationCount: notifications[domain].count,
              hasNewNotifications: notifications[domain].unread,
            });
          }
        });
      })

      this.set('nextCheck', Ember.run.later(this, 'getNotifications', 5000));
    }).catch(e => console.error("err", e));
  }
});
