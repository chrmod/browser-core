'use strict';
/*
 * This module is use for sending the events for purpose of human-web, anti-tracking via a secure channel.
 * This solves purpose like anti-duplicates, rate-limiting etc.
 */

 import messageContext from "hpn/message-context";

 const { classes: Cc, interfaces: Ci, utils: Cu } = Components;


 Cu.import("resource://gre/modules/Services.jsm");
 Cu.import("resource://gre/modules/FileUtils.jsm");
 Cu.import('resource://gre/modules/XPCOMUtils.jsm');



 var nsIHttpChannel = Ci.nsIHttpChannel;
 var genericPrefs = Components.classes['@mozilla.org/preferences-service;1']
 .getService(Components.interfaces.nsIPrefBranch);


// Import them in alphabetical order.
Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/bigint.js');
Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/crypto.js');
Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/helperFunctions.js');
// var CryptoJS = this.CryptoJS;
Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/jsencrypt.js');
Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/sha256.js');
// Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/rsa-sign.js');


/* Global variables
*/
var proxyCounter = 0;
var localTemporalUniq = null;
CliqzUtils.setPref('hpn', CliqzUtils.getPref('hpn', true));

/*
Function to create http url
*/

function createHttpUrl(host){
	return "http://" + host + "/verify";
}

/*
This will send the messages inside the trk one at a time. This uses a generator expression.
*/
function sendM(m){
	try{
		var mc = new messageContext(m);
	}
	catch (e){
		CliqzUtils.log("Error creating mc: " + e,CliqzSecureMessage.LOG_KEY);
		var mIdx = CliqzSecureMessage.pushMessage.next()['value'];
		if(mIdx) {
			sendM(CliqzSecureMessage._telemetry_sending[mIdx]);
		}
		else{
			return;
		}
	}

	if(!mc) return;

    // Check for local temporal uniquness
    var uniqKey = mc.dmC;
    if(localTemporalUniq && Object.keys(localTemporalUniq).indexOf(uniqKey) > -1) {
    	CliqzUtils.log("This message has already been sent....",CliqzSecureMessage.LOG_KEY);
    	var mIdx = CliqzSecureMessage.pushMessage.next()['value'];
    	if(mIdx) {
    		sendM(CliqzSecureMessage._telemetry_sending[mIdx]);
    	}
    	else{
    		return;
    	}
    }

    mc.aesEncrypt()
    .then(function(data){
		// After the message is AES encrypted, we need to sign the AES key.
		return mc.signKey()
	})
    .then(function(data){
		// After the message is SIGNED, we need to start the blind signature.
		mc.getMP();
		var uPK = CliqzSecureMessage.uPK.publicKeyB64;

		// Messages to be blinded.
		mc.m1 = mc.mP ;
		mc.m2 = mc.mP + ";" + uPK;
		mc.m3 = mc.mP + ";" + mc.dmC; // + ";" + uPK;

		var _bm1 = new blindSignContext(mc.m1);
		var _bm2 = new blindSignContext(mc.m2);
		var _bm3 = new blindSignContext(mc.m3);

		mc.r1 = _bm1.getBlindingNonce();
		mc.r2 = _bm2.getBlindingNonce();
		mc.r3 = _bm3.getBlindingNonce();

		// Get Unblinder - to unblind the message
		mc.u1 = _bm1.getUnBlinder();
		mc.u2 = _bm2.getUnBlinder();
		mc.u3 = _bm3.getUnBlinder();

		// Blind the message
		mc.bm1 = _bm1.blindMessage();
		mc.bm2 = _bm2.blindMessage();
		mc.bm3 = _bm3.blindMessage();

		// SIG(uPK;bm1;bm2;bm3)
		return CliqzSecureMessage.uPK.sign(uPK + ";" + mc.bm1 + ";" + mc.bm2 + ";" + mc.bm3)
	})
    .then(function(data){
    	mc.sigendData = data;
    	var payload = createPayloadBlindSignature(CliqzSecureMessage.uPK.publicKeyB64, mc.bm1, mc.bm2, mc.bm3, mc.sigendData);
    	return CliqzSecureMessage.httpHandler(CliqzSecureMessage.dsPK.endPoint)
    	.post(JSON.stringify(payload))

    })
    .then(function(response){
    	var response = JSON.parse(response);
		// Capture the response
		var bs1 = response["bs1"];
		var bs2 = response["bs2"];
		var bs3 = response["bs3"];

		// Unblind the message to get the signature.
		mc.us1 = unBlindMessage(bs1, mc.u1);
		mc.us2 = unBlindMessage(bs2, mc.u2);
		mc.us3 = unBlindMessage(bs3, mc.u3);
		// Verify the signature matches after unblinding.
		mc.vs1 = verifyBlindSignature(mc.us1, sha256_digest(mc.m1))
		mc.vs2 = verifyBlindSignature(mc.us2, sha256_digest(mc.m2))
		mc.vs3 = verifyBlindSignature(mc.us3, sha256_digest(mc.m3))

		// SIG(uPK;mp;dmC;us1;us2;us3)
		return CliqzSecureMessage.uPK.sign(CliqzSecureMessage.uPK.publicKeyB64 + ";" + mc.mP +";"+  mc.dmC + ";" + mc.us1 + ";" + mc.us2 + ";" + mc.us3);
	})
    .then(function(signedMessageProxy){
		// Create the payload to be sent to proxy;
		var payload = createPayloadProxy(CliqzSecureMessage.uPK.publicKeyB64, mc.mP, mc.dmC, mc.us1, mc.us2, mc.us3, signedMessageProxy);
		CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-sent",1);
		return CliqzSecureMessage.httpHandler(mc.proxyCoordinator)
		.post(JSON.stringify(payload))

	})
    .then(function(response){
    	var tt = new Date().getTime();
    	localTemporalUniq[mc.dmC] = {"ts":tt};
    	CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-success",1);
    	var mIdx = CliqzSecureMessage.pushMessage.next()['value'];
    	if(mIdx) {
    		sendM(CliqzSecureMessage._telemetry_sending[mIdx]);
    	}
    	else{
    		return;
    	}


    })
    .catch(function(err){
    	CliqzUtils.log("Error promise failed: " + err,CliqzSecureMessage.LOG_KEY);
    	CliqzSecureMessage.stats(mc.proxyCoordinator, "telemetry-error",1);
    	var mIdx = CliqzSecureMessage.pushMessage.next()['value'];
    	if(mIdx) {
    		sendM(CliqzSecureMessage._telemetry_sending[mIdx]);
    	}
    	else{
    		return;
    	}
    })

  }

