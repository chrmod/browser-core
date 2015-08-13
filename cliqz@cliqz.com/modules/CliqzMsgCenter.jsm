'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CAMPAIGN_ENDPOINT = 'http://10.10.22.75/message/?session=',
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

function _getLocalizedMessage(message) {
	var locale = CliqzUtils.currLocale;
	if (locale in message) {
		return message[locale];
	}
	// return value of first key
	if (message) {
		for (var key in message) {
			return message[key];
		}
	}
	return 'no_message';
}

/* ************************************************************************* */
var Campaign = function (id) {
	this.id = id;
	this.state = 'idle';
	this.isEnabled = true;
	this.counts = {trigger: 0, show: 0, confirm: 0,
		           postpone: 0, ignore: 0, discard: 0};
};

Campaign.prototype.setState = function (newState) {
	_log(this.id + ': ' + this.state + ' -> ' + newState);
	this.state = newState;
};
/* ************************************************************************* */

/* ************************************************************************* */
var TriggerUrlbarFocus = {
	id: 'TRIGGER_URLBAR_FOCUS',
	_listeners: [],
	init: function (win) {
		win.CLIQZ.Core.urlbar.addEventListener('focus',
			TriggerUrlbarFocus._onUrlbarFocus);
	},
	unload: function (win) {
		win.CLIQZ.Core.urlbar.removeEventListener('focus',
			TriggerUrlbarFocus._onUrlbarFocus);
	},
	addListener: function (callback) {
		TriggerUrlbarFocus._listeners.push(callback);
	},
	_onUrlbarFocus: function () {
		for (var i = 0; i < TriggerUrlbarFocus._listeners.length; i++) {
			TriggerUrlbarFocus._listeners[i](TriggerUrlbarFocus.id);
		}
	}
};
/* ************************************************************************* */

/* ************************************************************************* */
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
	_windows: [],
	init: function (win) {
		MessageHandlerDropdownFooter._windows.push(win);
		win.document.getElementById('cliqz-message-container').
			addEventListener('click',
				MessageHandlerDropdownFooter._onClick);
	},
	undload: function (win) {
		MessageHandlerDropdownFooter._windows.pop(win);
		win.document.getElementById('cliqz-message-container').
			removeEventListener('click',
				MessageHandlerDropdownFooter._onClick);
	},
	show: function (callback, campaign) {
		MessageHandlerDropdownFooter.callback = callback;
		MessageHandlerDropdownFooter.campaign = campaign;

		var options = [];
		for (var action in campaign.actions) {
			if (campaign.actions.hasOwnProperty(action)) {
				options.push({
					action: action,
					text: _getLocalizedMessage(campaign.actions[action].label),
					state: action.style
				});
			}
		}
		var message = {
			'footer-message': {
          		simple_message: _getLocalizedMessage(campaign.text),
          		options: options
          	}
		};

		var windows = MessageHandlerDropdownFooter._windows;
		for (var i = 0; i < windows.length; i++) {
			windows[i].CLIQZ.UI.messageCenterMessage = message;
		}
	},
	hide: function () {
		var windows = MessageHandlerDropdownFooter._windows;
		for (var i = 0; i < windows.length; i++) {
			windows[i].CLIQZ.UI.messageCenterMessage = null;
		}
		_getDropdown().hidePopup();
	},
	_onClick: function (e) {
		var action = e.target ? e.target.getAttribute('state') : null;
		MessageHandlerDropdownFooter.callback(
			MessageHandlerDropdownFooter.campaign, action);
	}
};
/* ************************************************************************* */

