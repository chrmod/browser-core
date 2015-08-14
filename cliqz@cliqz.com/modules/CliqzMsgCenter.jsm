'use strict';

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

// TODO: send locale and get rid of client-side localization
var CAMPAIGN_ENDPOINT = 'http://10.10.22.75/message/?session=', // &lang=de
	ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'],
	PREF_PREFIX = 'msgs.',
	UPDATE_INTERVAL = 1 * 60 * 1000;

// TODO: parse responds, don't pull otherwise
// http://10.10.22.75/message/show?session=O2SJ4ccGCdSUiEBU7W749512%7C16468%7C00&campaign=C001
// http://10.10.22.75/message/click?session=O2SJ4ccGCdSUiEBU7W749512%7C16468%7C00&campaign=C001
// http://10.10.22.75/message/accept?session=O2SJ4ccGCdSUiEBU7W749512%7C16468%7C00&campaign=C001

// http://10.10.22.75/message/accept?session=O2SJ4ccGCdSUiEBU7W749512%7C16468%7C00&campaign=C001&lang=en
// http://10.10.22.75/message/accept?session=O2SJ4ccGCdSUiEBU7W749512%7C16468%7C00&campaign=C001&lang=de

/* ************************************************************************* */
function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}

function _setPref(pref, val) {
	CliqzUtils.setPref(PREF_PREFIX + pref, val);
}

function _getPref(pref, defaultVal) {
	return CliqzUtils.getPref(PREF_PREFIX + pref, defaultVal);
}

