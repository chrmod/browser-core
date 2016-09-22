import { utils } from "core/cliqz";

export function version() {
  return utils.getPref('controlCenter', false) ? "2.0" : "1.2";
}

export function shouldShowOnboardingV2() {
  var step = utils.getPref('cliqz-onboarding-v2-step', 1),
      shouldShow = false;
  if(step < 3) {
    shouldShow = true;
  }

  return shouldShow;
}
