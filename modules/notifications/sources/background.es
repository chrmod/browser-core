import { utils } from 'core/cliqz';
import background from "core/base/background";

// const ALL_NOTIFICATIONS = [
//   {
//     message: 'You have 1 new message',
//     timestamp: 1468926896080,
//     source: 'gmail'
//   },
//   {
//     message: 'You have 10 new emails',
//     timestamp: 1468927093368,
//     source: 'gmx.net'
//   },
//   {
//     message: 'You have 2 new emails',
//     timestamp: 1468927226144,
//     source: 'webmail.de'
//   }
// ];

const ALL_NOTIFICATIONS = {
  'gmail.com': 1,
  'gmx.net': 2,
  'webmail.de': 3
}

export default background({
  enabled() { return true; },

  init(settings) {
  },

  unload() {

  },

  beforeBrowserShutdown() {

  },

  actions: {
    /**
    * get configuration with notification sources
    **/
    getConfig() {
      utils.log("Hello,", "ALL_NOTIFICATIONS")
      return {
        sources: ['gmail', 'gmx.net', 'webmail.de']
      }
    },

    /**
    * query store for notifications for specified sources
    */
    getNotificationsCount() {
      // return ALL_NOTIFICATIONS.filter(function(notification) {
      //   return sources.indexOf(notification.source) !== -1;
      // })
      return ALL_NOTIFICATIONS;
    },

    /**
    * Add a new source to configuration
    **/
    watch(url) {

    },

    /**
    * Remove a url from notification sources
    **/
    unwatch(url) {

    }
  }
})
