import { utils } from "core/cliqz";
import Test from "mobile-dev/test";

export default class {
  constructor(settings) {
  	this.window = settings.window;
  }

  init() {
  	this.window.Test = Test;
  }

  unload() {}
}
