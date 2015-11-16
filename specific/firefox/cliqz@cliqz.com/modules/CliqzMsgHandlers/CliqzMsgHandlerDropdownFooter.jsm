'use strict';

var EXPORTED_SYMBOLS = ['CliqzMsgHandlerDropdownFooter'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzMsgHandler',
  'chrome://cliqzmodules/content/CliqzMsgHandlers/CliqzMsgHandler.jsm');

function CliqzMsgHandlerDropdownFooter() {
    CliqzMsgHandler.call(this, CliqzMsgHandlerDropdownFooter.id);
}

CliqzMsgHandlerDropdownFooter.id = 'MESSAGE_HANDLER_DROPDOWN_FOOTER';

CliqzMsgHandlerDropdownFooter.prototype =
    Object.create(CliqzMsgHandler.prototype);

Object.assign(CliqzMsgHandlerDropdownFooter.prototype, {

  constructor: CliqzMsgHandlerDropdownFooter,

  parent: CliqzMsgHandler.prototype,

  registerWindow: function (win) {
      this.parent.registerWindow.call(this, win);

      win.CLIQZ.Core.popup.addEventListener('popupshowing',
          this._addClickListener);
      // keep reference to this listener
      win.CLIQZ.Core.popup[this.id] = this;
      if (this._messageQueue[0]) {
          this._renderMessage(this._messageQueue[0], win);
      }
  },

  unregisterWindow: function (win) {
      this.parent.unregisterWindow.call(this, win);
      // usually removed on popup showing, but not if window closed before
      if (win.CLIQZ.Core.popup[this.id]) {
          win.CLIQZ.Core.popup.removeEventListener('popupshowing',
              this._addClickListener);
          delete win.CLIQZ.Core.popup[this.id];
      }

      var msgContainer = win.document.getElementById('cliqz-message-container');
      if (msgContainer) {
          msgContainer.removeEventListener('mouseup', this._onClick);
          delete msgContainer[this.id];
      } else {
          _log('message container not found');
      }
  },

  _renderMessage: function (message, win) {
      // show in all open windows if win is not specified
      if (win) {
          // TODO: show immediately
          win.CLIQZ.UI.messageCenterMessage =
              message ? this._convertMessage(message) : null;
          if (!message) {
              // hide immediately
              if (win.CLIQZ.Core.popup.cliqzBox &&
                  win.CLIQZ.Core.popup.cliqzBox.messageContainer) {
                  win.CLIQZ.Core.popup.cliqzBox.messageContainer.innerHTML = '';
              }
          }
      } else {
          this._windows.map(function (w) {
              if (w) { this._renderMessage(message, w); }
          }.bind(this));
      }
  },

  _hideMessage: function (message) {
      this._renderMessage(null);
  },

  // converts message into format expected by UI
  _convertMessage: function (message) {
      var m = {
          simple_message: message.text,
          type: 'cqz-message-survey',
          options: []
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

  _addClickListener: function (e) {
      var popup = e.target,
          win = popup.parentNode.parentNode.parentNode,
          self = popup[CliqzMsgHandlerDropdownFooter.id];

      popup.removeEventListener('popupshowing', self._addClickListener);
      delete popup[self.id];

      var msgContainer = win.getElementById('cliqz-message-container');
      if (msgContainer) {
          msgContainer.addEventListener('mouseup', self._onClick);
          msgContainer[self.id] = self;
      } else {
          _log('message container not found');
      }
  },

  _onClick: function (e) {
      var action = e.target ? e.target.getAttribute('state') : null,
          msgContainer = e.target;
      while (msgContainer && msgContainer.id !== 'cliqz-message-container') {
          msgContainer = msgContainer.parentNode;
      }
      if (!msgContainer || msgContainer.id !== 'cliqz-message-container') {
          _log('message container not found');
          return;
      }
      var self = msgContainer[CliqzMsgHandlerDropdownFooter.id],
          message = self._messageQueue[0];
      // not thread-safe: if current message is removed while it is showing,
      // the next message is used when invoking the callback
      if (message && self._callbacks[message.id]) {
          self._callbacks[message.id](message.id, action);
      }
  }
});
