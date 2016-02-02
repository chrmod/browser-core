import CliqzSecureMessage from 'hpn/main';


/*
Function to clean string for calculating route hash
*/
var punctuation = '!"\'()*,-./:;?[\\]^_`{|}~%$=&+#'
var regex =  new RegExp("[" + punctuation + "]","g");
function cleanStr(s){
  // Replace all spaces

  // Because in some telemetry message we only create uniqu based on anti-duplicate.
  // Anti-duplicate is not a string, hence converting it to string.
  s = '' + s;

  // Decode uri component
  // Need to find lua equivalent

  try{
    s = decodeURIComponent(s);
  }catch(e){};


  s = s.replace(/ /g,'');

  // Convert to lower
  s = s.toLowerCase();

  // Trim
  s = s.trim();

  // Remove all punctuation marks
  s = s.replace(regex,'');

  // Clean the URL
  s = s.replace(/^http:\/\//, "");
  s = s.replace(/^https:\/\//, "");
  s = s.replace(/^www\./,'');

  // Cleant the Puntuations
  return s;

}

/*
Function to create http url
*/

export function createHttpUrl(host){
	return "http://" + host + "/verify";
}

/* This method will return the string based on mapping of which keys to use to hash for routing.
*/
export function getRouteHash(msg){
	// Make sure this is JSON.
	// msg.action = msg.action.toLowerCase();
	var static_fields = CliqzSecureMessage.sourceMap[msg.action]["static"] || [];
	var flatMsg = JSON.flatten(msg, static_fields );
	if(!flatMsg.action) return null;
	var keys = CliqzSecureMessage.sourceMap[flatMsg.action]["keys"];

	var routeHashStr = "";
	keys.forEach(function(key){
    var s = cleanStr(flatMsg[key])
		routeHashStr += s;
	});
  routeHashStr = routeHashStr.replace(/ /g,'');
  routeHashStr = routeHashStr.trim();
	return routeHashStr;
}


export function fetchSourceMapping(){
	// This will fetch the route table from local file, will move it to webservice later.
    //Check health
    CliqzUtils.httpGet(CliqzSecureMessage.SOURCE_MAP_PROVIDER,
    	function success(req){
    		try {
    			CliqzSecureMessage.sourceMap = JSON.parse(req.response);
    		} catch(e){}
    	},
    	function error(res){
    		CliqzUtils.log('Error loading config. ', CliqzSecureMessage.LOG_KEY);
    	}, 5000);
}

// Create a new http handler.
export function _http(url){

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
        if(CliqzSecureMessage) CliqzSecureMessage.stats(uri, "total-sent", 1);

        client.onload = function () {
        	var statusClass = parseInt(client.status / 100);
        	var te = new Date().getTime();
        	CliqzUtils.log("Time taken: " + (te - ts),CliqzSecureMessage.LOG_KEY);
        	if(CliqzSecureMessage) CliqzSecureMessage.stats(uri, "latency", (te-ts));
          // CliqzUtils.log("Time taken2: " + CliqzSecureMessage.performance.getEntriesByName("lat"),CliqzSecureMessage.LOG_KEY);

          if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
            // Performs the function "resolve" when this.status is equal to 2xx
            resolve(this.response);
          } else {
            // Performs the function "reject" when this.status is different than 2xx
            CliqzUtils.log("Error _http: " + client.status,"Other status code." + this.response);
            CliqzSecureMessage.stats(uri, client.status, 1);
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
        };
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
}

/*
Converts given array to generator like object.
*/
export function trkGen(trk) {
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
        	cipherParams.iv = CryptoJS.enc.Hex.parse(jsonObj.iv);
        }
        if (jsonObj.s) {
        	cipherParams.salt = CryptoJS.enc.Hex.parse(jsonObj.s);
        }

        return cipherParams;
      }
};


export { JsonFormatter };