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


// Import them in alphabetical order.
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/bigint.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/crypto.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/helperFunctions.js');
// var CryptoJS = this.CryptoJS;
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/jsencrypt.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/sha256.js');
// Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/rsa-sign.js');


/* Global variables
*/
var proxyCounter = 0;
var localTemporalUniq = null;
CliqzUtils.setPref('hpn', CliqzUtils.getPref('hpn', true));


/* Convert the trk into a generator and execute each message sequentially.
   when index reaches length of the trk,
   yield's done will be true
   and its value will be undefined;
*/

function *trkGen(trk) {
	var index = 0;
  	while (index < trk.length) {
    	yield index++;
    }
}

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
    	var mc = new CliqzSecureMessage.messageContext(m);
    }
    catch (e){
    	CliqzUtils.log("Error: " + e,CliqzSecureMessage.LOG_KEY);
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
		CliqzUtils.log("Error: " + mc.proxyCoordinator,CliqzSecureMessage.LOG_KEY);
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

/* This method will ensure that we have the same length for all the mesages
*/
function padMessage(msg){
	var mxLen = "14000";
	var str = msg + new Array((mxLen - msg.length) + 1).join("\n");
	return str;
}
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

var types = {
   'get': function(prop) {
      return Object.prototype.toString.call(prop);
   },
   'object': '[object Object]',
   'array': '[object Array]',
   'string': '[object String]',
   'boolean': '[object Boolean]',
   'number': '[object Number]'
}

// _keys.forEach(function(e){console.log(Object.getPrototypeOf(e))})

var JsonFormatter = {
    stringify: function (cipherParams) {
        // create json object with ciphertext
        var jsonObj = {
            ct: cipherParams.ciphertext.toString(CryptoJS.enc.Base64)
        };

        // optionally add iv and salt
        if (cipherParams.iv) {
            jsonObj.iv = cipherParams.iv.toString();
        }
        if (cipherParams.salt) {
            jsonObj.s = cipherParams.salt.toString();
        }

        // stringify json object
        return JSON.stringify(jsonObj);
    },

    parse: function (jsonStr) {
        // parse json string
        var jsonObj = JSON.parse(jsonStr);

        // extract ciphertext from json object, and create cipher params object
        var cipherParams = CryptoJS.lib.CipherParams.create({
            ciphertext: CryptoJS.enc.Base64.parse(jsonObj.ct)
        });

        // optionally extract iv and salt
        if (jsonObj.iv) {
            cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv)
        }
        if (jsonObj.s) {
            cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s)
        }

        return cipherParams;
    }
};

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
          if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            // Performs the function "reject" when this.status is different than 2xx
            CliqzUtils.log("Error: " + client.status,"Other status code.");
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


/**
 * Method to create object for message recieved+
 * Only excepts valid JSON messages with the following fields:
 * Type : Humanweb / Antitracking etc.
 * Actions : Valid actions like Page, query etc.
 * @returns string with payload created.
 */
var messageContext = function (msg) {
	if(!msg) return;
	CliqzUtils.log("Message Rec: " + JSON.stringify(msg),CliqzSecureMessage.LOG_KEY);
 	this.orgMessage = isJson(msg) ? JSON.stringify(msg) : msg;
 	this.jMessage = isJson(msg) ? msg : JSON.parse(msg);
 	this.sha256 = sha256_digest(this.orgMessage);
 	this.signed = null;
 	this.encrypted = null;
 	this.routeHash = null;// "http://54.157.18.130/verify"; // Default : null;
 	this.type = this.jMessage.type || null;
 	this.action = this.jMessage.action.toLowerCase() || null;
 	this.interval = this.action ? CliqzSecureMessage.sourceMap[this.action]["interval"] : null;
 	this.rateLimit = this.action ? CliqzSecureMessage.sourceMap[this.action]["ratelimit"] : null;
 	this.endPoint = this.action ? CliqzSecureMessage.sourceMap[this.action]["endpoint"] : null;
 	this.mE = null;
 	this.mK = null;
 	this.mP = null;
 	this.dm = null;
 	this.dmC =  this.calculateRouteHash(this.jMessage);
 	this.proxyCoordinator = this.getProxyIP(this.dmC);//"http://54.157.18.130/verify";
 	this.proxyValidators = null;//["http://54.157.18.130:81/verify"];
}

