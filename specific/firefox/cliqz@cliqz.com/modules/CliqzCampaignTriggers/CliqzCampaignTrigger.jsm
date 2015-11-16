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
        this._listeners.forEach(function (listener) {
          listener(this.id);
        }.bind(this));
    }
};
