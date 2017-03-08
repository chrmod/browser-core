import CliqzMasterComm from 'mobile-pairing/cliqz-master-comm';
import YoutubeApp from 'pairing/apps/youtube';
import TabsharingApp from 'pairing/apps/tabsharing';
import PingPongApp from 'pairing/apps/pingpong';
import PairingObserver from 'pairing/apps/pairing-observer';
import CliqzUtils from 'core/utils';

export default {
  init() {
    const pingpong = new PingPongApp(
      () => {},
      (source) => CliqzUtils.log(`Received PING from ${source}`),
      (source) => CliqzUtils.log(`Received PONG from ${source}`)
    );
    CliqzMasterComm.addApp('PINGPONG', pingpong);

    const youtube = new YoutubeApp(
      () => {},
      ({ url, title, format }) => {
        osAPI.downloadVideo({ url, filename: `${title || 'YouTube video'}.${format}` });
      }
    );
    CliqzMasterComm.addApp('YTDOWNLOADER', youtube);

    const tabsharing = new TabsharingApp(
      () => {},
      (tabs, source) => {
        CliqzUtils.log(`Received tabs ${tabs} from ${source}`);
        osAPI.openTab(tabs);
      }
    );
    CliqzMasterComm.addApp('TABSHARING', tabsharing);

    const observer = new PairingObserver(() => {
      osAPI.pushPairingData(CliqzMasterComm.pairingData);
    });
    observer.onpairingerror = (error) => {
      osAPI.notifyPairingError({ error });
    };
    CliqzMasterComm.addApp('__MOBILEUI', observer);

    this.arnChecker = CliqzUtils.setInterval(() => {
      if (!CliqzMasterComm.arn) {
        osAPI.deviceARN('setDeviceARN');
      }
    }, 10000); // TODO: probably this is not the best way to do it.

    return CliqzMasterComm.init(window.localStorage, window)
    .then(x => {
      if (!CliqzMasterComm.arn) {
        osAPI.deviceARN('setDeviceARN');
      }
    });
  },
  unload() {
    CliqzUtils.clearInterval(this.arnChecker);
    CliqzMasterComm.unload();
  },
};
