var db = {
    showConsoleLogs: false
};

CLIQZEnvironment = {
	TEMPLATES_PATH: '/generic/static/templates/',
    log: function(msg, key){ console.log(key, msg) },
    getPref: function(k, d){return db[k] || d; },
    setPref: function(k,v){db[k] = v},
    setInterval: function(){ setInterval.apply(null, arguments) },
    setTimeout: function(){ setTimeout.apply(null, arguments) },
    clearTimeout: function(){ clearTimeout.apply(null, arguments) },
    tldExtractor: function(host){
    	//lucian: temp - FIX IT
    	return host.split('.').splice(-1)[0];
    },
    OS: 'darwin',
    isPrivate: function(){ return false; },
    getWindow: function(){ return window; },
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
    historySearch: function(q, callback, searchParam, sessionStart){
        var res = [];
        for (var i = 0; i<5; i++) {
            res.push({
                style:   'favicon',
                value:   'http://coolurl_' + i + '.com',
                image:   '',
                comment: query + 'Title ' +i,
                label:   ''
            });
        }
        callback({
            query: q,
            results: res,
            ready:  true
        })
    }
}

//Lucian: temp hopefully
CliqzLanguage = {
	stateToQueryString: function(){ return ''; }
}
/*
CliqzAutocomplete = {
    spellCorr: {}
}
*/
CliqzResultProviders = {
    getCustomResults: function(q){
        return [q]
    }
}
CliqzHistoryPattern = {
    detectPattern: function(){}
}
XPCOMUtils = {
	defineLazyModuleGetter: function(){},
    generateQI: function(){},
}
Services = {
	scriptloader: {
		loadSubScript: function(){}
	}
}

Components = {
    interfaces: {
        nsIAutoCompleteResult: {}
    },
	utils: {
		import: function(){}
	},
    ID: function(){}
}

XULBrowserWindow = {
    updateStatusField: function(){},
    setOverLink: function(){}
}