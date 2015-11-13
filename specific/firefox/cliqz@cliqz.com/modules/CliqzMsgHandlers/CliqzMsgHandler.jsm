'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgHandler'];

function CliqzMsgHandler (id) {
    this.id = id;
    this._windows = [];
    this._messageQueue = [];
    // message id is key
    this._callbacks = {};
}

CliqzMsgHandler.prototype = {
    registerWindow: function (win) {
        this._windows.push(win);
    },

    unregisterWindow: function (win) {
        var i = this._windows.indexOf(win);
        if (i > -1) {
            this._windows.splice(i, 1);
        }
    },

    enqueueMessage: function (message, callback) {
        this._messageQueue.push(message);
        this._callbacks[message.id] = callback;
        if (this._messageQueue.length === 1) {
            this._renderMessage(message);
        }
    },

    dequeueMessage: function (message) {
        var i = this._messageQueue.indexOf(message);
        if (i === 0) {
            this.showNextMessage();
        } else if (i > -1) {
            this._messageQueue.splice(i, 1);
            delete this._callbacks[message.id];
        }
    },

    showNextMessage: function () {
        var message = this._messageQueue.shift();
        if (message) {
            delete this._callbacks[message.id];
            this._hideMessage(message);
            if (this._messageQueue.length > 0) {
                this._renderMessage(this._messageQueue[0]);
            }
        }
    }
};
