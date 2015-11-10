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
// var CryptoJS = this.CryptoJS;
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/jsencrypt.js');
Services.scriptloader.loadSubScript('chrome://cliqz/content/extern/sha256.js');


/*
var worker = new Worker('chrome://cliqz/content/extern/demo-worker.js');
// Decide what to do when the worker sends us a message
worker.onmessage = function(e) {
    CliqzUtils.log(e.data, "XXXXXXX");
};

// Send the worker a message
worker.postMessage('hello worker');
*/

/* Source mapping for routing keys, endpoints, rate-limit etc
*/

var sourceMap = {
	"alive" :{				// Action which will identify the message type.
		"keys":["action"],	// Keys to fetch to create route hash.
		"ratelimit": 1,		// How many events are allowed in the defined interval.
		"interval": 3600,	// Time window in which set of events are allowed.
		"endpoint": {
			"protocol": "https",
			"method": "POST",
			"service": "safe-browsing"
		}
	}
}


JSON.flatten = function (data) {
    var result = {};

    function recurse(cur, prop) {
        if (Object(cur) !== cur) {
            result[prop] = cur;
        } else if (Array.isArray(cur)) {
            for (var i = 0, l = cur.length; i < l; i++)
            recurse(cur[i], prop + "[" + i + "]");
            if (l == 0) result[prop] = [];
        } else {
            var isEmpty = true;
            for (var p in cur) {
                isEmpty = false;
                recurse(cur[p], prop ? prop + "." + p : p);
            }
            if (isEmpty && prop) result[prop] = {};
        }
    }
    recurse(data, "");
    return result;
};
JSON.unflatten = function (data) {
    "use strict";
    if (Object(data) !== data || Array.isArray(data)) return data;
    var regex = /\.?([^.\[\]]+)|\[(\d+)\]/g,
        resultholder = {};
    for (var p in data) {
        var cur = resultholder,
            prop = "",
            m;
        while (m = regex.exec(p)) {
            cur = cur[prop] || (cur[prop] = (m[2] ? [] : {}));
            prop = m[2] || m[1];
        }
        cur[prop] = data[p];
    }
    return resultholder[""] || resultholder;
};

var sample_message = ['{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}'];

/* This method will return the string based on mapping of which keys to use to hash for routing.
*/

function getRouteHash(msg){
	var flastMsg = JSON.flatten(JSON.parse(msg));
	var keys = sourceMap[msg.action]["keys"];
	return msg[keys[0]];

}
function fetchRouteTable(){
	// This will fetch the route table from local file, will move it to webservice later.
	_http("chrome://cliqz/content/route-hash-table.json")
	.get()
	.then(function(response){
		CliqzUtils.log(respone, CliqzSecureMessage.LOG_KEY);
	})
	.catch(_this.log("Error occurred while fetch signing key: "));
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
		this.publiKey = this.keyGen.getPublicKeyB64();
		CliqzUtils.setPref('userPKBeta', this.privateKey);
	}
	else{
		this.keyGen.setPrivateKey(keySet);
		this.privateKey = this.keyGen.getKey();
		this.publiKey = this.keyGen.getPublicKeyB64();
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
 * Method to create object for message recieved..
 * Only excepts valid JSON messages with the following fields:
 * Type : Humanweb / Antitracking etc.
 * Actions : Valid actions like Page, query etc.
 * @returns string with payload created.
 */
var messageContext = function (msg) {
 	this.orgMessage = msg;
 	this.jMessage = JSON.parse(msg);
 	this.sha256 = sha256_digest(this.orgMessage);
 	this.signed = null;
 	this.encrypted = null;
 	this.routeHash = "http://192.168.3.249/verify"; // Default : null;
 	this.type = this.jMessage.type;
 	this.action = this.jMessage.action;
 	this.interval = sourceMap[this.action]["interval"];
 	this.rateLimit = sourceMap[this.action]["ratelimit"];

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
		    var key = CryptoJS.MD5(_this.orgMessage);
		    var encrypted = CryptoJS.AES.encrypt(_this.orgMessage, key, {iv:iv});
		    _this.log(eventID);
		    _this.eventID = eventID;
		    _this.aesKey = key;
			_this.encryptedMessage = encrypted.toString();
			_this.iv = encrypted.iv.toString(CryptoJS.enc.Hex);
			_this.messageToSign = key + ";" + encrypted.iv + ";" + "instant;cPK;endPoint";
			resolve(_this.aes);
		}
		catch(e){
			reject(e);
		}
	})

	return promise;
}


