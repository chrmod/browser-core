import Ember from 'ember';

export default Ember.Service.extend({
  store: Ember.inject.service(),
  cliqz: Ember.inject.service(),

  start() {
    let resolver;
    const loadingPromise = new Ember.RSVP.Promise(resolve => resolver = resolve);
    this.set("loadingPromiseResolver", resolver)
    this.set("loadingPromise", loadingPromise);
    Ember.run.later(this, 'getNotifications', 0);
  },

  stop() {
    Ember.run.cancel(this.get('nextCheck'));
  },

  waitForFirstFetch() {
    return this.get("loadingPromise");
  },

  getNotifications() {
    // clear next scheduled check
    Ember.run.cancel(this.get('nextCheck'));

    const cliqz = this.get('cliqz');
    const store = this.get('store');
    const speedDials = new Map(
      store.peekAll('speed-dial').map(dial => [dial.get('url'), dial])
    );

    return cliqz.getNotifications([...speedDials.keys()]).then(notifications => {
      Object.keys(notifications).forEach(url => {
        const speedDial = speedDials.get(url);
        const speedDialNotification = notifications[url];
        const hadNotifications = speedDial.get('hasNewNotifications');
        const hasNotifications = Boolean(speedDialNotification.unread);

        speedDial.setProperties({
          notificationCount: speedDialNotification.count,
          hasNewNotifications: speedDialNotification.unread,
          notificationStatus: speedDialNotification.status,
          notificationError: speedDialNotification.error,
        });

        if(!hadNotifications && hasNotifications) {
          this.get('cliqz').sendTelemetry({
            type: 'home',
            action: 'notify',
            target_type: speedDial.get('type'),
            //target_index: TODO how to get the index
          });
        }
      });

      this.set('nextCheck', Ember.run.later(this, 'getNotifications', 5000));
    }).then(() => {
      this.get("loadingPromiseResolver")();
    });
  },

  enableNotifications(speedDial) {
    const cliqz = this.get('cliqz');
    cliqz.watch(speedDial.get('url')).then(() => {
      this.getNotifications();
    });
  },

  disableNotifications(speedDial) {

    const cliqz = this.get('cliqz');
    cliqz.unwatch(speedDial.get('url'));
    speedDial.setProperties({
      notificationStatus: 'available'
    });
  },
});