var CliqzMsgCenter = {
	_windows: [],
	_campaigns: {},
	_messageHandlers: {},
	_triggers: {},

	init: function (win) {
		CliqzMsgCenter._windows.push(win);

		var id;
		for (id in CliqzMsgCenter._triggers) {
			if (CliqzMsgCenter._triggers.hasOwnProperty(id)) {
				CliqzMsgCenter._triggers[id].init(win);
			}
		}
		for (id in CliqzMsgCenter._messageHandlers) {
			if (CliqzMsgCenter._messageHandlers.hasOwnProperty(id)) {
				CliqzMsgCenter._messageHandlers[id].init(win);
			}
		}
		// TODO: make sure currently showing messages are shown
		// TODO: retrieve periodically
	},
	unload: function (win) {
		CliqzMsgCenter._windows.pop(win);

		var id;
		for (id in CliqzMsgCenter._triggers) {
			if (CliqzMsgCenter._triggers.hasOwnProperty(id)) {
				CliqzMsgCenter._triggers[id].unload(win);
			}
		}
		for (id in CliqzMsgCenter._messageHandlers) {
			if (CliqzMsgCenter._messageHandlers.hasOwnProperty(id)) {
				CliqzMsgCenter._messageHandlers[id].unload(win);
			}
		}
	},
	registerTrigger: function (id, trigger) {
		CliqzMsgCenter._triggers[id] = trigger;
		for (var i = 0; i < CliqzMsgCenter._windows.length; i++) {
			trigger.init(CliqzMsgCenter._windows[i]);
		}
		trigger.addListener(CliqzMsgCenter._onTrigger);
	},
	registerMessageHandler: function (id, handler) {
		CliqzMsgCenter._messageHandlers[id] = handler;
		for (var i = 0; i < CliqzMsgCenter._windows.length; i++) {
			handler.init(CliqzMsgCenter._windows[i]);
		}
	},

	_retrieveCampaigns: function () {
		var endpoint = CAMPAIGN_ENDPOINT +
			encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session'));

		CliqzUtils.httpGet(endpoint, function success(req) {
    		try {
        		var clientCampaigns = CliqzMsgCenter._campaigns,
        		    serverCampaigns = JSON.parse(req.response).campaigns,
        		    cId;

        		for (cId in serverCampaigns) {
        			if (serverCampaigns.hasOwnProperty(cId) &&
        			    !(cId in clientCampaigns)) {
        				CliqzMsgCenter._addCampaign(cId, serverCampaigns[cId]);
        			}
        		}
        		for (cId in clientCampaigns) {
        			if (clientCampaigns.hasOwnProperty(cId) &&
        				!(cId in serverCampaigns)) {
        				CliqzMsgCenter._removeCampaign(cId);
        			}
        		}
    		} catch (e) {
    			_log('error parsing campaigns: ' + e);
    		}
    	}, function error(e) {
    		_log('error retrieving campaigns: ' + e);
    	});
	},
	_addCampaign: function (id, data) {
		var campaign = new Campaign(id);
		for (var key in data) {
			if (data.hasOwnProperty(key) && !key.startsWith('DEBUG')) {
				campaign[key] = data[key];
			}
		}
		CliqzMsgCenter._campaigns[id] = campaign;
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
	_triggerCampaign: function (campaign) {
		// TODO: retrieve from server
		_log('campaign ' + campaign.id + ' trigger');
		if (campaign.isEnabled && campaign.state == 'idle') {
			if (++campaign.counts.trigger == campaign.limits.trigger) {
				if (campaign.limits.show == -1 ||
					++campaign.counts.show <= campaign.limits.show) {
					campaign.setState('showing');
					campaign.counts.trigger = 0;

					var handler =
						CliqzMsgCenter._messageHandlers[campaign.handlerId];
					if (handler) {
						handler.show(
							CliqzMsgCenter._onMessageAction, campaign);
					}
				} else {
					campaign.setState('ended');
				}
			}
		}
	},
	_onMessageAction: function (campaign, action) {
		_log('campaign ' + campaign.id + ': ' + action);
		// TODO: move this to constant
		if (ACTIONS.indexOf(action) != -1) {
			if (campaign.limits[action] != -1 ||
				++campaign.counts[action] == campaign.limits[action]) {
				campaign.setState('ended');
			} else {
				campaign.setState('idle');
			}
			var handler =
				CliqzMsgCenter._messageHandlers[campaign.handlerId];
			if (handler) {
				handler.hide();
			}
		}

		if (campaign.counts.show == campaign.limits.show) {
			campaign.setState('ended');
		}
	},
};

CliqzMsgCenter.registerTrigger(TriggerUrlbarFocus.id,
	TriggerUrlbarFocus);
CliqzMsgCenter.registerMessageHandler(MessageHandlerDropdownFooter.id,
	MessageHandlerDropdownFooter);