/*
var sample_message = '{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}';
var sample_message_tokens = '{"action":"attrack.tokens","type":"humanweb","ver":"1.6","payload":{"ver":"0.93","whitelist":"3431576100b20e0a15d4a4c141700f7f","ts":"2015111523","anti-duplicates":3109759,"safeKey":"6bc8710c90f5ac35fbb7ae4ce1660198","data":{"2e7285b81f0da788c9b5fb92e7fe987a":{"08c64a59bc61b81a":{"c":1,"kv":{"6144bb91c094de745cab7863f75f7ba6":{"c5d7165b0d540f62f089442e2df33786":1}}}}}},"ts":"20151116"}'
var sample_message_tp = '{"action":"attrack.tp_events","type":"humanweb","ver":"1.6","payload":{"ver":"0.93","updateInTime":true,"observers":{"http-on-examine-merged-response":0,"http-on-examine-cached-response":1,"http-on-modify-request":1,"http-on-examine-response":1,"http-on-opening-request":1},"conf":{"qs":false,"cookie":false,"post":false,"fingerprint":false},"addons":false,"data":[{"c":1,"hostname":"4180eb52b6857bde","tps":{"www.adobe.com":{"paths":["046bf570ff40bd68"],"c":1,"bad_cookie_sent":1,"cookie_set":1,"type_3":1,"resp_ob":1},"mellon-rn.traviangames.com":{"paths":["483541e9c625e94e","e6029a482ff9c00f","00d74390a6e74734"],"c":5,"bad_cookie_sent":5,"cookie_set":5,"type_4":1,"type_2":3,"type_7":1,"resp_ob":5,"has_qs":4},"code.jquery.com":{"type_2":1,"c":1,"resp_ob":1,"paths":["a4c61b1bb989f654"]},"tracker.simplaex.net":{"paths":["8f6768fe1ffc3bb0"],"c":1,"bad_cookie_sent":1,"has_qs":1,"type_7":1,"resp_ob":1,"cookie_set":1},"cdnjs.cloudflare.com":{"paths":["be4136f4de5afcc6"],"c":1,"bad_cookie_sent":1,"cookie_set":1,"type_2":1,"resp_ob":1},"wwwimages.adobe.com":{"cookie_set":1,"bad_cookie_sent":1,"resp_ob":1,"paths":["58c8bf2e09ebbcad"]}},"t":1641625,"path":"50d3e5509ac52e81","ra":0}]},"ts":"20151116"}'
*/


/* This method will return the string based on mapping of which keys to use to hash for routing.
*/

function getRouteHash(msg){
	// Make sure this is JSON.
	msg.action = msg.action.toLowerCase();
	var static_fields = CliqzSecureMessage.sourceMap[msg.action]["static"] || [];
	var flatMsg = JSON.flatten(msg, static_fields );
	if(!flatMsg.action) return null;
	var keys = CliqzSecureMessage.sourceMap[flatMsg.action]["keys"];

	var routeHashStr = "";
	keys.forEach(function(key){
		routeHashStr += flatMsg[key];
	})
	return routeHashStr;

}

function fetchSourceMapping(){
	// This will fetch the route table from local file, will move it to webservice later.
    //Check health
    CliqzUtils.httpGet(CliqzSecureMessage.SOURCE_MAP_PROVIDER,
    	function success(req){
    		try {
    			CliqzSecureMessage.sourceMap = JSON.parse(req.response);
    		} catch(e){};
    	},
    	function error(res){
    		CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY);
    	}, 5000);
  }

  function isJson(str) {
	// If can be parsed that means it's a str.
	// If cannot be parsed and is an object then it's a JSON.
	try {
		JSON.parse(str);
	} catch (e) {
		if(typeof str =='object')
			return true;
	}
	return false;
}


// _keys.forEach(function(e){console.log(Object.getPrototypeOf(e))})


