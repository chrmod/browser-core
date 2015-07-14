const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
//Cu.import('resource://gre/modules/osfile.jsm');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");

function writeToFile(testData) {
      var version = getBrowserVersion(),
          filename = "mocha-report-fileUtils-" + version + ".xml",
          file = FileUtils.getFile("ProfD", [filename]);

      var ostream = FileUtils.openSafeFileOutputStream(file);

      var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                      createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      converter.charset = "UTF-8";
      var istream = converter.convertToInputStream(testData);

      // The last argument (the callback) is optional.
      NetUtil.asyncCopy(istream, ostream, function(status) {
        if (!Components.isSuccessCode(status)) {
          // Handle error!
          return;
        }
      });
}



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

function getBrowserVersion() {
  var userAgent = navigator.userAgent,
      userAgentParts = userAgent.split('/'),
      version = userAgentParts[userAgentParts.length - 1];
  
  return version;
}

/* Using osfile 
 * TODO make an abstraction
 */
/*function writeToFile(testData) {
  var version = getBrowserVersion();
  try {
  var _this = this,
      filename = "mocha-report-" + version + ".xml",
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
}*/

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
  CliqzUtils.extensionRestart()
});

window.focus();

var runner =  mocha.run();

var XMLReport = '<?xml version="1.0" encoding="UTF-8"?>';
Mocha.reporters.XUnit.prototype.write = function (line) {
  var version = getBrowserVersion();
  //append project="ff-version" in the test report for jenkins purposes
  if(line.indexOf('<testsuite') !== -1) {
    var testSuite = line,
        testSuiteParts = testSuite.split(" ");
    testSuiteParts.splice(1, 0, 'package="' + 'ff-' + version + '"');
    line = testSuiteParts.join(" ");
  }
  //TODO: refactor?
  if(line.indexOf('<testcase') !== -1) {
    var testCase = line,
        testCaseAttrs = testCase.split(" ");

        for(var i=0; i < testCaseAttrs.length; i++) {
          if(testCaseAttrs[i].indexOf("classname") !== -1) {
            var className = testCaseAttrs[i];
            className += "-" + version;
            testCaseAttrs[i] = className;
            line = testCaseAttrs.join(" ");
            break;
          }
        }
  }
  XMLReport += line;
};
new Mocha.reporters.XUnit(runner, {});

runner.on('end', function () { 
  writeToFile(XMLReport);

  if(getParameterByName('closeOnFinish') === "1") {
    Components
      .classes['@mozilla.org/toolkit/app-startup;1']
      .getService(Components.interfaces.nsIAppStartup)
      .quit(Components.interfaces.nsIAppStartup.eForceQuit);
  }
});