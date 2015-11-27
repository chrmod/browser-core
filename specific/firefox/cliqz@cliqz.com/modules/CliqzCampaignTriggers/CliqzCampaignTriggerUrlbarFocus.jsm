'use strict';

var EXPORTED_SYMBOLS = ['CliqzCampaignTriggerUrlbarFocus'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCampaignTrigger',
  'chrome://cliqzmodules/content/CliqzCampaignTriggers/CliqzCampaignTrigger.jsm');

function CliqzCampaignTriggerUrlbarFocus() {
  CliqzCampaignTrigger.call(this, CliqzCampaignTriggerUrlbarFocus.id);
  CliqzEvents.sub('core:urlbar_focus', this.notifyListeners());
}

CliqzCampaignTriggerUrlbarFocus.id = 'TRIGGER_URLBAR_FOCUS';

CliqzCampaignTriggerUrlbarFocus.prototype = Object.create(CliqzCampaignTrigger.prototype);
CliqzCampaignTriggerUrlbarFocus.prototype.constructor = CliqzCampaignTriggerUrlbarFocus;
