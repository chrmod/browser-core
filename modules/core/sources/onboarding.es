import { utils } from "core/cliqz";
import config from "core/config";

export function version() {
  return config.settings.channel === "40" ? "2.0" : "1.1";
}

export function shouldShowOnboardingV2() {
  var step = utils.getPref('cliqz-onboarding-v2-step', 1),
      shouldShow = false;
  if(step < 3) {
    shouldShow = true;
  }
  return shouldShow;
}