// Create a new http handler.
function _http(url){

	var core = {

    // Method that performs request
    req : function (method, url, data, type) {
	      // Creating a promise
	      var promise = new Promise( function (resolve, reject) {

        // Instantiates the XMLHttpRequest
        var client = Cc['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        var uri = url;
        var ts = new Date().getTime();

        client.open(method, uri, true);
        client.setRequestHeader("x-type", type ? type : "delayed");
        client.overrideMimeType('application/json');
        //client.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        client.send(data);
        CliqzSecureMessage.stats(uri, "total-sent", 1);

        client.onload = function () {
        	var statusClass = parseInt(client.status / 100);
        	var te = new Date().getTime();
        	CliqzUtils.log("Time taken: " + (te - ts),CliqzSecureMessage.LOG_KEY);
        	CliqzSecureMessage.stats(uri, "latency", (te-ts));
          // CliqzUtils.log("Time taken2: " + CliqzSecureMessage.performance.getEntriesByName("lat"),CliqzSecureMessage.LOG_KEY);

          if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            // Performs the function "reject" when this.status is different than 2xx
            CliqzUtils.log("Error _http: " + client.status,"Other status code.");
            reject(this.statusText);
          }
        };
        client.onerror = function () {
        	CliqzUtils.log(client.responseText,"error");
        	CliqzSecureMessage.stats(uri, "total-error", 1);
        	reject(this.statusText);
        };
        client.ontimeout = function(){
        	CliqzSecureMessage.stats(uri, "total-timeouts", 1);
        	CliqzUtils.log("Error3","timeout");
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
  	'post' : function(args, type) {
  		return core.req('POST', url, args, type);
  	}
  };
};

/**
 * Method to create payload to send for blind signature.
 * The payload needs to consist of <uPK,
 									{mP}*r1, // BM1
 									{mP, uPK}*r2, // BM2
 									{DmC, uPK} * r3, // BM3
 									SIG(uPK;bm1;bm2;bm3)
 									>
 * @returns string with payload created.
 */

 function createPayloadBlindSignature(uPK, bm1, bm2, bm3, sig){
 	var payload = {};
 	payload["uPK"] = uPK;
 	payload["bm1"] = bm1;
 	payload["bm2"] = bm2;
 	payload["bm3"] = bm3;
 	payload["sig"] = sig;
 	return payload;
 }

/**
 * Method to create payload to send to proxy.
 * The payload needs to consist of <uPK,
 									dmC,
 									{H{mP}*r1}Dsk, // BlindSigned1
 									{H(mP, uPK)}Dsk, // BlindSigned2
 									{H(mP, dmC)}Dsk, // BlindSigned3
 									SIG(uPK;dmC;bs1;bs2;bs3)
 									>
 * @returns string with payload created.
 */

 function createPayloadProxy(uPK, mP, dmC, bs1, bs2, bs3, sig){
 	var payload = {};
 	payload["uPK"] = uPK;
 	payload["mP"] = mP;
 	payload["dmC"] = dmC;
 	payload["bs1"] = bs1;
 	payload["bs2"] = bs2;
 	payload["bs3"] = bs3;
 	payload["sig"] = sig;
 	return payload;
 }

 function unBlindMessage(blindSignedMessage, unBlinder){
	// Unblind the message before sending it for verification.
	// s = u*(bs) mod n
	var _us = multMod(unBlinder, str2bigInt(blindSignedMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	var us = bigInt2str(_us,10, 0)
	return us;

}

function verifyBlindSignature(signedMessage, hashedOriginalMessage){
	// Verify the message to see, the signer is not the problem.
	// m = s^e mod n

	var message_signed = bigInt2str(powMod(str2bigInt(signedMessage,10,0), str2bigInt(CliqzSecureMessage.dsPK.e, 10), str2bigInt(CliqzSecureMessage.dsPK.n, 10)),10);
	var original_message = bigInt2str(str2bigInt(hashedOriginalMessage,16),10);

	if(original_message === message_signed.toLowerCase()){
		return true;
	}
	else{
		// Need to replace this with reject.
		return false;
	}
	/*
	var _this = this;
	return new Promise(function(resolve, reject){
		var message_signed = bigInt2str(powMod(str2bigInt(signedMessage,10,0), str2bigInt(CliqzSecureMessage.dsPK.e, 10), str2bigInt(CliqzSecureMessage.dsPK.n, 10)),10);
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
*/
}

/**
Generate user Public-private key.
This should be long-time key
Only generate if the key is not already generated and stored on the machine.
For now in prefs.
*/
var userPK = function () {
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
 userPK.prototype.encrypt = function(msg){
 	return this.keyGen.encrypt(msg);

 }

/**
 * Method to decrypt messages using long live public key.
 */
 userPK.prototype.decrypt = function(msg){
 	return this.keyGen.decrypt(msg);
 }

/**
 * Method to sign the str using userSK.
 * @returns signature in hex format.
 */
 userPK.prototype.sign = function(msg){
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





// Set the context for blind signatures right.
var blindSignContext = function (msg) {
 	/*
 	Initialize it with the following:
 	1. Signer Public Key
 	2. Signer Public Exponent
 	3. Signer Public Modulous
 	*/

 	this.keyObj = new JSEncrypt();
 	this.randomNumber = null;
 	this.blindingNonce = null;
 	this.blinder = null;
 	this.unblinder = null;
 	this.keySize = 4096;
 	this.hashedMessage = "";
 	this.bm = "";
 	this.signedMessage = "";
 	this.msg = msg;

 }

/*
blindSignContext.prototype.fetchSignerKey = function(){
	// This will fetch the Public key of the signer from local file.
	var publicKeyPath = this.publicKeyPath;
	var _this = this;
	_http(publicKeyPath)
	.get()
	.then(function(response){
		var parseKey = _this.keyObj.parseKeyValues(response);
		_this.publicKey = response;
		_this.n = parseKey['mod'];
		_this.log("Key parsed and loaded");
	})
	.catch(_this.log("Error occurred while fetch signing key: "));
}
*/

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

blindSignContext.prototype.hashMessage = function(){
	// Need sha256 digest the message.
	var msg = this.msg;
	this.hashedMessage = sha256_digest(msg);
	return this.hashedMessage;

	/*
	// var _this = this;
	return new Promise(function(resolve, reject){
		var hashM = sha256_digest(msg);
		_this.log("Hash: " + hashM);
		_this.hashedMessage = hashM;
		resolve(hashM);
	});
*/
}

blindSignContext.prototype.getBlindingNonce = function(){
	// Create a random value.

	var randomNumber = randBigInt(this.keySize,1);
	this.blindingNonce = randomNumber
	return randomNumber;
	/*
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
	*/
}

blindSignContext.prototype.getBlinder = function(){
	// Calculate blinder.
	// b = r ^ e mod n
	var b = powMod(this.blindingNonce, str2bigInt(CliqzSecureMessage.dsPK.e, 10), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	// var u = inverseMod(this.blindingNonce, str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	this.blinder = b;
	// this.unblinder = u;
	return b;
	/*
	var _this = this;
	return new Promise(function(resolve, reject){
		var b = powMod(_this.blindingNonce, str2bigInt(_this.e, 10), str2bigInt(_this.n, 10));
		var u = inverseMod(_this.blindingNonce, str2bigInt(_this.n, 10));
		_this.blinder = b;
		_this.unblinder = u;
		resolve(b);
	});
*/
}

blindSignContext.prototype.getUnBlinder = function(){
	// Calculate blinder.
	// b = r ^ e mod n
	var u = inverseMod(this.blindingNonce, str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	this.unblinder = u;
	return u;
}

blindSignContext.prototype.blindMessage = function(){
	// Blind the message before sending it for signing.
	// bm = b*m mod n
	var hashMessage = this.hashMessage();
	// var rnd = this.getBlindingNonce();
	var blinder = this.getBlinder();
	var bm = multMod(blinder, str2bigInt(hashMessage, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	this.bm = bigInt2str(bm, 10);
	return this.bm;
	/*
	var _this = this;
	return new Promise(function(resolve, reject){
		// _this.log(_this.hashedMessage);
		var bm = multMod(_this.blinder, str2bigInt(_this.hashedMessage, 16), str2bigInt(_this.n, 10));
		_this.bm = bigInt2str(bm, 10);
		resolve(bm);
	})
*/

}


blindSignContext.prototype.unBlindMessage = function(blindSignedMessage){
	// Unblind the message before sending it for verification.
	// s = u*(bs) mod n

	var bs = blindSignedMessage;
	var us = multMod(this.unblinder, str2bigInt(bs, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
	var us = bigInt2str(_us,10, 0)
	this.signedMessage = us;
	return us;
	/*
	return new Promise(function(resolve, reject){
		var _us = multMod(_this.unblinder, str2bigInt(bs, 16), str2bigInt(CliqzSecureMessage.dsPK.n, 10));
		var us = bigInt2str(_us,10, 0)
		_this.signedMessage = us;
		resolve(us);
	})
*/

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
	VERSION: '0.1',
	LOG_KEY: 'securemessage',
	debug: false,
	blindSign: blindSignContext,
	counter: 0,
    // messageContext: messageContext,
    keyPool:[],
    httpHandler:_http,
    secureLogger: null,
    JSEncrypt: JSEncrypt,
    cryptoJS: CryptoJS,
    uPK : new userPK(),
    dsPK : null,
    routeTable : null,
    RSAKey: "",
    eventID:{},
    sourceMap:null,
    tmult: 4,
    tpace: 250,
    resp: {},
    SOURCE_MAP_PROVIDER: "https://hpn.test.cliqz.com/sourcemap.json?q=1",
    LOOKUP_TABLE_PROVIDER: "https://hpn.test.cliqz.com/lookuptable?q=1",
    KEYS_PROVIDER: "https://hpn.test.cliqz.com/signerKey?q=1",
    temporalUniquness:{},
    peerID:null,
    proxyID:null,
    proxyList: null,
    proxyStats:{},
    PROXY_LIST_PROVIDER: "https://hpn.test.cliqz.com/proxyList?q=1",
    signerKey: null,
    loggerKey: null,
    messageContext: messageContext,
    getRouteHash: getRouteHash,
    pacemaker: function() {
    	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 10 == 0) {
    		if (CliqzSecureMessage.debug) {
    			CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter/CliqzSecureMessage.tmult , CliqzSecureMessage.LOG_KEY);
    		}

    	}

    	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 5 == 0) {
    		var currentTime = Date.now();


    		if(!CliqzUtils.getWindow() || !CliqzUtils.getWindow().CLIQZ) return;
    		var tDiff = currentTime - CliqzUtils.getWindow().CLIQZ.UI.lastInputTime;

    		if(tDiff > 0 && tDiff > (1000 * 2 * 1)){
    			CliqzSecureMessage.proxyIP();
    		}

    		if(!CliqzSecureMessage.sourceMap){
    			fetchSourceMapping();
    		}

    		if(!CliqzSecureMessage.routeTable){
    			CliqzSecureMessage.fetchRouteTable();
    		}
    	}

        //Fetch sourceMap
        if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 15 * 1) == 0) {
        	if (CliqzSecureMessage.debug) {
        		CliqzUtils.log('Load proxy list', CliqzSecureMessage.LOG_KEY);
        	}
        	fetchSourceMapping();
        	CliqzSecureMessage.fetchProxyList();

        }

        //Fetch secure keys
        if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 60 * 1) == 0) {
        	if (CliqzSecureMessage.debug) {
        		CliqzUtils.log('Load signer keys', CliqzSecureMessage.LOG_KEY);
        	}
        	CliqzSecureMessage.fetchSecureKeys();

        }

        if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 10 * 1) == 0) {
        	if (CliqzSecureMessage.debug) {
        		CliqzUtils.log('Save local temporalUniquness stats', CliqzSecureMessage.LOG_KEY);
        	}
        	saveLocalCheckTable();
        	saveLocalProxyList();
        	saveLocalRouteTable();

            // Flush proxy stats
            CliqzSecureMessage.flushProxyStats();
          }

          CliqzSecureMessage.counter += 1;
        },
        fetchRouteTable: function(){
		// This will fetch the route table from webservice.
		CliqzUtils.httpGet(CliqzSecureMessage.LOOKUP_TABLE_PROVIDER,
			function success(res){
				try{
					var routeTable = JSON.parse(res.response);
					CliqzSecureMessage.routeTable= routeTable;
				}
				catch(e){
					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load content from route table", CliqzSecureMessage.LOG_KEY);
				}
			},
			function error(res){
				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
			});
	},
	fetchProxyList: function(){
		// This will fetch the alive proxies from the webservice.
		CliqzUtils.httpGet(CliqzSecureMessage.PROXY_LIST_PROVIDER,
			function success(res){
				try{
					var proxyList = JSON.parse(res.response);
					CliqzSecureMessage.proxyList = proxyList;
				}
				catch(e){
					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load content from proxy list", CliqzSecureMessage.LOG_KEY);
				}
			},
			function error(res){
				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
			});
	},
	fetchSecureKeys: function(){
		// This will fetch the route table from local file, will move it to webservice later.
		CliqzUtils.httpGet(CliqzSecureMessage.KEYS_PROVIDER,
			function success(res){
				try{
					var keys = JSON.parse(res.response);
					CliqzSecureMessage.signerKey = keys["signer"];
					CliqzSecureMessage.loggerKey = keys["securelogger"];
				}
				catch(e){
					if (CliqzSecureMessage.debug) CliqzUtils.log("Could load signer and secure logger keys", CliqzSecureMessage.LOG_KEY);
				}
			},
			function error(res){
				CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
			});
	},
    // ****************************
    // telemetry, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    telemetry: function(msg, instantPush) {
        if (!CliqzSecureMessage || //might be called after the module gets unloaded
        	CliqzUtils.getPref('dnt', false) ||
        	CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

        	if (msg) CliqzSecureMessage.trk.push(msg);
        CliqzUtils.clearTimeout(CliqzSecureMessage.trkTimer);
        if(instantPush || CliqzSecureMessage.trk.length % 100 == 0){
        	CliqzSecureMessage.pushTelemetry();
        } else {
        	CliqzSecureMessage.trkTimer = CliqzUtils.setTimeout(CliqzSecureMessage.pushTelemetry, 60000);
        }
      },
      _telemetry_req: null,
      _telemetry_sending: [],
      _telemetry_start: undefined,
      telemetry_MAX_SIZE: 500,
      previousDataPost: null,
      pushMessage : [],
      sha1:null,
      routeHashTable:null,
      pacemakerId:null,
      queryProxyIP:null,
      performance:null,
      pushTelemetry: function() {
        // if(CliqzSecureMessage._telemetry_req) return;

        // put current data aside in case of failure
        // Changing the slice and empty array function to splice.

        //CliqzSecureMessage._telemetry_sending = CliqzSecureMessage.trk.slice(0);
        //CliqzSecureMessage.trk = [];

        // Check if track has duplicate messages.
        // Generate a telemetry signal, with base64 endocing of data and respective count.

        CliqzSecureMessage._telemetry_sending = CliqzSecureMessage.trk.splice(0);
        CliqzSecureMessage._telemetry_start = (new Date()).getTime();
        CliqzSecureMessage.pushMessage = trkGen(CliqzSecureMessage._telemetry_sending);
        sendM(CliqzSecureMessage._telemetry_sending[CliqzSecureMessage.pushMessage.next()["value"]]);

      },
      pushTelemetryCallback: function(req){
      	try {
      		var response = JSON.parse(req.response);
      		CliqzSecureMessage._telemetry_sending = [];
      		CliqzSecureMessage._telemetry_req = null;
      	} catch(e){}
      },
      pushTelemetryError: function(req){
        // pushTelemetry failed, put data back in queue to be sent again later
        CliqzSecureMessage.trk = CliqzSecureMessage._telemetry_sending.concat(CliqzSecureMessage.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CliqzSecureMessage.trk.length - CliqzSecureMessage.telemetry_MAX_SIZE + 100;
        if(slice_pos > 0){
        	CliqzSecureMessage.trk = CliqzSecureMessage.trk.slice(slice_pos);
        }

        CliqzSecureMessage._telemetry_sending = [];
        CliqzSecureMessage._telemetry_req = null;
      },
      initAtWindow: function(window){
    	Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/crypto-kjur.js', window);
    	// Services.scriptloader.loadSubScript('chrome://cliqzres/content/content/hpn/content/extern/rsa-sign.js', window);
    	// Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/peerjs.js', window)(6);
    	CliqzSecureMessage.RSAKey = window.RSAKey;
    	CliqzSecureMessage.sha1 = window.CryptoJS.SHA1;
    	overRideCliqzResults();
    	overRideHumanWebTelemetry();
    },
    init: function(){
    	// Doing it here, because this lib. uses navigator and window objects.
    	// Better method appriciated.

    	if (CliqzSecureMessage.pacemakerId==null) {
    		CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
    	}



    	// Get sourceMap
    	// fetchRouteTable();
    	CliqzSecureMessage.fetchRouteTable();
    	CliqzSecureMessage.fetchProxyList();
    	fetchSourceMapping();
    	if(!CliqzSecureMessage.dbConn) CliqzSecureMessage.initDB();
    	if(!localTemporalUniq) loadLocalCheckTable();


    	// Backup if we were not able to load from the webservice, pick the last one.
    	if(!CliqzSecureMessage.proxyList) loadLocalProxyList();
    	if(!CliqzSecureMessage.routeTable) loadLocalRouteTable();
    	// CliqzSecureMessage.proxyIP();
    	// overRideCliqzResults();
    	// overRideHumanWebTelemetry();
    },
    initDB: function() {
    	if ( FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]).exists() ) {
    		if (CliqzSecureMessage.dbConn==null) {
    			CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]))

    		}
    		createTable();
    		return;
    	}
    	else {
    		CliqzSecureMessage.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbhumanweb"]));
    		createTable();
    	}

    },
    unload: function(){
    	saveLocalCheckTable();
    	CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
    },
    dbConn: null,
    aesDecrypt : function(msg){
    	var encryptedMsg = msg.split(";")[1];
    	var eventID = msg.split(";")[0];
    	var key = CliqzSecureMessage.eventID[eventID]["key"];
    	var iv = CliqzSecureMessage.eventID[eventID]["iv"];
    	var decrypted = CryptoJS.AES.decrypt(
    		{ciphertext: CryptoJS.enc.Base64.parse(encryptedMsg) },
    		CryptoJS.enc.Hex.parse(key),
    		{ iv: CryptoJS.enc.Hex.parse(iv),format: JsonFormatter }
    		);
    	return decrypted.toString(CryptoJS.enc.Utf8);
    },
    proxyIP: function (){
    	if(proxyCounter >= CliqzSecureMessage.proxyList.length) proxyCounter = 0;
    	var url = createHttpUrl(CliqzSecureMessage.proxyList[proxyCounter]);
      CliqzSecureMessage.queryProxyIP = url;//"http://54.145.178.227/verify" ; //url;
      proxyCounter += 1;
    },
    stats: function(proxyIP, statName, value){
    	try{
    		if(CliqzSecureMessage.proxyStats && CliqzSecureMessage.proxyStats[proxyIP]){
    			if(CliqzSecureMessage.proxyStats[proxyIP][statName]) {
    				if(statName == "latency"){
    					CliqzSecureMessage.proxyStats[proxyIP][statName].push(value);
    				}else{
    					CliqzSecureMessage.proxyStats[proxyIP][statName] += value
    				}
    			}else{
    				if(statName == "latency"){
    					CliqzSecureMessage.proxyStats[proxyIP][statName] = [value];
    				}else{
    					CliqzSecureMessage.proxyStats[proxyIP][statName] = value;
    				}
    			}
    		}
    		else{
    			if(statName == "latency"){
    				var stats = {};
    				stats[statName] = [value];
    				CliqzSecureMessage.proxyStats[proxyIP] = stats;
    			}
    			else{
    				var stats = {};
    				stats[statName] = value;
    				CliqzSecureMessage.proxyStats[proxyIP] = stats;
    			}
    		}
    	}
    	catch(e){
    		CliqzUtils.log("Error is proxy stats: " + e,CliqzSecureMessage.LOG_KEY);
    	}
    },
    flushProxyStats: function(){
    	var proxyStats = CliqzSecureMessage.proxyStats;
    	if(Object.keys(proxyStats).length == 0) return;
    	var msg = {"action": "proxy-health", "anti-duplicates":Math.floor(Math.random() * 10000000),"type": "cliqz", "ver": "1.5", "payload": proxyStats,"ts": CliqzUtils.getPref('config_ts', null)};
    	CliqzSecureMessage.telemetry(msg);
    	CliqzSecureMessage.proxyStats = {};
    	return;
    }
  }

/**
Load Directory Service Public key.
*/
var directoryServicePK = function () {
	// This certainly needs to find a better place.
	var dsPubKey = "-----BEGIN PUBLIC KEY-----\
	MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA5IUb5B02se1hKWjWNN6D\
	dG4EQ8AiKtUAn3qdnQ1cJOeIqUjAu4FsaLJyndrYIOlfyEiJSeb4rJOmkUaVUoKF\
	7vmvfNug7IugiVrm4rgGMUIzXm5nHhZf+ntA803Rg5J+C0xt9IrIj4CBgcYxnQFQ\
	uhdFN7cWTmcoJqs74wUM4j1Q0gRGV+wp2WG+dp1n04uagRGIU7Ego06Xxk4wO6S4\
	Ceqk5tWHt7IzqNWRZO5JMaSulne6Otq47jf3PGIW1Ok8ze2PmgM/5ars/H7UWDFr\
	avbGMlYe3bhaTKusUoqgcKmPzsroE/tJMwh7cqPaXTfYdesOoTNfP2lsDC0fsW3X\
	HGwZaWcaoJWnOFboIWFInrrEKmTO/rugKIMnUuES6eEgJXPHLcemg45ZvvCG9gqq\
	7TsIFtyyhXxBJgcOnFPdV2DUa61Oe+Ew0wRv3dVH0wx+ar5RN8Bbg080GhP3wyZ+\
	yjqvlcypuq+Qzd3xWF61ZmFyzlUnjKESLB8PpvTnsTvMPNpCbF6I3AyQ79mi9SM6\
	Urh6hU90zpidn7kYTrIvkHkvEtVpALliIji/6XnGpNYIpw0CWTbqU/fMOt+ITcKg\
	rWMymdRofsl0g6+abRETWEg+8uu7pLlDVehM9sPZPhtOGd/Vl+05FDUhNsbszdOE\
	vUNtCY8pX4SI5pnA/FjWHOkCAwEAAQ==\
	-----END PUBLIC KEY-----"
	this.endPoint = "http://securebrowsingbeta-1342316385.us-east-1.elb.amazonaws.com/sign";//"http://10.10.73.207/sign";
	this.loadKey = new JSEncrypt();
	this.loadKey.setPublicKey(CliqzSecureMessage.signerKey || dsPubKey);
	this.n = this.loadKey.parseKeyValues(dsPubKey)['mod'];
	this.e = '' + this.loadKey.parseKeyValues(dsPubKey)['e']; // Needs to be string, else fails on blinding nonce.
}

CliqzSecureMessage.dsPK = new directoryServicePK();

var secureEventLoggerContext = function () {
	var publicKey = "-----BEGIN PUBLIC KEY-----\
	MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAh5HhcRAn6+6woXQXl/Nt\
	Z+fOooNglZct/HSpYuqkcmrPauHW7EuOSq5bvpBZRTDROjR/kUPomqVZIzqhdCFP\
	A8BwXSCz7hAel2Q157vtBvh9sngMMLXb5Fgzef5N4EuKO8pL5KrS+I9tfZac41vF\
	JSdpgAirZYhh+tdcQQ1z0Qv/Rw0zOXjfvddCz3gEv2gB9KsLMVnTS1J4YOOgfza2\
	adg9Ebz1z99DiF4vtCwn0IUwH/3ToTBwJLbMnC3Ol43yBNk8rgK2mkgCi614vOSD\
	3hnVmio+iW6+AUklM8VPl6l7hEK9cljJY+9UsMVmTrvaFbMPwS6AdZCXKTmNdaMJ\
	cy3zSOXu5zvzihoQLwAu9LM3l2eVk0Mw0K7JXOP20fc8BtzWCOLYVP32r4R0BNuh\
	TtvGqjHNZHPJN5OwaxkLpn2dujL9uDWGjRiOItKMVq/nOqmNGghrbf8IOaKT7VQh\
	qOU4cXRkB/uF1UjYETBavwUZAxx9Wd/cMcAGmKiDxighxxQ29jDufl+2WG065tmJ\
	z+zCxmgrPh6Zb3KFUxPTe6yksAhWJhmGShA9v20t84M5c6NpZXoUsFcVja6XxzHe\
	SB8dWq9Uu5QcZ83Gz/ronwdEjT2OGTtBgOFeTDqLYUgphC1gcUEHOCnTNXRMQOXq\
	GwBfZHp+Mq61QcMq2rNS7xECAwEAAQ==\
	-----END PUBLIC KEY-----"
	this.keyObj = new JSEncrypt();
	this.keyObj.setPublicKey(CliqzSecureMessage.loggerKey || publicKey);

}
CliqzSecureMessage.secureLogger = new secureEventLoggerContext();

function createTable(){
	var localcheck = "create table if not exists localcheck(\
		id VARCHAR(24) PRIMARY KEY NOT NULL,\
		data VARCHAR(1000000) \
		)";

(CliqzSecureMessage.dbConn.executeSimpleSQLAsync || CliqzSecureMessage.dbConn.executeSimpleSQL)(localcheck);

}

function saveLocalCheckTable() {
	if (localTemporalUniq) {
		saveRecord('localTemporalUniq', JSON.stringify(localTemporalUniq));
	}
}

function saveLocalProxyList() {
	if (CliqzSecureMessage.proxyList) {
		saveRecord('proxylist', JSON.stringify(CliqzSecureMessage.proxyList));
	}
}

function saveLocalRouteTable() {
	if (CliqzSecureMessage.routeTable) {
		saveRecord('routetable', JSON.stringify(CliqzSecureMessage.routeTable));
	}
}

function loadLocalProxyList() {
	loadRecord('proxylist', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on proxy list", CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.proxyList = null;
		}
		else {
			try {
				CliqzSecureMessage.proxyList = JSON.parse(data);
			} catch(ee) {
				CliqzSecureMessage.proxyList = null;
			}
		}
	});
}

