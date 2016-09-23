import utils from "core/utils";
const CLIQZ_ONBOARDING = "about:onboarding";

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    var step = utils.getPref('cliqz-onboarding-v2-step', 1);
    if(step < 3) {
      utils.openLink(this.window, CLIQZ_ONBOARDING);
    }

    if (this.window.gInitialPages && this.window.gInitialPages.indexOf(CLIQZ_ONBOARDING)===-1) {
      this.window.gInitialPages.push(CLIQZ_ONBOARDING);
    }
  }

  unload() {

  }
}
