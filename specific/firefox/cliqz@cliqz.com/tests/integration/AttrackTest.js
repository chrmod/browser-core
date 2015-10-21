
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

TESTS.AttrackTest = function (CliqzAttrack, CliqzUtils) {

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
                    tabs.push(gBrowser.addTab("https://cliqz.com"));
                    // get tab id from tp_events (assumption that this is correct)
                    waitIfNotReady(function() {
                        return Object.keys(CliqzAttrack.tp_events._active).length > 0;
                    }).then(function() {
                        tab_id = Object.keys(CliqzAttrack.tp_events._active)[0];
                        done();
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
                // CliqzAttrack.init(win);
                // CliqzAttrack.initAtBrowser();
                CliqzAttrack.tp_events.commit(true);
                CliqzAttrack.tp_events._staged = [];
                // prevent data push during the test
                CliqzAttrack._last_push = (new Date()).getTime();
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

                afterEach(function() {
                    tabs.forEach(function(t) {
                        gBrowser.removeTab(t);
                    });
                    tabs = [];
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
                        done();
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

}