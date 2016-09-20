import Storage from "core/storage";
import utils from "core/utils";
import ABTests from "core/ab-tests";

export default class {

  constructor(settings) {
  	this.window = settings.window;
    this.actions = {
      addClassToWindow: this.addClassToWindow.bind(this),
      removeClassFromWindow: this.removeClassFromWindow.bind(this)
    }
  }

  init() {
    ABTests.check();
  }

  unload() {
  }

  addClassToWindow() {
    var args = [].slice.call(arguments);
    var mainWindow = this.window.document.getElementById('main-window');
    args.forEach(function(aClass) {
      mainWindow.classList.add(aClass);
    });
  }

  removeClassFromWindow() {
    var args = [].slice.call(arguments);
    var mainWindow = this.window.document.getElementById('main-window');
      args.forEach(function(aClass) {
        mainWindow.classList.remove(aClass);
      });
  }
}
