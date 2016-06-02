import background from 'goldrush/background';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;

    //this.window.document.style.border = '5px solid red';
  }

  init() {
    debugger;
    background.testOfferFetcher();
  }

  unload() {

  }
}
