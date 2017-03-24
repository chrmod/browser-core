import CliqzUtils from 'core/utils';
import Crypto from 'pairing/crypto';
import console from 'core/console';
import { encryptPairedMessage, decryptPairedMessage, ERRORS } from 'pairing/shared';
import CliqzPeer from 'p2p/cliqz-peer';
import fetch from 'platform/fetch';

// This class has the responsibility of handling the desktop-mobile pairing.
// It should be agnostic of concrete features, just providing the infrastructure
// for pairing, unpairing, sending messages to other devices, receiving messages and
// dispatching them, etc.

export default class CliqzPairing {
  // COMM
  static get STATUS_UNPAIRED() {
    return 0;
  }

  static get STATUS_PAIRED() {
    return 1;
  }

  static get STATUS_PAIRING() {
    return 2;
  }

  waitInit() {
    if (this.isInit) {
      return Promise.resolve();
    }
    if (this.isUnloaded) {
      return Promise.reject();
    }
    return this.initPromise;
  }

  generateKeypair() {
    return CliqzPeer.generateKeypair()
      .then((keypair) => {
        this.keypair = keypair;
        return Crypto.sha256(this.keypair[0]);
      })
      .then((deviceID) => {
        this.deviceID = deviceID;
      });
  }
  // data will generally be an auto-persisting object
  // CliqzPeer is the p2p client library constructor (passed to avoid dealing with
  // hidden window loading, etc)
  initComm(window, data) {
    this.pairingTimeout = 30; // 30 seconds
    this.window = window;
    this.data = data;

    this.onpairing = null;
    this.onpaired = null;
    this.onunpaired = null;
    this.onmessage = null;
    this.onerror = null;
    this.ondeviceadded = null;
    this.ondeviceremoved = null;
    this.onmasterconnected = null;
    this.onmasterdisconnected = null;
    if (this.masterID) {
      this.setPaired(this.masterID, this.devices);
      this.checkMasterConnection();
    } else {
      this.setUnpaired(true);
    }
    // TODO: is this really a good idea? are we doing it too often?
    // this.connectionKeeper = CliqzUtils.setInterval(
    //   this.checkMasterConnection.bind(this),
    //   60000
    // );
    return Promise.resolve();
  }

