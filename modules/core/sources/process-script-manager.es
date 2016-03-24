const PROCESS_SCRIPT_URL = "chrome://cliqz/content/core/processScript.js";

export default class {

  constructor(dispatcher) {
    this.dispatchMessage = dispatcher;
  }

  init(dispatcher) {
    this.mm = Cc["@mozilla.org/parentprocessmessagemanager;1"]
        .getService(Ci.nsIProcessScriptLoader);

    this.mm.loadProcessScript(PROCESS_SCRIPT_URL, true);

    this.mm.addMessageListener("cliqz", this.dispatchMessage);
  }

  unload() {
    this.mm.removeMessageListener("cliqz", this.dispatchMessage);
    this.mm.removeDelayedProcessScript(PROCESS_SCRIPT_URL);
  }

  broadcast(channel, msg) {
    this.mm.broadcastAsyncMessage(channel, msg);
  }
}