function loadLocalRouteTable() {
	loadRecord('routetable', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on route table", CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.routeTable = null;
		}
		else {
			try {
				CliqzSecureMessage.routeTable = JSON.parse(data);
			} catch(ee) {
				CliqzSecureMessage.routeTable = null;
			}
		}
	});
}

function loadLocalCheckTable() {
	loadRecord('localTemporalUniq', function(data) {
		if (data==null) {
			if (CliqzSecureMessage.debug) CliqzUtils.log("There was no data on action stats", CliqzSecureMessage.LOG_KEY);
			localTemporalUniq = {};
		}
		else {
			try {
				localTemporalUniq = JSON.parse(data);
			} catch(ee) {
				localTemporalUniq = {};
			}
		}
	});
}

function saveRecord(id, data) {
	if(!(CliqzSecureMessage.dbConn)) return;
	var st = CliqzSecureMessage.dbConn.createStatement("INSERT OR REPLACE INTO localcheck (id,data) VALUES (:id, :data)");
	st.params.id = id;
	st.params.data = data;

	st.executeAsync({
		handleError: function(aError) {
			if(CliqzSecureMessage && CliqzSecureMessage.debug){
				if (CliqzSecureMessage.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzSecureMessage.LOG_KEY);
			}
		},
		handleCompletion: function(aReason) {
			if(CliqzSecureMessage && CliqzSecureMessage.debug){
				if (CliqzSecureMessage.debug) CliqzUtils.log("Insertion success", CliqzSecureMessage.LOG_KEY);
			}
		}
	});
}

