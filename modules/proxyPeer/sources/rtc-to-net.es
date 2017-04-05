
import { utils } from '../core/cliqz';
// import md5 from 'core/helpers/md5';

import logger from './logger';
import { openSocket } from './tcp-socket';
import { SERVER_REPLY
       , parseRequest } from './socks-protocol';
import { unwrapAESKey, b64Decode } from './rtc-crypto';
import { createResponseFromExitNode } from './rtc-onion';
import MessageQueue from './message-queue';


function hashConnectionID(connectionID /* , peerID */) {
  // TODO: Remove after debug
  // TODO: Make sure hash is used everywhere instead of connectionID
  // (except when connectionID is needed like in send to client via Relay)
  return connectionID;
  // return md5(peerID.concat('::::').concat(connectionID));
}


export default class {
  constructor() {
    // {connectionID => TcpConnection} in case of exit node, keep connection to server opened
    this.outgoingTcpConnections = new Map();

    // Keep some statistics
    this.receivedMessages = 0;
    this.droppedMessages = 0;

    this.dataIn = 0; // updated in proxy-peer.es
    this.dataOut = 0;

    // Display health check
    this.healthCheck = utils.setInterval(
      () => {
        logger.log(`RTCToNet healthcheck ${JSON.stringify(this.healthcheck())}`);
      },
      60 * 1000);

    // Clean-up dead connections
    this.closeDeadConnections = utils.setInterval(
      () => {
        const timestamp = Date.now();
        [...this.outgoingTcpConnections.keys()].forEach((connectionID) => {
          const { socket, lastActivity } = this.outgoingTcpConnections.get(connectionID);
          if (lastActivity < (timestamp - (1000 * 15))) {
            logger.debug(`EXIT ${connectionID} garbage collect`);
            this.outgoingTcpConnections.delete(connectionID);

            try {
              socket.close();
            } catch (e) {
              logger.error(`EXIT ${connectionID} exception while garbage collecting ${e}`);
            }
          }
        });
      },
      10 * 1000);
  }

  healthcheck() {
    return {
      receivedMessages: this.receivedMessages,
      droppedMessages: this.droppedMessages,
      dataIn: `${(this.dataIn / 1048576).toFixed(2)} MB`,
      dataOut: `${(this.dataOut / 1048576).toFixed(2)} MB`,
      currentOpenedConnections: this.outgoingTcpConnections.size,
    };
  }

  stop() {
    utils.clearInterval(this.closeDeadConnections);
    utils.clearInterval(this.healthCheck);
  }

  handleExitMessage(message, peer, sender, peerPrivKey) {
    try {
      this.receivedMessages += 1;

      const connectionID = message.connectionID;
      const connectionHash = hashConnectionID(connectionID, sender);

      if (!this.outgoingTcpConnections.has(connectionHash) && message.messageNumber === 1) {
        return this.openNewConnection(message, peer, sender, connectionHash, peerPrivKey);
      }

      return this.relayToOpenedConnection(message, connectionHash);
    } catch (ex) {
      return Promise.reject(ex);
    }
  }

