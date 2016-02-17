import config from "core/config";

export default {
  init(settings) {
  	Object.keys(settings).forEach( key => {
  		config[key] = settings[key];
  	});
  },
  unload() {
  }
}
