import MockOS from "mobile-dev/MockOS"

export default {
  init(settings) {
  	window.MockOS = MockOS;
  },

  unload() {

  }
}