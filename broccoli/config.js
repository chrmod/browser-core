"use strict";
var fs = require('fs');

var configFilePath  = process.env['CLIQZ_CONFIG_PATH'];
console.log('Configuration file:', configFilePath);

var cliqzConfig     = JSON.parse(fs.readFileSync(configFilePath));

module.exports = cliqzConfig;
