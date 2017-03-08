/* eslint-disable camelcase */
/* global USERAGENT */
// TODO: try to use existing useragent library, see if the newer version gets more phone
// device names

import MessageStorage from 'pairing/message-storage';
import CliqzCrypto from 'pairing/crypto';
import crypto from 'platform/crypto';
import console from 'core/console';
import utils from 'core/utils';
import fetch from 'platform/fetch';
import { encryptPairedMessage, decryptPairedMessage, ERRORS, getMessageTargets } from 'pairing/shared';
import { base64_encode, base64_decode, hex_decode } from 'p2p/internal/utils';
import CliqzPeer from 'p2p/cliqz-peer';

function has(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const maxSize = 5 * 1024 * 1024; // 1MB message limit (for masterPeer and MessageStorage)

export default class PeerMaster {
  constructor(debug = false) {
    this.pushTime = 1000;
    this.debug = debug;
    this.apps = new Map();
    this.logError = console.error.bind(console);
    if (debug) {
      this.log = console.log.bind(console);
    } else {
      this.log = () => {};
    }
    this.pairingTimeout = 10000;
  }
  setObject(key, object) {
    this.storage.setItem(key, JSON.stringify(object));
  }
  getObject(key, notFound = false) {
    const o = this.storage.getItem(key);
    if (o) {
      return JSON.parse(o);
    }
    return notFound;
  }
  getStorage(key) {
    return this.storage ? this.getObject(this.storagePrefix + key, null) : null;
  }
  setStorage(key, value) {
    return this.setObject(this.storagePrefix + key, value);
  }
  clearStorage(key) {
    return this.storage.removeItem(this.storagePrefix + key);
  }
  get keypair() {
    return this.getStorage('keypair');
  }
  get privateKey() {
    return this.keypair[1];
  }

  get publicKey() {
    return this.keypair[0];
  }

  get peerID() {
    if (this.masterPeer) {
      return this.masterPeer.peerID;
    }
    return null;
  }

  get pairingData() {
    const slaves = (this.slaves || []).map(({ name, peerID }) => {
      const isConnected = this.masterPeer && this.masterPeer.isPeerConnected(peerID);
      return { name, id: peerID, status: isConnected ? 'connected' : 'disconnected' };
    });
    const pairing = Object.keys(this.pairingDevices).map(peerID => ({ peerID, status: 'pairing' }));
    return {
      devices: slaves.concat(pairing),
    };
  }

  get arn() {
    return this.getStorage('arn');
  }

  __unloadSlaves() {
    this.slavesByName = this.slavesById = {};
    this.slaves = [];
  }

  __loadSlaves() {
    this.slaves = this.getStorage('__slaves') || [];
    this.slaves.forEach((slave) => {
      this.slavesById[slave.peerID] = slave;
      this.slavesByName[slave.name] = slave;
    });
  }

  __addSlave(name, peerID, publicKey, randomToken) {
    const slave = {
      name,
      peerID,
      publicKey,
      randomToken,
    };
    this.slaves.push(slave);
    this.slavesById[slave.peerID] = slave;
    this.slavesByName[slave.name] = slave;
    this.setStorage('__slaves', this.slaves);
    this.enableMasterPeerIfNeeded();
    return slave;
  }

  __removeSlaveById(peerID) {
    if (has(this.slavesById, peerID)) {
      const slave = this.slavesById[peerID];
      this.slaves.splice(this.slaves.indexOf(slave), 1);
      delete this.slavesByName[slave.name];
      delete this.slavesById[slave.peerID];
      this.setStorage('__slaves', this.slaves);
      this.disableMasterPeerIfNeeded();
    }
  }

  generateKey() {
    return crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: { name: 'SHA-256' },
      },
      true,
      ['sign', 'verify'],
    )
    .then(key => crypto.subtle.exportKey('jwk', key.privateKey))
    .then(key =>
      this.setStorage('keypair', CliqzPeer.privateKeytoKeypair(CliqzCrypto.exportPrivateKey(key))),
    )
    .catch(e => this.log(e));
  }
  init(storage, window) {
    this.window = window;
    // TODO: do platform independent (now is specific to mobile, needs useragent.js library)
    const info = typeof USERAGENT !== 'undefined' ?
      USERAGENT.analyze(this.window.navigator.userAgent) : { os: {}, device: {} };
    const osInfo = info.os.full || 'Unknown OS';
    const deviceInfo = info.device.full || 'Unknown device';
    this.masterName = `${deviceInfo} (${osInfo})`;
    this.storage = storage;
    // to take into account message marshalling overhead
    this.msgStorage = new MessageStorage(storage, maxSize / 2);
    this.masterPeer = null;
    this.slavesByName = {};
    this.slavesById = {};
    this.slaves = [];
    this.pairingDevices = {};
    this.storagePrefix = 'PEERMASTER_';

    return Promise.resolve()
    .then(() => this.__loadSlaves())
    .then(() => {
      if (!this.keypair) {
        return this.generateKey();
      }
      return null;
    })
    .then(() => this.enableMasterPeerIfNeeded())
    .then(() => {
      this.isInit = true;
      this.apps.forEach((app, channel) => {
        if (app.oninit) {
          app.oninit(...this.getOnInitArgs(channel));
        }
      });
      this.pushInterval = utils.setInterval(this.messagePusher.bind(this), this.pushTime);
    });
  }

  unload(destroy = false) {
    utils.clearInterval(this.pushInterval);
    this.pushInterval = null;
    return Promise.resolve()
      .then(() => {
        const p = this.masterPeer;
        this.masterPeer = null;
        return p ? p.destroy() : null;
      })
      .then(() => {
        this.apps.forEach((app) => {
          if (app.onunload) {
            app.onunload();
          }
        });
        this.apps.clear();
        if (destroy) {
          this.clearStorage('__slaves');
          this.clearStorage('keypair');
          this.storage = null;
          return this.msgStorage.destroy();
        }
        this.storage = null;
        return null;
      })
      .then(() => this.__unloadSlaves());
  }

  destroy() {
    return this.unload(true);
  }

  sendMessage(slaveID, msg) {
    if (has(this.slavesById, slaveID)) {
      return this.masterPeer.send(slaveID, msg);
    }
    return Promise.reject('unknown slaveName');
  }

  sendMessages(slaveID, msgs) {
    return Promise.all(msgs.map(x => this.sendMessage(slaveID, x)));
  }

  pushEncryptedMessage(data) {
    const targets = getMessageTargets(data);
    targets.forEach(([peerID]) => {
      if (peerID === this.peerID) {
        decryptPairedMessage(
          data,
          peerID,
          this.privateKey,
        )
        .then(({ type, msg, source }) => this.processMessageForMe(type, msg, source));
      } else {
        // TODO: should we only send to open connections?
        this.sendMessage(peerID, data)
        .catch(() => {
          // If we fail sending the message, then store it.
          try {
            this.msgStorage.pushPeerMessage(base64_encode(data), peerID);
          } catch (e) {
            this.log(e, 'Failed storing message');
          }
        });
      }
    });
  }

  // TODO: push more than once message? maybe now it's too slow...
  messagePusher() {
    if (this.pushingMessages) {
      return;
    }
    this.pushingMessages = true;
    Promise.resolve()
    .then(() => {
      if (!this.masterPeer) {
        return Promise.resolve();
      }
      const conn = Object.keys(this.masterPeer.connections);
      if (conn.length === 0) {
        return Promise.resolve();
      }
      this.pushingPeer = ((this.pushingPeer || 0) + 1) % conn.length;
      const peer = conn[this.pushingPeer];
      const messages = this.msgStorage.getMessages(peer);
      if (messages && messages.length) {
        return this.sendMessage(peer, base64_decode(messages[0]))
        .then(() => this.msgStorage.popPeerMessage(peer));
      }
      return Promise.resolve();
    })
    .catch(() => {})
    .then(() => {
      this.pushingMessages = false;
    });
  }

  static get EXPIRY_DAYS() {
    // TODO: change to sth lower, and refresh more often
    return 365;
  }

  static encryptARN(arn, publicKey) {
    const ts = Math.floor(Date.now() / 1000) + (PeerMaster.EXPIRY_DAYS * 3600 * 24);
    const data = new Uint8Array(20);
    const hexArn = arn.replace(/-/g, '');
    if (hexArn.length !== 32) {
      return Promise.reject(new Error('arn length is not 32'));
    }
    data.set(hex_decode(hexArn));
    new DataView(data.buffer).setInt32(16, ts, true);
    const cleanPK = publicKey.split('\n').filter(x => x.trim() && !x.includes('-')).join('');
    return CliqzCrypto.rawEncryptRSA(data, cleanPK)
    .then(x => base64_encode(x));
  }

  setDeviceARN(arn) {
    if (arn) {
      this.setStorage('arn', arn);
      // TODO: perhaps too many ARN notifications?
      const ids = this.devices.map(x => x.id).filter(x => x !== this.peerID);
      this.notifyARN(ids);
    }
  }

  pushMessage(msg, source, type, targets) {
    let t = targets;
    if (!t || t.length === 0) {
      t = this.getTrustedDevices();
    }
    const devices = this.devices.filter(x => t.indexOf(x.id) !== -1);
    return encryptPairedMessage({ msg, source, type }, devices)
    .then(encrypted => this.pushEncryptedMessage(encrypted))
    .catch((e) => {
      this.log('Error pushing message', e);
    });
  }

  get devices() {
    return this.getTrustedDevices().map(x => ({
      id: x,
      name: x === this.peerID ? this.masterName : this.slavesById[x].name,
      publicKey: x === this.peerID ? this.publicKey : this.slavesById[x].publicKey,
    }));
  }

  notifyNewPeer(peerID) {
    this.pushMessage(this.devices.find(x => x.id === peerID), peerID, '__NEWPEER');
    this.notifyARN([peerID]);
  }

  notifyARN(deviceIDS) {
    const arn = this.arn;
    if (arn) {
      // TODO: cache public key
      return fetch('https://p2p-pusher.cliqz.com/pk')
      .then(response => response.json())
      .then(({ publicKey }) => PeerMaster.encryptARN(arn, publicKey))
      .then(token => this.pushMessage(token, this.peerID, '__NEWARN', deviceIDS));
    }
    return Promise.reject(new Error('no arn found'));
  }

  changeDeviceName(peerID, newName) {
    const slave = this.slavesById[peerID];
    if (slave) {
      // TODO: refactor
      PeerMaster.checkDeviceName(newName);
      delete this.slavesByName[slave.name];
      const uniqueDeviceName = this.getUniqueDeviceName(newName);
      slave.name = uniqueDeviceName;
      this.slavesByName[uniqueDeviceName] = slave;
      this.setStorage('__slaves', this.slaves);
      this.notifyNewPeer(peerID);
    }
  }

  static checkDeviceName(deviceName) {
    if (deviceName.length === 0) {
      throw new Error(ERRORS.PAIRING_DEVICE_NAME_EMPTY);
    }
    if (deviceName.length > 32) {
      throw new Error(ERRORS.PAIRING_DEVICE_NAME_TOOLONG);
    }
  }

  processPairingMessage(peerID, publicKey, deviceName, { randomToken }) {
    this.log(`Registering Slave: ${deviceName} ${peerID}`);
    return CliqzCrypto.sha256(publicKey)
    .then((h) => {
      // Error handling
      if (h !== peerID) {
        throw new Error(ERRORS.PAIRING_PUBLICKEY_MISMATCH);
      }

      PeerMaster.checkDeviceName(deviceName);
      const uniqueDeviceName = this.getUniqueDeviceName(deviceName);

      if (has(this.slavesById, peerID)) {
        this.__removeSlaveById(peerID);
        this.msgStorage.clearMessages(peerID);
      }
      this.__addSlave(uniqueDeviceName, peerID, publicKey, randomToken);
      this.msgStorage.addPeer(peerID);
      this.removePairingDevice(peerID);
      const devices = this.devices;

      return this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.sendEncrypted({ devices }, aesKey))
      .then(encrypted => this.masterPeer.send(peerID, encrypted))
      .then(() => {
        this.propagateEvent('ondeviceadded', [{ id: peerID, name: uniqueDeviceName }]);
        // TODO: check failures here
        this.notifyNewPeer(peerID);
      });
    })
    .catch((e) => {
      this.logError(e, 'Error pairing');
      this.__removeSlaveById(peerID);
      this.msgStorage.clearMessages(peerID);
      this.removePairingDevice(peerID);
      this.notifyPairingError();
    });
  }

  processMessageForMe(type, msg, source) {
    if (type === '__NEWPEER') {
      this.log('New peer!!');
      // this.addPeer(source);
    } else if (type === '__REMOVEDPEER') {
      this.log('Removed peer!!');
      // this.removePeer(source);
    } else if (type === 'receive_messages') {
      // this._sendPendingMessages(source);
    } else if (type === 'remove_peer') {
      this._removePeer(source);
    } else {
      this.log(msg, 'Handling message!!!');
      const app = this.apps.get(type);
      if (app && app.onmessage) {
        app.onmessage(msg, source, type);
      }
    }
  }
  processMessage(data, label, peerID) {
    if (has(this.slavesById, peerID)) {
      this.pushEncryptedMessage(data);
    } else if (has(this.pairingDevices, peerID)) {
      const device = this.pairingDevices[peerID];
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.receiveEncrypted(data, aesKey))
      .then((decrypted) => {
        const [publicKey, deviceName] = decrypted;
        return this.processPairingMessage(peerID, publicKey, deviceName, device);
      })
      .catch((e) => {
        this.log('Error receiving pairing message', e);
        this.removePairingDevice(peerID);
        this.notifyPairingError();
      });
    } else {
      this.log('ERROR: unknown peerID', peerID);
    }
  }

  loadPairingAESKey(peerID) {
    const device = this.pairingDevices[peerID] || this.slavesById[peerID];
    if (device && device.randomToken) {
      const random = CliqzCrypto.toByteArray(device.randomToken, 'b64');
      return CliqzCrypto.deriveAESKey(random);
    }
    return Promise.reject(new Error(`loadPairingAESKey: unknown peer ${peerID}`));
  }

  // Assuming keypair is already generated
  enableMasterPeerIfNeeded() {
    if (this.masterPeer) {
      return Promise.resolve();
    }
    this.masterPeer = new CliqzPeer(this.window,
      this.keypair,
      {
        DEBUG: this.debug,
      },
    );

    this.masterPeer.encryptSignaling = (data, peerID) =>
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.sendEncrypted(data, aesKey))
      .catch(() => data);

    this.masterPeer.decryptSignaling = (data, peerID) =>
      this.loadPairingAESKey(peerID)
      .then(aesKey => PeerMaster.receiveEncrypted(data, aesKey))
      .catch(() => data);

    this.masterPeer.onmessage = this.processMessage.bind(this);
    this.masterPeer.setMessageSizeLimit(maxSize);
    this.masterPeer.onconnect = (peerID) => {
      this.propagateEvent('statusChanged');
      if (has(this.slavesById, peerID)) {
        // Nothing
      } else if (!has(this.pairingDevices, peerID)) {
        this.log('Unknown peer', peerID);
      }
    };
    this.masterPeer.ondisconnect = (peer) => {
      this.log('Connection with', peer, 'was closed');
      this.removePairingDevice(peer, true);
      this.disableMasterPeerIfNeeded();
      this.propagateEvent('statusChanged');
    };

    // We try to create a connection with all our slaves at startup
    return this.masterPeer.createConnection().then(() => {
      this.getTrustedDevices().forEach((slaveID) => {
        if (slaveID !== this.peerID) {
          this.masterPeer.addTrustedPeer(slaveID);
          this.masterPeer.connectPeer(slaveID)
          .catch(() => {});
        }
      });
    });
  }

  disableMasterPeerIfNeeded() {
    const numPairing = Object.keys(this.pairingDevices).length;
    const numDevices = Object.keys(this.slaves).length;
    if (numPairing === 0 && numDevices === 0) {
      if (this.masterPeer) {
        this.masterPeer.destroy();
        this.masterPeer = null;
      }
    }
  }

  addPairingDevice(deviceID, data) {
    this.pairingDevices[deviceID] = data;
    this.enableMasterPeerIfNeeded();
    this.masterPeer.addTrustedPeer(deviceID);
    this.masterPeer.connectPeer(deviceID);
    utils.setTimeout(() => this.removePairingDevice(deviceID, true), this.pairingTimeout);
    this.propagateEvent('statusChanged');
  }

  notifyPairingError(error = 1) {
    this.propagateEvent('onpairingerror', [error]);
    this.propagateEvent('statusChanged');
  }

  removePairingDevice(deviceID, error = false) {
    if (has(this.pairingDevices, deviceID)) {
      delete this.pairingDevices[deviceID];
      if (this.masterPeer && !has(this.slavesById, deviceID)) {
        this.masterPeer.removeTrustedPeer(deviceID);
      }
      this.disableMasterPeerIfNeeded();
      if (error) {
        this.notifyPairingError();
      }
    }
  }

  _removePeer(deviceID) {
    const slave = this.slavesById[deviceID];
    const deviceName = slave && slave.name;
    this.unregisterSlave(deviceID);
    this.pushMessage({}, deviceID, '__REMOVEDPEER');
    this.propagateEvent('ondeviceremoved', [{ id: deviceID, name: deviceName }]);
  }

  // Use this to unpair device from mobile
  unpair(deviceID) {
    const promise = new Promise((resolve, reject) => {
      utils.setTimeout(reject, 1000);
      this.pushMessage({}, deviceID, '__REMOVEDPEER', [deviceID])
        .then(resolve)
        .catch(reject);
    });
    return promise
      .catch(() => {})
      .then(() => this._removePeer(deviceID));
  }

  qrCodeValue(value) {
    try {
      const [id64, randomToken] = value.split(':');
      const deviceID = CliqzCrypto.fromByteArray(CliqzCrypto.toByteArray(id64, 'b64'), 'hex');
      if (CliqzPeer.isPeerAuthenticated(deviceID)) {
        this.addPairingDevice(deviceID, { randomToken });
      } else {
        throw new Error('slave peerID must be authenticated (64 chars)');
      }
    } catch (e) {
      this.notifyPairingError();
    }
  }

  propagateEvent(eventName, args) {
    this.apps.forEach((x) => {
      if (x[eventName]) {
        x[eventName](...args);
      }
    });
  }

  static sendEncrypted(message, aesKey) {
    return CliqzCrypto.encryptStringAES(JSON.stringify(message), aesKey);
  }

  static receiveEncrypted(data, aesKey) {
    return CliqzCrypto.decryptStringAES(data, aesKey)
    .then(message => JSON.parse(message));
  }

  unregisterSlave(deviceID) {
    if (has(this.slavesById, deviceID)) {
      this.msgStorage.removePeer(deviceID);
      if (this.masterPeer) this.masterPeer.removeTrustedPeer(deviceID);
      this.__removeSlaveById(deviceID);
    }
  }

  getTrustedDevices() {
    return this.slaves.map(slave => slave.peerID).concat(this.peerID);
  }

  getUniqueDeviceName(deviceName) {
    let name = deviceName;
    let cnt = 2;
    while (!name || has(this.slavesByName, name)) {
      name = `${deviceName} (${cnt})`;
      cnt += 1;
    }
    return name;
  }

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

  getOnInitArgs(channel) {
    const self = this;
    const comm = {
      send(msg, targets) {
        let t = targets;
        if (t && !Array.isArray(t)) {
          t = [t];
        }
        return self.pushMessage(msg, self.peerID, channel, t);
      },
      unpair(deviceID) {
        return self.unpair(deviceID);
      },
      get devices() {
        return self.getTrustedDevices();
      },
      get masterName() {
        return self.masterName;
      },
    };
    return [comm];
  }
}