function loadRecord(id, callback){
	var stmt = CliqzSecureMessage.dbConn.createAsyncStatement("SELECT id, data FROM localcheck WHERE id = :id;");
	stmt.params.id = id;

	var fres = null;
	var res = [];
	stmt.executeAsync({
		handleResult: function(aResultSet) {
			if(!(CliqzSecureMessage)) return;
			for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
				if (row.getResultByName("id")==id) {
					res.push(row.getResultByName("data"));
				}
				else {
					if (CliqzSecureMessage.debug) CliqzUtils.log("There are more than one record", CliqzSecureMessage.LOG_KEY);
					callback(null);
				}
				break;
			}
		},
		handleError: function(aError) {
			if(!(CliqzSecureMessage)) return;
			if (CliqzSecureMessage.debug) CliqzUtils.log("SQL error: " + aError.message, CliqzSecureMessage.LOG_KEY);
			callback(null);
		},
		handleCompletion: function(aReason) {
			if(!(CliqzSecureMessage)) return;
			if (res.length == 1) callback(res[0]);
			else callback(null);
		}
	});
}


/* Convert the trk into a generator and execute each message sequentially.
   when index reaches length of the trk,
   yield's done will be true
   and its value will be undefined;
   */

/*
function *trkGen(trk) {
	var index = 0;
  	while (index < trk.length) {
    	yield index++;
    }
}
*/

