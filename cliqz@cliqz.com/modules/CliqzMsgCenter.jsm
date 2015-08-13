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

function _getDropdown() {
	return CliqzUtils.getWindow().CLIQZ.Core.popup;
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

var MessageHandlerAlert = {
	id: 'MESSAGE_HANDLER_ALERT',
	show: function (callback, campaign) {
		// TODO: allow for multiple compaigns using the same handler
		//       (callback will be overwritten when calling show)
		//		or make sure this is a Singleton
		MessageHandlerAlert.callback = callback;
		MessageHandlerAlert.campaign = campaign;

		CliqzUtils.getWindow().alert(campaign.content);
		callback(campaign, 'confirmed');
	},
	hide: function () { }
};

// TODO: make Singleton
var MessageHandlerDropdownFooter = {
	id: 'MESSAGE_HANDLER_DROPDOWN_FOOTER',
	init: function (win) {
		win.document.getElementById('cliqz-message-container').
			addEventListener('click',
				MessageHandlerDropdownFooter._onClick);
	},
	show: function (callback, campaign) {
		MessageHandlerDropdownFooter.callback = callback;
		MessageHandlerDropdownFooter.campaign = campaign;

		CliqzUtils.getWindow().CLIQZ.UI.messageCenterMessage = {
			'footer-message': {
          		simple_message: campaign.content,
          		options: [{
	            	text: 'confirm',
	              	action: 'confirmed',
	              	state: 'default'
	            }, {
	            	text: 'discard',
	              	action: 'discarded',
	              	state: 'default'
	            }]
          	}
		};
	},
	hide: function () {
		CliqzUtils.getWindow().CLIQZ.UI.messageCenterMessage = null;
		_getDropdown().hidePopup();
	},
	_onClick: function (e) {
		var action = e.target ? e.target.getAttribute('state') : null;
		MessageHandlerDropdownFooter.callback(
			MessageHandlerDropdownFooter.campaign, action);
	}
};

var CliqzMsgCenter = {
	_campaigns: {},

	init: function () {
		TriggerUrlbarFocus.init(CliqzMsgCenter._onTrigger);
		// TODO: make sure currently showing messages are shown
		// TODO: make this compatible with multiple windows
		MessageHandlerDropdownFooter.init(CliqzUtils.getWindow());
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
			isEnabled: true,
			limits: {
				triggered: 2,
				shown: 2,
				confirmed: 2,
				ignored: -1,
				discarded: 1
			},
			counts: {
				triggered: 0,
				shown: 0,
				confirmed: 0,
				ignored: 0,
				discarded: 0
			},
			state: 'idle',
			setState: function (newState) {
				_log(id + ': ' + this.state + ' -> ' + newState);
				this.state = newState;
			},
			messageHandler: MessageHandlerDropdownFooter
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
	_onMessageAction: function (campaign, action) {
		_log('campaign ' + campaign.id + ': ' + action);
		if (['confirmed', 'ignored', 'discarded'].indexOf(action) != -1) {
			if (campaign.limits[action] == -1 ||
				++campaign.counts[action] == campaign.limits[action]) {
				campaign.setState('ended');
			} else {
				campaign.setState('idle');
			}
			campaign.messageHandler.hide();
		}
		// TODO: check for shown limit
	},
	_triggerCampaign: function (campaign) {
		_log('campaign ' + campaign.id + ' triggered');
		if (campaign.isEnabled && campaign.state == 'idle') {
			if (++campaign.counts.triggered == campaign.limits.triggered) {
				if (campaign.limits.shown == -1 ||
					++campaign.counts.shown <= campaign.limits.shown) {
					campaign.setState('showing');
					campaign.counts.triggered = 0;

					campaign.messageHandler.show(
						CliqzMsgCenter._onMessageAction, campaign);
				} else {
					campaign.setState('ended');
				}
			}
		}
	}
};










