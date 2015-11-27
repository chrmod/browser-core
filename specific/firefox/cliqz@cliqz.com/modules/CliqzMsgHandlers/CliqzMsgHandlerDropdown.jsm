'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgHandlerDropdown'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandler',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

function _log(msg) {
  CliqzUtils.log(msg, 'CliqzMsgHandlerDropdown');
}

function CliqzMsgHandlerDropdown() {
  CliqzMsgHandler.call(this, CliqzMsgHandlerDropdown.id);
  CliqzEvents.sub('ui:dropdown_message_click', this._onClick.bind(this));
}

CliqzMsgHandlerDropdown.id = 'MESSAGE_HANDLER_DROPDOWN';

CliqzMsgHandlerDropdown.prototype = Object.create(CliqzMsgHandler.prototype);
CliqzMsgHandlerDropdown.prototype.constructor = CliqzMsgHandlerDropdown;

CliqzMsgHandlerDropdown.prototype._renderMessage = function (message) {
  CliqzEvents.pub('msg_handler_dropdown:message_ready', this._convertMessage(message));
};

CliqzMsgHandlerDropdown.prototype._hideMessage = function (message) {
  CliqzEvents.pub('msg_handler_dropdown:message_revoked', this._convertMessage(message));
};

// converts message into format expected by UI
CliqzMsgHandlerDropdown.prototype._convertMessage = function (message) {
  var m = {
    simple_message: message.text,
    type: 'cqz-message-survey',
    options: [],
    location: message.location
  };

  if (message.options) {
    for (var i = 0; i < message.options.length; i++) {
      m.options.push ({
        text: message.options[i].label,
        state: message.options[i].style,
        action: message.options[i].action
      });
    }
  }

  return {'footer-message': m};
};

CliqzMsgHandlerDropdown.prototype._onClick = function (action) {
  var message = this._messageQueue[0];

  // not thread-safe: if current message is removed while it is showing,
  // the next message is used when invoking the callback
  if (message && this._callbacks[message.id]) {
    this._callbacks[message.id](message.id, action);
  }
};

