import maybe from '../core/helpers/maybe';
import Panel from '../core/ui/panel';
import { addStylesheet, removeStylesheet } from '../core/helpers/stylesheet';


export default class {

  constructor(settings) {
    this.window = settings.window;

    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/new-tab-button/index.html',
      'new-tab-button-panel'
    );

    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);

    this.actions = {

      lightUp: () => {
        maybe(this, 'button').then(button => {
          button.classList.add('has-notification');
        });
      },

      lightDown: () => {
        maybe(this, 'button').then(button => {
          button.classList.remove('has-notification');
        });
      },

    };
  }

  init() {
    this.cssUrl = 'chrome://cliqz/content/new-tab-button/styles/xul.css';
    addStylesheet(this.window.document, this.cssUrl);
    this.panel.attach();

    maybe(this, 'button').then(button => {
      button.addEventListener('mouseover', this.onMouseOver);
      button.addEventListener('mouseout', this.onMouseOut);
    });
  }

  unload() {
    removeStylesheet(this.window.document, this.cssUrl);

    maybe(this, 'button').then(button => {
      button.removeEventListener('mouseover', this.onMouseOver);
      button.addEventListener('mouseout', this.onMouseOut);

      this.panel.deattach();
    });
  }

  onMouseOver() {
    maybe(this, 'button').then(button => {
      //this.panel.open(button);
    });
  }

  onMouseOut() {
    //this.panel.hide();
  }

  button() {
    return this.window.document.getAnonymousElementByAttribute(
      this.window.gBrowser.tabContainer, 'anonid', 'tabs-newtab-button');
  }
}
