'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Components.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandler',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandlerAlert',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandlerAlert.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandlerDropdownFooter',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandlerDropdownFooter.jsm');


/* ************************************************************************* */
function _log(msg) {
	CliqzUtils.log(msg, 'CliqzMsgCenter');
}
/* ************************************************************************* */


function CliqzMsgCenter() {
  this._windows = [];
  this._messageHandlers = {};

  this.registerMessageHandler(CliqzMsgHandlerDropdownFooter.id,
    new CliqzMsgHandlerDropdownFooter());
  this.registerMessageHandler(CliqzMsgHandlerAlert.id,
    new CliqzMsgHandlerAlert());

  CliqzEvents.sub('show_message', this.showMessage);
  CliqzEvents.sub('hide_message', this.hide_message);
}

// TODO: add destructor

CliqzMsgCenter.prototype = {

	registerWindow: function (win) {
		this._windows.push(win);

		var id;
		for (id in this._messageHandlers) {
			if (this._messageHandlers.hasOwnProperty(id)) {
				this._messageHandlers[id].registerWindow(win);
			}
		}
	},

	unregisterWindow: function (win) {
		var i = this._windows.indexOf(win);
		if (i > -1) {
			this._windows.splice(i, 1);
		}

		var id;
		for (id in this._messageHandlers) {
			if (this._messageHandlers.hasOwnProperty(id)) {
				this._messageHandlers[id].unregisterWindow(win);
			}
		}
	},

	registerMessageHandler: function (id, handler) {
		this._messageHandlers[id] = handler;
		for (var i = 0; i < this._windows.length; i++) {
			handler.init(this._windows[i]);
		}
	},

	showMessage: function (message, handlerId, callback) {
		var handler =
			this._messageHandlers[handlerId];
		if (handler) {
			handler.enqueueMessage(message, callback);
		} else {
			_log('message handler not found: ' + handlerId);
		}
	},

  hideMessage: function (message, handlerId) {
    var handler =
      this._messageHandlers[handlerId];
    if (handler) {
      handler.dequeueMessage(message);
    } else {
      _log('message handler not found: ' + handlerId);
    }
  }
};
