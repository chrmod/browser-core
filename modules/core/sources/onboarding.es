import { utils } from "core/cliqz";

export function version() {
  return utils.getPref('onboarding-v2', "1.2") ? "2.0" : "1.2";
}

export function shouldShowOnboardingV2() {
  var step = utils.getPref('cliqz-onboarding-v2-step', 1),
      hasControlCenter = utils.getPref('controlCenter', false),
      shouldShow = false;
  if(!hasControlCenter) {
    return false;
  }
  if(step < 3) {
    shouldShow = true;
  }

  return shouldShow;
}
