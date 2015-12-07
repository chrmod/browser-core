export default class {

  constructor(settings) {
    this.window = settings.window;
  }

  init() {
    Services.scriptloader.loadSubScript(
      'chrome://cliqz/content/users1st/users1st.js', this.window);
  }

  unload() { }
}
