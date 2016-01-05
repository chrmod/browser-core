"use strict";

Components.utils.import("chrome://cliqz/content/bower_components/httpd/index.js");

function waitIfNotReady(fn) {
    var first = true;
    return waitFor(function() {
        if (first) {
            first = false;
            return false;
        }
        return fn();
    });
}

TESTS.AttrackTest = function (CliqzUtils) {
    var CliqzAttrack = CliqzUtils.getWindow().CLIQZ.System.get("antitracking/attrack").default;

    var module_enabled = CliqzUtils.getPref('antiTrackTest', false);

    before(function() {
      // make sure that module is loaded (default it is not initialised on extension startup)
      CliqzUtils.setPref('antiTrackTest', true);
    });

    after(function() {
      CliqzUtils.setPref('antiTrackTest', module_enabled);
    });

    describe('CliqzAttrack.tab_listener', function() {

        describe('isWindowActive', function() {

            it('returns false for none existant tab ids', function() {
                chai.expect(CliqzAttrack.tab_listener.isWindowActive(-1)).to.be.false;
                chai.expect(CliqzAttrack.tab_listener.isWindowActive(0)).to.be.false;
                chai.expect(CliqzAttrack.tab_listener.isWindowActive(532)).to.be.false;
            });

            describe('when tab is opened', function() {
                var win = CliqzUtils.getWindow(),
                    gBrowser = win.gBrowser,
                    tabs = [],
                    tab_id;

                beforeEach(function(done) {
                    CliqzAttrack.tp_events._active = {};
                    tabs.push(gBrowser.addTab("https://cliqz.com"));
                    // get tab id from tp_events (assumption that this is correct)
                    waitIfNotReady(function() {
                        return Object.keys(CliqzAttrack.tp_events._active).length > 0;
                    }).then(function() {
                        tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                        setTimeout(done, 1000);
                    });
                });

                afterEach(function() {
                    tabs.forEach(function(t) {
                        gBrowser.removeTab(t);
                    });
                    tabs = [];
                });

                it('returns true for open tab id', function() {
                    console.log(tab_id);
                    chai.expect(CliqzAttrack.tab_listener.isWindowActive(tab_id)).to.be.true;
                });

                describe('when tab is closed', function() {

                    beforeEach(function() {
                        gBrowser.removeTab(tabs.shift());
                    });

                    it('returns false for closed tab id', function() {
                        console.log(tab_id);
                        chai.expect(CliqzAttrack.tab_listener.isWindowActive(tab_id)).to.be.false;
                    });
                });
            });
        });

    });

    describe('CliqzAttrack.tp_events', function() {

        describe('Integration', function() {
            var win = CliqzUtils.getWindow(),
                gBrowser = win.gBrowser,
                tabs = [];

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            afterEach(function() {
                tabs.forEach(function(t) {
                    gBrowser.removeTab(t);
                });
                tabs = [];
            });

            it('should initially have no active tabs', function() {
                chai.expect(CliqzAttrack.tp_events._active).to.be.empty;
            });

            describe('when tabs are opened', function() {

                var tab_id = 0,
                    page_load;

                beforeEach(function() {
                    tabs.push(gBrowser.addTab("https://cliqz.com"));
                    tabs.push(gBrowser.addTab("https://cliqz.com/privacy#saferWeb"));
                });

                it('should add tabs to _active', function(done) {

                    this.timeout(2000);

                    waitIfNotReady(function() {
                        return Object.keys(CliqzAttrack.tp_events._active).length > 0;
                    }).then(function() {
                        chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(2);
                        tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                        page_load = CliqzAttrack.tp_events._active[tab_id];
                        chai.expect(page_load).to.include.keys('hostname', 'url', 'path');
                        chai.expect(page_load.url).to.equal('https://cliqz.com/');
                        chai.expect(page_load.hostname).to.equal('cliqz.com');
                        // md5('/')
                        chai.expect(page_load.path).to.equal('6666cd76f96956469e7be39d750cc7d9'.substring(0, 16));
                        chai.expect(page_load.tps).to.be.empty;
                        setTimeout(done, 1000);
                    });

                });

                describe('when a tab is closed', function() {
                    beforeEach(function() {
                        gBrowser.removeTab(tabs.shift());
                        console.log(tabs);
                    });

                    describe('CliqzAttrack.tp_events.commit', function() {
                        beforeEach(function() {
                            CliqzAttrack.tp_events.commit(true);
                        });

                        it('should stage closed tabs only', function() {
                            chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                            // check staged tab
                            chai.expect(CliqzAttrack.tp_events._staged).to.have.length(1);
                            chai.expect(CliqzAttrack.tp_events._staged[0].url).to.equal('https://cliqz.com/');

                            // check active tab
                            tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                            chai.expect(CliqzAttrack.tp_events._active[tab_id].url).to.equal("https://cliqz.com/privacy#saferWeb");
                        });
                    });

                });

                describe('when new page is loaded in existing tab', function() {

                    beforeEach(function() {
                        gBrowser.getBrowserForTab(tabs[0]).loadURI("http://www.w3.org/");
                    });

                    describe('CliqzAttrack.tp_events.commit', function() {
                        beforeEach(function() {
                            CliqzAttrack.tp_events.commit(true);
                        });

                        it('should stage previous page load', function() {
                            // still have 2 active tabs
                            chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(2);
                            // check staged tab
                            chai.expect(CliqzAttrack.tp_events._staged).to.have.length(1);
                            chai.expect(CliqzAttrack.tp_events._staged[0].url).to.equal('https://cliqz.com/');

                            // check active tabs
                            tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                            chai.expect(CliqzAttrack.tp_events._active[tab_id].url).to.equal("http://www.w3.org/");
                        });
                    });

                });
            });

            describe('redirects', function() {

              var server, server_port, hit_target = false, proxy_type = null;

              before(function() {
                server = new HttpServer();
                // 302 redirect case
                server.registerPathHandler('/302', function(request, response) {
                  response.setStatusLine(request.httpVersion, 302, 'Redirect');
                  response.setHeader('Location', 'http://cliqztest.de:'+ server_port +'/target');
                  response.write("<html><body></body></html>");
                });
                // 303 redirect case
                server.registerPathHandler('/303', function(request, response) {
                  response.setStatusLine(request.httpVersion, 303, 'Redirect');
                  response.setHeader('Location', 'http://cliqztest.de:'+ server_port +'/target');
                  response.write("<html><body></body></html>");
                });
                // js redirect case
                server.registerPathHandler('/js', function(request, response) {
                  response.write("<html><body><script>window.location=\"http://cliqztest.de:"+ server_port +"/target\"</script></body></html>")
                });
                server.registerPathHandler('/target', function(request, response) {
                  hit_target = true;
                  response.write("<html><body></body></html>");
                });
                server_port = 60508;
                server.identity.add("http", "cliqztest.com", server_port);
                server.identity.add("http", "cliqztest.de", server_port);

                server.start(server_port);

                prefs.setCharPref('network.proxy.autoconfig_url', 'chrome://cliqz/content/firefox-tests/proxy.pac');
                if(prefs.prefHasUserValue('network.proxy.type')) {
                  proxy_type = prefs.getIntPref('network.proxy.type');
                }
                prefs.setIntPref('network.proxy.type', 2);
              });

              after(function() {
                server.stop(function() {});
                // reset user prefs
                if(proxy_type == null) {
                  prefs.clearUserPref('network.proxy.type');
                } else {
                  prefs.setIntPref('network.proxy.type', proxy_type);
                }
              });

              ['302', '303', 'js'].forEach(function(kind) {
                describe(kind, function() {
                  beforeEach(function() {
                    hit_target = false;
                    tabs.push(gBrowser.addTab("http://localhost:"+ server_port +"/"+ kind));
                  });

                  it('gets host at end of redirect chain', function(done) {
                    this.timeout(2000);
                    waitIfNotReady(function() {
                        return hit_target;
                      }).then(function() {
                        console.log(CliqzAttrack.tp_events._active);
                        chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                        var tabid = Object.keys(CliqzAttrack.tp_events._active)[0];
                        chai.expect(CliqzAttrack.tp_events._active[tabid].hostname).to.equal("cliqztest.de");
                        if (kind != 'js') {
                          // check original is in redirect chain
                          chai.expect(CliqzAttrack.tp_events._active[tabid].redirects).to.have.length(1);
                          chai.expect(CliqzAttrack.tp_events._active[tabid].redirects[0]).to.equal("localhost");
                        }
                      }).then(done, done);
                  });
              });
              });

            });
        });

        describe('onFullPage', function() {

            var url_parts = CliqzAttrack.urlInfo.get("https://cliqz.com"),
                mock_tab_id = 43;

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            it("adds a tab to _active with request context's tab ID", function() {
                var page_load = CliqzAttrack.tp_events.onFullPage(url_parts, mock_tab_id);

                chai.expect(page_load).is.not.null;
                chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(1);
                chai.expect(CliqzAttrack.tp_events._active).to.have.property(mock_tab_id);
                chai.expect(CliqzAttrack.tp_events._active[mock_tab_id].url).to.equal(url_parts.toString());
            });

            it("does not add a tab to _active if the url is malformed", function() {
                [null, undefined, 'http://cliqz.com', CliqzAttrack.urlInfo.get("/home/cliqz"), CliqzAttrack.urlInfo.get("about:config")].forEach(function(url) {
                    var page_load = CliqzAttrack.tp_events.onFullPage(url, mock_tab_id);

                    chai.expect(page_load).is.null;
                    chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(0);
                });
            });

            it("does not add a tab to _active if the tab ID <= 0", function() {
                [null, undefined, 0, -1].forEach(function(id) {
                    var page_load = CliqzAttrack.tp_events.onFullPage(url_parts, id);

                    chai.expect(page_load).is.null;
                    chai.expect(Object.keys(CliqzAttrack.tp_events._active)).to.have.length(0);
                });
            });

        });

        describe('get', function() {

            var src_url = "https://cliqz.com",
                src_url_parts = CliqzAttrack.urlInfo.get(src_url),
                url = "https://example.com/beacon",
                url_parts = CliqzAttrack.urlInfo.get(url),
                mock_tab_id = 34;

            var testInvalidTabIds = function() {
                [undefined, null, 0, -1, 552].forEach(function(tab_id) {
                    var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, tab_id);
                    chai.expect(req).to.be.null;
                });
            };

            beforeEach(function() {
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
            });

            describe('after page load', function() {
                var page_load;

                beforeEach(function() {
                    page_load = CliqzAttrack.tp_events.onFullPage(src_url_parts, mock_tab_id);
                });

                it('returns a stats object for the specified page load and third party', function() {
                    var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);

                    chai.expect(req).to.not.be.null;
                    chai.expect(req).to.include.keys(CliqzAttrack.tp_events._stats);
                    chai.expect(req['c']).to.equal(0);
                    chai.expect(page_load.tps).to.have.property(url_parts.hostname);
                    chai.expect(page_load.tps[url_parts.hostname]).to.have.property(url_parts.path);
                    chai.expect(page_load.tps[url_parts.hostname][url_parts.path]).to.equal(req);
                });

                it('returns null if source tab is invalid', testInvalidTabIds);

                it('returns null if third party referrer is not related to the page load', function() {
                    var alt_url = "https://www.w3.org/",
                        alt_url_parts = CliqzAttrack.urlInfo.get(alt_url);

                    var req = CliqzAttrack.tp_events.get(url, url_parts, alt_url, alt_url_parts, mock_tab_id);

                    chai.expect(req).to.be.null;
                });

                it('third party referrer relation is transative', function() {
                    var alt_url = "https://www.w3.org/",
                        alt_url_parts = CliqzAttrack.urlInfo.get(alt_url);

                    CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);
                    var req = CliqzAttrack.tp_events.get(alt_url, alt_url_parts, url, url_parts, mock_tab_id);

                    chai.expect(req).to.not.be.null;
                    chai.expect(req).to.include.keys(CliqzAttrack.tp_events._stats);
                    chai.expect(req['c']).to.equal(0);
                    chai.expect(page_load.tps).to.have.property(url_parts.hostname);
                    chai.expect(page_load.tps).to.have.property(alt_url_parts.hostname);
                    chai.expect(page_load.tps[alt_url_parts.hostname]).to.have.property(alt_url_parts.path);
                    chai.expect(page_load.tps[alt_url_parts.hostname][alt_url_parts.path]).to.equal(req);
                });
            });

            it('returns null if onFullPage has not been called for the referrer', function() {
                var req = CliqzAttrack.tp_events.get(url, url_parts, src_url, src_url_parts, mock_tab_id);

                chai.expect(req).to.be.null;
                chai.expect(CliqzAttrack.tp_events._active).to.be.empty;
            });

            it('returns null if source tab is invalid', testInvalidTabIds);
        });

        describe('PageLoadData', function() {

            var page_load,
                url = 'https://cliqz.com/privacy#saferWeb',
                url_parts = CliqzAttrack.urlInfo.get(url);

            beforeEach(function() {
                page_load = new CliqzAttrack.tp_events.PageLoadData(url_parts);
            });

            it('should have initial attributes from source url', function() {
                console.log(page_load);
                chai.expect(page_load.url).to.equal(url);
                chai.expect(page_load.hostname).to.equal(url_parts.hostname);
                chai.expect(page_load.tps).to.be.empty;
                chai.expect(page_load.path).to.equal(page_load._shortHash(url_parts.path));
            });

            describe('getTpUrl', function() {
                var tp_url;

                beforeEach(function() {
                    tp_url = page_load.getTpUrl('hostname', '/');
                });

                it('should create a stat entry for the given page load', function() {
                    chai.expect(tp_url).to.include.keys(CliqzAttrack.tp_events._stats);
                    chai.expect(page_load.tps).to.have.property('hostname');
                    chai.expect(page_load.tps['hostname']).to.have.property('/');
                    chai.expect(page_load.tps['hostname']['/']).to.equal(tp_url);
                });

                it('should return the same object on repeated calls', function() {
                    tp_url['c'] += 1;

                    chai.expect(page_load.getTpUrl('hostname', '/')).to.equal(tp_url);
                });
            });

            describe('asPlainObject', function() {

                it('should contain page load metadata', function() {
                    var plain = page_load.asPlainObject();
                    chai.expect(plain).to.include.keys('hostname', 'path', 'c', 't', 'ra', 'tps');
                });

                it('should hash page load host', function() {
                    var plain = page_load.asPlainObject();
                    // md5('cliqz.com')
                    chai.expect(plain.hostname).to.equal("716378bd1d4c36198e252476ef80c66e".substring(0, 16));
                });

                it('should sum third party stats', function() {
                    var paths = ['script.js', 'beacon'],
                        tps = paths.map(function(p) {
                            return page_load.getTpUrl('example.com', p);
                        });
                    tps.forEach(function(tp) {
                        tp['c'] += 1;
                    });

                    var plain = page_load.asPlainObject();
                    chai.expect(Object.keys(plain.tps)).to.have.length(1);
                    chai.expect(plain.tps).to.have.property('example.com');
                    chai.expect(plain.tps['example.com']['c']).to.equal(2);
                    chai.expect(plain.tps['example.com']['paths']).to.have.length(2);
                    chai.expect(plain.tps['example.com']['paths']).to.eql(paths.map(page_load._shortHash));
                });

                it('should prune all zero stats', function() {
                    var paths = ['script.js', 'beacon'],
                        tps = paths.map(function(p) {
                            return page_load.getTpUrl('example.com', p);
                        }),
                        paths_hash = paths.map(page_load._shortHash);
                    tps.forEach(function(tp) {
                        tp['c'] += 1;
                    });
                    tps[1]['has_qs'] += 1;

                    var plain = page_load.asPlainObject();
                    chai.expect(plain.tps['example.com']).to.eql({'c': 2, 'has_qs': 1, 'paths': paths_hash});
                });
            });

        });
    });

    describe('CliqzAttrack.isHash', function() {

        var not_hash = ['',
            'Firefox',
            'some words',
            '23/9/2015 13:32:57 5 -120', // date string
            //'UTF-8',
            'http://www.cliqz.com', // a url
            '1440x900', // screen resolution
            '/59666047/theguardian.com/international/front/ng',
            'url=%2Finternational&edition=int&ct=section&p=ng&k=international&x=pirae8sgr%2Cpirak431b&su=0&pv=ig3kwi0qkucaub6l1azw&bp=desktop&si=f&fr=5plus' // 'cust_params' from doubleclick
            ];

        var hashes = ['04C2EAD03BAB7F5E-2E85855CF4C75134',
            '54f5095c96e53deed8f9c147cfb12870',
            '1AB62a15974a93a320e682g1445527405',
            '22163a4ff9030048002213fd4895c8edc3160ed6ab'
            ]

        not_hash.forEach(function(str) {
          it("'" + str + "' is not a hash", function() {
            chai.expect(CliqzAttrack.isHash(str)).to.be.false;
          })
        });

        hashes.forEach(function(str) {
          it("'" + str + "' is a hash", function() {
            chai.expect(CliqzAttrack.isHash(str)).to.be.true;
          })
        });

    });

    describe('CliqzAttrack.getGeneralDomain', function() {

        var spec = {
          'cliqz.com': ['cliqz.com', 'www.cliqz.com', 'a.b.cliqz.com'],
          'example.co.uk': ['example.co.uk', 'test.example.co.uk'],
          '127.0.0.1': ['127.0.0.1'],
          '1.2.3.4': ['1.2.3.4']
        };

        for (var general_domain in spec) {
            spec[general_domain].forEach(function(sub_domain) {
                var gen = general_domain;
                it(sub_domain +' has general domain '+ gen, function() {
                    chai.expect(CliqzAttrack.getGeneralDomain(sub_domain)).to.eql(gen);
                });
            });
        }
    });

    describe('CliqzAttrack list update', function() {

      var real_versioncheck_url = 'https://cdn.cliqz.com/anti-tracking/whitelist/versioncheck.json',
        real_token_url = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_whitelist_tokens_md5.json',
        real_safekey_url = 'https://cdn.cliqz.com/anti-tracking/whitelist/domain_safe_key.json',
        mock_token_string = "{\"f528764d624db129\": {\"7269d282a42ce53e58c7b3f66ca19bac\": true}}\n",
        mock_token_url = "/token_whitelist.json",
        mock_token_hash = '4b45ea02efdbc85bf5a456beb3ab1cac',
        mock_safekey_string = "{\"f528764d624db129\": {\"924a8ceeac17f54d3be3f8cdf1c04eb2\": \"20200101\"}}\n",
        mock_safekey_url = "/safekey.json",
        mock_safekey_hash = "3e82cf3535f01bfb960e826f1ad8ec2d",
        server,
        server_port = -1;

      before(function() {
        // serve fake whitelists
        server = new HttpServer();
        server.registerPathHandler('/token_whitelist.json', function(request, response) {
          response.write(mock_token_string);
        });
        server.registerPathHandler('/safekey.json', function(request, response) {
          response.write(mock_safekey_string);
        });
        server.start(-1);
        server_port = server.identity.primaryPort
        mock_token_url = "http://localhost:" + server_port + "/token_whitelist.json";
        mock_safekey_url = "http://localhost:" + server_port + "/safekey.json";
      });

      after(function() {
        // shutdown server
        server.stop(function() {});
      });

      it('version check URL is correct', function() {
        chai.expect(CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK).to.equal(real_versioncheck_url);
      });

      it('token whitelist URL is correct', function() {
        chai.expect(CliqzAttrack.URL_TOKEN_WHITELIST).to.equal(real_token_url);
      });

      it('safekey list URL is correct', function() {
        chai.expect(CliqzAttrack.URL_SAFE_KEY).to.equal(real_safekey_url);
      });

      describe('loadRemoteTokenWhitelist', function() {

        beforeEach(function() {
          // mock token whitelist URL
          CliqzAttrack.URL_TOKEN_WHITELIST = mock_token_url;
          CliqzAttrack.tokenWhitelistVersion = null;
        });

        afterEach(function() {
          // restore original url
          CliqzAttrack.URL_TOKEN_WHITELIST = real_token_url;
        });

        it('loads remote token list', function(done) {
          CliqzAttrack.loadRemoteTokenWhitelist();
          waitFor(function() {
            return CliqzAttrack.tokenWhitelistVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.tokenWhitelistVersion).to.equal(mock_token_hash);
              chai.expect(Object.keys(CliqzAttrack.tokenExtWhitelist)).to.have.length(1);
              chai.expect(CliqzAttrack.tokenExtWhitelist).to.have.property("f528764d624db129");
              chai.expect(CliqzAttrack.tokenExtWhitelist["f528764d624db129"]).to.have.property("7269d282a42ce53e58c7b3f66ca19bac");
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });
      });

      describe('loadRemoteSafeKey', function() {

        beforeEach(function() {
          // mock safekey URL
          CliqzAttrack.URL_SAFE_KEY = mock_safekey_url;
          CliqzAttrack.safeKeyExtVersion = null;
          CliqzAttrack.safeKey = {};
        });

        afterEach(function() {
          // restore original url
          CliqzAttrack.URL_SAFE_KEY = real_safekey_url;
        });

        it('loads remote safekeys', function(done) {
          CliqzAttrack.loadRemoteSafeKey();
          waitFor(function() {
            return CliqzAttrack.safeKeyExtVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.safeKeyExtVersion).to.equal(mock_safekey_hash);
              chai.expect(Object.keys(CliqzAttrack.safeKey)).to.have.length(1);
              chai.expect(CliqzAttrack.safeKey).to.have.property("f528764d624db129");
              chai.expect(CliqzAttrack.safeKey["f528764d624db129"]).to.have.property("924a8ceeac17f54d3be3f8cdf1c04eb2");
              chai.expect(CliqzAttrack.safeKey["f528764d624db129"]["924a8ceeac17f54d3be3f8cdf1c04eb2"]).to.eql(["20200101", 'r']);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });

        it('merges with existing safekeys', function(done) {
          var domain1_hash = "f528764d624db129",
            domain2_hash = "9776604f86ca9f6a",
            key_hash = "4a8a08f09d37b73795649038408b5f33",
            today = CliqzAttrack.getTime().substring(0, 8);
          CliqzAttrack.safeKey[domain1_hash] = {};
          CliqzAttrack.safeKey[domain1_hash][key_hash] = [today, 'l'];
          CliqzAttrack.safeKey[domain2_hash] = {};
          CliqzAttrack.safeKey[domain2_hash][key_hash] = [today, 'l'];

          CliqzAttrack.loadRemoteSafeKey();
          waitFor(function() {
            return CliqzAttrack.safeKeyExtVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.safeKeyExtVersion).to.equal(mock_safekey_hash);
              chai.expect(Object.keys(CliqzAttrack.safeKey)).to.have.length(2);
              chai.expect(CliqzAttrack.safeKey).to.have.keys(domain1_hash, domain2_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash]).to.have.property("924a8ceeac17f54d3be3f8cdf1c04eb2");
              chai.expect(CliqzAttrack.safeKey[domain1_hash]["924a8ceeac17f54d3be3f8cdf1c04eb2"]).to.eql(["20200101", 'r']);
              chai.expect(CliqzAttrack.safeKey[domain1_hash]).to.have.property(key_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash][key_hash]).to.eql([today, 'l']);
              chai.expect(CliqzAttrack.safeKey[domain2_hash]).to.have.property(key_hash);
              chai.expect(CliqzAttrack.safeKey[domain2_hash][key_hash]).to.eql([today, 'l']);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });

        it('replaces local key with remote if remote is more recent', function(done) {
          var domain1_hash = "f528764d624db129",
            key_hash = "924a8ceeac17f54d3be3f8cdf1c04eb2",
            today = CliqzAttrack.getTime().substring(0, 8);
          CliqzAttrack.safeKey[domain1_hash] = {};
          CliqzAttrack.safeKey[domain1_hash][key_hash] = [today, 'l'];

          CliqzAttrack.loadRemoteSafeKey();
          waitFor(function() {
            return CliqzAttrack.safeKeyExtVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.safeKeyExtVersion).to.equal(mock_safekey_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash]).to.have.property(key_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash][key_hash]).to.eql(["20200101", 'r']);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });

        it('leaves local key if it is more recent than remote', function(done) {
          var domain1_hash = "f528764d624db129",
            key_hash = "924a8ceeac17f54d3be3f8cdf1c04eb2",
            day = "20200102";
          CliqzAttrack.safeKey[domain1_hash] = {};
          CliqzAttrack.safeKey[domain1_hash][key_hash] = [day, 'l'];

          CliqzAttrack.loadRemoteSafeKey();
          waitFor(function() {
            return CliqzAttrack.safeKeyExtVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.safeKeyExtVersion).to.equal(mock_safekey_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash]).to.have.property(key_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash][key_hash]).to.eql([day, 'l']);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });

        it("prunes keys more than 7 days old", function(done) {
          var domain1_hash = "f528764d624db129",
            key_hash = "4a8a08f09d37b73795649038408b5f33",
            day = new Date(),
            daystr = null,
            d = "",
            m = "";
          day.setDate(day.getDate() - 8);
          d = (day.getDate()  < 10 ? "0" : "" ) + day.getDate();
          m = (day.getMonth() < 10 ? "0" : "" ) + parseInt((day.getMonth()));
          daystr = "" + day.getFullYear() + m + d;
          CliqzAttrack.safeKey[domain1_hash] = {};
          CliqzAttrack.safeKey[domain1_hash][key_hash] = [daystr, 'l'];

          CliqzAttrack.loadRemoteSafeKey();
          waitFor(function() {
            return CliqzAttrack.safeKeyExtVersion != null
          }).then(function() {
            try {
              chai.expect(CliqzAttrack.safeKeyExtVersion).to.equal(mock_safekey_hash);
              chai.expect(CliqzAttrack.safeKey[domain1_hash]).to.not.have.property(key_hash);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          });
        });
      });

      describe('loadRemoteWhitelists', function() {

        var calledLoadRemoteTokenWhitelist = 0,
          calledLoadRemoteSafeKey = 0,
          origLoadRemoteTokenWhitelistFn = CliqzAttrack.loadRemoteTokenWhitelist,
          origLoadRemoteSafeKeyFn = CliqzAttrack.loadRemoteSafeKey;

        beforeEach(function() {
          // setup clean state
          CliqzAttrack.safeKeyExtVersion = null;
          CliqzAttrack.safeKey = {};
          CliqzAttrack.tokenWhitelistVersion = null;
          CliqzAttrack.tokenExtWhitelist = {};
          CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK = "chrome://cliqz/content/firefox-tests/mockdata/versioncheck.json";
          // mock update functions
          calledLoadRemoteTokenWhitelist = 0;
          calledLoadRemoteSafeKey = 0;
          CliqzAttrack.loadRemoteTokenWhitelist = function() {
            calledLoadRemoteTokenWhitelist++;
          };
          CliqzAttrack.loadRemoteSafeKey = function() {
            calledLoadRemoteSafeKey++;
          };
        });

        afterEach(function() {
          // restore original url
          CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK = real_versioncheck_url;
          CliqzAttrack.loadRemoteTokenWhitelist = origLoadRemoteTokenWhitelistFn;
          CliqzAttrack.loadRemoteSafeKey = origLoadRemoteSafeKeyFn;
        });

        it('does not update if versions match', function(done) {
          CliqzAttrack.safeKeyExtVersion = mock_safekey_hash;
          CliqzAttrack.tokenWhitelistVersion = mock_token_hash;
          CliqzAttrack.loadRemoteWhitelists();
          setTimeout(function() {
            try {
              chai.expect(calledLoadRemoteTokenWhitelist).to.equal(0);
              chai.expect(calledLoadRemoteSafeKey).to.equal(0);
              setTimeout(done, 1000);
            } catch(e) { setTimeout(done, 1000, e); }
          }, 500);
        });

        it('updates if versions do not match', function(done) {
          CliqzAttrack.loadRemoteWhitelists();

          waitFor(function() {
            return calledLoadRemoteTokenWhitelist == 1 && calledLoadRemoteSafeKey == 1;
          }).then(done);
        });

        it('updates tokens only if needed', function(done) {
          CliqzAttrack.tokenWhitelistVersion = mock_token_hash;

          CliqzAttrack.loadRemoteWhitelists();
          waitFor(function() {
            return calledLoadRemoteTokenWhitelist == 0 && calledLoadRemoteSafeKey == 1;
          }).then(done);
        });

        it('updates safekeys only if needed', function(done) {
          CliqzAttrack.safeKeyExtVersion = mock_safekey_hash;

          CliqzAttrack.loadRemoteWhitelists();
          waitFor(function() {
            return calledLoadRemoteTokenWhitelist == 1 && calledLoadRemoteSafeKey == 0;
          }).then(done);
        });

        describe("force_clean", function() {

          beforeEach(function() {
            CliqzAttrack.URL_SAFE_KEY_VERSIONCHECK = "chrome://cliqz/content/firefox-tests/mockdata/versioncheck_clean.json";
          });

          it('clears safekeys before loading new remote list', function(done) {
            CliqzAttrack.safeKey['a'] = {'b': ['20150101', 'l']};
            CliqzAttrack.loadRemoteWhitelists();
            waitFor(function() {
              return calledLoadRemoteSafeKey == 1;
            }).then(function() {
              try {
                chai.expect(CliqzAttrack.safeKey).to.eql({});
                chai.expect(CliqzAttrack.requestKeyValue).to.eql({});
                setTimeout(done, 1000);
              } catch(e) { setTimeout(done, 1000, e); }
            });
          });

          it('only clears when safekey update is required', function(done) {
            CliqzAttrack.safeKey['a'] = {'b': ['20150101', 'l']};
            CliqzAttrack.safeKeyExtVersion = mock_safekey_hash;
            CliqzAttrack.loadRemoteWhitelists();
            waitFor(function() {
              return calledLoadRemoteTokenWhitelist == 1;
            }).then(function() {
              try {
                chai.expect(CliqzAttrack.safeKey).to.not.eql({});
                setTimeout(done, 1000);
              } catch(e) { setTimeout(done, 1000, e); }
            });
          });
        });
      });
    });

    describe('isSourceWhitelisted', function() {

      it('returns false for non whitelisted domain', function() {
        chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
      });

      describe('addSourceDomainToWhitelist', function() {

        afterEach(function() {
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
        });

        it('adds a source domain to the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.true;
        });

        it('does not add any other domains to the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('www.example.com')).to.be.false;
        });

      });

      describe('removeSourceDomainFromWhitelist', function() {

        afterEach(function() {
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('www.example.com');
        });

        it('removes a domain from the whitelist', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');
          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
        });

        it('does not remove other domains', function() {
          CliqzAttrack.addSourceDomainToWhitelist('example.com');
          CliqzAttrack.addSourceDomainToWhitelist('www.example.com');
          CliqzAttrack.removeSourceDomainFromWhitelist('example.com');

          chai.expect(CliqzAttrack.isSourceWhitelisted('example.com')).to.be.false;
          chai.expect(CliqzAttrack.isSourceWhitelisted('www.example.com')).to.be.true;
        });
      });
    });

}

TESTS.AttrackTest.MIN_BROWSER_VERSION = 35;