/**
 * Method to sign the AES encryptiong key with Aggregator Public key.
 * @returns string of encrypted key.
 */
messageContext.prototype.signKey = function(){
	var aesKey = this.aesKey.toString(CryptoJS.enc.Base64);
	var _this = this;
	var promise = new Promise(function(resolve, reject){
		try{
			var signedKey = CliqzSecureMessage.secureLogger.keyObj.encrypt(_this.messageToSign);
			_this.signedKey = signedKey;
			resolve(signedKey);
		}
		catch(e){
			reject(e);
		}
	})
	return promise;
}

/**
 * Method to create hash for the message which will be used for routing purpose.
 * @returns hash.
 */
messageContext.prototype.calculateRouteHash = function(msg){
	var hash = "";
	var _msg = msg || this.orgMessage;
	var _keys = ['action'];
	var stringRouteHash = getRouteHash(msg);
	var hashM = sha256_digest(stringRouteHash);
	CliqzUtils.log(JSON.parse(_msg)[_keys[0]]);
	var hash = modInt(str2bigInt(hashM,16), 500);
	this.routeHash = hashM;
	this.proxyHash = hash;
	this.rateLimit = 1; // One-hour, needs to be in seconds.
	CliqzUtils.log("Hash: " + hash,CliqzUtils.LOG_KEY);
}

