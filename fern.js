#!/usr/bin/env node

'use strict';

const program = require('commander');
const spaws = require('cross-spawn');
const fs = require('fs');
const wrench = require('wrench');
const walk = require('walk');
const colors = require('colors');
const broccoli = require('broccoli');
const Testem = require('testem')
const path = require('path')
const childProcess = require('child_process');
const rimraf = require('rimraf');
const chalk = require('chalk');

const OUTPUT_PATH = process.env['CLIQZ_OUTPUT_PATH'] || 'build';

colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

// Install git hooks:
let hookInstaller = spaws('git-hooks/install-hooks.sh');
hookInstaller.stderr.on('data', data => console.log(data.toString()));
hookInstaller.stdout.on('data', data => console.log(data.toString()));

function setConfigPath(configPath) {
  configPath = configPath || './configs/jenkins.json';
  process.env['CLIQZ_CONFIG_PATH'] = configPath;
}

function buildEmberAppSync(appPath) {
  isPackageInstalled('ember', '-v', 'npm ember-cli package is missing, to install it run `npm install ember-cli -g`');

  rimraf.sync(appPath + 'dist', []);
  var app = appPath.substring(8).substring(0, appPath.substring(8).length - 1);
  console.log(`Building Ember app: ${app}`);
  spaws.sync('ember', ['build', '--output-path=dist', '--env=production'], { stdio: 'inherit', stderr: 'inherit', cwd: appPath});
}

function isPackageInstalled(pkg, options, msg) {
  var spawned = spaws.sync(pkg, [options], { stderr: 'inherit' });
  if(spawned.error !== null) {
    console.log(chalk.red(msg));
    process.exit(1);
  }
}

program.version('0.1.0');

program.command('install')
       .action(() => {
          isPackageInstalled('bower', '--silent', 'npm bower package missing, to install it run `npm install bower -g`');
          isPackageInstalled('broccoli', '-V', 'npm broccoli-cli package is missing, to install it run `npm install broccoli-cli -g`');
          isPackageInstalled('ember', '-v', 'npm ember-cli package is missing, to install it run `npm install ember-cli -g`');

          console.log(chalk.green('Installing project dependencies'));
          spaws.sync('npm', ['install'], { stdio: 'inherit', stderr: 'inherit'});
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit'});

          console.log(chalk.green('Installing ember freshtab dependencies'));
          spaws.sync('npm', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'modules/fresh-tab-frontend'});
          spaws.sync('bower', ['install'], { stdio: 'inherit', stderr: 'inherit', cwd: 'modules/fresh-tab-frontend'});
          console.log(chalk.green('DONE!'))
       });


program.command('build [file]')
       .option('--no-maps', 'disables source maps')
       .action((configPath, options) => {
          var buildStart = Date.now();
          setConfigPath(configPath);

          process.env['CLIQZ_SOURCE_MAPS'] = options.maps;

          console.log("Starting build");
          buildEmberAppSync('modules/fresh-tab-frontend/');
          let child = spaws('broccoli', ['build', OUTPUT_PATH]);
          child.stderr.on('data', data => console.log(data.toString()));
          child.stdout.on('data', data => console.log(data.toString()));
          child.on('close', code => console.log(code === 0 ? 'done - ' + (Date.now() - buildStart) +'ms' : ''));
       });

program.command('serve [file]')
       .action(configPath => {
          setConfigPath(configPath);
          buildEmberAppSync('modules/fresh-tab-frontend/');
          let child = spaws('broccoli', ['serve', '--output', OUTPUT_PATH], { stdio: 'inherit', stderr: 'inherit'});

       });

program.command('test <file>')
       .option('--ci [output]', 'Starts Testem in CI mode')
       .action( (configPath, options) => {
          setConfigPath(configPath);
          let node = broccoli.loadBrocfile();
          let builder = new broccoli.Builder(node);
          // maybe we can run watcher without server
          // but then we will have to copy build artifacts to 'output' folder
          let server = broccoli.server.serve(builder, {
            port: 4300,
            host: 'localhost',
            output: 'build'
          });
          let watcher = server.watcher;

          if (options.ci) {
            watcher.on('change', function() {
              let child = childProcess.execFile('node', [path.join('fern', 'testem-ci.js')]);

              let testResults = [];
              child.stderr.on('data', data => {
                let result = data.toString();
                testResults.push(result);
                console.log(result);
              });
              child.stdout.on('data', data => {
                let result = data.toString();
                testResults.push(result);
                console.log(result);
              });
              child.on('close', code => {
                if (typeof options.ci === 'string') {
                  fs.writeFileSync(options.ci, testResults.join(""));
                }
                process.exit()
              });
            });
          } else {
            let testem = new Testem();
            let started = false;

            watcher.on('change', function() {
              if (started) {
                testem.restart();
              } else {
                started = true;
                testem.startDev({
                  host: 'localhost',
                  port: '4200'
                });
              }
            });
          }
       });

program.command('generate <type> <moduleName>')
       .description('available types: module')
       .action((type, moduleName) => {
         if(type !== 'module') {
           console.error(`Error: generate does not support type - '${type}'`);
           return;
         }

        const modulePath = `modules/${moduleName}`;

        try {
          fs.lstatSync(modulePath);

          // lstatSync throws error if Directory does not exist, which is
          // the only situation that generator can work.
          console.log(e);
          console.error(`Error: module '${moduleName}' already exists`);
          return;
        } catch (e) {
        }

        wrench.copyDirSyncRecursive('fern/templates/module', modulePath);

        console.log('installing module');
        walk.walk(modulePath).on('file', (root, stat, next) => {
          console.log('  create'.info, `${root}/${stat.name}`);
          next();
        });
       });

program.parse(process.argv);
