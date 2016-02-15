import { utils } from "core/cliqz";
import config from "core/config";

var lastRequestId = 0;
var callbacks = {};

export default {
  FRAME_SCRIPT_URL: "chrome://cliqz/content/core/frameScript.js",

  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

  	Object.keys(settings).forEach( key => {
  		config[key] = settings[key];
  	});

    this.globalMM = Cc["@mozilla.org/globalmessagemanager;1"]
        .getService(Ci.nsIMessageListenerManager);

    this.globalMM.addMessageListener("cliqz:framescript", this.dispatchMessage);

    this.globalMM.loadFrameScript(this.FRAME_SCRIPT_URL, true);
  },

  unload() {
    this.globalMM.removeMessageListener("cliqz:framescript", this.dispatchMessage);
    this.globalMM.getDelayedFrameScripts(this.FRAME_SCRIPT_URL);
  },

  getHTML(url, timeout = 1000) {
    const requestId = lastRequestId++,
          documents = [];

    this.globalMM.broadcastAsyncMessage("cliqz:core", {
      action: "getHTML",
      args: [ url ],
      requestId
    });

    callbacks[requestId] = function (doc) {
      documents.push(doc);
    };

    return new Promise( resolve => {
      utils.setTimeout(function () {
        delete callbacks[requestId];
        resolve(documents);
      }, timeout);
    });
  },

  dispatchMessage(msg) {
    if (msg.data.requestId in callbacks) {
      this.handleResponse(msg);
    } else {
      this.handleRequest(msg);
    }
  },

  handleRequest(msg) {
    const { action, module, args } = msg.data.payload,
          windowId = msg.data.windowId;

    utils.importModule(`${module}/background`).then( module => {
      const background = module.default;
      return background.actions[action].apply(null, args);
    }).then( response => {
      this.globalMM.broadcastAsyncMessage(`window-${windowId}`, {
        response,
        action: msg.data.payload.action
      });
    }).catch( e => utils.log(e.toString(), "Problem with frameScript") );
  },

  handleResponse(msg) {
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
  }
};
