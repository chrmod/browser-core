import { utils } from "core/cliqz";
import config from "core/config";

export default {
  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

  	Object.keys(settings).forEach( key => {
  		config[key] = settings[key];
  	});

    this.globalMM = Cc["@mozilla.org/globalmessagemanager;1"]
        .getService(Ci.nsIMessageListenerManager);

    this.globalMM.addMessageListener("cliqz", this.dispatchMessage);

    this.globalMM.loadFrameScript("chrome://cliqz/content/core/frameScript.js", true);
  },

  unload() {
  },

  dispatchMessage(msg) {
    utils.log(msg.data, "frame: message from page");

    let message = {};

    try {
      message = JSON.parse(msg.data);
    } catch (e) {
      // non CLIQZ or invalid message should be ignored
    }

    utils.log(message, "Received");
    if (message.target !== "cliqz") {
      return;
    }

    utils.log(message.args, "Received");
  }
}
