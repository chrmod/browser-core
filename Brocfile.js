"use strict";
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var compileSass = require('broccoli-sass-source-maps');
var concat = require('broccoli-sourcemap-concat');
var jade = require('broccoli-jade');
var fs = require('fs');
var path = require('path');
var Babel = require('broccoli-babel-transpiler');
var amdNameResolver = require('amd-name-resolver');
var AssetRev = require('broccoli-asset-rev');
var uglify = require('broccoli-uglify-sourcemap');
var writeFile = require('broccoli-file-creator');
var JSHinter = require('broccoli-jshint');
var ConfigReplace = require('broccoli-config-replace');

// build environment
var buildEnv = process.env.CLIQZ_BUILD_ENV || 'development';

// input trees
var bowerComponents = new Funnel('bower_components');
var nodeModules    = new Funnel('node_modules');
var firefoxSpecific = new Funnel('specific/firefox/cliqz@cliqz.com');
var firefoxPackage  = new Funnel('specific/firefox/package');
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*', '*.py'] });
var cliqziumSpecific= new Funnel('specific/cliqzium');
var webSpecific     = new Funnel('specific/web');
var generic         = new Funnel('generic');
var libs            = new Funnel(generic, { srcDir: 'modules/libs' });
var global          = new Funnel(generic, { srcDir: 'modules/global' });
var local           = new Funnel(generic, { srcDir: 'modules/local', exclude: ['views/**/*'] });
var ui              = new Funnel(local,   { include: ['UI.js'] });
var staticViews     = new Funnel(generic, { srcDir: 'modules/local/views' });

// Build configuration
var configFilePath  = process.env['CLIQZ_CONFIG_PATH'];
var cliqzConfig     = JSON.parse(fs.readFileSync(configFilePath));

// start - setting up frameScript whitelist
cliqzConfig.settings.frameScriptWhitelist = cliqzConfig.settings.frameScriptWhitelist || [];
if (buildEnv === 'development') {
  // freshtab development server
  cliqzConfig.settings.frameScriptWhitelist.push('http://localhost:3000/');
}
// end

console.log('Configuration file:', configFilePath);
console.log(cliqzConfig);
var config          = writeFile('cliqz.json', JSON.stringify(cliqzConfig));

var platform = new Funnel('platforms/'+cliqzConfig.platform);
platform = Babel(platform, {
  sourceMaps: 'inline',
  filterExtensions: ['es'],
  modules: 'system',
  moduleRoot: 'platform'
});

webSpecific = jade(webSpecific);

var mobileCss = compileSass(
  ['specific/mobile/skin/sass'],
  'style.sass',
  'style.css',
  { sourceMap: true }
);

// Attach subprojects
let moduleConfigs = Object.create(null);
let bareModules = [];

cliqzConfig.modules.forEach(function (name) {
  let configJson = "{}";

  try {
    configJson = fs.readFileSync('modules/'+name+'/config.json');
  } catch(e) {
    // Existance of config.json is not required
  }

  moduleConfigs[name] = JSON.parse(configJson);
});

let bareModuleNames = cliqzConfig.modules.filter(name => moduleConfigs[name].transpile === false)

var modules = [new Funnel(platform, { destDir: "platform" })];
var requiredBowerComponents = new Set();
var modulesTree = new Funnel('modules', {
  include: cliqzConfig.modules.map( name => `${name}/**/*` )
});

var jsHinterTree = new JSHinter(
  new Funnel(modulesTree, {
    include: ['**/*.es', '**/*.js'],
    exclude: bareModuleNames.map( name => `${name}/**/*` )
  }),
  {
    testGenerator: function () { return ''; },
    jshintrcPath: process.cwd() + '/.jshintrc'
  }
);
jsHinterTree.extensions = ['js', 'es']

modulesTree = new MergeTrees([
  modulesTree,
  jsHinterTree
]);

cliqzConfig.modules.forEach(function (name) {
  var modulePath = 'modules/'+name;

  if (!fs.statSync(modulePath).isDirectory()) {
    return;
  }


  if (bareModuleNames.indexOf(name) >= 0) {
    bareModules = new Funnel(`${modulePath}/dist`, { destDir: name });
    return;
  }

  try {
    var conf = fs.readFileSync(modulePath+'/bower_components.json');
    JSON.parse(conf).forEach(Set.prototype.add.bind(requiredBowerComponents));
  } catch(e) { }

  var sources = new Funnel(modulesTree, { srcDir: name + '/sources', exclude: ['styles/**/*'] });

  sources = Babel(sources, {
    sourceMaps: 'inline',
    filterExtensions: ['es'],
    modules: 'system',
    moduleRoot: name,
  });

  var outputTree = [
    new Funnel(modulesTree, { srcDir: name + '/dist' }),
    sources,
  ];

  var hasStyles = false;

  try {
    fs.statSync(modulePath+"/sources/styles"); // throws if not found
    hasStyles = true;
  } catch (e) { }

  if (hasStyles) {
    fs.readdirSync( modulePath+'/sources/styles').forEach(function (file) {
      var extName = path.extname(file);

      if ( (file.indexOf('_') === 0) ||
           ['.sass', '.scss'].indexOf(extName) === -1 ) {
        return;
      }

      var compiledCss = compileSass(
        [modulePath+'/sources/styles'],
        file,
        file.replace(/\.(sass|scss)+$/, '.css'),
        { sourceMap: true }
      );

      outputTree.push(new Funnel(compiledCss, { destDir: 'styles' }));
    });
  }

  var module = new MergeTrees(outputTree);

  modules.push(new Funnel(module, { destDir: name }));
});

