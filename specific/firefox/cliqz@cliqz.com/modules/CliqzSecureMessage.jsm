'use strict';
/*
 * This module is use for sending the events for purpose of human-web, anti-tracking via a secure channel.
 * This solves purpose like anti-duplicates, rate-limiting etc.
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzSecureMessage'];

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');


var nsIHttpChannel = Ci.nsIHttpChannel;
var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);


Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/jsencrypt.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/bigint.js', this);
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/sha256.js');


// Create a new http handler.
function _http(url){

  var core = {

    // Method that performs request
    req : function (method, url, data) {

      // Creating a promise
      var promise = new Promise( function (resolve, reject) {

        // Instantiates the XMLHttpRequest
        var client = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        var uri = url;

        client.open(method, uri, true);
        client.overrideMimeType('application/json');
        client.send(data);

        client.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            // Performs the function "reject" when this.status is different than 2xx
            reject(this.statusText);
          }
        };
        client.onerror = function () {
          reject(this.statusText);
        };
        client.ontimeout = function(){
            reject(this.statusText);
        }
      });

      // Return the promise
      return promise;
    }
  };


  return {
    'get' : function(args) {
      return core.req('GET', url, args);
    },
    'post' : function(args) {
      return core.req('POST', url, args);
    }
  };
};

// Set the context for message to be sent.
var messageContext = function (msg) {
 	/*

 	*/

 	this.orgMessage = msg;
 	this.sha256 = sha256_digest(this.orgMessage);
 	this.signed = null;
 	this.encrypted = null;
 	this.routeHash = "routeHash" // Default : null;

}

messageContext.prototype.createPayload = function(){
	// Return the public exponent
	var payload = {};
	payload["uPK"] = "";
	payload["encrypted"] = this.sha256; // This needs to be replaces with encrypted.
	payload["sm"] = this.signed;
	payload["routeHash"] = this.routeHash;
	return JSON.stringify(payload);
}
// Set the context for blind signatures right.
var blindSignContext = function (keySize) {
 	/*
 	Initialize it with the following:
 	1. Signer Public Key
 	2. Signer Public Exponent
 	3. Signer Public Modulous
 	*/

 	this.keyObj = new JSEncrypt({default_key_size:keySize});
 	this.publicKeyPath = "chrome://cliqz/content/signer-pub-key.pub";
 	this.publicKey = "";
 	this.e = "65537";
 	this.n = null;
 	this.randomNumber = null;
 	this.blindingNonce = null;
 	this.blinder = null;
 	this.unblinder = null;
 	this.keySize = 4096;
 	this.hashedMessage = "";
 	this.bm = "";
 	this.signedMessage = "";

}

blindSignContext.prototype.fetchSignerKey = function(){
	// This will fetch the Public key of the signer from local file.
	var publicKeyPath = this.publicKeyPath;
	var _this = this;
	_http(publicKeyPath)
	.get()
	.then(function(response){
		var parseKey = _this.keyObj.parseKeyValues(response);
		_this.n = parseKey['mod'];
		_this.log("Key parsed and loaded");
	})
	.catch(_this.log("Error occurred while fetch signing key: "));
}

blindSignContext.prototype.exponent = function(){
	// Return the public exponent
	return this.e;
}

blindSignContext.prototype.modulus = function(){
	// Return the public modulous
	return this.n;
}

blindSignContext.prototype.log =  function(msg){
	if(CliqzSecureMessage.debug){
		CliqzUtils.log(msg, "Blind Signature")
	}

}

blindSignContext.prototype.hashMessage = function(str){
	// Need sha256 digest the message.
	var _this = this;
	return new Promise(function(resolve, reject){
		var hashM = sha256_digest(str);
		_this.log("Hash: " + hashM);
		_this.hashedMessage = hashM;
		resolve(hashM);
	});
}

