'use strict';
/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

var EXPORTED_SYMBOLS = ['ResultProviders'];

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/Services.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');


var INIT_KEY = 'newProvidersAdded',
	LOG_KEY = 'NonDefaultProviders.jsm',
	KEY ='#',
	// default shortcut is first 2 lowercased letters
	// the folowing are non default
    MAPPING = {
        '#gi': 'Google Images',
        '#gm': 'Google Maps'
    },
    CUSTOM = {
        '#fee': {
            url: 'https://beta.cliqz.com/support/'
        },
        '#team': {
            url: 'https://beta.cliqz.com/team/'
        },
        '#cliqz': {
            url: 'https://beta.cliqz.com/'
        },
        '#join': {
            url: 'https://beta.cliqz.com/jobs/'
        }
    },
    ENGINE_CODES = ['google images', 'google maps', 'google', 'yahoo', 'bing', 'wikipedia', 'amazon', 'ebay', 'leo']
	;

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp


var ResultProviders = {
    init: function(){
        // creates shortcuts for all the engines
        this.getSearchEngines();
    },
    getCustomResults: function(q){
        var results = null;
        var customQuery = ResultProviders.isCustomQuery(q);
        var isLocationWiki_query = function(query){ // THUY ------ testing WIKI LOCATION results with GOOGLE MAP
            if (query.toLowerCase() === "thuycliqz")
                return true;
            return false;
        };
        if(customQuery){
            results = [
                Result.generic(
                    Result.CLIQZC + ' sources-' + customQuery.engineCode,
                    customQuery.queryURI,
                    null,
                    null,
                    null,
                    null,
                    {
                        q: customQuery.updatedQ,
                        engine: customQuery.engineName
                    }
                )
            ];
            q = customQuery.updatedQ;
        } else if(CliqzCalculator.isCalculatorSearch(q)){
            var calcRes = CliqzCalculator.get(q);
            if (calcRes != null){
                results = [calcRes];
            }
        } else if(isLocationWiki_query(q)) {  // THUY ------ testing WIKI LOCATION results with GOOGLE MAP
            results = [Result.cliqzExtra(
                {
                    q: q,
                    url: 'http://de.wikipedia.org/wiki/Australien',
                    style: "cliqz-extra",
                    type: "cliqz-extra",
                    subType: JSON.stringify({type:'calculator'}),
                    "data": {
                        "template": "hq12",
                        "description": "THUY-Der Staat Australien liegt auf der Südhalbkugel nordwestlich von Neuseeland und südlich von Indonesien, Osttimor, West-Neuguinea und Papua-Neuguinea und umfasst neben der kontinentalen Landmasse die vorgelagerte Insel Tasmanien und einige kleinere Inseln.",
                        "source_language": "DE",
                        "source_name": "Wikipedia",
                        "richData": {
                            "map":{
                                "url": "http://maps.google.com/maps/api/staticmap?size=200x200&center=Paris&format=png&markers=size:mid%7Ccolor:red%7Clabel:1%7CParis&sensor=false",
                                "alt_text": 'GoogleMap',
                                "search_url": "http://maps.google.com/?q=Australia"
                            },
                            "images": [
                                "http://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Flag_of_Australia.svg/300px-Flag_of_Australia.svg.png",
                                "http://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Coat_of_Arms_of_Australia.svg/300px-Coat_of_Arms_of_Australia.svg.png",
                                "http://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Australia-climate-map_MJC01.png/440px-Australia-climate-map_MJC01.png",
                                "http://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Uluru_Australia%281%29.jpg/440px-Uluru_Australia%281%29.jpg",
                                "http://ts1.mm.bing.net/th?id=HN.607993960275905008&pid=15.1&H=99&W=160",
                                "http://ts1.mm.bing.net/th?id=HN.608014958369835100&pid=15.1&H=106&W=160",
                                "http://ts4.mm.bing.net/th?id=HN.608040028094595619&pid=15.1&H=240&W=160",
                                "http://ts1.mm.bing.net/th?id=HN.608038511970419668&pid=15.1&H=160&W=160"
                            ],
                            "additional_sources": [
                                {
                                    "title": "Geographie Australiens",
                                    "url": "http://de.wikipedia.org/wiki/Geographie_Australiens"
                                },
                                {
                                    "title": "Klima in Australien",
                                    "url": "http://de.wikipedia.org/wiki/Klima_in_Australien"
                                },
                                {
                                    "title": "Fauna Australiens",
                                    "url": "http://de.wikipedia.org/wiki/Fauna_Australiens"
                                }]
                        },
                        "title": "Australien"
                    }
                })];
        }
        return [q, results];
    },
    getSearchEngines: function(){
        var engines = {},
            defEngines = Services.search.getEngines();
        for(var i=0; i<defEngines.length; i++){
            var engine = defEngines[i];
            if(engine.hidden != true && engine.iconURI){
                engines[engine.name] = {
                    prefix: ResultProviders.getShortcut(engine.name),
                    name: engine.name,
                    icon: engine.iconURI.spec,
                    code: ResultProviders.getEngineCode(engine.name),
                    base_url: engine.searchForm
                }


            }
        }
        return engines;
    },
    getEngineCode: function(engineName){
        for(var c in ENGINE_CODES){
            if(engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1){
                return +c + 1;
            }
        }
        // unknown engine
        return 0;
    },
    getEngineSubmission: function(engine, q){
        return Services.search.getEngineByName(engine).getSubmission(q);
    },
    setCurrentSearchEngine: function(engine){
        Services.search.currentEngine = Services.search.getEngineByName(engine);
    },
    // called for each query
    isCustomQuery: function(q){
        if(CUSTOM[q.trim()] && CUSTOM[q.trim()].url){
            return {
                updatedQ  : q,
                engineName: 'CLIQZ',
                queryURI  : CUSTOM[q.trim()].url
            }
        }
        // a prefix has min 4 chars
        if(q.length < 5) return false;

        var components = q.split(' ');

        if(components.length < 2) return false;

        var start = components[0],
            end = components[components.length-1];

        if(MAPPING.hasOwnProperty(start)){
            var uq = q.substring(start.length + 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[start],
                queryURI  : Services.search.getEngineByName(MAPPING[start]).getSubmission(uq).uri.spec,
                engineCode: ResultProviders.getEngineCode(MAPPING[start])
            };
        } else if(MAPPING.hasOwnProperty(end)) {
            var uq = q.substring(0, q.length - end.length - 1);
            return {
                updatedQ  : uq,
                engineName: MAPPING[end],
                queryURI  : Services.search.getEngineByName(MAPPING[end]).getSubmission(uq).uri.spec,
                engineCode: ResultProviders.getEngineCode(MAPPING[end])
            };
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
		url: "http://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
		name: "Google Images",
		iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
		method: 'GET'
	},
	{
		key: "#gm",
		url: "http://maps.google.de/maps?q={searchTerms}",
		name: "Google Maps",
		iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
        method: 'GET'
	}
];

if (!CliqzUtils.getPref(INIT_KEY, false)) {
    CliqzUtils.setPref(INIT_KEY, true);

    var PROPS = ["name", "iconURL", "name" /*alias*/, "name" /*description*/, "method", "url"];

    for(var idx = 0; idx < NonDefaultProviders.length; idx++){
    	var extern = NonDefaultProviders[idx];

    	try {
    	CliqzUtils.log('Analysing ' + extern.name, LOG_KEY);
	    if (!Services.search.getEngineByName(extern.name)) {
	    	CliqzUtils.log('Added ' + extern.name, LOG_KEY);
        	Services.search.addEngineWithDetails.apply(
        		Services.search,
            	PROPS.map(function (k) { return extern[k]; })
            );
   		} }
   		catch(e){
   			CliqzUtils.log(e, 'err' + LOG_KEY);
   		}
    }
}

ResultProviders.init();
