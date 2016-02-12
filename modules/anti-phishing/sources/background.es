import AntiPhishing from "anti-phishing/anti-phishing";

export default {
  init(settings) {
    AntiPhishing.init();
  },

  unload() {
    AntiPhishing.unload();
  }
}
