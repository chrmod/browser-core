'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}

function _getUrlbar() {
	return CliqzUtils.getWindow().CLIQZ.Core.urlbar;
}

var TriggerUrlbarFocus = {
	init: function (callback) {
		TriggerUrlbarFocus.id = 'TRIGGER_URLBAR_FOCUS';
		TriggerUrlbarFocus.callback = callback;

		_getUrlbar().addEventListener('focus',
			TriggerUrlbarFocus._onUrlbarFocus);
	},
	destroy: function () {
		_getUrlbar().removeEventListener('focus',
			TriggerUrlbarFocus._onUrlbarFocus);
	},
	_onUrlbarFocus: function () {
		TriggerUrlbarFocus.callback(TriggerUrlbarFocus.id);
	}
};

var CliqzMsgCenter = {
	_campaigns: {},

	init: function () {
		TriggerUrlbarFocus.init(CliqzMsgCenter._onTrigger);
	},
	destroy: function () {
		TriggerUrlbarFocus.destroy();
	},
	_addCampaign: function (id) {
		CliqzMsgCenter._campaigns[id] = {
			id: id,
			triggerId: TriggerUrlbarFocus.id,
			state: 'idle'
		};
	},
	_onTrigger: function (id) {
		_log(id + ' triggered');

		// find all campaigns for this trigger
		var campaigns = CliqzMsgCenter._campaigns;
		for (var cId in campaigns) {
			if (campaigns.hasOwnProperty(cId)) {
				if (campaigns[cId].triggerId == id) {
					_log(cId + ' triggered');
				}
			}
		}
	}
};
