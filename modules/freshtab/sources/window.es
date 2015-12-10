import FreshTab from 'freshtab/main';

export default class {
  init() {}

  unload() {}

  createButtonItem(win) {
    if ( CliqzUtils.getPref("freshTabButton", true) && FreshTab.initialized ){
      return win.CLIQZ.Core.createCheckBoxItem(
          win.document,
          'freshTabState',
          CliqzUtils.getLocalizedString('btnFreshTab'),
          true,
          FreshTab.toggleState
      );
    }
  }
};
