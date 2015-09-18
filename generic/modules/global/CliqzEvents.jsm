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
    cache : {},
    /* 
     * Publish events of interest with a specific id
     */
    pub: function(id) {
        //provide as many arguments as you want with this little trick
        var args = [].slice.call(arguments, 1),
            i;
        
        if(!CliqzEvents.cache[id]) {
            CliqzEvents.cache[id] = [];    
        }

        // go through all the provided functions for the particular id and invoke them passing an array of arguments
        for(i = 0; i < CliqzEvents.cache[id].length; i++) {
            CliqzEvents.cache[id][i].apply(null, args);
        }  
    },
    /* Subscribe to events of interest
     * with a specific id and a callback 
     * to be executed when the event is observed
     */
    sub: function(id, fn) {
        CliqzUtils.log('Subscribe to event: ' +id, 'Events.sub');
        if(!CliqzEvents.cache[id]) {
            CliqzEvents.cache[id] = [fn];
        } else {
            CliqzEvents.cache[id].push(fn);    
        }
        
    },
    un_sub: function(id, fn) {
      var index;
      if(!CliqzEvents.cache[id]) {
        return;
      }
      if(!fn) {
        CliqzEvents.cache[id] = [];  
      } else {
        index = CliqzEvents.cache[id].indexOf(fn);
                if (index > -1) {
                    CliqzEvents.cache[id] = CliqzEvents.cache[id].slice(0, index).concat(CliqzEvents.cache[id].slice(index + 1));
                }  
      }      
    }
};