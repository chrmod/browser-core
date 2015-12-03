'use strict';

TESTS.CliqzmessageCenterTestUnit = function (CliqzMsgCenter, CliqzUtils) {
  describe('CliqzMsgCenter (unit)', function() {
    var messageCenter, dropdownHandler,
    getMessage = function (id, location) {
      return {
        id: id,
        location: location,
        options: [
        {
          action: 'confirm',
          label: 'Jetzt installieren!',
          style: 'default',
          url: 'www.dominikschmidt.net'
        },
        {
          action: 'postpone',
          label: 'Später',
          style: 'default'
        },
        {
          action: 'discard',
          label: 'Nicht mehr anzeigen',
          style: 'gray'
        }
        ],
        text: 'Der CLIQZ browser ist besser als Firefox.'
      };
    }, ui = CliqzUtils.getWindow().CLIQZ.UI,
    core = CliqzUtils.getWindow().CLIQZ.Core;

    beforeEach(function() {
      messageCenter = new CliqzMsgCenter();
      dropdownHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_DROPDOWN;
    });

    context('general tests', function () {
      it('should register all handlers', function() {
        chai.expect(messageCenter._messageHandlers).to.have.all.keys(
          'MESSAGE_HANDLER_ALERT', 'MESSAGE_HANDLER_DROPDOWN'
          );
      });

      it('should enqueue messages on show', function() {
        var alertHandler = messageCenter._messageHandlers.MESSAGE_HANDLER_ALERT;

        chai.expect(dropdownHandler._messageQueue).to.have.length(0);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID0', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(1);
        chai.expect(alertHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(getMessage('ID1', 'bottom'), 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(2);
        chai.expect(alertHandler._messageQueue).to.have.length(0);
      });

      it('should dequeue messages on hide', function() {
        var msg0 = getMessage('ID0'), msg1 = getMessage('ID1', 'bottom');
        chai.expect(dropdownHandler._messageQueue).to.have.length(0);

        messageCenter.showMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
        messageCenter.showMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(2);

        messageCenter.hideMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(1);
        chai.expect(dropdownHandler._messageQueue).to.contain(msg0);

        messageCenter.hideMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
        chai.expect(dropdownHandler._messageQueue).to.have.length(0);
      });
    });

context('dropdown handler tests', function () {
  it('should show message (bottom)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg = getMessage('ID0', 'bottom');
    messageCenter.showMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(dropdownHandler._messageQueue).to.have.length(1);
    chai.expect(ui.messageCenterMessage).to.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.contain(msg.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg.text);
      messageCenter.hideMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
      return Promise.resolve();
    });
  });

  it('should show message (top)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg = getMessage('ID0', 'top');
    messageCenter.showMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(dropdownHandler._messageQueue).to.have.length(1);
    chai.expect(ui.messageCenterMessage).to.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.contain(msg.text);
      messageCenter.hideMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
      return Promise.resolve();
    });
  });

  it('should hide message (bottom)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg = getMessage('ID0', 'bottom');
    messageCenter.showMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.be.ok;
    messageCenter.hideMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg.text);
      return Promise.resolve();
    });
  });

  it('should hide message (top)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg = getMessage('ID0', 'top');
    messageCenter.showMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.be.ok;
    messageCenter.hideMessage(msg, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg.text);
      return Promise.resolve();
    });
  });

  it('should hide multiple messages (one after another)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg0 = getMessage('ID0', 'bottom'), msg1 = getMessage('ID1', 'top');
    msg0.text = 'msg0';
    msg1.text = 'msg1';
    messageCenter.showMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg0.text);
    messageCenter.hideMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    messageCenter.showMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg1.text);
    messageCenter.hideMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg0.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg0.text);
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg1.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg1.text);
      return Promise.resolve();
    });
  });

it('should hide multiple messages (in batch)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg0 = getMessage('ID0', 'bottom'), msg1 = getMessage('ID1', 'top');
    msg0.text = 'msg0';
    msg1.text = 'msg1';
    messageCenter.showMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg0.text);
    messageCenter.showMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg0.text);
    messageCenter.hideMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg1.text);
    messageCenter.hideMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg0.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg0.text);
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg1.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg1.text);
      return Promise.resolve();
    });
  });

  it('should hide message (mixed locations)', function() {
    chai.expect(ui.messageCenterMessage).to.not.be.ok;
    var msg0 = getMessage('ID0', 'bottom'), msg1 = getMessage('ID1', 'top');
    msg0.text = 'msg0';
    msg1.text = 'msg1';
    messageCenter.showMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    messageCenter.showMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg0.text);
    messageCenter.hideMessage(msg0, 'MESSAGE_HANDLER_DROPDOWN');
    chai.expect(ui.messageCenterMessage['footer-message'].simple_message).to.contain(msg1.text);
    fillIn('some query');
    return waitForResult().then(function() {
      chai.expect(core.popup.cliqzBox.messageContainer.innerHTML).to.not.contain(msg0.text);
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.contain(msg1.text);
      messageCenter.hideMessage(msg1, 'MESSAGE_HANDLER_DROPDOWN');
      chai.expect(ui.messageCenterMessage).to.not.be.ok;
      chai.expect(core.popup.cliqzBox.messageContainerTop.innerHTML).to.not.contain(msg1.text);
      return Promise.resolve();
    });
  });
});
});
};
