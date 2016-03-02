import { utils } from "core/cliqz";
import background from "core/base/background";
import HumanWeb from "human-web/human-web";
import hs from "core/history-service";

export default background({
  enabled(settings) {
    return utils.getPref("humanWeb", false);
  },

  init(settings) {
    HumanWeb.initAtBrowser();

    hs.addObserver(HumanWeb.historyObserver, false);
  },

  unload() {
    hs.removeObserver(HumanWeb.historyObserver);

    HumanWeb.unloadAtBrowser();
    HumanWeb.unload();
  },

  beforeBrowserShutdown() {
    HumanWeb.unload();
  },

  events: {
    "ui:click-on-url": function (data) {
      HumanWeb.queryCache[data.url] = {
        d: 1,
        q: data.query,
        t: data.type,
        pt: data.positionType,
      };
    }
  }
})
