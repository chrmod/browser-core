#!/usr/bin/env node

'use strict';

const program = require('commander');
const spaws = require('cross-spawn');
const fs = require('fs');
const wrench = require('wrench');
const walk = require('walk');
const colors = require('colors');

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

function setConfigPath(configPath) {
  configPath = configPath || './configs/jenkins.json';
  process.env['CLIQZ_CONFIG_PATH'] = configPath;
}

program.version('0.1.0');

program.command('build [file]')

       .action(configPath => {
          setConfigPath(configPath);

          console.log("Starting build");
          let child = spaws('broccoli', ['build', OUTPUT_PATH]);
          child.stderr.on('data', data => console.log(data.toString()));
          child.stdout.on('data', data => console.log(data.toString()));
          child.on('close', code => console.log(code === 0 ? 'done' : ''));
       });

program.command('serve [file]')
       .action(configPath => {
          setConfigPath(configPath);

          let child = spaws('broccoli', ['serve', '--output', OUTPUT_PATH]);
          child.stderr.on('data', data => console.log(data.toString()));
          child.stdout.on('data', data => console.log(data.toString()));
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
