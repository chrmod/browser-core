"use strict";

TESTS.CliqzAttrackIntegrationTest = function(CliqzUtils) {
  var System = CliqzUtils.getWindow().CLIQZ.System,
      CliqzAttrack = System.get("antitracking/attrack").default,
      CliqzHumanWeb = System.get("human-web/human-web").default,
      persist = System.get("antitracking/persistent-state"),
      BloomFilter = System.get("antitracking/bloom-filter").BloomFilter,
      datetime = System.get("antitracking/time"),
      trackertxt = System.get("antitracking/tracker-txt");
  // make sure that module is loaded (default it is not initialised on extension startup)
  CliqzUtils.setPref('antiTrackTest', true);

  describe('CliqzAttrack_integration', function() {
    this.retries(3);

    var echoed = [],
      md5 = CliqzHumanWeb._md5,
      module_enabled = CliqzUtils.getPref('antiTrackTest', false),
      window = CliqzUtils.getWindow();

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

      // log request
      echoed.push(r_obj);
      console.log(r_obj);

      // send an appropriate response
      if ('accept' in headers && headers['accept'].indexOf('image') > -1) {
        var imgFile = ['firefox-tests', 'mockserver', 'Transparent.gif'];
        // prevent img caching
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        // send actual gif file
        testServer.writeFileResponse(request, imgFile, response);
      } else {
        response.write('{}');
      }
    }

    var attrackBloomFilterPref = null,
      baseURL = CliqzAttrack.bloomFilter.baseURL;

    before(function() {
      attrackBloomFilterPref = CliqzUtils.getPref('attrackBloomFilter');
    });

    var win = CliqzUtils.getWindow(),
              gBrowser = win.gBrowser,
              tabs = [];

    var openTestPage = function(testpage, domainname = 'localhost') {
      // open page in a new tab
      var url = "http://"+ domainname +":" + testServer.port + "/" + testpage;
      echoed = [];
      tabs.push(gBrowser.addTab(url));
    };

    function setupAttrackTestServer() {
      // Add static resources from cliqz@cliqz.com/firefox-tests/mockserver directory
      testServer.registerDirectory('/', ['firefox-tests', 'mockserver']);
      testServer.registerDirectory('/bower_components/', ['bower_components']);
      // add specific handler for /test which will collect request parameters for testing.
      testServer.registerPathHandler('/test', collect_request_parameters);
    }

    beforeEach(function() {
      this.timeout(5000);

      setupAttrackTestServer();

      // clean preferences -> default everything to off, except Attrack module.
      CliqzUtils.setPref('attrackBlockCookieTracking', false);
      CliqzUtils.setPref('attrackRemoveQueryStringTracking', false);
      CliqzUtils.setPref('attrackAlterPostdataTracking', false);
      CliqzUtils.setPref('attrackCanvasFingerprintTracking', false);
      CliqzUtils.setPref('attrackRefererTracking', false);
      CliqzAttrack.initialiseAntiRefererTracking();
      // clean tp_events
      CliqzAttrack.tp_events.commit(true);
      CliqzAttrack.tp_events._active = {};
      CliqzAttrack.tp_events._staged = [];
      // clean up attrack caches
      CliqzAttrack.requestKeyValue = {};
      CliqzAttrack.tokenExtWhitelist = {};
      CliqzAttrack.bloomFilter.baseURL = null;
      CliqzAttrack.bloomFilter.bloomFilter = new BloomFilter('0000000000000000000', 5);
      CliqzAttrack.safeKey = {};
      CliqzAttrack.tokenDomain = {};
      CliqzAttrack.recentlyModified.clear();

      // enable token removal
      trackertxt.setDefaultTrackerTxtRule('replace');

      console.log("----- TEST ----");
    });

    afterEach(function() {
      // close all tabs
      tabs.forEach(function(t) {
          gBrowser.removeTab(t);
      });
      tabs = [];
      CliqzAttrack.bloomFilter.baseURL = baseURL;
    });

    /** Helper function for testing each request to the /test endpoint after the expected
     *  number of requests have arrived. */
    var expectNRequests = function(n_requests) {
      return {
        assertEach: function(test, done) {
          var _this = this;
          // wait for n_requests requests to be made to test path, then do tests on metadata
          this.then(function() {
            try {
              chai.expect(echoed.length).to.equal(n_requests, "Number of requests exceeded.");
              for(var i=0; i<echoed.length; i++) {
                test(echoed[i]);
              }
              done();
            } catch(e) {
              done(e);
            }
          });
        },
        then: function(done) {
          waitFor(function() {
            return echoed.length >= n_requests;
          }).then(function() {
            setTimeout(function() {
              done();
            }, 50);
          });
        }
      }
    };

    /** Asserts that the request metadata m contains the expected cookie value. */
    var hasCookie = function(m) {
      chai.expect(m.headers).to.have.property('cookie');
      chai.expect(m.headers['cookie']).to.contain('uid=abcdefghijklmnop');
    };

    /** Asserts that the request metadata m contains a cookie value iff the request
        was to localhost */
    var onlyLocalhostCookie = function(m) {
      if(m.host == 'localhost' || m.host == 'cliqztest.com') {
        chai.expect(m.headers).to.have.property('cookie');
        chai.expect(m.headers['cookie']).to.contain('uid=abcdefghijklmnop');
      } else {
        chai.expect(m.headers).to.not.have.property('cookie');
      }
    };

    /** Asserts that the tp_event object from a request matches the provided specification */
    var test_tp_events = function(spec) {
      chai.expect(Object.keys(CliqzAttrack.tp_events._active)).has.length(1);
      var tab_id = Object.keys(CliqzAttrack.tp_events._active)[0],
        evnt = CliqzAttrack.tp_events._active[tab_id];
      // check first party is correct, and collected third parties match expectations
      chai.expect(evnt.url).to.eql(spec.url);
      chai.expect(evnt.tps).to.include.keys(Object.keys(spec.tps));
      // check expected third party contents
      for (var tp_domain in spec.tps) {
        // has all paths for this third party
        chai.expect(evnt.tps[tp_domain]).to.include.keys(Object.keys(spec.tps[tp_domain]));
        for (var tp_path in spec.tps[tp_domain]) {
          var expected_stats = spec.tps[tp_domain][tp_path],
            actual_stats = evnt.tps[tp_domain][tp_path];
          // must have all the stats we're testing
          //chai.expect(actual_stats).to.include.keys(Object.keys(expected_stats));
          for (var stat_key in actual_stats) {
            if (stat_key == 'paths' || stat_key == 'resp_ob' || stat_key == 'not_cached' || stat_key == 'cached') { continue; }
            // stat should be 0 unless otherwise specified
            var expected = 0;
            if (stat_key in expected_stats) {
              expected = expected_stats[stat_key];
            }
            chai.expect(actual_stats[stat_key]).to.equal(expected, 'tp_event['+ [tp_domain, tp_path, stat_key].join('][') +']');
          }
        }
      }
    };

    /** Helper class for generating tp_event expectations. */
    var tp_events_expectations = function(testpage, domainname = 'localhost') {
      this.url = "http://" + domainname + ":" + testServer.port + "/" + testpage;
      this.tps = page_specs[testpage].base_tps();
    }

    tp_events_expectations.prototype = {

      set_all: function(k, v) {
        this.if('c', 1).set(k, v);
      },

      if: function(test_k, test_v) {
        var self = this;
        return {
          set: function(set_k, set_v) {
            for (var tp in self.tps) {
              for (var path in self.tps[tp]) {
                var s = self.tps[tp][path];
                if(test_k in s && s[test_k] == test_v) {
                  s[set_k] = set_v;
                }
              };
            };
            return this;
          }
        }
      }
    };

    /** Specfies test pages, and the base expectations of these pages.
        The base_tps function provides an object describing the actions of the page, i.e.
        what third party resources should be requested, and what meta-data is expected in
        tp_events.
    */
    var page_specs = {
      'thirdpartyscript.html': {
        base_tps: function() {
          return {
            '127.0.0.1': {
              '/test': {
                'c': 1,
                'cookie_set': 1,
                'has_qs': 1,
                'type_2': 1
              }
            }
          }
        }
      },
      'injectedscript.html': {
        base_tps: function() {
          return {
            '127.0.0.1': {
              '/test': {
                'c': 1,
                'cookie_set': 1,
                'has_qs': 1,
                'type_2': 1
              }
            }
          }
        }
      },
      'imgtest.html': {
        base_tps: function() {
          return {
            '127.0.0.1': {
              '/test': {
                'c': 1,
                'cookie_set': 1,
                'has_qs': 1,
                'type_3': 1
              }
            }
          }
        }
      },
      'crossdomainxhr.html': {
        base_tps: function() {
          return {
            '127.0.0.1': {
              '/test': {
                'c': 1,
                'cookie_set': 1,
                'has_qs': 1,
                'type_11': 1
              }
            }
          }
        }
      },
      'iframetest.html': {
        base_tps: function() {
          return {
            '127.0.0.1': {
              '/iframe.html': {
                'c': 1,
                'cookie_set': 1,
                'type_7': 1
              },
              '/test': {
                'c': 1,
                'cookie_set': 1,
                'has_qs': 1,
                'type_11': 1
              },
              '/bower_components/jquery/dist/jquery.js': {
                'c': 1,
                'type_2': 1,
                'cookie_set': 1
              }
            }
          }
        }
      }
    };

    // Test each of the page_specs in various different configurations.
    Object.keys(page_specs).forEach(function (testpage) {
      describe(testpage, function() {

        context('cookie tests', function() {

          before(function(done) {
            this.timeout(4000);
            setupAttrackTestServer();

            // initial request to ensure cookies are set
            var tmp_tabs = ['localhost', 'cliqztest.com'].map(function(d) {
              var url = "http://"+ d +":" + testServer.port + "/" + testpage;
              return gBrowser.addTab(url);
            });
            setTimeout(function() {
              tmp_tabs.forEach(function(t) {
                gBrowser.removeTab(t);
              });
              done();
            }, 1500);
          });

          var testAllowsAllCookies = function(done) {
            this.timeout(5000);
            openTestPage(testpage);

            // with no cookie blocking, all pages setting cookies should also set them.
            var tp_event_expectation = new tp_events_expectations(testpage);
            tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);

            expectNRequests(2).assertEach(hasCookie, function(e) {
              if(e) {
                done(e);
              } else {
                console.log(CliqzAttrack.tokenExtWhitelist);
                try {
                  test_tp_events(tp_event_expectation);
                  done();
                } catch(e) { done(e); }
              }
            });
          };

          context('cookie blocking disabled', function() {

            beforeEach(function() {
              CliqzUtils.setPref('attrackBlockCookieTracking', false);
            });

            it('pref check', function() {
              chai.expect(CliqzAttrack.isCookieEnabled()).to.be.false;
            });

            it('allows all cookies', testAllowsAllCookies);
          });

          context('cookie blocking enabled', function() {

            beforeEach(function() {
              CliqzUtils.setPref('attrackBlockCookieTracking', true);
            });

            it('pref check', function() {
              chai.expect(CliqzAttrack.isCookieEnabled()).to.be.true;
            });

            var test_domain = 'localhost',
              testBlockTPCookies = function(done) {
              openTestPage(testpage, test_domain);

              // cookie blocking will be done by the 'tp1' block.
              var tp_event_expectation = new tp_events_expectations(testpage, test_domain);
              tp_event_expectation.if('cookie_set', 1).set('cookie_blocked', 1).set('cookie_block_tp1', 1);

              expectNRequests(2).assertEach(onlyLocalhostCookie, function(e) {
                if(e) {
                  done(e);
                } else {
                  try {
                    test_tp_events(tp_event_expectation);
                    done();
                  } catch(e) {
                    done(e);
                  }
                }
              });
            };

            it('allows same-domain cookie and blocks third party domain cookie', function(done) {
              this.timeout(5000);
              test_domain = 'localhost';
              testBlockTPCookies(done);
            });

            context('anti-tracking disabled for source domain', function() {

              beforeEach(function() {
                CliqzAttrack.addSourceDomainToWhitelist('localhost');
              });

              afterEach(function() {
                CliqzAttrack.removeSourceDomainFromWhitelist('localhost');
              });

              it('allows all cookies on whitelisted site', testAllowsAllCookies);

              it('blocks cookies on other domains', function(done) {
                this.timeout(5000);
                test_domain = 'cliqztest.com';
                testBlockTPCookies(done);
              });
            });
          });

        });

        var QSBlocking = function() {
          var uid = '04C2EAD03BAB7F5E-2E85855CF4C75134';

          beforeEach(function() {
            CliqzUtils.setPref('attrackRemoveQueryStringTracking', true);
          });

          it('pref check', function() {
            chai.expect(CliqzAttrack.isQSEnabled()).to.be.true;
            chai.expect(CliqzAttrack.tokenExtWhitelist).to.not.have.property(md5('localhost').substring(0, 16));
            chai.expect(CliqzAttrack.tokenExtWhitelist).to.not.have.property(md5('127.0.0.1').substring(0, 16));
          });

          it('allows query strings on domains not in the tracker list', function(done) {
            this.timeout(5000);
            openTestPage(testpage);

            var tp_event_expectation = new tp_events_expectations(testpage);
            tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);

            expectNRequests(2).assertEach(function(m) {
              chai.expect(m.qs).to.contain('uid=' + uid);
              chai.expect(m.qs).to.contain('callback=func');
            }, function(e) {
              if(e) {
                done(e);
              } else {
                console.log(CliqzAttrack.tp_events);
                try {
                  test_tp_events(tp_event_expectation);
                  done();
                } catch(e) { done(e); }
              }
            });
          });

          describe('third party on tracker list', function() {

            beforeEach(function() {
              var tracker_hash = md5('127.0.0.1').substring(0, 16);
              CliqzAttrack.tokenExtWhitelist[tracker_hash] = {}
              CliqzAttrack.safeKey[tracker_hash] = {};
              CliqzAttrack.bloomFilter.bloomFilter.addSingle(tracker_hash);
              persist.clear_persistent(CliqzAttrack.tokenDomain);
            });

            it('pref check', function() {
              chai.expect(CliqzAttrack.tokenExtWhitelist).to.not.have.property(md5('localhost').substring(0, 16));
              chai.expect(CliqzAttrack.tokenExtWhitelist).to.have.property(md5('127.0.0.1').substring(0, 16));
              chai.expect(CliqzAttrack.bloomFilter.bloomFilter.testSingle(md5('localhost').substring(0, 16))).to.equal(false);
              chai.expect(CliqzAttrack.bloomFilter.bloomFilter.testSingle(md5('127.0.0.1').substring(0, 16))).to.equal(true);
            });

            it('allows QS first time on tracker', function(done) {
              this.timeout(5000);
              openTestPage(testpage);

              var tp_event_expectation = new tp_events_expectations(testpage);
              tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);
              tp_event_expectation.if('has_qs', 1).set('token.has_qs_newToken', 1).set('token.qs_newToken', 1);

              expectNRequests(2).assertEach(function(m) {
                chai.expect(m.qs).to.contain('uid=' + uid);
                chai.expect(m.qs).to.contain('callback=func');
              }, function(e) {
                if(e) {
                  done(e);
                } else {
                  try {
                    test_tp_events(tp_event_expectation);
                    done();
                  } catch(e) {
                    done(e);
                  }
                }
              });
            });

            context('when domain count exceeded', function() {

              beforeEach(function() {
                // make an artificial tokenDomain list to trigger blocking
                var tok = md5(uid),
                  today = datetime.getTime().substr(0, 8);;
                CliqzAttrack.tokenDomain[tok] = {};
                ['example.com', 'localhost', 'cliqz.com'].forEach(function(d) {
                  CliqzAttrack.tokenDomain[tok][md5(d).substring(0, 16)] = today;
                });
              });

              var test_domain = "localhost",
                testUIDisBlocked = function(done) {

                var tp_event_expectation = new tp_events_expectations(testpage, test_domain);
                tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);
                tp_event_expectation.if('has_qs', 1).set('bad_tokens', 1).set('bad_qs', 1);
                // with an img tag we fallback to redirect, otherwise we just rewrite the channel URI.
                // with redirect we also see the cookie twice!
                if(testpage == "imgtest.html") {
                  tp_event_expectation.if('has_qs', 1).set('token_red_replace', 1).set('cookie_set', 2).set('bad_cookie_sent', 2);
                } else {
                  tp_event_expectation.if('has_qs', 1).set('token_blocked_replace', 1);
                }

                openTestPage(testpage, test_domain);

                expectNRequests(2).assertEach(function(m) {
                  console.log(CliqzAttrack.tokenDomain);
                  if(m.host == test_domain) {
                    chai.expect(m.qs).to.contain('uid=' + uid);
                  } else {
                    chai.expect(m.qs).to.not.contain('uid=' + uid);
                  }
                  chai.expect(m.qs).to.contain('callback=func');
                }, function(e) {
                  if(e) {
                    done(e);
                  } else {
                    try {
                      test_tp_events(tp_event_expectation);
                      done();
                    } catch(e) {
                      done(e);
                    }
                  }
                });
              };

              it('blocks long tokens on tracker domain', function(done) {
                this.timeout(5000);
                testUIDisBlocked(done);
              });

              it('does not block if safekey', function(done) {
                this.timeout(5000);

                var key = md5('uid'),
                  tracker_hash = md5('127.0.0.1').substring(0, 16),
                  day = datetime.newUTCDate();

                CliqzAttrack.safeKey[tracker_hash][key] = ['r', day];

                var tp_event_expectation = new tp_events_expectations(testpage);
                tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);
                tp_event_expectation.if('has_qs', 1).set('token.safekey', 1).set('token.has_safekey', 1);

                openTestPage(testpage);

                expectNRequests(2).assertEach(function(m) {
                  chai.expect(m.qs).to.contain('uid=' + uid);
                }, function(e) {
                  if(e) {
                    done(e);
                  } else {
                    try {
                      test_tp_events(tp_event_expectation);
                      done();
                    } catch(e) {
                      done(e);
                    }
                  }
                });
              });

              var allowWhiteListedToken = function(done) {
                this.timeout(5000);

                var tok = md5(uid),
                  tracker_hash = md5('127.0.0.1').substring(0, 16),
                  day = datetime.newUTCDate();

                CliqzAttrack.tokenExtWhitelist[tracker_hash][tok] = true;
                CliqzAttrack.bloomFilter.bloomFilter.addSingle(tracker_hash + tok);

                var tp_event_expectation = new tp_events_expectations(testpage);
                tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);
                tp_event_expectation.if('has_qs', 1).set('token.whitelisted', 1).set('token.has_whitelisted', 1);

                openTestPage(testpage);

                expectNRequests(2).assertEach(function(m) {
                  chai.expect(m.qs).to.contain('uid=' + uid);
                }, function(e) {
                  if(e) {
                    done(e);
                  } else {
                    try {
                      test_tp_events(tp_event_expectation);
                      done();
                    } catch(e) {
                      done(e);
                    }
                  }
                });
              }

              it('does not block if whitelisted token', allowWhiteListedToken);

              context('anti-tracking disabled for source domain', function() {

                beforeEach(function() {
                  CliqzAttrack.addSourceDomainToWhitelist('localhost');
                });

                afterEach(function() {
                  CliqzAttrack.removeSourceDomainFromWhitelist('localhost');
                });

                it('allows all tokens on whitelisted site', function(done) {
                  this.timeout(5000);
                  openTestPage(testpage);

                  var tp_event_expectation = new tp_events_expectations(testpage);
                  tp_event_expectation.if('cookie_set', 1).set('bad_cookie_sent', 1);
                  tp_event_expectation.if('has_qs', 1).set('bad_qs', 1).set('bad_tokens', 1).set('source_whitelisted', 1);

                  expectNRequests(2).assertEach(function(m) {
                    chai.expect(m.qs).to.contain('uid=' + uid);
                    chai.expect(m.qs).to.contain('callback=func');
                  }, function(e) {
                    if(e) {
                      done(e);
                    } else {
                      try {
                        test_tp_events(tp_event_expectation);
                        done();
                      } catch(e) {
                        done(e);
                      }
                    }
                  });
                });

                it('still blocks tokens on other sites', function(done) {
                  this.timeout(5000);
                  test_domain = 'cliqztest.com';
                  testUIDisBlocked(done)
                });
              });
            });

            it('increments domain count when a tracker is visited', function(done) {
              CliqzAttrack.obfuscateMethod = 'replace';
              persist.clear_persistent(CliqzAttrack.tokenDomain);
              this.timeout(10000);

              // open a page so that token domain will be incremented
              openTestPage(testpage);
              // open third page after a delay (so it will be after the first two)
              // the updated token domain list should cause a tracker block event.
              expectNRequests(2).assertEach(function(m) {
                chai.expect(m.qs).to.contain('uid=' + uid);
              }, function(e) {
                if(e) {
                  done(e);
                } else {
                  echoed = [];
                  openTestPage(testpage, 'cliqztest.com');
                  expectNRequests(2).assertEach(function(m) {
                    return true;
                  }, function(e) {
                    if(e) {
                      done(e);
                    } else {
                      var tok = md5(uid);
                      chai.expect(CliqzAttrack.tokenDomain).to.have.property(tok);
                      chai.expect(Object.keys(CliqzAttrack.tokenDomain[tok])).to.have.length(2);
                      done();
                    }
                  });
                }
              });
            });
          }); // tp on tracker list
        };

        context("Bloom filter disabled", function() {
          beforeEach(function() {
            CliqzUtils.setPref('attrackBloomFilter', false);
          });
          describe('QS blocking enabled', QSBlocking);
        });

        context("Bloom filter enabled", function() {
          beforeEach(function() {
            CliqzUtils.setPref('attrackBloomFilter', true);
          });
          afterEach(function() {
            CliqzUtils.setPref('attrackBloomFilter', false);
          });
          describe('QS blocking enabled', QSBlocking);
        });
      }); // describe testpage
    }); // for each page

    describe("local safeKey", function() {
      var win = CliqzUtils.getWindow(),
        gBrowser = win.gBrowser,
        tabs = [],
        testpage = 'localsafekey.html';

      it('adds local safekey if 3 different values seen', function(done) {
        this.timeout(5000);
        openTestPage(testpage);

        expectNRequests(3).then(function(m) {
          try {
            var url_hash = md5('127.0.0.1').substring(0, 16),
              callback_hash = md5('callback'),
              uid_hash = md5('uid');
            chai.expect(CliqzAttrack.safeKey).has.property(url_hash);
            chai.expect(CliqzAttrack.safeKey[url_hash]).has.property(callback_hash);
            chai.expect(CliqzAttrack.safeKey[url_hash]).not.has.property(uid_hash);
            done();
          } catch(e) {
            done(e);
          }
        });
      });

    });

    describe('Referer Tracking Protection', function() {

      var testpage = 'referertest.html';

      describe('disabled', function() {

        it('full referer is sent to third parties', function(done) {
          openTestPage(testpage);

          expectNRequests(2).assertEach(function(m) {
            chai.expect(m.headers['referer']).to.contain("http://localhost:"+ testServer.port);
          }, done);

        });
      });

      describe('enabled', function() {

        beforeEach(function() {
          CliqzUtils.setPref('attrackRefererTracking', true);
          CliqzAttrack.initialiseAntiRefererTracking();
        });

        afterEach(function() {
          CliqzUtils.setPref('attrackRefererTracking', false);
          CliqzAttrack.initialiseAntiRefererTracking();
        });

        it('does not send referer to anyone', function(done) {
          openTestPage(testpage);

          expectNRequests(2).assertEach(function(m) {
            chai.expect(m.headers).to.not.have.property('referer');
          }, done);
        });

        it('sends referer on link click to same domain', function(done) {
          this.timeout(10000);

          openTestPage(testpage);

          expectNRequests(2).assertEach(function(m) {}, function(e) {
            if(e) {
              done(e);
            } else {
              var tab = gBrowser.getBrowserForTab(tabs[0]);
              echoed = [];
              tab.contentDocument.getElementById('local_link').click();
              expectNRequests(1).assertEach(function(m) {
                chai.expect(m.headers).to.have.property('referer');
                chai.expect(m.headers['referer']).to.contain(testpage);
              }, done);
            }
          });
        });

        it('blocks referer on link click to different domain', function(done) {
          this.timeout(10000);

          openTestPage(testpage);

          expectNRequests(2).assertEach(function(m) {}, function(e) {
            if(e) {
              done(e);
            } else {
              var tab = gBrowser.getBrowserForTab(tabs[0]);
              echoed = [];
              tab.contentDocument.getElementById('remote_link').click();
              expectNRequests(1).assertEach(function(m) {
                chai.expect(m.headers).to.not.have.property('referer');
              }, done);
            }
          });
        });

      });
    });

  }); // describe integration test
};

TESTS.CliqzAttrackIntegrationTest.MIN_BROWSER_VERSION = 35;
