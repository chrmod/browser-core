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

  CliqzEvents.sub('ui_message_click', this._onClick.bind(this));
}

CliqzMsgHandlerDropdown.id = 'MESSAGE_HANDLER_DROPDOWN';

CliqzMsgHandlerDropdown.prototype =
Object.create(CliqzMsgHandler.prototype);

Object.assign(CliqzMsgHandlerDropdown.prototype, {

  constructor: CliqzMsgHandlerDropdown,

  parent: CliqzMsgHandler.prototype,

  _renderMessage: function (message, win, hide) {
      // show in all open windows if win is not specified
      if (win) {
          // TODO: show immediately
          win.CLIQZ.UI.messageCenterMessage =
          hide ? null : this._convertMessage(message);

          // hide immediately
          if (hide) {
            if (win.CLIQZ.Core.popup.cliqzBox) {
              var messageContainer = (message.location === 'top') ?
              win.CLIQZ.Core.popup.cliqzBox.messageContainerTop :
              win.CLIQZ.Core.popup.cliqzBox.messageContainer;
              if (messageContainer) {
                messageContainer.innerHTML = '';
              }
            }
          }
        } else {
          this._windows.map(function (w) {
            if (w) { this._renderMessage(message, w, hide); }
          }.bind(this));
        }
      },

      _hideMessage: function (message) {
        this._renderMessage(message, null, true);
      },

  // converts message into format expected by UI
  _convertMessage: function (message) {
    var m = {
      simple_message: message.text,
      type: 'cqz-message-survey',
      options: [],
      showOnTop: message.location === 'top'
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
  },

  _onClick: function (e) {
    var action = e.getAttribute('state'),
    message = this._messageQueue[0];

      // not thread-safe: if current message is removed while it is showing,
      // the next message is used when invoking the callback
      if (message && this._callbacks[message.id]) {
        this._callbacks[message.id](message.id, action);
      }
    }
  });
