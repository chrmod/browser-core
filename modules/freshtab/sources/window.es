import FreshTab from 'freshtab/main';

export default class {

  constructor(settings) {
    this.buttonEnabled = settings.freshTabButton;
  }

  init() {}

  unload() {}

  createButtonItem(win) {
    if ( !(this.buttonEnabled || FreshTab.initialized) ) { return; }

    return win.CLIQZ.Core.createCheckBoxItem(
      win.document,
      'freshTabState',
      CliqzUtils.getLocalizedString('btnFreshTab'),
      true,
      FreshTab.toggleState
    );
  }
};
