'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CAMPAIGN_ENDPOINT = 'http://10.10.22.75/message/?session=',
	ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'],
	PREF_PREFIX = 'msgs.',
	UPDATE_INTERVAL = 1 * 60 * 1000;

function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}

function _getDropdown() {
	return CliqzUtils.getWindow().CLIQZ.Core.popup;
}

function _setPref(pref, val) {
	CliqzUtils.setPref(PREF_PREFIX + pref, val);
}

function _getPref(pref, defaultVal) {
	return CliqzUtils.getPref(PREF_PREFIX + pref, defaultVal);
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
var Campaign = function (id, data) {
	this.id = id;
	this.state = 'idle';
	this.isEnabled = true;
	this.counts = {trigger: 0, show: 0, confirm: 0,
		           postpone: 0, ignore: 0, discard: 0};

	this.update(data);
};
Campaign.prototype.update = function (data) {
	for (var key in data) {
		if (data.hasOwnProperty(key) && !key.startsWith('DEBUG')) {
			this[key] = data[key];
		}
	}
};
Campaign.prototype.setState = function (newState) {
	_log(this.id + ': ' + this.state + ' -> ' + newState);
	this.state = newState;
};
Campaign.prototype.save = function () {
	_setPref('campaigns.data.' + this.id, JSON.stringify(this));
	_log('saved campaign ' + this.id);
};
Campaign.prototype.load = function () {
	this.update(JSON.parse(_getPref('campaigns.data.' + this.id, '{}')));
	_log('loaded campaign ' + this.id);
};
/* ************************************************************************* */

/* ************************************************************************* */
var Trigger = function (id) {
	this.id = id;
	this._listeners = [];
};
Trigger.prototype.addListener = function(callback) {
	this._listeners.push(callback);
};
Trigger.prototype._notifyListeners = function () {
	for (var i = 0; i < this._listeners.length; i++) {
		this._listeners[i](this.id);
	}
};

// Singleton
var TriggerUrlbarFocus = new Trigger('TRIGGER_URLBAR_FOCUS');
TriggerUrlbarFocus.init = function (win) {
	win.CLIQZ.Core.urlbar.addEventListener('focus',
		this._onUrlbarFocus);
};
TriggerUrlbarFocus.unload = function (win) {
	win.CLIQZ.Core.urlbar.removeEventListener('focus',
		this._onUrlbarFocus);
};
TriggerUrlbarFocus._onUrlbarFocus = function () {
	TriggerUrlbarFocus._notifyListeners();
};
/* ************************************************************************* */

/* ************************************************************************* */
var MessageHandlerAlert = {
	id: 'MESSAGE_HANDLER_ALERT',
	init: function (win) { },
	undload: function (win) { },
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
// TODO: allow for queuing messages
// TODO: allow for sending messages without campaigns
var MessageHandlerDropdownFooter = {
	id: 'MESSAGE_HANDLER_DROPDOWN_FOOTER',
	_windows: [],
	_currentMessage: null,
	// TODO: show in all new windows
	init: function (win) {
		MessageHandlerDropdownFooter._windows.push(win);
		// message container does not exist yet, wait for popup
		win.CLIQZ.Core.popup.addEventListener('popupshowing',
			MessageHandlerDropdownFooter._addClickListener);
		if (MessageHandlerDropdownFooter._currentMessage) {
			win.CLIQZ.UI.messageCenterMessage =
				MessageHandlerDropdownFooter._currentMessage;
		}
	},
	undload: function (win) {
		var i = MessageHandlerDropdownFooter._windows.indexOf(win);
		if (i > -1) {
			MessageHandlerDropdownFooter._windows =
				MessageHandlerDropdownFooter._windows.splice(i, 1);
		}
		// usually removed on popup showing, but not if window closed before
		win.CLIQZ.Core.popup.removeEventListener('popupshowing',
			MessageHandlerDropdownFooter._addClickListener);
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
		MessageHandlerDropdownFooter._currentMessage = {
			'footer-message': {
          		simple_message: _getLocalizedMessage(campaign.text),
          		options: options
          	}
		};

		var windows = MessageHandlerDropdownFooter._windows;
		for (var i = 0; i < windows.length; i++) {
			windows[i].CLIQZ.UI.messageCenterMessage =
				MessageHandlerDropdownFooter._currentMessage;
		}
	},
	hide: function () {
		var windows = MessageHandlerDropdownFooter._windows;
		for (var i = 0; i < windows.length; i++) {
			windows[i].CLIQZ.UI.messageCenterMessage = null;
		}
		_getDropdown().hidePopup();
	},
	// adds click listener to message container when popup shows for first time
	_addClickListener: function (e) {
		var popup = e.target,
			win = popup.parentNode.parentNode.parentNode;

		win.getElementById('cliqz-message-container').
			addEventListener('click',
				MessageHandlerDropdownFooter._onClick);
		popup.removeEventListener('popupshowing',
			MessageHandlerDropdownFooter._addClickListener);
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
	_updateTimer: null,

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
		var i = CliqzMsgCenter._windows.indexOf(win);
		if (i > -1) {
			CliqzMsgCenter._windows =
				CliqzMsgCenter._windows.splice(i, 1);
		}

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

	_activateCampaignUpdates: function () {
		if (!CliqzMsgCenter._updateTimer) {
			// run once now
			CliqzMsgCenter._updateCampaigns();
			CliqzMsgCenter._updateTimer = CliqzUtils.setInterval(function () {
				if (CliqzMsgCenter) {
					CliqzMsgCenter._updateCampaigns();
				}
			}, UPDATE_INTERVAL);
		}
	},
	_deactivateCampaignUpdates: function () {
		CliqzUtils.clearTimeout(CliqzMsgCenter._updateTimer);
		CliqzMsgCenter._updateTimer = null;
	},
	_updateCampaigns: function () {
		_log('updating campaigns');
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
        		CliqzMsgCenter._saveCampaigns();
    		} catch (e) {
    			_log('error parsing campaigns: ' + e);
    		}
    	}, function error(e) {
    		_log('error updating campaigns: ' + e);
    	});
	},
	_addCampaign: function (id, data) {
		CliqzMsgCenter._campaigns[id] = new Campaign(id, data);
		_log('added campaign ' + id);
	},
	_removeCampaign: function (id) {
		// TODO: cancel all active messages
		delete CliqzMsgCenter._campaigns[id];
		_log('removed campaign ' + id);
	},
	_loadCampaigns: function () {
		_log('loading campaigns');
		var cIds = JSON.parse(_getPref('campaigns.ids', '[]'));
		for (var i = 0; i < cIds.length; i++) {
			CliqzMsgCenter._campaigns[cIds[i]] = new Campaign(cIds[i]);
			CliqzMsgCenter._campaigns[cIds[i]].load();
		}
	},
	_saveCampaigns: function () {
		_log('saving campaigns');
		_setPref('campaigns.ids',
			JSON.stringify(Object.keys(CliqzMsgCenter._campaigns)));
		for (var cId in CliqzMsgCenter._campaigns) {
			if (CliqzMsgCenter._campaigns.hasOwnProperty(cId)) {
				CliqzMsgCenter._campaigns[cId].save();
			}
		}
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
			campaign.save();
		}
	},
	_onMessageAction: function (campaign, action) {
		_log('campaign ' + campaign.id + ': ' + action);
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
		campaign.save();
	},
};

CliqzMsgCenter._loadCampaigns();
CliqzMsgCenter._activateCampaignUpdates();
CliqzMsgCenter.registerTrigger(TriggerUrlbarFocus.id,
	TriggerUrlbarFocus);
CliqzMsgCenter.registerMessageHandler(MessageHandlerDropdownFooter.id,
	MessageHandlerDropdownFooter);










