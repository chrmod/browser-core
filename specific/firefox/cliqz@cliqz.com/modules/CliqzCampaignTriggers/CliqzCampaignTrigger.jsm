'use strict';

var EXPORTED_SYMBOLS = ['CliqzCampaignTrigger'];

function CliqzCampaignTrigger(id) {
    this.id = id;
    this._listeners = [];
}

CliqzCampaignTrigger.prototype = {

    addListener: function(callback) {
        this._listeners.push(callback);
    },

    notifyListeners: function () {
        for (var i = 0; i < this._listeners.length; i++) {
            this._listeners[i](this.id);
        }
    }
};
