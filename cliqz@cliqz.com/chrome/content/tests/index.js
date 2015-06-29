const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import('resource://gre/modules/osfile.jsm');

var MODULES = {};
mocha.setup('bdd');

function getFunctionArguments(fn) {
  var args = fn.toString ().match (/^\s*function\s+(?:\w*\s*)?\((.*?)\)/);
  return args ? (args[1] ? args[1].trim ().split (/\s*,\s*/) : []) : [];
}

function loadModule(moduleName) {
  if(!MODULES[moduleName]) {
    XPCOMUtils.defineLazyModuleGetter(MODULES, moduleName,
                    'chrome://cliqzmodules/content/'+moduleName+'.jsm');
  }
  return MODULES[moduleName];
}

function writeToFile(testData) {
 try {
  var _this = this,
      filename = "mocha-report.xml",
      path = OS.Path.join(OS.Constants.Path.profileDir, filename);
   
  OS.File.writeAtomic(path, testData).then(
    function(value) {
      console.log("save: saved to" + path);
    }, function(e) {
      console.log("save: failed saving to" + path + ":" +e);
    });  
 } catch(e) {
    console.log("save: failed saving to" + path + ":" +e);  
 }
}

Object.keys(TESTS).forEach(function (testName) {
  var testFunction = TESTS[testName];
  var moduleNames = getFunctionArguments(testFunction);
  var modules = moduleNames.map(loadModule);
  testFunction.apply(null, modules);
});

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

/* Turn off telemetry during tests */
var telemetry, CliqzUtils;

beforeEach(function () {
  CliqzUtils = loadModule("CliqzUtils");
  telemetry = CliqzUtils.telemetry;
  CliqzUtils.telemetry = function () {};
});

afterEach(function () {
  CliqzUtils.telemetry = telemetry;
  CliqzUtils.getWindow().CLIQZ.Core.urlbar.mInputField.setUserInput("");
});

window.focus();

var runner =  mocha.run();

var XMLReport = '<?xml version="1.0" encoding="UTF-8"?>';
Mocha.reporters.XUnit.prototype.write = function (line) {
  XMLReport += line;
};
new Mocha.reporters.XUnit(runner, {});

runner.on('end', function () { 
  writeToFile(XMLReport);

  if(getParameterByName('closeOnFinish') === "1") {
    console.log("test");
    Components
      .classes['@mozilla.org/toolkit/app-startup;1']
      .getService(Components.interfaces.nsIAppStartup)
      .quit(Components.interfaces.nsIAppStartup.eForceQuit);
  }
});