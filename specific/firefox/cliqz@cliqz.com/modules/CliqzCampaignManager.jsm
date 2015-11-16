'use strict';

var EXPORTED_SYMBOLS = ['CliqzCampaignManager'];

Components.import('resource://gre/modules/XPCOMUtils.jsm');


XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

// TODO: refactor
var CAMPAIGN_SERVER = 'https://fec.cliqz.com/message/',
    ACTIONS = ['confirm', 'ignore', 'discard', 'postpone'],
    PREF_PREFIX = 'msgs.';

function _log(msg) {
    CliqzUtils.log(msg, 'CliqzCampaignManager');
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

function _getEndpoint(endpoint, campaign) {
    return CAMPAIGN_SERVER + (endpoint ? endpoint : '') + '?session=' +
        encodeURIComponent(CliqzUtils.cliqzPrefs.getCharPref('session')) +
        '&lang=' + encodeURIComponent(CliqzUtils.currLocale) +
        (campaign ? '&campaign=' + campaign.id : '');
}

function _telemetry(campaign, action) {
    CliqzUtils.telemetry({
        type: 'campaign',
        id: campaign.id,
        action: action
    });
}

/* ************************************************************************* */
var Campaign = function (id, data) {
    this.id = id;
    this.init();
    this.update(data);
};
Campaign.prototype.init = function () {
    this.state = 'idle';
    this.isEnabled = true;
    this.counts = {trigger: 0, show: 0, confirm: 0,
                   postpone: 0, ignore: 0, discard: 0};
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

var TriggerUrlbarFocus = TriggerUrlbarFocus ||
    new Trigger('TRIGGER_URLBAR_FOCUS');
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

function CliqzCampaignManager() {
    this._campaigns = {};
    this._triggers = {};
    this._updateTimer = null;
    this._windows = [];

    this.UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour

    this.registerTrigger(TriggerUrlbarFocus.id, TriggerUrlbarFocus);

    this.loadCampaigns();
    this.activateCampaignUpdates();
}

CliqzCampaignManager.prototype = {
    registerTrigger: function (id, trigger) {
        this._triggers[id] = trigger;
        for (var i = 0; i < this._windows.length; i++) {
            trigger.init(this._windows[i]);
        }
        trigger.addListener(this._onTrigger.bind(this));
    },
    registerWindow: function (win) {
        this._windows.push(win);

        var id;
        for (id in this._triggers) {
            if (this._triggers.hasOwnProperty(id)) {
                this._triggers[id].init(win);
            }
        }
    },
    unregisterWindow: function (win) {
        var i = this._windows.indexOf(win);
        if (i > -1) {
            this._windows.splice(i, 1);
        }

        var id;
        for (id in this._triggers) {
            if (this._triggers.hasOwnProperty(id)) {
                this._triggers[id].unload(win);
            }
        }
    },
    activateCampaignUpdates: function () {
        if (!this._updateTimer) {
            // run once now
            this.updateCampaigns();
            this._updateTimer = CliqzUtils.setInterval(function () {
                this.updateCampaigns();
            }, this.UPDATE_INTERVAL);
        }
    },
    deactivateCampaignUpdates: function () {
        CliqzUtils.clearTimeout(this._updateTimer);
        this._updateTimer = null;
    },
    loadCampaigns: function () {
        _log('loading campaigns');
        try {
            var cIds = JSON.parse(_getPref('campaigns.ids', '[]'));
            for (var i = 0; i < cIds.length; i++) {
                var campaign = new Campaign(cIds[i]);
                if (campaign.load()) {
                    this._campaigns[cIds[i]] = campaign;
                    if (campaign.state === 'show') {
                        CliqzUtils.messageCenter.showMessage(campaign.message,
                            campaign.handlerId,
                            this._onMessageAction.bind(this));
                    }
                } else {
                    campaign.delete();
                }
            }
        } catch (e) {
            _log('error loading campaigns: ' + e);
        }
    },
    saveCampaigns: function () {
        _log('saving campaigns');
        _setPref('campaigns.ids',
            JSON.stringify(Object.keys(this._campaigns)));
        for (var cId in this._campaigns) {
            if (this._campaigns.hasOwnProperty(cId)) {
                this._campaigns[cId].save();
            }
        }
    },
    updateCampaigns: function () {
        _log('updating campaigns');
        CliqzUtils.httpGet(_getEndpoint(),
            this._updateCampaignsCallback.bind(this),
            function error(e) {
                _log('error updating campaigns: ' + e);
            });
    },
    addCampaign: function (id, data) {
        this._campaigns[id] = new Campaign(id, data);
        CliqzUtils.httpGet(_getEndpoint('accept', this._campaigns[id]));
        _telemetry(this._campaigns[id], 'add');
        _log('added campaign ' + id);
    },
    removeCampaign: function (id) {
        var campaign = this._campaigns[id],
            handler = CliqzUtils.messageCenter._messageHandlers[campaign.handlerId];
        if (handler) {
            handler.dequeueMessage(campaign.message);
        }
        campaign.delete();
        delete this._campaigns[id];
        _telemetry(campaign, 'remove');
        _log('removed campaign ' + id);
    },
    _onMessageAction: function (campaignId, action) {
        var campaign = this._campaigns[campaignId];
        if (campaign) {
            if (campaign.state === 'end') {
                _log('campaign ' + campaign.id + ' has ended');
                return;
            }

            if (ACTIONS.indexOf(action) !== -1) {
                _log('campaign ' + campaign.id + ': ' + action);
                _telemetry(campaign, action);

                // TODO: use mapping
                if (action === 'confirm') {
                    CliqzUtils.httpGet(_getEndpoint('click', campaign));
                } else if (action === 'postpone') {
                    CliqzUtils.httpGet(_getEndpoint('postpone', campaign));
                } else if (action === 'discard') {
                    CliqzUtils.httpGet(_getEndpoint('discard', campaign));
                }

                // open URL in new tab if specified for this action
                var gBrowser = CliqzUtils.getWindow().gBrowser;
                // TODO: use some()
                campaign.message.options.forEach(function (option) {
                    if (option.action === action && option.url) {
                        gBrowser.selectedTab = gBrowser.addTab(option.url);
                    }
                });

                // end campaign if limit reached
                if (campaign.limits[action] !== -1 &&
                    ++campaign.counts[action] === campaign.limits[action]) {
                    campaign.setState('end');
                } else {
                    campaign.setState('idle');
                }

                CliqzUtils.messageCenter._messageHandlers[campaign.handlerId].
                    dequeueMessage(campaign.message);
            }

            if (campaign.counts.show === campaign.limits.show) {
                campaign.setState('end');
            }
            campaign.save();
        } else {
            _log('campaign ' + campaignId + ' not found');
        }
        this.updateCampaigns();
    },
    _onTrigger: function (id) {
        _log(id + ' trigger');

        // find all campaigns for this trigger
        var campaigns = this._campaigns;
        for (var cId in campaigns) {
            if (campaigns.hasOwnProperty(cId)) {
                if (campaigns[cId].triggerId === id) {
                    this._triggerCampaign(campaigns[cId]);
                }
            }
        }
    },
    _triggerCampaign: function (campaign) {
        _log('campaign ' + campaign.id + ' trigger');
        if (campaign.isEnabled && campaign.state === 'idle') {
            if (++campaign.counts.trigger === campaign.limits.trigger) {
                if (campaign.limits.show === -1 ||
                    ++campaign.counts.show <= campaign.limits.show) {
                    campaign.setState('show');
                    campaign.counts.trigger = 0;
                    // need ID in message to associate callback with campaign
                    campaign.message.id = campaign.id;
                    CliqzUtils.messageCenter.showMessage(campaign.message,
                        campaign.handlerId, this._onMessageAction.bind(this));
                    CliqzUtils.httpGet(_getEndpoint('show', campaign));
                    _telemetry(campaign, 'show');
                } else {
                    campaign.setState('end');
                }
                this.updateCampaigns();
            }
            campaign.save();
        }
    },
    // TODO: rename to onUpdate...
    _updateCampaignsCallback: function (req) {
        try {
            var clientCampaigns = this._campaigns,
                serverCampaigns = JSON.parse(req.response).campaigns,
                cId;

            for (cId in serverCampaigns) {
                if (serverCampaigns.hasOwnProperty(cId) &&
                    !(cId in clientCampaigns)) {
                    this.addCampaign(cId, serverCampaigns[cId]);
                }
            }
            for (cId in clientCampaigns) {
                if (clientCampaigns.hasOwnProperty(cId) &&
                    !(cId in serverCampaigns)) {
                    this.removeCampaign(cId);
                }
            }
            this.saveCampaigns();
        } catch (e) {
            _log('error parsing campaigns: ' + e);
        }
    }
};


