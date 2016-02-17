var Testem  = require('testem');

var testem = new Testem();

testem.startCI({
  host: 'localhost',
  port: '3000'
}, function(exitCode) {
  process.exit();
});
