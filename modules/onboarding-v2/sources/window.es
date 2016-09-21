import utils from "core/utils";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    var step = utils.getPref('cliqz-onboarding-v2-step', 1);
    if(step < 3) {
      utils.openLink(this.window, "about:onboarding");
    }
  }

  unload() {

  }
}
