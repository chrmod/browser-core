Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

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

Object.keys(TESTS).forEach(function (testName) {
  var testFunction = TESTS[testName];
  var moduleNames = getFunctionArguments(testFunction);
  var modules = moduleNames.map(loadModule);
  testFunction.apply(null, modules);
});


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

mocha.run();