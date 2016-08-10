var CliqzSecureMessage = {
	VERSION: '0.1',
	LOG_KEY: 'securemessage',
	debug: true,
	mode:"safe",
	counter: 0,
	tmult: 4,
  	tpace: 250,
	SOURCE_MAP_PROVIDER: "https://hpn-collector.cliqz.com/sourcemapjson?q=1",
	LOOKUP_TABLE_PROVIDER: "https://hpn-collector.cliqz.com/lookuptable?q=1",
	KEYS_PROVIDER: "https://hpn-collector.cliqz.com/signerKey?q=1",
	proxyList: null,
	proxyStats:{},
	PROXY_LIST_PROVIDER: "https://hpn-collector.cliqz.com/proxyList?q=1",
	BLIND_SIGNER:"https://hpn-sign.cliqz.com/sign",
	USER_REG:"https://hpn-sign.cliqz.com/register",
	signerKey: null,
	loggerKey: null,
	localTemporalUniq:null,
	pacemakerId: null,
	testMessage: function(){
		var sample_message = [
								{"action":"extension-query","type":"cliqz","ts":"","ver":"1.5","payload":"a&s=Mdw1i5slNi95U3DCaw9dCJWdRQPWM3CV&n=1&qc=0&lang=en%2Cde&locale=en-US&force_country=true&adult=0&loc_pref=ask"},
								{"action": "alive","mode":"safe", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}
							 ]
		sample_message.forEach( e=> {
			CliqzSecureMessage.pushMessage(e);
		})
	},
	pacemaker: function() {
	  	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 10 == 0) {
	  		if (CliqzSecureMessage.debug) {
	  			CliqzUtils.log('Pacemaker: ' + CliqzSecureMessage.counter/CliqzSecureMessage.tmult , CliqzSecureMessage.LOG_KEY);
	  		}

	  	}

	  	/* Konark : Need to get the event from extension, to switch the proxyIP
	  	if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % 5 == 0) {
	  		var currentTime = Date.now();


	  		if(!CliqzUtils.getWindow() || !CliqzUtils.getWindow().CLIQZ || !CliqzUtils.getWindow().CLIQZ.UI) return;
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
		*/

	    //Fetch sourceMap
	    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 3 * 1) == 0) {
	    	if (CliqzSecureMessage.debug) {
	    		CliqzUtils.log('Load proxy list', CliqzSecureMessage.LOG_KEY);
	    	}
	    	fetchSourceMapping();
	    	CliqzSecureMessage.fetchProxyList();
	      	CliqzSecureMessage.fetchRouteTable();
	      	CliqzSecureMessage.prunelocalTemporalUniq();

	    }

	    //Fetch secure keys
	    if ((CliqzSecureMessage.counter/CliqzSecureMessage.tmult) % (60 * 60 * 1) == 0) {
	    	if (CliqzSecureMessage.debug) {
	    		CliqzUtils.log('Load signer keys', CliqzSecureMessage.LOG_KEY);
	    	}
	    	CliqzSecureMessage.fetchSecureKeys();

	    }

	    /* Konark : To be fixed, after implementing DB in here.
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
		*/
	    CliqzSecureMessage.counter += 1;
 	},
 	init: function(){
		if (CliqzSecureMessage.pacemakerId == null) {
		    CliqzSecureMessage.pacemakerId = setInterval(CliqzSecureMessage.pacemaker, CliqzSecureMessage.tpace, null);
		}
		CliqzSecureMessage.secureLogger = new secureLogger();
 	},
	pushMessage: function(msg){
		msg.mode = CliqzSecureMessage.mode;
		var mc = new messageContext(msg);
		mc.aesEncrypt()
		.then(function(enxryptedQuery){
			return mc.signKey();
		})
		.then(function(){
			var data = {"mP":mc.getMP()}
			return _http("http://54.211.9.241/verify")
			 	   .post(JSON.stringify(data), "instant")
		})
		.then(function(response){
			if(msg.action != "extension-query") return;
			return mc.aesDecrypt(JSON.parse(response)["data"]);
		})
		.then(function(res){
			// callback && callback({"response":res});
			console.log(res);
		})
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
  		// This will fetch the public keys for signer and collector.
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
	prunelocalTemporalUniq: function(){
	  if(CliqzSecureMessage.localTemporalUniq){
	    var curr_time = Date.now();
	    var pi = 0;
	    Object.keys(CliqzSecureMessage.localTemporalUniq).forEach( e => {
	      var d = CliqzSecureMessage.localTemporalUniq[e]["ts"];
	      var diff = (curr_time - d);
	      if(diff >= (24 * 60 * 60 * 1000)) {
	        delete CliqzSecureMessage.localTemporalUniq[e];
	        pi += 1;
	      }
	    });
	    CliqzUtils.log("Pruned local temp queue: " + pi + "items", CliqzSecureMessage.LOG_KEY);
	    if(CliqzHumanWeb.actionStats) CliqzHumanWeb.actionStats['itemsLocalValidation'] = Object.keys(CliqzSecureMessage.localTemporalUniq).length;
	  }
	},
  	sha1: function(dataString){
	    var promise = new Promise(function(resolve, reject){
	      var documentBytes = stringToByteArray(dataString);
	      crypto.subtle.digest({
	        name:"SHA-1"
	      },
	        documentBytes
	      )
	      .then(function(hash){
	          var signatureBytes = new Uint8Array(hash);
	          resolve(byteArrayToHexString(signatureBytes));
	      })
	      .catch(function(err){
	          CliqzUtils.log(">>> Error" + err);
	          reject(err);
	      });
	    })
	    return promise;
  	}
}