'use strict';

var EXPORTED_SYMBOLS = ['CliqzCampaign'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var PREF_PREFIX = 'msgs.';

function _log(msg) {
    CliqzUtils.log(msg, 'CliqzCampaign');
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

function CliqzCampaign(id, data) {
    this.id = id;
    this.init();
    this.update(data);
}

CliqzCampaign.prototype = {
    init: function () {
        this.state = 'idle';
        this.isEnabled = true;
        this.counts = {trigger: 0, show: 0, confirm: 0,
                       postpone: 0, ignore: 0, discard: 0};
    },

    update: function (data) {
        for (var key in data) {
            if (data.hasOwnProperty(key) && !key.startsWith('DEBUG')) {
                this[key] = data[key];
            }
        }
    },

    setState: function (newState) {
        _log(this.id + ': ' + this.state + ' -> ' + newState);
        this.state = newState;
    },

    save: function () {
        _setPref('campaigns.data.' + this.id, JSON.stringify(this));
        _log('saved campaign ' + this.id);
    },

    load: function () {
        try {
            this.update(JSON.parse(_getPref('campaigns.data.' + this.id, '{}')));
            _log('loaded campaign ' + this.id);
            return true;
        } catch (e) {
            _log('error loading campaign ' + this.id);
            return false;
        }
    },

    delete: function () {
        _clearPref('campaigns.data.' + this.id);
    }
};
