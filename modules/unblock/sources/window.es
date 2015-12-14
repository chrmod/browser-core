import CliqzUnblock from 'unblock/main';

export default class {
  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    CliqzUnblock.initWindow(this.window);
  }

  unload() {
    CliqzUnblock.unloadWindow(this.window);
  }
};
