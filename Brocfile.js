var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var compileSass = require('broccoli-sass-source-maps');
var concat = require('broccoli-sourcemap-concat');
var jade = require('broccoli-jade');
var fs = require('fs');
var Babel = require('broccoli-babel-transpiler');
var amdNameResolver = require('amd-name-resolver');

// input trees
var bowerComponents = new Funnel('bower_components');
var firefoxSpecific = new Funnel('specific/firefox/cliqz@cliqz.com', {
  exclude: ['chrome/content/core.js', 'platform.js']
});
var firefoxCoreJs   = new Funnel('specific/firefox/cliqz@cliqz.com/chrome/content', { include: ['core.js'] });
var firefoxPlatform = new Funnel('specific/firefox/', { include: ['platform.js'] });
var firefoxPackage  = new Funnel('specific/firefox/package');
var exceptionsJsm   = new Funnel('specific/firefox', { include: ['CliqzExceptions.jsm'] });
var mobileSpecific  = new Funnel('specific/mobile', { exclude: ['skin/sass/**/*'] });
var cliqziumSpecific= new Funnel('specific/cliqzium');
var generic         = new Funnel('generic');
var staticFiles     = new Funnel(generic, { srcDir: 'static', exclude: ['styles/sass/**/*', 'styles/css/**/*'] });
var staticFiles     = new Funnel(generic, { srcDir: 'static', exclude: ['styles/sass/**/*', 'styles/css/**/*', 'views/**/*'] });
var staticViews     = new Funnel(generic, { srcDir: 'static/views' });
var locales         = new Funnel(generic, { srcDir: 'static/locale', destDir: 'locale' });
var templates       = new Funnel(generic, { srcDir: 'static/templates', destDir: 'templates'});
var libs            = new Funnel(generic, { srcDir: 'modules/libs' });
var global          = new Funnel(generic, { srcDir: 'modules/global' });
var local           = new Funnel(generic, { srcDir: 'modules/local' });
var ui              = new Funnel(local, { include: ['UI.js'] });
var helpers         = new Funnel('views');
var jadeViews       = new Funnel(helpers, { include: ['*.jade'] });
var compiledViews   = jade(jadeViews);
var compiledCss     = compileSass(
  ['generic/static/styles/sass'],
  'extension.scss',
  'extension.css',
  { sourceMap: true }
);
var mobileCss = compileSass(
  ['specific/mobile/skin/sass'],
  'style.sass',
  'style.css',
  { sourceMap: true }
);

// attach subprojects
var components = [];
var modules = []

fs.readdirSync("modules").forEach(function (name) {
  var path = 'modules/'+name;
  if(fs.statSync(path).isDirectory()) {
    var init = new Funnel(path, { include: ['component.js'], destDir: path });
    var module = new MergeTrees([
      new Funnel(path+'/dist', { destDir: name }),
      new Funnel(firefoxPlatform, { destDir: name })
    ]);
    components.push(init);
    modules.push(module);
  }
});

modules = new MergeTrees(modules);

firefoxCoreJs = concat(new MergeTrees([firefoxCoreJs].concat(components)), {
  outputFile: 'chrome/content/core.js',
  inputFiles: [ '**/*.js'],
  headerFiles: [ 'core.js' ],
  sourceMapConfig: { enabled: true },
});

firefoxSpecific = new MergeTrees([firefoxSpecific, firefoxCoreJs]);

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
])

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
           + "ctx[EXPORTED_SYMBOLS[0]] = " + modulename + ";\n"
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

var extensionJsm = concat(firefoxSpecific, {
  outputFile: 'Extension.jsm',
  inputFiles: [
    'modules/Extension.jsm',
  ],
  process: function (src,filepath) {
    return src.split('\n')
              .map(function (line){
                if(line.indexOf('CliqzExceptions') !== -1) {
                  return line.replace('// ', '');
                } else {
                  return line;
                }
              })
              .join('\n')
  }
});


var firefox = new MergeTrees([
  new Funnel(new MergeTrees([
    firefoxSpecific,
    new Funnel(staticFiles, { destDir: 'chrome' }),
    new Funnel(libs,        { destDir: 'modules/extern' }),
    new Funnel(global,      { destDir: 'modules' }),
    new Funnel(local,       { destDir: 'chrome/content'}),
    new Funnel(modules,     { destDir: 'chrome/content' }),
    new Funnel(compiledCss, { destDir: 'chrome/styles/css' }),
  ], { overwrite: true } ), { destDir: 'cliqz@cliqz.com' }),
  firefoxPackage,
]);

var cliqzium = new MergeTrees([
  new Funnel(locales, { }),
  new Funnel(templates, { }),
  new Funnel(compiledCss, { destDir: 'css' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localConcated, { destDir: 'js' }),
  new Funnel(libsConcated, { destDir: 'js' }),
  new Funnel(cliqziumSpecific, { }),
]);

var tool = new MergeTrees([
  new Funnel(staticFiles, { exclude: ['module'] }),
  new Funnel(compiledCss, { destDir: 'styles/css' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localConcated, { destDir: 'js' }),
  new Funnel(libsConcated, { destDir: 'js' }),
  new Funnel(compiledViews, { include: ['index.html'] }),
]);

var mobile = new MergeTrees([
  mobileSpecific,
  new Funnel(locales, { }),
  new Funnel(libsConcated, { destDir: 'js' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localMobile, { destDir: 'js' }),
  new Funnel(mobileCss, { destDir: 'skin/css' }),
]);

var firefoxDebug = new MergeTrees([
  firefox,
  new Funnel(exceptionsJsm, { destDir: 'cliqz@cliqz.com/modules' }),
  new Funnel(extensionJsm, { destDir: 'cliqz@cliqz.com/modules' }),
], { overwrite: true });


// Output trees
module.exports = new MergeTrees([
  new Funnel(cliqzium,     { destDir: 'cliqzium'     }),
  new Funnel(firefox,      { destDir: 'firefox'      }),
  new Funnel(firefoxDebug, { destDir: 'firefoxDebug' }),
  new Funnel(tool,         { destDir: 'tool'         }),
  new Funnel(mobile,       { destDir: 'mobile'       }),
  // debug view
  new Funnel(helpers,      { destDir: 'views' }),
  new Funnel(compiledCss,  { destDir: 'generic/static/styles/css' }),
  new Funnel(staticFiles,  { destDir: 'generic/static' }),
]);