modules = new MergeTrees(modules.concat(bareModules));
modules = new Funnel(modules, { exclude: ["**/*.jshint.js"] });

var babelOptions = {
  modules: "amdStrict",
  moduleIds: true,
  resolveModuleSource: amdNameResolver,
  sourceMaps: "inline"
};

var loader = new Funnel(bowerComponents, { include: ['loader.js/loader.js'] });
var babelStaticViews = new Babel(staticViews, babelOptions);
var babelUi = new Babel(ui, babelOptions);
var uiTree = MergeTrees([loader, babelStaticViews, babelUi]);

var uiConcated = concat(uiTree, {
  outputFile: 'UI.js',
  headerFiles: ['loader.js/loader.js'],
  inputFiles: [
    "**/*.js"
  ],
  footerFiles: [
    'UI.js',
  ],
  footer: "require('UI').default(this);",
  sourceMapConfig: { enabled: true },
});

local = MergeTrees([
  new Funnel(local, { exclude: ['UI.js'] }),
  uiConcated
]);

var globalConcated = concat(global, {
  outputFile: 'global.js',
  header: "'use strict';\n\nvar CLIQZ = {};\n\n",
  headerFiles: [
    'CliqzUtils.jsm',
  ],
  inputFiles: [
    '*.jsm',
  ],
  footer: "\n",
  sourceMapConfig: { enabled: true },
  process: function (src,filepath) {
    var modulename = filepath.match(/[^\/]+$/)[0].split(".")[0]
    return "// start module " + modulename + "\n"
           + "(function(ctx,Q,E){\n"
           + src
           + "; ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
           + "})(this, CLIQZ,CLIQZEnvironment);\n"
           + "// end module " + modulename + "\n\n"
  }
});

var localConcated = concat(local, {
  outputFile: 'local.js',
  header: "'use strict';\n\n",
  inputFiles: [
    "UI.js",
    "ContextMenu.js",
  ],
  sourceMapConfig: { enabled: true },
});

var libsConcated = concat(libs, {
  outputFile: 'libs.js',
  inputFiles: [
    "*.js",
  ],
  sourceMapConfig: { enabled: false },
});

var localMobile = concat(local, {
  outputFile: 'local.js',
  header: "'use strict';\n",
  inputFiles: [ 'UI.js' ],
});

var bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) })
]);

var firefoxLibs = new MergeTrees([
  libs,
  new Funnel(nodeModules, { srcDir: 'es6-micro-loader/dist', include: ['system-polyfill.js'] }),
]);

var extensionConfig = new ConfigReplace(
  new Funnel(firefoxSpecific, { include: [ 'modules/Extension.jsm' ] }),
  config,
  {
    configPath: 'cliqz.json',
    files: [
      'modules/Extension.jsm'
    ],
    patterns: [{
      match: /\{\{CONFIG\}\}/g,
      replacement: config => JSON.stringify(config)
    }]
  }
);

firefoxSpecific = new MergeTrees([
  firefoxSpecific,
  extensionConfig,
], { overwrite: true });

//  first level trees
var firefox = new MergeTrees([
  new Funnel(new MergeTrees([
    firefoxSpecific,
    new Funnel(config,      { destDir: 'chrome/content'}),
    new Funnel(firefoxLibs, { destDir: 'modules/extern' }),
    new Funnel(global,      { destDir: 'modules' }),
    new Funnel(local,       { destDir: 'chrome/content'}),
    new Funnel(bowerTree,   { destDir: 'chrome/content/bower_components' }),
    new Funnel(modules,     { destDir: 'chrome/content' }),
  ], { overwrite: true } ), { destDir: 'cliqz@cliqz.com' }),
  firefoxPackage,
]);

var cliqzium = new MergeTrees([
  new Funnel(globalConcated,   { destDir: 'js' }),
  new Funnel(localConcated,    { destDir: 'js' }),
  new Funnel(libsConcated,     { destDir: 'js' }),
  cliqziumSpecific,
]);

var web = new MergeTrees([
  webSpecific,
  modules,
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localConcated,  { destDir: 'js' }),
  new Funnel(libsConcated,   { destDir: 'js' }),
]);

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(libsConcated,   { destDir: 'js' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localMobile,    { destDir: 'js' }),
  new Funnel(mobileCss,      { destDir: 'skin/css' }),
  new Funnel(modules,        { destDir: 'modules' })
]);

if (buildEnv === 'production' ) {
  mobile = new AssetRev(mobile, {
    extensions: ['js', 'css'],
    replaceExtensions: ['html', 'css', 'js'],
    generateAssetMap: true
  });
  // uglify breaks for cliqz-oss/broccoli#building-server:
  // "The .read/.rebuild API is no longer supported of Broccoli 1.0"
  // mobile = uglify(new Funnel(mobile), {
  //   mangle: false,
  //   compress: false,
  //   output: {
  //     indent_level: 2,
  //     comments: false,
  //     beautify: true
  //   },
  //   sourceMapConfig: {
  //     enabled: false
  //   }
  // });
}

// Output
module.exports = new MergeTrees([
  new Funnel(cliqzium, { destDir: 'cliqzium'      }),
  new Funnel(firefox,  { destDir: 'firefox'       }),
  new Funnel(web,      { destDir: 'web'           }),
  new Funnel(mobile,   { destDir: 'mobile/search' }),
]);
