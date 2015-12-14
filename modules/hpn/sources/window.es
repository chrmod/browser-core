import CliqzSecureMessage from 'hpn/main';

export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    CliqzSecureMessage.initAtWindow(this.window);
  }

  unload() {
    CliqzSecureMessage.unload();
  }

};