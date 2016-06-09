import background from 'goldrush/background';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.settings = settings.settings;

    //this.window.document.style.border = '5px solid red';
  }

  init() {
    background.testOfferFetcher();
    background.testFIDs();
    // background.testWritingFile();
    /*
    const toolbar = this.window.document.createElement("toolbar");
    const iframe = this.window.document.createElement("iframe");
    const bottomBox = this.window.document.querySelector("#browser-bottombox");
    bottomBox.appendChild(toolbar);
    iframe.setAttribute("src", "chrome://cliqz/content/goldrush/ad1.html");
    toolbar.appendChild(iframe);
    */
  }

  unload() {

  }
}
