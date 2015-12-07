#!/usr/bin/env node

'use strict';

const program = require('commander');
const spaws = require('cross-spawn');

const OUTPUT_PATH = process.env['CLIQZ_OUTPUT_PATH'] || 'build';

function setConfigPath(configPath) {
  configPath = configPath || './configs/beta.json';
  process.env['CLIQZ_CONFIG_PATH'] = configPath;
}

program.version('0.0.1');

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

program.parse(process.argv);
