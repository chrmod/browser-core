import CliqzSecureMessage from 'hpn/main';

/**
Generate user Public-private key.
This should be long-time key
Only generate if the key is not already generated and stored on the machine.
For now in prefs.
*/
export default class {
  constructor(msg) {
  var keySet = CliqzUtils.getPref('userPKBeta',false);
  this.keyGen = new JSEncrypt({default_key_size:2048});
  if(!keySet) {
     // Using 2048 as 4096 is pretty compute intensive.
     this.privateKey = this.keyGen.getPrivateKeyB64 ();
     this.publicKey = this.keyGen.getPublicKeyB64();
     this.publicKeyB64 = this.keyGen.getPublicKeyB64();
     CliqzUtils.setPref('userPKBeta', this.privateKey);
    }
    else{
      this.keyGen.setPrivateKey(keySet);
      this.privateKey = this.keyGen.getPrivateKeyB64();
      this.publicKey = this.keyGen.getPublicKey();
      this.publicKeyB64 = this.keyGen.getPublicKeyB64();
    }
  }

  /**
   * Method to encrypt messages using long live public key.
  */
  encrypt(msg){
    return this.keyGen.encrypt(msg);
  }

  /**
  * Method to decrypt messages using long live public key.
  */
  decrypt(msg){
    return this.keyGen.decrypt(msg);
  }

  /**
   * Method to sign the str using userSK.
   * @returns signature in hex format.
   */
  sign(msg){
    var _this = this;
    var promise = new Promise(function(resolve, reject){
      try{
        var rsa = new CliqzSecureMessage.RSAKey();
        rsa.readPrivateKeyFromPEMString(CliqzSecureMessage.uPK.privateKey);
        var hSig = rsa.sign(msg,"sha256");
        resolve(hSig);

      }
      catch(e){
        reject(e);
      }
    })
    return promise;
  }
}