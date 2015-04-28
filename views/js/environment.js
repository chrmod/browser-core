CLIQZEnvironment = {
	TEMPLATES_PATH: '/generic/static/templates/',
    log: function(msg, key){ console.log(key, msg) },
    getPref: function(){},
    setPref: function(){},
    setInterval: setInterval,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    tldExtractor: function(host){
    	//lucian: temp - FIX IT
    	return host.split('.').splice(-1)[0];
    },
    getWindow: function(){ return window },
    httpHandler: function(method, url, callback, onerror, timeout, data){
        var req = new XMLHttpRequest();
        req.open(method, url, true);
        req.overrideMimeType('application/json');
        req.onload = function(){
            if(!parseInt) return; //parseInt is not a function after extension disable/uninstall

            var statusClass = parseInt(req.status / 100);
            if(statusClass == 2 || statusClass == 3 || statusClass == 0 /* local files */){
                callback && callback(req);
            } else {
                CLIQZEnvironment.log( "loaded with non-200 " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.onerror = function(){
            if(CLIQZEnvironment){
                CLIQZEnvironment.log( "error loading " + url + " (status=" + req.status + " " + req.statusText + ")", "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }
        req.ontimeout = function(){
            if(CLIQZEnvironment){ //might happen after disabling the extension
                CLIQZEnvironment.log( "timeout for " + url, "CLIQZEnvironment.httpHandler");
                onerror && onerror();
            }
        }

        if(callback){
            if(timeout){
                req.timeout = parseInt(timeout)
            } else {
                req.timeout = (method == 'POST'? 10000 : 1000);
            }
        }

        req.send(data);
        return req;
    },
}

//Lucian: temp hopefully
CliqzLanguage = {
	stateToQueryString: function(){ return ''; }
}
CliqzAutocomplete = {}
XPCOMUtils = {
	defineLazyModuleGetter: function(){}
}
Services = {
	scriptloader: {
		loadSubScript: function(){}
	}
}

Components = {
	utils: {
		import: function(){}
	}
}

XULBrowserWindow = {
    updateStatusField: function(){},
    setOverLink: function(){}
}