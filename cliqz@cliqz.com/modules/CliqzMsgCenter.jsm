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

var MessageAlert = {
	id: 'MESSAGE_ALERT',
	show: function (content) {
		CliqzUtils.getWindow().alert(content);
	}
}

var CliqzMsgCenter = {
	_campaigns: {},

	init: function () {
		TriggerUrlbarFocus.init(CliqzMsgCenter._onTrigger);
	},
	destroy: function () {
		TriggerUrlbarFocus.destroy();
	},
	retrieveCampaigns: function () {
		// TODO: send request to endpoint
		// TODO: add or remove campaigns
	},
	_addCampaign: function (id, content) {
		CliqzMsgCenter._campaigns[id] = {
			id: id,
			triggerId: TriggerUrlbarFocus.id,
			content: content,
			state: {
				current: 'idle'
			},
			message: MessageAlert
		};
		_log('added campaign ' + id);
	},
	_removeCampaign: function (id) {
		// TODO: cancel all active messages
		delete CliqzMsgCenter._campaigns[id];
		_log('removed campaign ' + id);
	},
	_onTrigger: function (id) {
		_log(id + ' triggered');

		// find all campaigns for this trigger
		var campaigns = CliqzMsgCenter._campaigns;
		for (var cId in campaigns) {
			if (campaigns.hasOwnProperty(cId)) {
				if (campaigns[cId].triggerId == id) {
					CliqzMsgCenter._triggerCampaign(campaigns[cId]);
				}
			}
		}
	},
	_triggerCampaign: function (campaign) {
		_log('campaign ' + campaign.id + ' triggered');
		campaign.message.show(campaign.content);
	}
};
