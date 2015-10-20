
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

    //describe('CliqzAttrack.')

    describe('CliqzAttrack.tp_events', function() {

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
        });

    });

}