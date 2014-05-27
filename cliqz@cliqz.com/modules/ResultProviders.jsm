'use strict';

var EXPORTED_SYMBOLS = ['ResultProviders'];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZ',
  'chrome://cliqz/content/utils.js');

var INIT_KEY = 'providersAdded1',
	LOG_KEY = 'NonDefaultProviders.jsm',
	KEY ='#',
	// default shortcut is first 2 lowercased letters
	// the folowing are non default
    MAPPING   = {
        '#gi': 'Google Images',
        '#gm': 'Google Maps'
    }
	;

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp


var ResultProviders = {
    init: function(){
        // creates shortcuts for all the engines
        this.getSearchEngines();
    },
    getSearchEngines: function(){
        var engines = {};
        for(var engine of Services.search.getEngines()){
            if(engine.hidden != true){
                engines[engine.name] = {
                    prefix: ResultProviders.getShortcut(engine.name),
                    name: engine.name,
                    icon: engine.iconURI.spec
                }
            }
        }
        return engines;
    },
    getEngineSubmission: function(engine, q){
        return Services.search.getEngineByName(engine).getSubmission(q);
    },
    setCurrentSearchEngine: function(engine){
        var searchPrefs = Components.classes['@mozilla.org/preferences-service;1']
                    .getService(Components.interfaces.nsIPrefService).getBranch('browser.search.');

        searchPrefs.setCharPref('defaultenginename', engine);
        searchPrefs.setCharPref('selectedEngine', engine);
    },
    // called for each query
    isCustomQuery: function(q){
        var components = q.split(' ');

        // a prefix has min 4 chars
        if(q.length < 5) return false;

        var components = q.split(' ');

        if(components.length < 2) return false;

        var start = components[0],
            end = components[components.length-1];

        if(MAPPING[start]){
            var uq = q.substring(start.length + 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[start],
                queryURI  : Services.search.getEngineByName(MAPPING[start]).getSubmission(uq).uri.spec
            }
        } else if(MAPPING[end]) {
            var uq = q.substring(0, q.length - end.length - 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[end],
                queryURI  : Services.search.getEngineByName(MAPPING[end]).getSubmission(uq).uri.spec
            }
        }

        return null;
    },
    // called once at visual hashtag creation
	getShortcut: function(name){
        for(var key in MAPPING)
            if(MAPPING[key] === name)
                return key;

		return ResultProviders.createShortcut(name);
	},
	// create a unique shortcut
	createShortcut: function(name){
		for(var i=2; i<name.length; i++){
			var candidate = KEY + name.substring(0, i).toLowerCase();

			if(MAPPING[candidate] == undefined){
				//this shortcut doesn't exist yet so we can use it
				MAPPING[candidate] = name;

				return candidate;
			}
		}
	},
    getM: function(){ return MAPPING }
}

var NonDefaultProviders = [
	{
		key: "#gi",
		url: "http://www.google.de/search?tbm=isch&q=%q&hl=de",
		name: "Google Images",
		iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
		method: 'GET'
	},
	{
		key: "#gm",
		url: "http://maps.google.de/maps?q=%q",
		name: "Google Maps",
		iconURL: "http://maps.gstatic.com/favicon.ico",
		method: 'GET'
	},
	{
		key: "#le",
		url: "http://dict.leo.org/?search=%q",
		name: "LEO Eng-Deu v2.0",
		iconURL: "data:image/x-icon;base64,AAABAAEAEBAAAAEAGABoAwAAFgAAACgAAAAQAAAAIAAAAAEAGAAAAAAAAAAAAEgAAABIAAAAAAAAAAAAAACh0vp3ad+nb158HwB8IgB5HACnalJeTuBVReGpcF14GwB9IwB1FwCrcFb++/WRiOoj1f94o8I/PlZWUU86JB01EQdXNyo/NJZFOLecaFZ1GQB1FwCrcFf//viQh+5lU9gJyfY1UFXy///0///p+Pjc6uq3wsKQmZlsc3dVU1I9LCpEMCiCgX9lX6pjU82nbFgGxPEYWWiYoaHx///v///M2trj8/P6///////////0///g7u67xsaQlZVPSkdUEwAHy/EAx/YKQE7u/f2lsLArJklQRkU5OVFdYWiMk5O7xcXj8fH0///////0//9EQT8MnvMA2f8NV2nx//+IkZGCr8Tw7/9dTdVGNbmvr69+f39OTF5YV1ZbW1hhYmBfVk8HFOAAmPYLWmfw//+IkpIToMGXzPdXRdk6JdJ/ceKBc+OIfOSCduKAduN/duKGfe8CANsADt8IRGjq+/uPmZkAlbgZ0/99s/JFMdUfB8wfBswfBswfBswfBswfBswfBswCANwAANwFC2nY6Oikrq4AgqEAzv8Z0/9+svI7JtMeBcweBcweBcweBcweBcweBcwIB+IAAN0CAXTD0dHAzc0BcYMAzv8Azv8Z0/+Wz/ielOmIe+SIfeiNhfGOhvKOhvIMCs0AAOQAAH+0wcHY5uYFRGwA2/8Azv8Azv8Z0/+n4Pz////88+PVsp3ZuaTau6UHAjIAAM4AAIawvb3n+PgJDlkAmPYA2v8Azv8Azv8Z0/+Wz/v8+PStclhyEgB5HQAHAgAAADIAAH+otLTn9/cICFoADN4AlPUA2/8Azv8Azv8Z0/+W0Pv//vuweF91FgAJBgUAAAAAACaDjIy+y8sBAXMAANwADd4AmPYA2v8Azv8Azv8Z0/+Wz/v///yweWEGBQwAAAAAAAAPECIcHkoAAMsAAN0AANwADN4AlPUA2f8Azv8Azv8Z0/+U0Pr//v0PDRgKCgoJBgUGAQAHAjIHAsMJBtkFBN0FBNwJEtcHlOkHy/EHxPEHyvca0v+c0PkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
		method: 'GET'
	}
];

if (!CLIQZ.Utils.getPref(INIT_KEY, false)) {
    CLIQZ.Utils.setPref(INIT_KEY, true);

    var PROPS = ["name", "iconURL", "name" /*alias*/, "name" /*description*/, "method", "url"];

    for(var idx = 0; idx < NonDefaultProviders.length; idx++){
    	var extern = NonDefaultProviders[idx];

    	try {
    	CLIQZ.Utils.log('Analysing ' + extern.name, LOG_KEY);
	    if (!Services.search.getEngineByName(extern.name)) {
	    	CLIQZ.Utils.log('Added ' + extern.name, LOG_KEY);
        	Services.search.addEngineWithDetails.apply(
        		Services.search,
            	PROPS.map(function (k) { return extern[k]; })
            );
   		} }
   		catch(e){
   			CLIQZ.Utils.log(e, 'err' + LOG_KEY);
   		}
    }

    CLIQZ.Utils.log('Default Engines updated', LOG_KEY);
}

ResultProviders.init();
