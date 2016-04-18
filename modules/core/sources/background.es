import { utils } from "core/cliqz";
import config from "core/config";
import ProcessScriptManager from "platform/process-script-manager";

var lastRequestId = 0;
var callbacks = {};

export default {

  init(settings) {
    this.dispatchMessage = this.dispatchMessage.bind(this);

    utils.bindObjectFunctions(this.actions, this);

    this.mm = new ProcessScriptManager(this.dispatchMessage);
    this.mm.init();
  },

  unload() {
    this.mm.unload();
  },

  getHTML(url, timeout = 1000) {
    const requestId = lastRequestId++,
          documents = [];

    this.mm.broadcast("cliqz:core", {
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
      this.mm.broadcast(`window-${windowId}`, {
        response,
        action: msg.data.payload.action
      });
    }).catch( e => utils.log(e.toString(), "Problem with frameScript") );
  },

  handleResponse(msg) {
    callbacks[msg.data.requestId].apply(null, [msg.data.payload]);
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