blindSignContext.prototype.getBlindingNonce = function(){
	// Create a random value.
	var _this = this;
	var promise = new Promise(function(resolve, reject){
		try{
			var randomNumber = randBigInt(_this.keySize,1);
			_this.blindingNonce = randomNumber;
			resolve(randomNumber);
		} catch(e) {
			reject(_this.log("Error in generating random number: " + e));
		}
	});
	return promise;
}

blindSignContext.prototype.getBlinder = function(){
	// Calculate blinder.
	// b = r ^ e mod n
	var _this = this;
	return new Promise(function(resolve, reject){
		var b = powMod(_this.blindingNonce, str2bigInt(_this.e, 10), str2bigInt(_this.n, 10));
		var u = inverseMod(_this.blindingNonce, str2bigInt(_this.n, 10));
		_this.blinder = b;
		_this.unblinder = u;
		resolve(b);
	});
}

blindSignContext.prototype.blindMessage = function(){
	// Blind the message before sending it for signing.
	// bm = b*m mod n
	var _this = this;
	return new Promise(function(resolve, reject){
		// _this.log(_this.hashedMessage);
		var bm = multMod(_this.blinder, str2bigInt(_this.hashedMessage, 16), str2bigInt(_this.n, 10));
		_this.bm = bigInt2str(bm, 10);
		resolve(bm);
	})

}

blindSignContext.prototype.unBlindMessage = function(blindSignedMessage){
	// Unblind the message before sending it for verification.
	// s = u*(bs) mod n
	var _this = this;
	var bs = blindSignedMessage;
	return new Promise(function(resolve, reject){
		var _us = multMod(_this.unblinder, str2bigInt(bs, 16), str2bigInt(_this.n, 10));
		var us = bigInt2str(_us,10, 0)
		_this.signedMessage = us;
		resolve(us);
	})

}

blindSignContext.prototype.verify = function(){
	// Verify the message to see, the signer is not the problem.
	// m = s^e mod n
	var _this = this;
	return new Promise(function(resolve, reject){
		var message_signed = bigInt2str(powMod(str2bigInt(_this.signedMessage,10,0), str2bigInt(_this.e, 10), str2bigInt(_this.n, 10)),10);
		var original_message = bigInt2str(str2bigInt(_this.hashedMessage,16),10);
		// var original_message = _this.hashedMessage;
		_this.log("Org message:" + original_message);
		_this.log("Sign message:" + message_signed);
		if(original_message === message_signed.toLowerCase()){
			resolve(true);
		}
		else{
			// Need to replace this with reject.
			resolve(false);
		}

	})

}


var CliqzSecureMessage = {
    VERSION: '0.2',
    LOG_KEY: 'securemessage',
    debug: true,
    blindSign: blindSignContext,
    messageContext: messageContext,
    keyPool:[],
    httpHandler:_http
}

// CliqzSecureMessage.init();


/*
var mc = new CliqzSecureMessage.messageContext("konark");

var signerKey =  new CliqzSecureMessage.blindSign()
signerKey.fetchSignerKey()

console.log(message);
var bs = new CliqzSecureMessage.blindSign()
bs.e = signerKey.exponent();
bs.n = signerKey.modulus();
bs.hashMessage(mc.orgMessage)
.then(function(data){
	console.log("Hashed message:");
	console.log(data);
	return bs.getBlindingNonce()
})
.then(function(data){
	return bs.getBlinder();
})
.then(function(data1){
	return bs.blindMessage();
})
.then(function(){
	// Prepare payload
	var payload = {};
	payload["uPK"] = "uPK";
	payload["bm"] = bs.bm;
	return CliqzSecureMessage.httpHandler("http://192.168.3.249/sign")
  		.post(JSON.stringify(payload))
})
.then(function(blindSignedMessage){
	return bs.unBlindMessage(blindSignedMessage);
})
.then(function(data){
	console.log("The final output is:");
	console.log(data);
	mc.signed = data;
	return bs.verify()
})
.then(function(data){
	console.log("Verified: " + data);
	console.log(mc.createPayload());

})

*/
