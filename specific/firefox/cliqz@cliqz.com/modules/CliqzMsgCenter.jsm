'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgCenter'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

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
  this._messageHandlers = {};

  this.registerMessageHandler(CliqzMsgHandlerDropdownFooter.id,
    new CliqzMsgHandlerDropdownFooter());
  this.registerMessageHandler(CliqzMsgHandlerAlert.id,
    new CliqzMsgHandlerAlert());

  CliqzEvents.sub('msg_center_show_message', this.showMessage.bind(this));
  CliqzEvents.sub('msg_center_hide_message', this.hideMessage.bind(this));
}

// TODO: add destructor

CliqzMsgCenter.prototype = {

	registerMessageHandler: function (id, handler) {
		this._messageHandlers[id] = handler;
	},

  // TODO: add auto hide option
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
