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
var nodeModules    = new Funnel('node_modules');
var firefoxSpecific = new Funnel('specific/firefox/cliqz@cliqz.com', {
  exclude: ['platform.js']
});
var firefoxPlatform = new Funnel('specific/firefox/', { include: ['platform.js'] });
var firefoxPackage  = new Funnel('specific/firefox/package');
var exceptionsJsm   = new Funnel('specific/firefox', { include: ['CliqzExceptions.jsm'] });
var chromeSpecific  = new Funnel('specific/chrome');
var iOSSpecific     = new Funnel('specific/iOS');
var mobileSpecific  = new Funnel('specific/mobile');
var androidSpecific = new Funnel('specific/androidkit');
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

// attach subprojects
var components = [];
var modules = []

fs.readdirSync("modules").forEach(function (name) {
  var path = 'modules/'+name;
  if(fs.statSync(path).isDirectory()) {
    var init = new Funnel(path, { include: ['component.js'], destDir: path });

    var sources = Babel(new Funnel(path+'/sources'), {
      sourceMaps: 'inline',
      filterExtensions: ['es'],
      modules: 'system',
      moduleRoot: name,
    });

    var module = new MergeTrees([
      new Funnel(path+'/dist' ),
      sources,
      new Funnel(firefoxPlatform)
    ]);

    components.push(init);
    modules.push(new Funnel(module, { destDir: name }));
  }
});

modules = new MergeTrees(modules);

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

var toolLibsConcated = concat( new MergeTrees([
  libsConcated,
  new Funnel(androidSpecific, { include: [ 'js/viewpager.js'] }),
]), {
  outputFile: 'libs.js',
  inputFiles: [ 'libs.js' ],
  footerFiles: [ 'js/viewpager.js' ],
  sourceMapConfig: { enabled: false },
});

var localMobile = concat(local, {
  outputFile: 'js/local.js',
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
// compiled trees
var android = new MergeTrees([
  new Funnel(staticFiles, { srcDir: 'locale', destDir: 'navigation/locale' }),
  new Funnel(staticFiles, { srcDir: 'skin', destDir: 'navigation/skin' }),
  new Funnel(mobileSpecific, { srcDir: 'skin', destDir: 'navigation/skin/mobile' }),
  new Funnel(mobileSpecific, { srcDir: 'templates', destDir: 'navigation/templates' }),
  new Funnel(androidSpecific, { destDir: 'navigation' }),
  new Funnel(globalConcated, { destDir: 'navigation/js' }),
  new Funnel(libsConcated, { destDir: 'navigation/js' }),
  new Funnel(localMobile, { destDir: 'navigation' }),
  new Funnel(local, { include: ['CliqzAntiPhishing.js'], destDir: 'navigation/js' }),
]);

var chrome = new MergeTrees([
  chromeSpecific,
  new Funnel(generic, { destDir: 'navigation-tool' }),
]);

var firefoxLibs = new MergeTrees([
  libs,
  new Funnel(nodeModules, { srcDir: 'es6-micro-loader/dist', include: ['system-polyfill.js'] })
]);

var firefox = new MergeTrees([
  new Funnel(new MergeTrees([
    firefoxSpecific,
    new Funnel(".", { include: ["cliqz.json"], destDir: "chrome/content" }),
    new Funnel(staticFiles, { destDir: 'chrome' }),
    new Funnel(firefoxLibs, { destDir: 'modules/extern' }),
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
  new Funnel(toolLibsConcated, { destDir: 'js' }),
  new Funnel(cliqziumSpecific, { }),
]);

var tool = new MergeTrees([
  new Funnel(staticFiles, { exclude: ['module'] }),
  new Funnel(compiledCss, { destDir: 'styles/css' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(localConcated, { destDir: 'js' }),
  new Funnel(toolLibsConcated, { destDir: 'js' }),
  new Funnel(compiledViews, { include: ['index.html'] }),
]);

var firefoxDebug = new MergeTrees([
  firefox,
  new Funnel(exceptionsJsm, { destDir: 'cliqz@cliqz.com/modules' }),
  new Funnel(extensionJsm, { destDir: 'cliqz@cliqz.com/modules' }),
], { overwrite: true });

var ios = new MergeTrees([
  new Funnel(generic, { destDir: 'generic' }),
  new Funnel(globalConcated, { destDir: 'js' }),
  new Funnel(libsConcated, { destDir: 'js' }),
  localMobile,
  new Funnel(iOSSpecific, { destDir: 'iOS/css', srcDir: 'css' }),
  new Funnel(iOSSpecific, { include: ['index.html'] }),
]);

// Output trees
module.exports = new MergeTrees([
  new Funnel(android,      { destDir: 'androidkit'   }),
  new Funnel(chrome,       { destDir: 'chrome'       }),
  new Funnel(cliqzium,     { destDir: 'cliqzium'     }),
  new Funnel(firefox,      { destDir: 'firefox'      }),
  new Funnel(firefoxDebug, { destDir: 'firefoxDebug' }),
  new Funnel(tool,         { destDir: 'tool'         }),
  new Funnel(ios,          { destDir: 'tool_iOS'     }),
  // debug view
  new Funnel(helpers,      { destDir: 'views' }),
  new Funnel(compiledCss,  { destDir: 'generic/static/styles/css' }),
  new Funnel(staticFiles,  { destDir: 'generic/static' }),
]);
