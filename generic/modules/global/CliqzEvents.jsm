'use strict';
/*
 * This method implements the publish subscribe design pattern
 *
 */

var EXPORTED_SYMBOLS = ['CliqzEvents'];
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzEvents = CliqzEvents || {
  //use a javascript object to push the message ids and the callbacks
  cache: {},
//    /*
//     * Publish events of interest with a specific id
//     */
  pub: function (id) {
    var args = [].slice.call(arguments, 1);
    (CliqzEvents.cache[id] || []).forEach(function (ev) {
      ev.apply(null, args);
    });
  },

  /* Subscribe to events of interest
   * with a specific id and a callback
   * to be executed when the event is observed
   */
  sub: function (id, fn) {
    CliqzUtils.log('Subscribe to event: ' + id, 'Events.sub');
    if (!CliqzEvents.cache[id]) {
      CliqzEvents.cache[id] = [fn];
    } else {
      CliqzEvents.cache[id].push(fn);
    }

  },
  un_sub: function (id, fn) {
    var index;
    if (!CliqzEvents.cache[id]) {
      return;
    }
    if (!fn) {
      CliqzEvents.cache[id] = [];
    } else {
      index = CliqzEvents.cache[id].indexOf(fn);
      if (index > -1) {
        CliqzEvents.cache[id].splice(index);
      }
    }
  }
};