/**
 * Method to create payload to send for blind signature.
 * The payload needs to consist of eventID, userPK, encryptedMessage
 * @returns string with payload created.
 */
messageContext.prototype.createPayloadBlindSignature = function(){
	var payload = {};
	payload["uPK"] = "";
	payload["encrypted"] = this.eventID + ":" + this.aes + ":"; // This needs to be replaces with encrypted.
	payload["sm"] = this.signed;
	payload["routeHash"] = this.routeHash;
	return JSON.stringify(payload);
}

/**
 * Method to parse a message and encrypt with AES.
 * @returns string of AES encrypted message.
 */
messageContext.prototype.aesEncrypt = function(){
	var _this = this;
	var promise = new Promise(function(resolve, reject){
		try{
			var salt = CryptoJS.lib.WordArray.random(128/8);
			var iv = CryptoJS.enc.Hex.parse(salt.toString());
		    var eventID = ('' + iv).substring(0,5);
		    // The AES key needs to replaced by some random value.
		    // Any specific reasons why it can't be MD5 of the message ?
		    var encryptionPaylod = {};
		    encryptionPaylod['msg'] = _this.orgMessage;
		    encryptionPaylod['endpoint'] = _this.endPoint;
		    var msgEncrypt = padMessage(JSON.stringify(encryptionPaylod));
		    var key = CryptoJS.MD5(_this.orgMessage);
		    // var encrypted = CryptoJS.AES.encrypt(_this.orgMessage, key, {iv:iv});
		    var encrypted = CryptoJS.AES.encrypt(msgEncrypt, key, {iv:iv});
		    _this.log(eventID);
		    _this.eventID = eventID;
		    _this.aesKey = '' + key;
			_this.encryptedMessage = encrypted.toString();
			_this.iv = encrypted.iv.toString(CryptoJS.enc.Hex);
			// _this.messageToSign = key + ";" + encrypted.iv + ";" + "instant;cPK;endPoint";
			_this.mE = encrypted.toString();
			_this.mID = eventID;
			_this.key = key;
			resolve(_this.mE);
		}
		catch(e){
			reject(e);
		}
	})

	return promise;
}

/**
 * Method to parse a message and decrypt with AES.
 * @returns string of AES decrypted message.
 */
messageContext.prototype.aesDecrypt = function(msg){
	var _this = this;
	var promise = new Promise(function(resolve, reject){
		try{
			var encryptedMsg = msg.split(";")[1];
			var key = _this.aesKey;
			var iv = _this.iv;
			var decrypted = CryptoJS.AES.decrypt(
  				{ciphertext: CryptoJS.enc.Base64.parse(encryptedMsg) },
  				CryptoJS.enc.Hex.parse(key),
  				{ iv: CryptoJS.enc.Hex.parse(iv),format: JsonFormatter }
			);
			resolve(decrypted.toString(CryptoJS.enc.Utf8));
		}
		catch(e){
			reject(e);
		}
	})

	return promise;
}


/**
 * Method to sign the AES encryptiong key with Aggregator Public key.
 * Calculate mK = {AESKey;iv;endPoint}
 * @returns string of encrypted key.
 */
messageContext.prototype.signKey = function(){
	var aesKey = this.aesKey.toString(CryptoJS.enc.Base64);
	var _this = this;
	var promise = new Promise(function(resolve, reject){
		try{
			var messageToSign = _this.key + ";" + _this.iv + ";endPoint";
			var signedKey = CliqzSecureMessage.secureLogger.keyObj.encrypt(messageToSign);
			_this.signedKey = signedKey;
			_this.mK = signedKey;
			resolve(signedKey);
		}
		catch(e){
			reject(e);
		}
	})
	return promise;
}

/**
 * Method to create MP
 * Calculate mP = <mID, mK, mE>
 * @returns string called mP.
 */
messageContext.prototype.getMP = function(){
	var mP = this.mID + ";" + this.mK +";" + this.mE;
	this.mP = mP;
	return mP
}

/**
 * Method to create hash for the message which will be used for routing purpose.
 * @returns hash.
 */
messageContext.prototype.calculateRouteHash = function(msg){
	var hash = "";
	// var _msg = msg || this.orgMessage;
	var stringRouteHash = getRouteHash(msg);
	var hashM = CliqzSecureMessage.sha1(stringRouteHash).toString();
	var dmC = hexToBinary(hashM)['result'].slice(0,13);
	var routeHash = parseInt(dmC, 2);
	return dmC;
}

