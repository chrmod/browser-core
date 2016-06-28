"use strict";
var fs = require('fs');
var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');
var Babel = require('broccoli-babel-transpiler');
var JSHinter = require('broccoli-jshint');
var compileSass = require('broccoli-sass-source-maps');
var broccoliSource = require('broccoli-source');
var WatchedDir = broccoliSource.WatchedDir;
var UnwatchedDir = broccoliSource.UnwatchedDir;

var cliqzConfig = require('./config');

const bowerComponents = new UnwatchedDir('bower_components');
const modulesTree = new WatchedDir('modules');
const subprojectsTree = new UnwatchedDir('subprojects');

var babelOptions = {
  sourceMaps: cliqzConfig.sourceMaps ? 'inline' : false,
  filterExtensions: ['es'],
  modules: 'system',
  moduleIds: true,
  compact: false
};

function getPlatformTree() {
  let platform = new Funnel(new WatchedDir('platforms/'+cliqzConfig.platform), {
    exclude: ['tests/**/*']
  });
  platform = Babel(platform, Object.assign({}, babelOptions, {moduleIds: false}));
  return new Funnel(platform, { destDir: "platform" });
}

// Attach subprojects
var requiredBowerComponents = new Set();

const moduleConfigs = cliqzConfig.modules.map(name => {
  let configJson;

  try {
    configJson = fs.readFileSync('modules/'+name+'/config.json');
  } catch(e) {
    // Existance of config.json is not required
    configJson = "{}";
  }

  let config = JSON.parse(configJson);
  config.name = name;
  config.transpile = typeof config.transpile === "boolean" ? config.transpile : true;

  return config;
});

moduleConfigs.forEach( config => {
  (config.bower_components || []).forEach(Set.prototype.add.bind(requiredBowerComponents));
});

function getSourceTree() {
  let sources = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name => `${name}/sources/**/*.es`),
    getDestinationPath(path) {
      return path.replace("/sources", "");
    }
  });

  const moduleTestsTree = new Funnel(modulesTree, {
    include: cliqzConfig.modules.map(name =>  `${name}/tests/**/*.es`),
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

  return new Funnel(
    new MergeTrees(sourceTrees),
    {
      exclude: ["**/*.jshint.js"]
    }
  );
}

function getSassTree() {
  const sassTrees = [];
  cliqzConfig.modules.filter( name => {
    let modulePath = `modules/${name}`;

    try {
      fs.statSync(modulePath+"/sources/styles"); // throws if not found
      return true;
    } catch (e) {
      return false;
    }
  }).forEach(name => {
    let modulePath = `modules/${name}`;

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
  });

  return new MergeTrees(sassTrees);
}

function getDistTree() {
  const distTrees = new MergeTrees([
    modulesTree,
    subprojectsTree
  ]);
  return new Funnel(distTrees, {
    include: cliqzConfig.modules.concat(cliqzConfig.subprojects).map( name => `${name}/dist/**/*` ),
    getDestinationPath(path) {
      return path.replace("/dist", "");
    }
  });
}

const modules = new MergeTrees([
  getPlatformTree(),
  getDistTree(),
  getSassTree(),
  getSourceTree(),
]);
const bowerTree = new MergeTrees([
  new Funnel(bowerComponents, { include: Array.from(requiredBowerComponents) })
]);

module.exports = {
  modules,
  bowerComponents: bowerTree
}