function trkGen(trk) {
	var trk = trk;
	var idx = -1;
	return {
		next: function() {
			idx += 1
			if(idx < trk.length){
				return{
				value: idx, // Return the first yielded value.
				done: false
			}
		}
		else{
			return{
				value: undefined, // Return undefined.
				done: true
			}
		}
	}
}
};

function overRideCliqzResults(){
	CliqzUtils.getCliqzResults = function(q, callback){
		CliqzUtils._sessionSeq++;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if(CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)){
    	CliqzUtils._queryCount++;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;

    var url = (CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER) +
    encodeURIComponent(q) +
    CliqzUtils.encodeSessionParams() +
    CliqzLanguage.stateToQueryString() +
    CliqzUtils.encodeLocale() +
    CliqzUtils.encodeResultOrder() +
    CliqzUtils.encodeCountry() +
    CliqzUtils.encodeFilter() +
    CliqzUtils.encodeLocation();


    if(CliqzUtils.getPref("hpn")){
    	var _q = url.replace((CliqzUtils.CUSTOM_RESULTS_PROVIDER || CliqzUtils.RESULTS_PROVIDER),"")
    	var mc = new messageContext({"action": "extension-query", "type": "cliqz", "ver": "1.5", "payload":_q });
    	var proxyIP = CliqzSecureMessage.queryProxyIP;
    	mc.aesEncrypt()
    	.then(function(enxryptedQuery){
    		return mc.signKey();
    	})
    	.then(function(){
    		var data = {"mP":mc.getMP()}
    		CliqzSecureMessage.stats(proxyIP, "queries-sent", 1);
    		return _http(proxyIP)
    		.post(JSON.stringify(data), "instant")
    	})
    	.then(function(response){
    		return mc.aesDecrypt(JSON.parse(response)["data"]);
    	})
    	.then(function(res){
    		CliqzSecureMessage.stats(proxyIP, "queries-recieved", 1);
    		callback && callback({"response":res}, q);
    	})
    	.catch(function(err){
    		CliqzUtils.log("Error query chain: " + err,CliqzSecureMessage.LOG_KEY);
    		CliqzSecureMessage.stats(proxyIP, "queries-error", 1);
    	})
    }else{
    	var req = CliqzUtils.httpGet(url, function (res) {
    		callback && callback(res, q);
    	});
    	CliqzUtils.requestMonitor.addRequest(req);
    }

    /*
    var req = CliqzUtils.httpGet(url, function (res) {
            callback && callback(res, q);
          });
    CliqzUtils.requestMonitor.addRequest(req);
    */
  }
  return;
}

function overRideHumanWebTelemetry(){
	CliqzHumanWeb.telemetry = function(msg, instantPush) {
		if (!CliqzHumanWeb || //might be called after the module gets unloaded
			CliqzUtils.getPref('dnt', false) ||
			CliqzUtils.isPrivate(CliqzUtils.getWindow())) return;

			msg.ver = CliqzHumanWeb.VERSION;
		msg = CliqzHumanWeb.msgSanitize(msg);
		if (msg) CliqzHumanWeb.incrActionStats(msg.action);
		if (msg) CliqzHumanWeb.trk.push(msg);
		CliqzUtils.clearTimeout(CliqzHumanWeb.trkTimer);
		if(instantPush || CliqzHumanWeb.trk.length % 100 == 0){
			CliqzHumanWeb.pushTelemetry();
		} else {
			CliqzHumanWeb.trkTimer = CliqzUtils.setTimeout(CliqzHumanWeb.pushTelemetry, 60000);
		}
		CliqzSecureMessage.telemetry(msg);
	}
	return;
}

export default CliqzSecureMessage;