/**
 * Method to get proxy IP based on route hash which will be used for routing purpose.
 * @returns hash.
 */
messageContext.prototype.getProxyIP = function(routeHash){
	var totalProxies = 4096;
	var modRoute = routeHash % totalProxies;
	var proxyIP = createHttpUrl(CliqzSecureMessage.routeTable[modRoute]);
	return proxyIP;
}


messageContext.prototype.log =  function(msg){
	if(CliqzSecureMessage.debug){
		CliqzUtils.log(msg, "Message signing");
	}

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
    debug: true,
    blindSign: blindSignContext,
    counter: 0,
    messageContext: messageContext,
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
    SOURCE_MAP_PROVIDER: "http://securebrowsingtest-419796688.us-east-1.elb.amazonaws.com/sourcemap.json?q=1",
    LOOKUP_TABLE_PROVIDER: "http://securebrowsingtest-419796688.us-east-1.elb.amazonaws.com/lookuptable?q=1",
    KEYS_PROVIDER: "http://securebrowsingtest-419796688.us-east-1.elb.amazonaws.com/signerKey?q=1",
    temporalUniquness:{},
    peerID:null,
    proxyID:null,
    proxyList: [ "54.157.18.130", "54.211.9.241", "54.145.178.227" ], // We should save the last list of proxyList on disk.
    proxyStats:{},
    PROXY_LIST_PROVIDER: "http://securebrowsingtest-419796688.us-east-1.elb.amazonaws.com/proxyList",
    signerKey: null,
    loggerKey: null,
    pacemaker: function() {
    	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 10 == 0) {
            if (CliqzSecureMessage.debug) {
                CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter/CliqzSecureMessage.tmult , CliqzSecureMessage.LOG_KEY);
            }

        }

        if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 5 == 0) {
            var currentTime = Date.now();
            if(!CliqzUtils.getWindow()) return;
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
        if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 20 * 1) == 0) {
            if (CliqzSecureMessage.debug) {
                CliqzUtils.log('Load source mapping config', CliqzSecureMessage.LOG_KEY);
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

            // Flush proxy stats
            CliqzSecureMessage.flushProxyStats();
        }

        CliqzSecureMessage.counter += 1;
    },
    fetchRouteTable: function(){
		// This will fetch the route table from local file, will move it to webservice later.
		_http(CliqzSecureMessage.LOOKUP_TABLE_PROVIDER)
		.get()
		.then(function(res){
			CliqzSecureMessage.routeTable = JSON.parse(res);
			return;
		})
		.catch(function(err){CliqzUtils.log("Error occurred while getting route table" + err, CliqzSecureMessage.LOG_KEY)});
	},
    fetchProxyList: function(){
		// This will fetch the route table from local file, will move it to webservice later.
        CliqzUtils.httpGet(CliqzSecureMessage.PROXY_LIST_PROVIDER,
          function success(res){
			var proxyList = JSON.parse(res.response);
			CliqzSecureMessage.proxyList = proxyList;
          },
          function error(res){
            CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY)
            });
    },
    fetchSecureKeys: function(){
		// This will fetch the route table from local file, will move it to webservice later.
        CliqzUtils.httpGet(CliqzSecureMessage.KEYS_PROVIDER,
          function success(res){
			var keys = JSON.parse(res.response);
			CliqzSecureMessage.signerKey = keys["signer"];
			CliqzSecureMessage.loggerKey = keys["securelogger"];
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
		sendM(CliqzSecureMessage._telemetry_sending[CliqzSecureMessage.pushMessage.next()['value']])

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
    init: function(window){
    	// Doing it here, because this lib. uses navigator and window objects.
    	// Better method appriciated.

        if (CliqzSecureMessage.pacemakerId==null) {
            CliqzSecureMessage.pacemakerId = CliqzUtils.setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
        }

    	Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/crypto-kjur.js', window);
    	// Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/rsa-sign.js', window);
    	// Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/peerjs.js', window)(6);
    	CliqzSecureMessage.RSAKey = window.RSAKey;
    	CliqzSecureMessage.sha1 = window.CryptoJS.SHA1;

    	// Get sourceMap
    	// fetchRouteTable();
    	CliqzSecureMessage.fetchRouteTable();
    	CliqzSecureMessage.fetchProxyList();
    	fetchSourceMapping();
    	// CliqzSecureMessage.proxyIP();
    	if(!CliqzSecureMessage.dbConn) CliqzSecureMessage.initDB();
    	if(!localTemporalUniq) loadLocalCheckTable();

		/*
		var requestedPeer = "peer2"

		var c = peer.connect(requestedPeer, {
		        label: 'chat',
		        serialization: 'none',
		        metadata: {message: 'hi i want to chat with you!'}
		      });
		CliqzSecureMessage.wsconn = c
		peer.on('open', function(id){
		  console.log("ID:" + id);
		});
		*/

		// CliqzUtils.log(peer.id,"SXSXSX");
		// CliqzUtils.getWindow().console.log('aa',window.Peer({host: '54.157.18.130', port: 9000, path: '/'}));


    	/*
        var peer = new window.Peer({host: '54.157.18.130', port: 9000, path: '/'});

        CliqzUtils.log("ID: " + peer['id'],"XX");

    	CliqzSecureMessage.peer = peer;
		*/
    	// CliqzSecureMessage.wsconn.send("https://newbeta.cliqz.com/api/v1/results?q=test&s=UPDGlPBfFXmmPUAEpV6G7TicIgl2rE4k&n=1&qc=0&lang=en%2Cde&force_country=true&adult=0")
    	// var testTU = JSON.stringify({"uPK":"MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAhq3VXODlZXqNHVKuKEPzXZy5H/DhXC0QhzUozMASWK5Px2MQRYrpFlkE81KYUYoBLjSqabY2dBz9nMrnn2B9qEFTDWioZ0co2aHMvEiw72uacmBisOMchV0/Vj7hCh0rDu1NbJM6739u6VFhVX7KfUPecaH7aUfAj1seoRyNyKqWmHovk8SMJDpDwJQwYdQQ6e+r4B6bCOeiahsADO0qXVoC16hEGlPLIDBZexuKf1a2WO7ZPy5b95B9DsXpHbsUXJrAO/1DDVM6i7YH2XJv/b1fGYI9creok5ZJmgAndnJcXPIhMYFvvIz+Z0qBJNYWaHJkMAWfFG7HN34jzZjJUwIDAQAB","mP":"4be46;bQsLaGD7iEozd8UDwimtrb2H5Nika1GbDkmXIMzQV5FX6DyU58B70d1DOXEFK7uMrYYdcQbeinwlzsQvQpdx3Dn/CMd0GNerprihz9VaAWYo8n/UvtwSnG9SsUv23Nm97rWDaHR62NQ0uOExCNJhErYy0mPc+LIMhEvBCcCRQGOldDtqM4Nsfwrq1W7B3hAJZAd6QNomg/6abcQPDzDF24Tcw0j0K/gaEaUlk0VNXFGohmoqAJRFPRHPunUhHwXD8fD/ifbNM341U0PuY0xS+kjrhuUlbex8BVNWm1J8FJfqPKrs+SAJO2CL0BJfAf7c+IN2RTO/3mgbJ1xhUCMO4Bzo3sq/M7qe50ECPNgB3itjwoiGPZ3NvknX5ZUAOaLy22p1SfdGUQVH/NtcRuUmjW+CyFkMvtGCbklaribYEa7ES0GxeaNTfQdnMT+Ei1XRW5d7K0bYTvyAWYvGwMBlP4AZdNhHxPAGIR4Xl1/KK41vTOlSmd9K1KIG2JX7qZ3B3smbIMxNP3+Ba2brcRmMO9qJ3hlq3QynDpfIlIxjfIip2uXM8poq2rQLDLRymH6wRcF+YPWDWDdiYj9L3pws1ILQgXmxl89GXVO8ykPIwOlC7x87bvQRbrxPqfkJ7RuGm5Ue4Dwbst6kgrYWiEYfwBD1NG3bVz0VOJnUHaRLzeE=;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","dmC":"1011010000111","bs1":"240252777481127927309644669424437951793930361778538241636418925947104200548474216523695310809357562629466223207066765683243598108070230103012694314954512528466575021125791562206655021936599648364063167571960654066229316897489996106106381903219463298895867648826148272500382889509305932983975914419747994711135150742752813135245612921453150222037165755374099899270546953272457130309415691670321729315463471530594918249686156324820679621700927427182694741146154152569872724913452676971990639686501729331135120387354598942504638773269227915213054816472307007712567708633117824117520304317866386544907735419276209768188473825677497208846671642839518304497226936246442665885139844045824580263766013754998729707100117493255864532881212907136583475144871411902027418575067417550291921248843802423462522282237782225336239597483143913297100137587116951982860288286646731295541485909123116223300022897443319846903024258709063180588675197309882015987353087768764494099796093947635205841861268072783862352972870490877367794370475031943280889510827480116171306614768156811710338826387542891187452944044391889283546360471685308256534100810931773297151544946288471505525981815943319962085074839614769973138106586148477525358419059090237598455359938","bs2":"906057393022174516847661924405003800106491629098922817526409271325261626227188687080594798523939333703553755808021091968994426373386040118181343618754775324000909860887147282030446218833851369732089033661530224690082275029741479964967148987387474097191039048880093908227424199386958445899885382992112400712315194514967425778804441659487821888830074407116756123096629931631345300047800687145509337789650993657003888602439295815988961499181889399051734416496595769301989100401604238212219212782571364185615143290082645304296908884700718826689660073514125319006056860488495804279120301426867676216514424599153095214442658413328181854943823913037872041695231446993809656166136515364351661739450830380864871407266997505733674907987907000433128710351532531838856058836184821867338705663129793266285135913385143622812813468287646768268983377417557992118014414587066447827830013000577026383921838149326373339015767204707100011944257198557598984765137531360091293779160023924421625400883597898020794811859120058377998106111791662178877381049870804716360203745829341139447185326856837860828601807077483005172272480654635834094270664079064224031330413715242534381219591138905101117052691440873943444662048922716921593455324831810963115971997465","bs3":"549690755720780866646730186709452920366171218941873036414150453598689630430576981344605316504306004960441018375934482846407352678341837840582034433215662100572129953151268051639891050318257008919478192162188563030260199450833821919288825238220281441852390101591123269264604168752485832679085498864507853443278277297274050366510012053088555383286781560367559168848990520971908620833530644819885817134821080443071690272187401622498750194400911812163391363553859116142560707040203771570939670226852764948117370386335339902669246958853313540177099430088610244704610723989383957493358817562041194389906159748883550074719520702690994743933525273741123601921032875586180961077438815438865478514575401577020721038768677716622501834327148326520656802222025586407098331253655077394062842135170840872251412230050556284747605323837488799089258303545156862394569375651881950520869230649623038110495049238989469831809384652917933245412708425834749599073302878617579694602236700501319711366281651985521263035825300653802007891340369640818713922454134472892383874496884897611319444676468305096519353522295870695588059677136628671797918179371991506440843052675120301234423320155435222283642160424715539703308578899335884863764177949392939081230871716","sig":"32245ebfcb9dcf10629eaed97b8988ebb4fb7836beeca1b2188b10d7b593e76e86ed6a279c40fbb3393e37befaf237edbe55deea28919fc100122d6dfc3c9b8cf6747d07c516162a4888c13cc75ad534ff4c76f484f570e47a1128c77e8c13aa10d9a31fff6687a6593fad09b54087fb10f4c07f366294039646e55ae3821d598f77e6918f6d9e33fe59c4d6f8c3c2e28f1e383fe46add1105cb0c1ce78675baefff685dc853d7c7b4309fd3010d50bdbb48a29f1e11a19f251940931cf685b9183c32c79e846922d9d73cffa3700111bf051ca7638c497eaeb268b0b7bf90d8c7ada02dbc23fcc2632e739c9a16d903a67e2778143705a52335d6aeaee6478a"})
   		// var tuM = new tuMessageContext(testTU);
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
    	dump("unloadedxxx1");
    	saveLocalCheckTable();
    	CliqzUtils.clearTimeout(CliqzSecureMessage.pacemakerId);
    	dump("unloadedxxx");
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
					stats[statname] = [value];
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
		CliqzSecureMessage.proxyStats = {};
		var msg = {"action": "proxy-health", "anti-duplicates":Math.floor(Math.random() * 10000000),"type": "cliqz", "ver": "1.5", "payload": proxyStats,"ts": CliqzUtils.getPref('config_ts', null)};
		CliqzSecureMessage.telemetry(msg);
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