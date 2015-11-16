Components.utils.import('chrome://cliqzmodules/content/CliqzEvents.jsm');

var messageCallbacks = Object.create(null);

CliqzEvents.sub("antitracking-background", function (res) {
  if (!messageCallbacks[res.id]) { return; }

  messageCallbacks[res.id](res.message);
  delete messageCallbacks[res.id];
});

var chrome = {
  runtime: {
    sendMessage(message, callback) {
      var messageId = CliqzEvents.nextId();
      messageCallbacks[messageId] = callback;

      CliqzEvents.pub("antitracking-popup", {
        message: message,
        id: messageId
      });
    }
  }
};
