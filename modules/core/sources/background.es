import { utils } from "core/cliqz";
import config from "core/config";

export default {
  PROCESS_SCRIPT_URL: "chrome://cliqz/content/core/processScript.js",

  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

  	Object.keys(settings).forEach( key => {
  		config[key] = settings[key];
  	});

    this.mm = Cc["@mozilla.org/parentprocessmessagemanager;1"]
        .getService(Ci.nsIProcessScriptLoader);

    this.mm.loadProcessScript(this.PROCESS_SCRIPT_URL, true);

    this.mm.addMessageListener("cliqz", this.dispatchMessage);

    utils.bindObjectFunctions(this.actions, this);
  },

  unload() {
    this.mm.removeMessageListener("cliqz", this.dispatchMessage);
    this.mm.getDelayedFrameScripts(this.FRAME_SCRIPT_URL);
  },

  dispatchMessage(msg) {
    const { action, module, args } = msg.data.payload,
          windowId = msg.data.windowId;

    utils.importModule(`${module}/background`).then( module => {
      const background = module.default;
      return background.actions[action].apply(null, args);
    }).then( response => {
      this.mm.broadcastAsyncMessage(`window-${windowId}`, {
        response,
        action: msg.data.payload.action
      });
    }).catch( e => utils.log(e.toString(), "Problem with frameScript") );
  },
  actions: {
    sendTelemetry(msg) {
      utils.telemetry(msg);
      return Promise.resolve();
    },
    getUrlbar(value) {
      let urlBar = utils.getWindow().document.getElementById("urlbar")
      urlBar.focus();
      urlBar.mInputField.focus();
      urlBar.mInputField.setUserInput(value);
      //utils.getWindow().CLIQZ.Core.urlbar.focus("ss");
    }
  }
};