  /* This step is the `request` of the SOCKS5 protocol. A request from the client
   * is contained in message. We parse it to extract information about endpoint
   * and then open a new TCP connection to it.
   *
   * @param {Object} message - Message received through data channel.
   * @param {CliqzPeer} peer -
   * @param {String} sender - ID of peer that sent this message.
   * @param {String} connectionHash - Key used to store/retrieve open connection
   *    from the outgoingTcpConnections hash map.
   */
  openNewConnection(message, peer, sender, connectionHash, peerPrivKey) {
    const connectionID = message.connectionID;
    const data = b64Decode(message.data);
    logger.debug(`EXIT ${connectionID} ${message.messageNumber} openNewConnection`);

    // We have a SOCKS Request and need to establish the connection
    const req = parseRequest(data);
    if (req === undefined) {
      // Request is not valid, hence we ignore it
      logger.error(`EXIT ${connectionID} ${message.messageNumber} proxy request is not valid ${data}`);
      return Promise.resolve();
    }

    let messageNumber = -1;
    return unwrapAESKey(message.aesKey, peerPrivKey).then((key) => {
      logger.log(`EXIT ${connectionID} ${message.messageNumber} connect to ${JSON.stringify(req)}`);
      const connection = {
        socket: openSocket(req['DST.ADDR'], req['DST.PORT']),
        lastActivity: Date.now(),
      };

      connection.queue = MessageQueue(
        'net-to-rtc',
        (destData) => {
          // Refresh last activity
          connection.lastActivity = Date.now();

          // Update data received from tcp socket
          this.dataIn += destData.length;

          // Encrypt payload before sending to client
          return createResponseFromExitNode(destData, key).then((encrypted) => {
            const currentMessageNumber = messageNumber;
            messageNumber -= 1;
            const response = JSON.stringify({
              connectionID,
              messageNumber: currentMessageNumber,
              role: 'relay',
              data: encrypted,
            });

            logger.debug(`EXIT ${connectionID} ${currentMessageNumber} to client ${destData.length}`);

            this.dataOut += response.length;
            return peer.send(sender, response, 'antitracking')
              .catch((e) => {
                logger.error(`EXIT ${connectionID} ${currentMessageNumber} ` +
                    `ERROR: could not send message ${e}`);
              });
          });
        },
      );

      // Keep connection opened
      this.outgoingTcpConnections.set(
        connectionHash,
        connection,
      );

      // Garbage collect if connection is closed by remote
      connection.socket.registerCallbackOnClose(() => {
        logger.debug(`EXIT ${connectionHash} garbage collect TCP closed`);
        this.outgoingTcpConnections.delete(connectionHash);
      });

      // Proxy data from the endpoint backwards to the client
      connection.socket.registerCallbackOnData(destData => connection.queue.push(destData));

      // Acknowledge that connection is opened
      logger.debug(`EXIT ${connectionHash} ${messageNumber} acknowledge opened`);
      data[1] = SERVER_REPLY.SUCCEEDED;
      return createResponseFromExitNode(data, key).then((encrypted) => {
        const currentMessageNumber = messageNumber;
        messageNumber -= 1;
        const acknowledgement = JSON.stringify({
          messageNumber: currentMessageNumber,
          connectionID,
          role: 'relay',
          data: encrypted,
        });

        this.dataOut += acknowledgement.length;
        return peer.send(sender, acknowledgement, 'antitracking')
          .catch((e) => {
            logger.error(`EXIT ${connectionHash} ${message.messageNumber} ` +
                `ERROR: could not send message ${e}`);
          });
      });
    }).catch((ex) => {
      // It can happen when connection is closed from the exit's node
      // perspective, but then client sends a request again through the
      // same channel. Then it's ok to make this fail as we don't really
      // want to have long-lived connection through proxy network.
      logger.error(`EXIT ${connectionHash} exception while unpacking ` +
        `AES keys ${ex} ${JSON.stringify(message)}`);
    });
  }


  relayToOpenedConnection(message, connectionHash) {
    const connectionID = message.connectionID;
    const data = b64Decode(message.data);

    // This should be a byte array (Uint8Array) and the connection should be established
    if (this.outgoingTcpConnections.has(connectionHash)) {
      const outgoingConnection = this.outgoingTcpConnections.get(connectionHash);
      outgoingConnection.lastActivity = Date.now();

      logger.debug(`EXIT ${connectionID} ${message.messageNumber} to net ${data.length}`);

      this.dataOut += data.length;
      return outgoingConnection.socket.sendData(data, data.length);
    }

    // Drop message because connection doesn't exist
    logger.error(`EXIT ${connectionID} ${message.messageNumber} dropped message`);
    this.droppedMessages += 1;
    return Promise.resolve();
  }
}
