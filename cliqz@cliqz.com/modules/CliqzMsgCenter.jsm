'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CAMPAIGN_ENDPOINT = 'http://10.10.21.80/message/?session=',
	ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'];

function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}

function _getDropdown() {
	return CliqzUtils.getWindow().CLIQZ.Core.popup;
}

function _getUrlbar() {
	return CliqzUtils.getWindow().CLIQZ.Core.urlbar;
}

/* ************************************************************************* */
var Campaign = function (id) {
	this.id = id;
	this.state = 'idle';
	this.isEnabled = true;
	this.counts = {trigger: 0, show: 0, confirm: 0, ignore: 0, discard: 0};
};

Campaign.prototype.setState = function (newState) {
	_log(this.id + ': ' + this.state + ' -> ' + newState);
	this.state = newState;
};
/* ************************************************************************* */

// TODO: need to add/remove listener for each window
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
		callback(campaign, 'confirm');
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
	              	action: 'confirm',
	              	state: 'default'
	            }, {
	            	text: 'discard',
	              	action: 'discard',
	              	state: 'gray'
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
		var endpoint = CAMPAIGN_ENDPOINT +
			encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session'));

    	_log(endpoint);
		CliqzUtils.httpGet(endpoint, function success(req) {
    		try {
    			_log(req.response);
        		var campaigns = JSON.parse(req.response).campaigns;
        		for (var i = 0; i < campaigns.length; i++) {
        			_log(campaigns[i]);
					// TODO: add or remove campaigns
        		}
    		} catch (e) {
    			_log('error parsing campaigns: ' + e);
    		}
    	}, function onerror(e) {
    		_log('error retrieving campaigns: ' + e);
    	});
	},
	_addCampaign: function (id, content) {
		CliqzMsgCenter._campaigns[id] = new Campaign(id);
		CliqzMsgCenter._campaigns[id].limits = {
			trigger: 2,
			show: 2,
			confirm: 2,
			ignore: -1,
			discard: 1
		};
		CliqzMsgCenter._campaigns[id].triggerId = TriggerUrlbarFocus.id;
		CliqzMsgCenter._campaigns[id].messageHandler = MessageHandlerDropdownFooter;
		CliqzMsgCenter._campaigns[id].content = content;
		_log('added campaign ' + id);
	},
	_removeCampaign: function (id) {
		// TODO: cancel all active messages
		delete CliqzMsgCenter._campaigns[id];
		_log('removed campaign ' + id);
	},
	_onTrigger: function (id) {
		_log(id + ' trigger');

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
		// TODO: move this to constant
		if (ACTIONS.indexOf(action) != -1) {
			if (campaign.limits[action] == -1 ||
				++campaign.counts[action] == campaign.limits[action]) {
				campaign.setState('ended');
			} else {
				campaign.setState('idle');
			}
			campaign.messageHandler.hide();
		}

		if (campaign.counts.show == campaign.limits.show) {
			campaign.setState('ended');
		}
	},
	_triggerCampaign: function (campaign) {
		_log('campaign ' + campaign.id + ' trigger');
		if (campaign.isEnabled && campaign.state == 'idle') {
			if (++campaign.counts.trigger == campaign.limits.trigger) {
				if (campaign.limits.show == -1 ||
					++campaign.counts.show <= campaign.limits.show) {
					campaign.setState('showing');
					campaign.counts.trigger = 0;

					campaign.messageHandler.show(
						CliqzMsgCenter._onMessageAction, campaign);
				} else {
					campaign.setState('ended');
				}
			}
		}
	}
};










