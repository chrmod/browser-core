
const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzEntityZones'];

var entityZones = [
  {domain: /^www\.google(\.de|\.com)?$/, entity: "google", template: "entity-search"},
];

var CliqzEntityZones = {
  /* Returns entity zone or false for a query */
  getEntity: function(query) {
    for (var i = 0; i < entityZones.length; i++) {
      if(entityZones[i].domain.test(query)) {
        return entityZones[i];
      }
    }
    return false;
  }
}
