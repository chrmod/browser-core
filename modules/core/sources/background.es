import { utils } from "core/cliqz";
import config from "core/config";

export default {
  FRAME_SCRIPT_URL: "chrome://cliqz/content/core/frameScript.js",

  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

  	Object.keys(settings).forEach( key => {
  		config[key] = settings[key];
  	});

    this.globalMM = Cc["@mozilla.org/globalmessagemanager;1"]
        .getService(Ci.nsIMessageListenerManager);

    this.globalMM.addMessageListener("cliqz", this.dispatchMessage);

    this.globalMM.loadFrameScript(this.FRAME_SCRIPT_URL, true);

    utils.bindObjectFunctions(this.actions, this);
  },

  unload() {
    this.globalMM.removeMessageListener("cliqz", this.dispatchMessage);
    this.globalMM.getDelayedFrameScripts(this.FRAME_SCRIPT_URL);
  },

  dispatchMessage(msg) {
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
    }).catch( e => utils.log(e, "Problem with frameScript") );
  },
  actions: {
    sendTelemetry(msg) {
      utils.telemetry(msg);
      return Promise.resolve();
    }
  }
};
