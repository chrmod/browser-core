import UI from './ui';

export default class {
  constructor(config) {
    this.window = config.window;
  }

  init() {
    // The UI's constructor receives Peercomm as the first param.
    // If pairing module is available, we pass it.
    // If not, we pass a null value.
    // So this video-downloader module could work
    // with/without 'pairing' module.
    CLIQZ.System.import('pairing/main')
    .then(x => (this.PeerComm = x.default))
    .catch(() => {})
    .then(() => {
      this.UI = new UI(this.PeerComm, this.window);
      this.UI.init();
    });
  }

  unload() {
    if (this.UI) {
      this.UI.unload();
    }
  }
}