messageContext.prototype.log =  function(msg){
	if(CliqzSecureMessage.debug){
		CliqzUtils.log(msg, "Message signing");
	}

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
 	this.signerEndPoint = "";
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

/**
 * Method to create payload to send for blind signature.
 * The payload needs to consist of <hash(eventID:encryptedData:SignedKey:rateLimit), userPK>
 * @returns string with payload created.
 */
blindSignContext.prototype.createPayloadBlindSignature = function(){
	var payload = {};
	payload["uPK"] = "";
	payload["encrypted"] = ""; // This needs to be replaces with encrypted.
	payload["sm"] = this.signed;
	payload["routeHash"] = this.routeHash;
	return JSON.stringify(payload);
}

var secureEventLoggerContext = function () {

 	this.keyObj = new JSEncrypt();
 	this.publicKeyPath = "chrome://cliqz/content/secureLogger-pub-key.pub";
 	var _this = this;
	_http(this.publicKeyPath)
	.get()
	.then(function(response){
		CliqzUtils.log("Secure event key loaded and parsed and loaded","SecureLogger");
		var parseKey = _this.keyObj.setPublicKey(response);
		CliqzUtils.log("Secure event key loaded and parsed and loaded","SecureLogger");
	})
	.catch(CliqzUtils.log("Error occurred while fetch signing key: ","SecureLogger"));

}

var CliqzSecureMessage = {
    VERSION: '0.1',
    LOG_KEY: 'securemessage',
    debug: true,
    blindSign: blindSignContext,
    messageContext: messageContext,
    keyPool:[],
    httpHandler:_http,
    secureLogger: new secureEventLoggerContext(),
    cryptoJS: CryptoJS,
    uPK : new userPK(),
    routeTable : [],
    fetchRouteTable: function(){
		// This will fetch the route table from local file, will move it to webservice later.
		_http("chrome://cliqz/content/route-hash-table.json")
		.get()
		.then(function(response){
			// CliqzUtils.log(response, CliqzSecureMessage.LOG_KEY);
			CliqzSecureMessage.routeTable = JSON.parse(response);
			return;
		})
		// .catch(CliqzUtils.log("Error occurred while fetch signing key: ", CliqzSecureMessage.LOG_KEY));
	}
}

// CliqzSecureMessage.init();


/*
var signerKey =  new CliqzSecureMessage.blindSign()
signerKey.fetchSignerKey()
var bs = new CliqzSecureMessage.blindSign()
bs.e = signerKey.exponent();
bs.n = signerKey.modulus();

var mc = new CliqzSecureMessage.messageContext('{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}');

CliqzSecureMessage.fetchRouteTable()
mc.calculateRouteHash()

mc.aesEncrypt()
.then(function(data){
	console.log("SigningAES-Key")
	return mc.signKey()
})
.then(function(){
	return bs.hashMessage(mc.eventID + ":" + mc.encryptedMessage + ":" + mc.signedKey + ":" + CliqzSecureMessage.uPK.publiKey + ":" + mc.interval + ":" + mc.rateLimit)
	})
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
	payload["uPK"] = CliqzSecureMessage.uPK.publiKey;
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


/*
console.log(message);

for(var i=0;i<10;i++){

bs.hashMessage()
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

/*
var payload1 = {}
// payload1['data'] = mc.eventID + ":" + mc.aes + ":" + mc.signedKey;
// payload1['sm'] = mc.signed;
// payload1['data'] = "mc.eventID + ":" + mc.aes + ":" + mc.signedKey";
payload1['em'] = mc.eventID + ":" + mc.encryptedMessage + ":" + mc.signedKey;
payload1['sm'] = mc.signed;
payload1['rH'] = mc.routeHash;
payload1['rL'] = mc.rateLimit;
payload1['i'] = mc.interval;
payload1['uPK'] =  CliqzSecureMessage.uPK.publiKey;

CliqzSecureMessage.httpHandler("http://192.168.3.249/verify")
  		.post(JSON.stringify(payload1))
*/





/*
var res = arr.reduce(function(p, c){
    return p.then(function(){ return workerFunction(c); });
}, Q());



function securePush(i, secureData){
    if(i < secureData.length){
    	var mc = new CliqzSecureMessage.messageContext(secureData[i]);
    	mc.aesEncrypt()
		.then(function(data){
			console.log("SigningAES-Key")
			return mc.signKey()
		})
		.then(function(){
			return bs.hashMessage(mc.eventID + ":" + mc.encryptedMessage + ":" + mc.signedKey + ":" CliqzSecureMessage.uPK.publiKey + mc.rateLimit);
		})
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
			// console.log(mc.createPayload());
		.catch(function(err)){
			console.log(err);
		}

		var payload1 = {}
			// payload1['data'] = mc.eventID + ":" + mc.aes + ":" + mc.signedKey;
			// payload1['sm'] = mc.signed;
			// payload1['data'] = "mc.eventID + ":" + mc.aes + ":" + mc.signedKey";
			payload1['em'] = mc.eventID + ":" + mc.encryptedMessage + ":" + mc.signedKey;
			payload1['sm'] = mc.signed;
			CliqzSecureMessage.httpHandler("http://192.168.3.249/verify")
			  		.post(JSON.stringify(payload1))
		securePush(i+1, secureData)
		})

	}
    }


    securePush(0, arr)
    */

/*
let arrGenerator = function* (arr) {
	for(var i=0;i<arr.length;i++){
		yield arr[i];
	}

}
arr = ['{"action": "alive", "type": "humanweb", "ver": "1.6", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}'
,'{"action": "alive", "type": "humanweb", "ver": "1.7", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}'
,'{"action": "alive", "type": "humanweb", "ver": "1.8", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}'
,'{"action": "alive", "type": "humanweb", "ver": "1.9", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}'
]
aa = arrGenerator(arr)

for(var i=0;i<arr.length;i++){
	var _msg = aa.next();
	// if(!_msg['done']) console.log("DOne");

	// CliqzUtils.setTimeout(function(){

	// }, [delay])

	var msg = _msg['value'];
	var mc = new CliqzSecureMessage.messageContext();
	mc.aesEncrypt()
	.then(function(data){
		console.log("SigningAES-Key")
		return mc.signKey()
	})
	.then(function(){
		return bs.hashMessage(msg)
		})
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
		payload["uPK"] = CliqzSecureMessage.uPK.publiKey;
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
}
*/