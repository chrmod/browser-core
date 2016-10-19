import maybe from '../core/helpers/maybe';
import Panel from '../core/ui/panel';

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.onMouseOver = this.onMouseOver.bind(this);
    this.panel = new Panel(
      this.window,
      'chrome://cliqz/content/new-tab-button/index.html',
      'new-tab-button-panel'
    );
    this.onMouseOver = this.onMouseOver.bind(this);
    this.onMouseOut = this.onMouseOut.bind(this);
  }

  init() {
    this.panel.attach();
    maybe(this, 'button').then(button => {
      button.addEventListener('mouseover', this.onMouseOver);
      button.addEventListener('mouseout', this.onMouseOut);
    });
  }

  unload() {
    maybe(this, 'button').then(button => {
      button.removeEventListener('mouseover', this.onMouseOver);
      button.addEventListener('mouseout', this.onMouseOut);
      this.panel.deattach();
    });
  }

  onMouseOver() {
    maybe(this, 'button').then(button => {
      this.panel.open(button);
    });
  }

  onMouseOut() {
    this.panel.hide();
  }

  button() {
    return this.window.document.getAnonymousElementByAttribute(
      this.window.gBrowser.tabContainer, 'class', 'tabs-newtab-button');
  }
}
