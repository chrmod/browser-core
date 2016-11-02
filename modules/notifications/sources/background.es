import utils from '../core/utils';
import events from '../core/events';
import background from '../core/base/background';
import NotificationCenter from './notification-center';

export default background({

  init() {
    this.notificationCenter = new NotificationCenter();

    this.onNewNotification = events.proxyEvent(
      'notifications:new-notification',
      this.notificationCenter,
      'new-notification'
    );

    this.onNotificationsCleared = events.proxyEvent(
      'notifications:notifications-cleared',
      this.notificationCenter,
      'notifications-cleared'
    );

    this.notificationCenter.start();
  },

  unload() {
    this.onNewNotification.unsubscribe();
    this.onNotificationsCleared.unsubscribe();

    this.notificationCentera.stop();
    delete this.notificationCentera;
  },

  beforeBrowserShutdown() {

  },

  actions: {
    /**
    * get configuration with notification sources
    **/
    getConfig() {
      return {
        sources: this.notificationCenter.domainList(),
      };
    },

    /**
    * query store for notifications for specified sources
    */
    getNotifications() {
      return this.notificationCenter.notifications();
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      return this.notificationCenter.addDomain(domainDetails.host);
    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {
      return this.notificationCenter.removeDomain(domainDetails.host);
    },

    ignore(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      return this.notificationCenter.ignoreDomain(domainDetails.host);
    },
  },

  events: {
    /*
     * Clears unread status for domain at currently open tab
     */
    'core.location_change': function onLocationChange(url) {
      const domainDetails = utils.getDetailsFromUrl(url);
      this.notificationCenter.clearDomainUnread(domainDetails.host);
    },
  },
});
