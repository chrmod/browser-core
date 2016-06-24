"use strict";
var fs = require('fs');
var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var Babel = require('broccoli-babel-transpiler');
var JSHinter = require('broccoli-jshint');
var compileSass = require('broccoli-sass-source-maps');


var cliqzConfig = require('./config');

var bowerComponents = new Funnel('bower_components');
var platform = new Funnel('platforms/'+cliqzConfig.platform, {
  exclude: ['tests/**/*']
});

platform = Babel(platform, {
  sourceMaps: cliqzConfig.sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleRoot: 'platform'
});

var babelOptions = {
  sourceMaps: cliqzConfig.sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleIds: true,
  compact: false
};

// Attach subprojects
let transpilableModuleNames = [];
var requiredBowerComponents = new Set();

cliqzConfig.rawModules = [];
cliqzConfig.modules.slice(0).forEach(function (name) {
  let configJson = "{}";

  try {
    configJson = fs.readFileSync('modules/'+name+'/config.json');
  } catch(e) {
    // Existance of config.json is not required
  }

  let config = JSON.parse(configJson);

  (config.bower_components || []).forEach(Set.prototype.add.bind(requiredBowerComponents));

  if (config.transpile !== false ){
    transpilableModuleNames.push(name);
  } else {
    cliqzConfig.modules.splice(cliqzConfig.modules.indexOf(name), 1);
    cliqzConfig.rawModules.push(name);
  }
});

// START - ES TREE
let sources = new Funnel('modules', {
  include: transpilableModuleNames.map(name => `${name}/sources/**/*.es`),
  getDestinationPath(path) {
    return path.replace("/sources", "");
  }
});

const moduleTestsTree = new Funnel('modules', {
  include: transpilableModuleNames.map(name => `${name}/tests/**/*.es`),
  getDestinationPath(path) {
    return path.replace("/tests", "");
  }
});

let jsHinterTree = new JSHinter(sources, {
  jshintrcPath: process.cwd() + '/.jshintrc',
  disableTestGenerator: true
});
jsHinterTree.extensions = ['es']

let transpiledSources = Babel(sources, babelOptions);
let transpiledModuleTestsTree = Babel(
  new Funnel(moduleTestsTree, { destDir: 'tests' }),
  babelOptions
);

let sourceTrees = [
  jsHinterTree,
  transpiledSources,
];

if (cliqzConfig.buildEnv !== 'production') {
  sourceTrees.push(transpiledModuleTestsTree);
}

let sourceTree = new Funnel(
  new MergeTrees(sourceTrees),
  {
    exclude: ["**/*.jshint.js"]
  }
);
// END - ES TREE

// START - CSS TREE
let sassTrees = [];
transpilableModuleNames.forEach( name => {
  let modulePath = `modules/${name}`,
      hasStyles = false;

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
        { sourceMap: cliqzConfig.sourceMaps }
      );

      sassTrees.push(new Funnel(compiledCss, { destDir: `${name}/styles` }));
    });
  }
});
let sassTree = new MergeTrees(sassTrees);
// END - CSS TREE

// START - DIST TREE
let distTree = new Funnel("modules", {
  include: (cliqzConfig.modules.concat(cliqzConfig.rawModules)).map( name => `${name}/dist/**/*` ),
  getDestinationPath(path) {
    return path.replace("/dist", "");
  }
});
// END - DIST TREE

let modules = new MergeTrees([
  new Funnel(platform, { destDir: "platform" }),
  distTree,
  sassTree,
  sourceTree,
]);
let bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) })
]);

module.exports = {
  modules,
  bowerComponents: bowerTree
}
