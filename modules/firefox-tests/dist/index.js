const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import('chrome://cliqzmodules/content/CLIQZ.jsm');

function loadModule(moduleName) {
  console.log(moduleName)
  return CLIQZ.System.get(moduleName).default;
}

function getBrowserVersion() {
  var userAgent = navigator.userAgent,
      userAgentParts = userAgent.split('/'),
      version = userAgentParts[userAgentParts.length - 1];

  return version;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function closeBrowser() {
  Cc['@mozilla.org/toolkit/app-startup;1']
    .getService(Ci.nsIAppStartup)
    .quit(Ci.nsIAppStartup.eForceQuit);
}

function writeToFile(testData) {
  var version   = getBrowserVersion(),
      filename  = "mocha-report-" + version + ".xml",
      file      = FileUtils.getFile("ProfD", [filename]),
      ostream   = FileUtils.openSafeFileOutputStream(file),
      converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
                    .createInstance(Ci.nsIScriptableUnicodeConverter),
      istream;

  converter.charset = "UTF-8";
  istream = converter.convertToInputStream(testData);

  NetUtil.asyncCopy(istream, ostream);
}

var runner;
var CliqzUtils = loadModule("core/utils"),
    chrome = CliqzUtils.getWindow(),
    telemetry,
    getCliqzResults,
    browserMajorVersion = parseInt(getBrowserVersion().split('.')[0]);

mocha.setup({ ui: 'bdd', timeout: 3000 });

/**
 * If extension did not intialize properly we want to kill tests ASAP
 */
if (!CliqzUtils) {
  describe("CLIQZ Tests", function () {
    it("initialize property", function () {
      throw "CliqzUtils missing";
    });
    after(function () {
      // Force end hook to fire
      runner.emit('end');
    });
  });
}

injectTestHelpers(CliqzUtils);
initHttpServer();

// Load Tests and inject their dependencies
Object.keys(window.TESTS).forEach(function (testName) {
  var testFunction = window.TESTS[testName],
      moduleNames = window.DEPS[testName],
      modules;

  if (moduleNames !== undefined) {
    modules = moduleNames.map(loadModule);
  }

  if ('MIN_BROWSER_VERSION' in testFunction && browserMajorVersion < testFunction.MIN_BROWSER_VERSION) {
    return; // skip tests
  }
  testFunction.apply(null, modules);
});

before(function () {
  // force location as it is IP based
  CliqzUtils.setPref("config_location", "de");
});

beforeEach(function () {
  return CliqzUtils.extensionRestart().then(function () {
    window.closeAllTabs(chrome.gBrowser);

    getCliqzResults = CliqzUtils.getCliqzResults;

    /* Turn off telemetry during tests */
    telemetry = CliqzUtils.telemetry;
    CliqzUtils.telemetry = function () {};
  });
});

afterEach(function () {
  CliqzUtils.telemetry = telemetry;
  CliqzUtils.getCliqzResults = getCliqzResults;

  // clear urlbar
  fillIn("");

  // clean waitFor side effects
  clearIntervals();
});

window.focus();

var runner =  mocha.run();

var XMLReport = '<?xml version="1.0" encoding="UTF-8"?>';

//append firefox version to the className attribute
var mochaTest = Mocha.reporters.XUnit.prototype.test;
Mocha.reporters.XUnit.prototype.test = function (test) {
  var version = getBrowserVersion(),
      fullTitle = test.parent.fullTitle;

  test.parent.fullTitle = function () {
    var title = fullTitle.apply(this);
    if(title.indexOf("firefox: ") === 0) {
      return title;
    } else {
      return "firefox: " + version + " - " + title;
    }
  }

  mochaTest.call(this, test);
}

Mocha.reporters.XUnit.prototype.write = function (line) {
  var version = getBrowserVersion();

  //append project="ff-version" in the test report for jenkins purposes
  if(line.indexOf('<testsuite') !== -1) {
    var line_parts = line.split(" ");
    line_parts.splice(1, 0, 'package="' + 'ff-' + version + '"');
    line = line_parts.join(" ");
  }

  XMLReport += line;
};

new Mocha.reporters.XUnit(runner, {});

runner.on('end', function () {
  writeToFile(XMLReport);
  if(getParameterByName('closeOnFinish') === "1") { closeBrowser(); }
});
