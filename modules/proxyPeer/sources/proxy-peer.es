import { fetch, Request } from '../core/http';

import CliqzPeer from '../p2p/cliqz-peer';
import { createHiddenWindow, destroyHiddenWindow } from '../p2p/utils';

import console from './console';
import MessageQueue from './message-queue';
import SocksProxy from './socks-proxy';
import RTCRelay from './rtc-relay';
import RTCToNet from './rtc-to-net';
import SocksToRTC from './socks-to-rtc';
import { decryptPayload } from './rtc-onion';


function post(url, payload) {
  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const request = new Request(url, {
    headers,
    method: 'POST',
    body: JSON.stringify(payload) });
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        return Promise.resolve();
      }
      return Promise.reject();
    });
}


export default class {
  constructor() {
    // Create a socks proxy
    this.socksProxy = new SocksProxy();
    this.peer = null;
    this.ppk = null;

    this.socksToRTC = null;
    this.rtcRelay = null;
    this.rtcToNet = null;
  }

  createPeer(window) {
    return CliqzPeer.generateKeypair()
      .then((ppk) => { this.ppk = ppk; })
      .then(() => {
        this.peer = new CliqzPeer(window, this.ppk, {
          ordered: true,
          brokerUrl: 'ws://p2p-signaling-102182689.us-east-1.elb.amazonaws.com:9666',
          maxReconnections: 0,
          maxMessageRetries: 0,
        });

        // Add message listener
        this.peer.onmessage = (message, label, peer) => this.handleNewMessage(message, peer);
      })
      .then(() => this.peer.createConnection())
      .then(() => post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
        pk: this.ppk[0],
        name: this.peer.peerID,
        ver: '0.6',
      }))
      .then(() => this.peer.socket.close())
      .then(() => post('https://hpn-sign.cliqz.com/registerPeerProxy/', {
        name: this.peer.peerID,
        ver: '0.6',
      }));
  }

  init() {
    // Init peer and register it to the signaling server
    return createHiddenWindow()
      .then(window => this.createPeer(window))
      .then(() => {
        // Client
        this.socksToRTC = new SocksToRTC(this.peer, this.socksProxy);
        this.clientQueue = MessageQueue(
          'client',
          ({ msg }) => this.socksToRTC.handleClientMessage(msg),
        );

        // Relay
        this.rtcRelay = new RTCRelay();
        this.relayQueue = MessageQueue(
          'relay',
          ({ msg, message, peer }) =>
          this.rtcRelay.handleRelayMessage(
            message,     /* Original message */
            msg,         /* Decrypted message */
            this.peer,   /* Current peer */
            peer),       /* Sender */
        );

        // Exit
        this.rtcToNet = new RTCToNet();
        this.exitQueue = MessageQueue(
          'exit',
          ({ msg, peer }) =>
          this.rtcToNet.handleExitMessage(
            msg,          /* Decrypted message */
            this.peer,    /* Current peer */
            peer,         /* Sender */
            this.ppk[1]), /* Private key of current peer */
        );

        // All messages
        this.messages = MessageQueue(
          'all',
          ({ message, peer }) =>
          decryptPayload(message, this.ppk[1])
          .then((msg) => {
            // Every message must have these fields defined
            const connectionID = msg.connectionID;
            const role = msg.role;
            const data = {
              msg,
              message,
              peer,
            };

            // Push in corresponding message queue
            if (role === 'exit') {
              this.exitQueue.push(data);
            } else if (role === 'relay') {
              if (msg.nextPeer || this.rtcRelay.isOpenedConnection(connectionID, peer)) {
                this.relayQueue.push(data);
              } else {
                this.clientQueue.push(data);
              }
            }
          })
          .catch(ex => console.debug(`proxyPeer ProxyPeer error: ${ex}`)),
        );
      });
  }

  getSocksProxyHost() {
    return this.socksProxy.getHost();
  }

  getSocksProxyPort() {
    return this.socksProxy.getPort();
  }

  unload() {
    this.socksProxy.unload();
    this.peer.disableSignaling();
    this.peer.destroy();
    destroyHiddenWindow();
    this.peer = null;
  }

  handleNewMessage(message, peer) {
    this.messages.push({ message, peer });
  }
}
