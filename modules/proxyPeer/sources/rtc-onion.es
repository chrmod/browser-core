import console from './console';
import { generateAESKey
       , encryptRSA
       , decryptRSA
       , encryptAES
       , decryptAES
       , base64_encode } from './rtc-crypto';


/*
 * Socks to RTC
 */


function encryptPayload(payload, pubKey) {
  const data = (new TextEncoder()).encode(JSON.stringify(payload));
  return generateAESKey()
    .then(aesKey => encryptRSA(
      data,
      pubKey,
      aesKey,
    ))
    .then(JSON.stringify);
}


export function decryptPayload(data, privKey) {
  const parsed = JSON.parse(data);
  try {
    return decryptRSA(parsed, privKey)
      .then(decrypted => JSON.parse((new TextDecoder()).decode(decrypted)));
  } catch (ex) {
    // From exit node to client, the payload is just a JSON
    // with an AES encrypted message. So no RSA decryption is
    // necessary.
    return Promise.resolve(parsed);
  }
}


export function wrapOnionRequest(data, peers, connectionID, aesKey, messageNumber) {
  // Deeper layer of the request, used by the exit node
  const onionRequest = {
    aesKey,
    connectionID,
    messageNumber,
    role: 'exit',
    data: base64_encode(data),
  };

  const wrapRequest = (layer, i) => {
    if (i > 0) {
      const peerName = peers[i].name;
      const pubKey = peers[i].pubKey;
      return encryptPayload(layer, pubKey).then(encrypted => wrapRequest(
        {
          connectionID,
          role: 'relay',
          messageNumber,
          nextPeer: peerName,
          data: encrypted,
        },
        i - 1)).catch((e) => { console.error(`proxyPeer PEER ERROR ${e} ${e.stack}`); });
    }

    return encryptPayload(layer, peers[0].pubKey);
  };

  return wrapRequest(onionRequest, peers.length - 1);
}


export function sendOnionRequest(onionRequest, peers, peer) {
  console.debug(`proxyPeer sendOnionRequest to ${JSON.stringify(peers[0])}`);
  return peer.send(
    peers[0].name,
    onionRequest,
    'antitracking',
  ).catch((e) => {
    console.error(`proxyPeer CLIENT ERROR: could not send message ${e} ${e.stack}`);
  });
}


/*
 * Exit node
 */


export function createResponseFromExitNode(data, aesKey) {
  return Promise.resolve(encryptAES(data, aesKey))
    .catch((ex) => {
      console.error(`proxyPeer SERVER ERR encryptResponse ${ex}`);
      return Promise.reject(ex);
    });
}


export function decryptResponseFromExitNode(encrypted, aesKey) {
  // TODO: Remove double conversion of iv
  return Promise.resolve(decryptAES(encrypted, aesKey))
    .catch((ex) => {
      console.error(`proxyPeer SERVER ERR decryptResponse ${ex}`);
      return Promise.reject(ex);
    });
}
