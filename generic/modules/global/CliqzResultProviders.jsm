'use strict';
/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

var EXPORTED_SYMBOLS = ['CliqzResultProviders'];

 Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
 Components.utils.import('resource://gre/modules/Services.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

 Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');


// INIT_KEY ('newProvidersAdded') was used only as a boolean but now we have multiple states
// state 1 -> Google images & Google maps
// state 2 -> YouTube engine is added
// state 3 -> Aliases (shortcuts) are updated:
//  - to first 2 letters for default engines
//  - to key property for NonDefaultProviders
 var INIT_KEY = 'newProvidersAdded',
     LOG_KEY = 'NonDefaultProviders.jsm',
     KEY ='#',
     CUSTOM = {
      '#fee': {
        url: 'https://cliqz.com/support/'
      },
      '#team': {
        url: 'https://cliqz.com/team/'
      },
      '#cliqz': {
        url: 'https://cliqz.com/'
      },
      '#join': {
        url: 'https://cliqz.com/jobs/'
      }
     },
     ENGINE_CODES = [
      'google images',
      'google maps',
      'google',
      'yahoo',
      'bing',
      'wikipedia',
      'amazon',
      'ebay',
      'leo',
      'youtube'
    ];

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp


var CliqzResultProviders = {
  init: function () {
    CliqzUtils.log('CliqzResultProviders initialized', LOG_KEY);
    CliqzResultProviders.manageProviders();
  },
  manageProviders: function() {

    CliqzResultProviders.addCustomProviders();
    //at this point YouTube engine is added and state is 2
    if ( CliqzUtils.getPref(INIT_KEY) === 2) {
      CliqzResultProviders.updateEngineAliases();
      CliqzUtils.setPref(INIT_KEY, 3);
    }
  },
  addCustomProviders: function() {
    var providersAddedState,
        maxState = -1;

    if (CliqzUtils.isPrefBool(CliqzUtils.getPref(INIT_KEY))) {
      providersAddedState = 1;
    } else {
      providersAddedState = CliqzUtils.getPref(INIT_KEY, 0);
    }

    NonDefaultProviders.forEach(function (extern) {
      CliqzUtils.log("NonDefaultProviders");
      try {
        CliqzUtils.log('Analysing ' + extern.name, LOG_KEY);
        if (!CLIQZEnvironment.getEngineByName(extern.name)) {
          if (providersAddedState < extern.state) {
            maxState = extern.state > maxState ? extern.state : maxState;
            CliqzUtils.log('Added ' + extern.name, LOG_KEY);
            CLIQZEnvironment.addEngineWithDetails(extern);
          }
        }
      } catch (e) {
        CliqzUtils.log(e, 'err' + LOG_KEY);
      }
    });

    if (maxState > 0) {
      CliqzUtils.setPref(INIT_KEY, maxState);
    }
  },
  updateEngineAliases: function() {
    CliqzResultProviders.getSearchEngines().forEach(function (engine) {
      var alias = engine.alias;
      if(!alias) { alias = CliqzResultProviders.createShortcut(engine.name); }
      if(engine.prefix && (engine.name === alias)) { alias = engine.prefix; }
      CliqzResultProviders.updateAlias(engine.name, alias);

    });
  },
  updateAlias: function(name, newAlias) {
    CLIQZEnvironment.updateAlias(name, newAlias);
    CliqzUtils.log("Alias of engine  " + name + " was updated to " + newAlias, LOG_KEY);
  },
  getCustomResults: function (q) {
    var results = null;
    var customQuery = CliqzResultProviders.customizeQuery(q);

    if(customQuery){
      results = [
        Result.generic(
          Result.CLIQZC + ' sources-' + customQuery.code,
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
    } else if(CliqzCalculator.isCalculatorSearch(q)) {
      var calcRes = CliqzCalculator.calculate(q);
      if (calcRes != null) {
        results = [calcRes];
      }
    }
    return [q, results];
  },
  getEngineCode: function (engineName) {
    for(var c in ENGINE_CODES) {
      if(engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1){
        return +c + 1;
      }
    }
    // unknown engine
    return 0;
  },
  setCurrentSearchEngine: function(engine){
    Services.search.currentEngine = CliqzResultProviders.getEngineByName(engine);
  },
  // called for each query
  customizeQuery: function(q){
    if(CUSTOM[q.trim()] && CUSTOM[q.trim()].url){
      return {
        updatedQ  : q,
        engineName: 'CLIQZ',
        queryURI  : CUSTOM[q.trim()].url,
        code      : '#'
      }
    }
    // a prefix has min 4 chars
    if(q.length < 5) return false;

    var components = q.split(' ');

    if(components.length < 2) return false;

    var start = components[0],
        end = components[components.length-1],
        engineName, uq;

    if(CliqzResultProviders.getEngineByAlias(start)) {
      engineName = CliqzResultProviders.getEngineByAlias(start).name;
      uq = q.substring(start.length + 1);
    } else if(CliqzResultProviders.getEngineByAlias(end)) {
      engineName = CliqzResultProviders.getEngineByAlias(end).name;
      uq = q.substring(0, q.length - end.length - 1);
    }

    if (engineName && uq) {
      return {
        updatedQ:   uq,
        engineName: engineName,
        queryURI:   CliqzResultProviders.getSubmissionByEngineName(engineName, uq),
        code:       CliqzResultProviders.getEngineCode(engineName)
      };
    } else {
      return null;
    }
  },
  getEngineByName: function(engine) {
    return CLIQZEnvironment.getEngineByName(engine);
  },
  getEngineByAlias: function(alias) {
    return CLIQZEnvironment.getEngineByAlias(alias);
  },
  getSubmissionByEngineName: function(name, query){
    var engines = CliqzResultProviders.getSearchEngines();
    for(var i=0; i < engines.length; i++){
      if(engines[i].name == name){
        return engines[i].getSubmissionForQuery(query);
      }
    }
  },
  // called once at visual hashtag creation
  // TODO: use the updated shortcuts from about:preferences#search
  getShortcut: function(name){
    for(var i=0; i < NonDefaultProviders.length; i++)
      if(NonDefaultProviders[i].name === name)
        return NonDefaultProviders[i].key;

    return CliqzResultProviders.createShortcut(name);
  },
  // create a unique shortcut -> first 2 lowercased letters
  createShortcut: function(name){
    return KEY + name.substring(0, 2).toLowerCase();
  },
  getSearchEngines: function(){
    return CLIQZEnvironment.getSearchEngines().map(function(e){
      e.prefix = CliqzResultProviders.getShortcut(e.name);
      e.code   = CliqzResultProviders.getEngineCode(e.name);

      return e;
    });
  }
}

// TODO: create language/location aware customization
var NonDefaultProviders = [
  {
    key: "#gi",
    url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
    name: "Google Images",
    iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
    method: 'GET',
    state:1
  },
  {
    key: "#gm",
    url: "https://maps.google.de/maps?q={searchTerms}",
    name: "Google Maps",
    iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
    method: 'GET',
    state: 1
  },
  {
    key: "#yt",
    url: "https://www.youtube.de/results?search_query={searchTerms}",
    name: "YouTube",
    iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
    method: 'GET',
    state: 2
  }
];