function _clearPref(pref) {
	CliqzUtils.cliqzPrefs.clearUserPref(PREF_PREFIX + pref);
}
/* ************************************************************************* */

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
	try {
		this.update(JSON.parse(_getPref('campaigns.data.' + this.id, '{}')));
		_log('loaded campaign ' + this.id);
		return true;
	} catch (e) {
		_log('error loading campaign ' + this.id);
		return false;
	}
};
Campaign.prototype.delete = function () {
	_clearPref('campaigns.data.' + this.id);
};
// TODO: remove after server update
Campaign.prototype.getMessage = function () {
	var message = {
		id: this.id,
		text: this.text,
		options: []
	};
	for (var a in this.actions) {
		if (this.actions.hasOwnProperty(a)) {
			message.options.push({
				action: a,
				text: this.actions[a].label,
				style: this.actions[a].style
			});
		}
	}
	return message;
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
var MessageHandler = function (id) {
	this.id = id;
	this._windows = [];
	this._messageQueue = [];
};
MessageHandler.prototype.init = function (win) {
	this._windows.push(win);
};
MessageHandler.prototype.unload = function (win) {
	var i = this._windows.indexOf(win);
	if (i > -1) {
		this._windows.splice(i, 1);
	}
};
MessageHandler.prototype.enqueueMessage = function (message, callback) {
	message.callback = callback;
	this._messageQueue.push(message);
	if (this._messageQueue.length == 1) {
		this._renderMessage(message);
	}
};
MessageHandler.prototype.dequeueMessage = function (message) {
	var i = this._messageQueue.indexOf(message);
	if (i === 0) {
		this.showNextMessage();
	} else if (i > -1) {
		this._messageQueue.splice(i, 1);
	}
};
MessageHandler.prototype.showNextMessage = function () {
	var message = this._messageQueue.shift();
	if (message) {
		this._removeMessage(message);
		if (this._messageQueue.length > 0) {
			this._renderMessage(this._messageQueue[0]);
		}
	}
};

var MessageHandlerDropdownFooter =
	new MessageHandler('MESSAGE_HANDLER_DROPDOWN_FOOTER');
MessageHandlerDropdownFooter._super = {
	init:
		MessageHandlerDropdownFooter.init.bind(MessageHandlerDropdownFooter),
	unload:
		MessageHandlerDropdownFooter.init.bind(MessageHandlerDropdownFooter)
};
MessageHandlerDropdownFooter.init = function (win) {
	this._super.init(win);
	// message container does not exist yet, wait for popup
	win.CLIQZ.Core.popup.addEventListener('popupshowing',
		this._addClickListener);
	if (this._messageQueue[0]) {
		this._renderMessage(this._messageQueue[0], win);
	}
};
MessageHandlerDropdownFooter.unload = function (win) {
	this._super.unload(win);
	// usually removed on popup showing, but not if window closed before
	win.CLIQZ.Core.popup.removeEventListener('popupshowing',
		this._addClickListener);
	win.document.getElementById('cliqz-message-container').
		removeEventListener('click', this._onClick);
};
MessageHandlerDropdownFooter._renderMessage = function (message, win) {
	if (win) {
		win.CLIQZ.UI.messageCenterMessage =
			message ? this._packageMessage(message) : null;
	} else {
		this._windows.map(function (w) {
			if (w) { this._renderMessage(message, w); }
		}.bind(this));
	}
};
MessageHandlerDropdownFooter._removeMessage = function (message) {
	this._renderMessage(null);
	CliqzUtils.getWindow().CLIQZ.Core.popup.hidePopup();
};
MessageHandlerDropdownFooter._packageMessage = function (message) {
	message.simple_message = message.text;
	delete message.text;

	if (message.options) {
		for (var i = 0; i < message.options.length; i++) {
			message.options[i].state = message.options[i].style;
			delete message.options[i].style;
		}
	}
	return {'footer-message': message};
};
MessageHandlerDropdownFooter._addClickListener = function (e) {
	var popup = e.target,
		win = popup.parentNode.parentNode.parentNode;

	win.getElementById('cliqz-message-container').addEventListener(
		'click', MessageHandlerDropdownFooter._onClick);
	popup.removeEventListener('popupshowing',
		MessageHandlerDropdownFooter._addClickListener);
};
MessageHandlerDropdownFooter._onClick = function (e) {
	var action = e.target ? e.target.getAttribute('state') : null,
	    message = MessageHandlerDropdownFooter._messageQueue[0];
	// not thread-safe: if current message is removed while it is showing,
	// the next message is used when invoking the callback
	if (message && message.callback) {
		message.callback(message.id, action);
	}
	MessageHandlerDropdownFooter.showNextMessage();
};

var MessageHandlerAlert =
	new MessageHandler('MESSAGE_HANDLER_ALERT');
MessageHandlerAlert._renderMessage = function (message) {
	// TODO: wait for window to open
	CliqzUtils.getWindow().alert(message.text);
	if (message.callback) {
		message.callback(message.id, message.options &&
			message.options.length > 0 && message.options[0].action);
	}
	this.showNextMessage();
};
MessageHandlerAlert._removeMessage = function () { };
// {
// 	id: 'MESSAGE_HANDLER_ALERT',
// 	show: function (callback, campaign) {
// 		// TODO: allow for multiple compaigns using the same handler
// 		//       (callback will be overwritten when calling show)
// 		//		or make sure this is a Singleton
// 		MessageHandlerAlert.callback = callback;
// 		MessageHandlerAlert.campaign = campaign;

// 		CliqzUtils.getWindow().alert(campaign.content);
// 		callback(campaign, 'confirm');
// 	},
// 	hide: function () { }
// };

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
			encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session')) +
			'&lang=' + encodeURIComponent(CliqzUtils.currLocale);

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
		CliqzMsgCenter._campaigns[id].delete();
		delete CliqzMsgCenter._campaigns[id];
		_log('removed campaign ' + id);
	},
	_loadCampaigns: function () {
		_log('loading campaigns');
		try {
			var cIds = JSON.parse(_getPref('campaigns.ids', '[]'));
			for (var i = 0; i < cIds.length; i++) {
				var campaign = new Campaign(cIds[i]);
				if (campaign.load()) {
					CliqzMsgCenter._campaigns[cIds[i]] = campaign;
					if (campaign.state == 'showing') {
						CliqzMsgCenter._showCampaign(campaign);
					}
				} else {
					campaign.delete();
				}
			}
		} catch (e) {
			_log('error loading campaigns: ' + e);
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
					CliqzMsgCenter._showCampaign(campaign);
				} else {
					campaign.setState('ended');
				}
			}
			campaign.save();
		}
	},
	_showCampaign: function (campaign) {
		var handler =
			CliqzMsgCenter._messageHandlers[campaign.handlerId];
		if (handler) {
			handler.enqueueMessage(campaign.getMessage(),
				CliqzMsgCenter._onMessageAction);
		} else {
			_log('message handler not found: ' + campaign.handlerId);
		}
	},
	// TODO: rename showing->show, ended->end
	_onMessageAction: function (campaignId, action) {
		var campaign = CliqzMsgCenter._campaigns[campaignId];
		if (campaign) {
			_log('campaign ' + campaignId + ': ' + action);
			if (ACTIONS.indexOf(action) != -1) {
				if (campaign.limits[action] != -1 ||
					++campaign.counts[action] == campaign.limits[action]) {
					campaign.setState('ended');
				} else {
					campaign.setState('idle');
				}
			}

			if (campaign.counts.show == campaign.limits.show) {
				campaign.setState('ended');
			}
			campaign.save();
		} else {
			_log('campaign ' + campaignId + ' not found');
		}
	},
};

CliqzMsgCenter.registerTrigger(TriggerUrlbarFocus.id,
	TriggerUrlbarFocus);
CliqzMsgCenter.registerMessageHandler(MessageHandlerDropdownFooter.id,
	MessageHandlerDropdownFooter);
CliqzMsgCenter.registerMessageHandler(MessageHandlerAlert.id,
	MessageHandlerAlert);

CliqzMsgCenter._loadCampaigns();
CliqzMsgCenter._activateCampaignUpdates();









