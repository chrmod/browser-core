import utils from '../core/utils';
import background from '../core/base/background';
import NotificationCenter from './notification-center';

export default background({

  init() {
    this.notificationCenter = new NotificationCenter();
    this.notificationCenter.start();
  },

  unload() {
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
    getNotificationsCount() {
      return this.notificationCenter.counts();
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {
      const domain = utils.getDetailsFromUrl(url);
      return this.notificationCenter.addDomain(domain);
    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {
      const domain = utils.getDetailsFromUrl(url);
      return this.notificationCenter.removeDomain(domain);
    },

    ignore(url) {
      const domain = utils.getDetailsFromUrl(url);
      return this.notificationCenter.ignoreDomain(domain);
    },
  },
});