  unloadComm() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
      this.destroyed = true;
    }
    this.onpairing = null;
    this.onpaired = null;
    this.onunpaired = null;
    this.onmessage = null;
    this.onerror = null;
    this.ondeviceadded = null;
    this.ondeviceremoved = null;
    this.onmasterconnected = null;
    this.onmasterdisconnected = null;
    CliqzUtils.clearInterval(this.connectionKeeper);
    this.connectionKeeper = null;
  }

  stopPairing() {
    if (this.status !== CliqzPairing.STATUS_PAIRING) {
      throw new Error('Cannot stop pairing if not pairing');
    }
    if (!this.pairingToken) {
      this.cancelPairing = true;
    } else {
      this.setUnpaired();
    }
  }

  get deviceID() {
    return this.data.get('deviceID');
  }

  set deviceID(id) {
    this.data.set('deviceID', id);
  }

  unpair() {
    if (this.status !== CliqzPairing.STATUS_PAIRED) {
      throw new Error('Cannot unpair if status is not paired');
    }
    const promise = new Promise((resolve, reject) => {
      CliqzUtils.setTimeout(reject, 1000);
      this.sendMessage({}, 'remove_peer', [this.masterID])
        .then(resolve)
        .catch(reject);
    });
    return promise
      .catch(e => this.log(e, 'ERROR unpairing'))
      .then(() => this.setUnpaired());
  }

  startPairing(slaveName) {
    if (this.status !== CliqzPairing.STATUS_UNPAIRED) {
      throw new Error('Only can start pairing if PeerComm status is unpaired');
    }
    this.setPairing(slaveName);
  }

  // private
  sendMessage(msg, type, targets) {
    if (this.status !== CliqzPairing.STATUS_PAIRED) {
      throw new Error('Only can send messages if PeerComm status is paired');
    }
    return this.sendPaired({ msg, type, source: this.deviceID }, targets);
  }

  checkMasterConnection() {
    if (this.status === CliqzPairing.STATUS_PAIRED) {
      return this.peer.checkPeerConnection(this.masterID)
      .catch(() =>
        this.wakeUpMaster()
        .then(() => new Promise(resolve => CliqzUtils.setTimeout(resolve, 3000)))
        .then(() => this.peer.checkPeerConnection(this.masterID)),
      );
    }
    return Promise.reject();
  }

  retrieveMessages() {
    if (this.status !== CliqzPairing.STATUS_PAIRED) {
      throw new Error('Cannot retrieve messages if PeerComm status is unpaired');
    }
    return this.sendMessage({}, 'receive_messages', [this.masterID]);
  }

  get isMasterConnected() {
    return this.isPaired && !!this.peer && !!this.peer._getConnection(this.masterID);
  }

  get isPaired() {
    return this.status === CliqzPairing.STATUS_PAIRED;
  }

  get isPairing() {
    return this.status === CliqzPairing.STATUS_PAIRING;
  }

  get isUnpaired() {
    return this.status === CliqzPairing.STATUS_UNPAIRED;
  }

  // Private ----
  get masterID() {
    return this.data.get('masterID');
  }
  set masterID(x) {
    this.data.set('masterID', x);
  }

  get aesKey() {
    return this.data.get('aesKey');
  }
  set aesKey(x) {
    this.data.set('aesKey', x);
  }

  get deviceName() {
    if (this.isPaired) {
      return this.devices.find(x => x.id === this.deviceID).name;
    }
    return null;
  }

  get devices() {
    return this.data.get('devices');
  }
  set devices(x) {
    this.data.set('devices', x);
  }

  get keypair() {
    return this.data.get('keypair');
  }
  set keypair(x) {
    this.data.set('keypair', x);
  }

  get masterName() {
    if (this.isPaired) {
      return this.devices.find(x => x.id === this.masterID).name;
    }
    return null;
  }

  get arn() {
    return this.data.get('arn');
  }

  set arn(x) {
    return this.data.set('arn', x);
  }

  get randomToken() {
    return this.data.get('randomToken');
  }

  set randomToken(x) {
    this.data.set('randomToken', x);
  }

  findDevice(deviceID) {
    return this.devices.find(x => x.id === deviceID);
  }

  static sendEncrypted(message, aesKey) {
    return Crypto.encryptStringAES(JSON.stringify(message), aesKey);
  }

  sendPaired(message, targets) {
    const devices = targets.map(x => this.findDevice(x)).filter(x => x);
    return this.checkMasterConnection() // TODO: we shouldn't do this for all messages, traffic!
    .then(() => encryptPairedMessage(message, devices))
    .then(encrypted => this.peer.send(this.masterID, encrypted));
  }

  static receiveEncrypted(data, aesKey) {
    return Crypto.decryptStringAES(data, aesKey)
      .then(message => JSON.parse(message));
  }

  loadPairingAESKey() {
    if (this.pairingAESKey) {
      return Promise.resolve(this.pairingAESKey);
    }
    if (this.randomToken) {
      const token = Crypto.toByteArray(this.randomToken, 'b64');
      return Crypto.deriveAESKey(token)
      .then(key => (this.pairingAESKey = key));
    }
    return Promise.reject(new Error('randomToken is null'));
  }

  onPairingMessage(data, label, peerID) {
    if (CliqzPeer.isPeerAuthenticated(peerID)) {
      this.loadPairingAESKey()
      .then(pairingAESKey => CliqzPairing.receiveEncrypted(data, pairingAESKey))
      .then((decrypted) => {
        try {
          if (decrypted.type === 'error') {
            this.onerror(decrypted.code);
            this.pairingMaster = peerID;
          } else {
            const { devices } = decrypted;
            this.setPaired(peerID, devices);
          }
        } catch (e) {
          this.log('Error in pairing 1 ', e);
        }
      })
      .catch((e) => {
        this.log('Error in pairing 2 ', e);
      });
    } else {
      this.log('ERROR: Peer is not authenticated');
    }
  }

  onPairedMessage(data, label, peerID) {
    if (peerID === this.masterID) {
      decryptPairedMessage(data, this.deviceID, this.peer.privateKey)
      .then(({ msg, type, source }) => this.receiveMessage(msg, type, source))
      .catch(() => {
        this.log('Error receiving encrypted message, unpairing...');
        this.setUnpaired();
        this.onerror(ERRORS.PAIRED_DECRYPTION_ERROR);
      });
    }
  }

  receiveMessage(msg, type, source) {
    if (type === '__NEWPEER') {
      this.log('New peer!!');
      this.addPeer(msg);
    } else if (type === '__REMOVEDPEER') {
      if (source === this.deviceID) {
        this.log('Unpaired from master!!');
        this.setUnpaired();
      } else {
        this.log('Removed peer!!');
        this.removePeer(source);
      }
    } else if (type === '__NEWARN') {
      this.arn = msg;
    } else if (this.onmessage) {
      this.onmessage(msg, source, type);
    }
  }

  wakeUpMaster() {
    const arn = this.arn;
    if (arn) {
      return fetch('https://p2p-pusher.cliqz.com/push', {
        method: 'post',
        body: JSON.stringify({ token: arn }),
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
      });
    }
    return Promise.reject(new Error('no arn found'));
  }

  addPeer(peer) {
    const idx = this.devices.findIndex(x => x.id === peer.id);
    if (idx >= 0) {
      this.data.apply('devices', 'splice', idx, 1);
    }
    this.data.apply('devices', 'push', peer);
    if (this.ondeviceadded) {
      this.ondeviceadded(peer);
    }
  }

  removePeer(id) {
    const idx = this.devices.findIndex(x => x.id === id);
    if (idx >= 0) {
      const rem = this.devices[idx];
      this.data.apply('devices', 'splice', idx, 1);
      if (this.ondeviceremoved) {
        this.ondeviceremoved(rem);
      }
    }
  }

  setPaired(masterID, devices) {
    this.initPeer();
    this.peer.onconnect = (peerID) => {
      if (peerID === this.masterID && this.onmasterconnected) {
        this.onmasterconnected();
      }
    };
    this.peer.ondisconnect = (peerID) => {
      if (peerID === this.masterID && this.onmasterdisconnected) {
        this.onmasterdisconnected();
      }
    };
    this.status = CliqzPairing.STATUS_PAIRED;
    this.peer.addTrustedPeer(masterID);
    this.peer.onmessage = this.onPairedMessage.bind(this);
    this.masterID = masterID;
    this.devices = devices;
    this.pairingMaster = null;
    this.pairingToken = null;
    CliqzUtils.clearInterval(this.pairingTimer);
    this.pairingTimer = null;
    this.pairingName = null;
    this.cancelPairing = false;
    if (this.onpaired) {
      this.onpaired(masterID, devices);
    }
  }

  setUnpaired(noTrigger) {
    this.status = CliqzPairing.STATUS_UNPAIRED;
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.deviceID = null;
    this.keypair = null;
    this.pairingAESKey = null;
    this.pairingToken = null;
    this.aesKey = null;
    this.masterID = null;
    this.devices = [];
    CliqzUtils.clearInterval(this.pairingTimer);
    this.pairingTimer = null;
    this.pairingName = null;
    this.pairingMaster = null;
    this.randomToken = null;
    this.cancelPairing = false;
    this.arn = null;
    if (this.onunpaired && !noTrigger) {
      this.onunpaired();
    }
  }

  generatePairingKey() {
    const token = Crypto.randomBytes(9);
    this.randomToken = Crypto.fromByteArray(token, 'b64');
    return this.loadPairingAESKey();
  }
  sendPairingMessage(masterID) {
    return this.loadPairingAESKey()
    .then(pairingAESKey =>
      CliqzPairing.sendEncrypted(
        [this.peer.publicKey, this.pairingName],
        pairingAESKey,
      ),
    )
    .then(encrypted => this.peer.send(masterID, encrypted));
  }
  retryPairingName(deviceName) {
    if (this.isPairing) {
      this.pairingName = deviceName;
      if (this.pairingMaster) {
        this.sendPairingMessage(this.pairingMaster);
      }
    }
  }
  setPairing(slaveName) {
    this.status = CliqzPairing.STATUS_PAIRING;
    this.pairingRemaining = this.pairingTimeout;
    this.pairingName = slaveName;
    this.pairingTimer = CliqzUtils.setInterval(() => {
      this.pairingRemaining -= 1;
      if (this.pairingRemaining <= 0) {
        if (this.isPairing) {
          this.stopPairing();
        }
      }
      if (this.onpairingtick) {
        this.onpairingtick(this.pairingRemaining);
      }
    }, 1000);

    Promise.all([
      this.generateKeypair(),
      this.generatePairingKey(),
    ])
      .then(() => {
        const p = this.initPeer();
        return p
        .then(() => {
          this.peer.onconnect = peerID => this.sendPairingMessage(peerID);

          this.peer.ondisconnect = null;
          this.peer.clearPeerWhitelist();
          this.peer.onmessage = this.onPairingMessage.bind(this);
          const b64 = Crypto.fromByteArray(Crypto.toByteArray(this.peer.peerID, 'hex'), 'b64');
          this.pairingToken = [b64, this.randomToken].join(':');
          if (this.onpairing) {
            this.onpairing(this.pairingToken);
          }
          if (this.cancelPairing) {
            this.setUnpaired();
          }
        });
      })
      .catch((e) => {
        // TODO: Errors here should be handled properly, server might be down, etc -> notifications
        // TODO: emit error
        this.log('Error in startPairing ', e);
        this.setUnpaired();
      });
  }

  initPeer() {
    if (!this.peer) {
      this.peer = new CliqzPeer(this.window,
        this.keypair,
        {
          DEBUG: this.debug,
          ordered: true,
          maxMessageRetries: 0,
        },
      );
      this.peer.setMessageSizeLimit(this.maxMsgSize);
      this.peer.encryptSignaling = data =>
        this.loadPairingAESKey()
        .then(aesKey => CliqzPairing.sendEncrypted(data, aesKey))
        .catch(() => data);

      this.peer.decryptSignaling = data =>
        this.loadPairingAESKey()
        .then(aesKey => CliqzPairing.receiveEncrypted(data, aesKey))
        .catch(() => data);
    }
    return this.peer.createConnection();
  }
  // !COMM

  constructor(debug = false) {
    this.maxMsgSize = 5 * 1024 * 1024;
    this.debug = debug;
    this.window = null;
    this.isInit = false;
    this.apps = new Map();
    this.initPromise = new Promise((resolve, reject) => {
      this.resolveInit = resolve;
      this.rejectInit = reject;
    });
    if (debug) {
      this.log = (...args) => console.log(...args);
    } else {
      this.log = () => {};
    }
  }

  // app is an object which can have several listeners, and will receive a 'comm' object, which
  // will allow it to send messages to one or many devices through its channel (a different string
  // for each app)
  // TODO: document this
  addApp(channel, app) {
    this.apps.set(channel, app);
    if (app.oninit && this.isInit) {
      app.oninit(...this.getOnInitArgs(channel));
    }
  }

  addObserver(channel, observer) {
    return this.addApp(channel, observer);
  }

  getApp(channel) {
    return this.apps.get(channel);
  }

  getObserver(channel) {
    return this.getApp(channel);
  }

  removeApp(channel, app) {
    if (this.apps.get(channel) === app) {
      this.apps.delete(channel);
    }
  }

  removeObserver(channel, observer) {
    return this.removeApp(channel, observer);
  }

  // Private -----
  propagateEvent(eventName, args) {
    this.apps.forEach((x) => {
      if (x[eventName]) {
        x[eventName](...args);
      }
    });
  }

  installEvent(eventName) {
    this[eventName] = (...args) => {
      this.propagateEvent(eventName, args);
    };
  }

  init(storage, window) {
    this.ss = storage;
    this.window = window;
    return this.initComm(this.window, this.ss)
      .then(() => {
        // These events will be directly propagated from this.comm to all the apps
        const events = [
          'onpairing',
          'onpaired',
          'onunpaired',
          'onerror',
          'ondeviceadded',
          'ondeviceremoved',
          'onmasterconnected',
          'onmasterdisconnected',
          'onpairingtick',
        ];
        events.forEach(e => this.installEvent(e));
        this.onmessage = (msg, source, type) => {
          const app = this.apps.get(type);
          if (app && app.onmessage) {
            app.onmessage(msg, source, type);
          }
        };
        this.apps.forEach((app, channel) => {
          if (app.oninit) {
            app.oninit(...this.getOnInitArgs(channel));
          }
        });
        this.resolveInit();
        this.isInit = true;
      })
      .catch((e) => {
        this.log('Error: ', e, 'PeerSlave.init');
        this.rejectInit(e);
      });
  }
  send(msg, channel, targets) {
    let t = targets;
    if (!t) {
      return Promise.resolve();
    }
    t = Array.isArray(t) ? t : [t];
    return this.sendMessage(msg, channel, t);
  }
  getOnInitArgs(channel) {
    const self = this;
    // This is the object each app will receive on init, and will be its interface to the
    // peer comm module. The app code itself has no dependency on us, but someone will need to
    // create the app and call CliqzPeerComm.addApp(channel, app)
    // TODO: this is just a proxy except for send!!!
    const comm = {
      send: (msg, targets) => self.send(msg, channel, targets),
      startPairing: slaveName => self.startPairing(slaveName),
      unpair: () => self.unpair(),
      stopPairing: () => self.stopPairing(),
      get devices() {
        return self.devices;
      },
      get isPaired() {
        return self.isPaired;
      },
      get isPairing() {
        return self.isPairing;
      },
      get isUnpaired() {
        return self.isUnpaired;
      },
      get masterID() {
        return self.masterID;
      },
      get deviceID() {
        return self.deviceID;
      },
      get deviceName() {
        return self.deviceName;
      },
      get pairingToken() {
        return self.pairingToken;
      },
      get pairingName() {
        return self.pairingName;
      },
      get pairingRemaining() {
        return self.pairingRemaining;
      },
      get masterName() {
        return self.masterName;
      },
      get isMasterConnected() {
        return self.isMasterConnected;
      },
    };
    return [comm];
  }
  unload() {
    this.apps.forEach((app) => {
      if (app.onunload) {
        app.onunload();
      }
    });
    this.apps.clear();
    this.unloadComm();
    this.window = null;
    this.isInit = false;
    this.isUnloaded = true;
    this.initPromises = [];
    return Promise.resolve();
  }
  pullMessages() {
    return this.retrieveMessages();
  }

  destroy() {
    this.unload(true);
  }
}
