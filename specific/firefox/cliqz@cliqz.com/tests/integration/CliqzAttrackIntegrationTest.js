"use strict";

Components.utils.import("chrome://cliqz_bower_components/content/httpd/index.js");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import('resource://gre/modules/osfile.jsm');

/** Gets the absolute path to the Cliqz extension's root directory */
function getExtensionDirectory() {
  var prefs = Components.classes['@mozilla.org/preferences-service;1']
        .getService(Components.interfaces.nsIPrefBranch);
  return JSON.parse(prefs.getCharPref('extensions.xpiState'))['app-profile']['cliqz@cliqz.com']['d'];
}

TESTS.CliqzAttrackIntegrationTest = function(CliqzAttrack, CliqzUtils) {

  describe('CliqzAttrack (integration)', function() {

    var server = null,
      server_port = -1,
      echoed = [];

    /** Collects metadata from the request and pushes it into the
      echoed array. Also sets cookie and access control headers.
    */
    var collect_request_parameters = function(request, response) {
      var r_obj = {
          method: request.method,
          host: request.host,
          path: request.path,
          qs: request.queryString
        },
        header_iter = request.headers,
        headers = {};

      while(header_iter.hasMoreElements()) {
        var header_name = header_iter.getNext().toString();
        headers[header_name] = request.getHeader(header_name);
      }
      r_obj['headers'] = headers;

      response.setHeader('Set-Cookie', 'uid=abcdefghijklmnop; Domain='+r_obj.host+'; Path=/');
      if(r_obj.host != "localhost") {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      echoed.push(r_obj);
      response.write('');
    }

    before(function(done) {
      // set up HTTP server.
      server = new HttpServer();
      // Add static resources from cliqz@cliqz.com/test/mockserver directory
      var f = new FileUtils.File(OS.Path.join(getExtensionDirectory(), 'tests', 'mockserver'));
      server.registerDirectory('/', f);
      // add specific hander for /test which will collect request parameters for testing.
      server.registerPathHandler('/test', collect_request_parameters);

      server.start(60508);
      server_port = server.identity.primaryPort;
      // wait for server to be up
      setTimeout(done, 500);
    });

    after(function() {
      // shutdown server
      server.stop(function() {});
    });

    beforeEach(function() {
      // clean preferences -> default everything to off, except Attrack module.
      CliqzUtils.setPref('antiTrackTest', true);
      CliqzUtils.setPref('attrackBlockCookieTracking', false);
      CliqzUtils.setPref('attrackRemoveQueryStringTracking', false);
      CliqzUtils.setPref('attrackAlterPostdataTracking', false);
      CliqzUtils.setPref('attrackCanvasFingerprintTracking', false);
      CliqzUtils.setPref('attrackRefererTracking', false);
    });

    var expectNRequests = function(n_requests) {
      return {
        assertEach: function(test, done) {
          // wait for two requests to be made to test path, then do tests on metadata
          waitFor(function() {
            return echoed.length >= n_requests;
          }).then(function() {
            try {
              for(var i=0; i<echoed.length; i++) {
                test(echoed[i]);
              }
              done();
            } catch(e) {
              done(e);
            }
          });
        }
      }
    };

    var hasCookie = function(m) {
      chai.expect(m.headers).to.have.property('cookie');
      chai.expect(m.headers['cookie']).to.contain('uid=abcdefghijklmnop');
    };

    var onlyLocalhostCookie = function(m) {
      if(m.host == 'localhost') {
        chai.expect(m.headers).to.have.property('cookie');
        chai.expect(m.headers['cookie']).to.contain('uid=abcdefghijklmnop');
      } else {
        chai.expect(m.headers).to.not.have.property('cookie');
      }
    };

    ['thirdpartyscript.html', 'crossdomainxhr.html', 'iframetest.html'].forEach(function (testpage) {
      describe(testpage, function() {
        var win = CliqzUtils.getWindow(),
                  gBrowser = win.gBrowser,
                  tabs = [];

        before(function(done) {
          // initial request to ensure cookies are set
          var url = "http://localhost:" + server_port + "/" + testpage;
          var t = gBrowser.addTab(url);
          setTimeout(function() {
            gBrowser.removeTab(t);
            done();
          }, 1000);
        });

        beforeEach(function() {
          // open page in a new tab
          var url = "http://localhost:" + server_port + "/" + testpage;
          echoed = [];
          tabs.push(gBrowser.addTab(url));
        });

        afterEach(function() {
          // close all tabs
          tabs.forEach(function(t) {
              gBrowser.removeTab(t);
          });
          tabs = [];
        });

        context('cookie blocking disabled', function() {

          beforeEach(function() {
            CliqzUtils.setPref('attrackBlockCookieTracking', false);
          });

          it('pref check', function() {
            chai.expect(CliqzAttrack.isCookieEnabled()).to.be.false;
          });

          it('allows all cookies', function(done) {
            this.timeout(5000);
            expectNRequests(2).assertEach(hasCookie, done);
          });
        });

        context('cookie blocking enabled', function() {

          beforeEach(function() {
            CliqzUtils.setPref('attrackBlockCookieTracking', true);
          });

          it('pref check', function() {
            chai.expect(CliqzAttrack.isCookieEnabled()).to.be.true;
          });

          it('allows same-domain cookie and blocks third party domain cookie', function(done) {
            this.timeout(5000);
            expectNRequests(2).assertEach(onlyLocalhostCookie, done);
          });
        });
      });
    });
  });
};
