import { utils, events } from "core/cliqz";
import HumanWeb from "human-web/human-web";

export default {
  init(settings) {
    this.urlClickListener = this.urlClickListener.bind(this);

    if(!utils.getPref("humanWeb", false)){
      return;
    }

    HumanWeb.initAtBrowser();
    events.sub("ui:click-on-url", this.urlClickListener);
  },

  urlClickListener(data) {
    HumanWeb.queryCache[data.url] = {
      d: 1,
      q: data.query,
      t: data.type,
      pt: data.positionType,
    };
  },

  unload(options) {
    if(!utils.getPref("humanWeb", false)){
      return;
    }

    events.un_sub("ui:click-on-url", this.urlClickListener);

    HumanWeb.unloadAtBrowser();

    if ( options.uninstall ) {
      HumanWeb.unload();
    }
  }
}
