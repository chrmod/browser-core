export default describeModule("freshtab/background",
  function () {
    return {
      "freshtab/main": {
        default: { shutdown() { } }
      },
      "freshtab/news": {
        default: { unload() { } }
      },
      "freshtab/history": {
        default: { getTopUrls(limit) { } }
      },
      "core/cliqz": { utils: { } },

      "freshtab/speed-dial": {
        default: function () { this.prototype.constructor.apply(this, arguments) }
      }
    }
  },
  function () {
    describe("#unload", function () {
      it("calls unload on News", function (done) {
        const News = this.deps("freshtab/news").default;
        News.unload = function () { done(); };
        this.module().default.unload();
      });

      it("calls shutdown on FreshTab", function (done) {
        const FreshTab = this.deps("freshtab/main").default;
        FreshTab.shutdown = function () { done(); };
        this.module().default.unload();
      });
    });

    describe("actions", function () {
      let prefs;

      beforeEach(function() {
        prefs = {};

        this.deps("core/cliqz").utils.getPref = function(key) {
          return prefs[key];
        }

        this.deps("core/cliqz").utils.hasPref = function(key) { return key in prefs; }

        this.deps("core/cliqz").utils.setPref = function(key, value) {
          prefs[key] = value;
        }

        this.deps("core/cliqz").utils.log = function() {};

        this.deps("core/cliqz").utils.getDetailsFromUrl = function() { return {}; }

        this.deps("core/cliqz").utils.getLogoDetails = function() { return ''; }

        this.deps('freshtab/speed-dial').default.prototype = function (url, custom) {
          this.title = url;
          this.url = url;
          this.displayTitle = url;
          this.custom = custom;
          this.logo = '';
        }
      });

      describe("#getSpeedDials", function() {

        let history_results;

        beforeEach(function() {
          const History = this.deps("freshtab/history").default;
          history_results = [
              {"url":"http://cliqz.com/","title":"Cliqz","total_count":32341},
              {"url":"https://github.com","title":"Github navigation extension","total_count":2548},
              {"url":"http://www.spiegel.com/","title":"Spiegel Nachrichten","total_count":1626}
          ];
          History.getTopUrls = function(limit) {
            return Promise.resolve(history_results);
          }

          //bind action to module
          this.module().default.actions.getSpeedDials = this.module().default.actions.getSpeedDials
            .bind(this.module().default);
        })

        it('display history tiles', function() {

          return this.module().default.actions.getSpeedDials().then((result) => {
            chai.expect(result.speedDials.length).to.equal(history_results.length);
            history_results.forEach((history, i) => {
              chai.expect(result.speedDials[i]).to.have.property('title').that.equal(history.url)
              chai.expect(result.speedDials[i]).to.have.property('url').that.equal(history.url)
              chai.expect(result.speedDials[i]).to.have.property('displayTitle').that.equal(history.url)
              chai.expect(result.speedDials[i]).to.have.property('custom').that.equal(false)
              chai.expect(result.speedDials[i]).to.have.property('logo').that.equal('')
            });

          });
        });

        it('display manually added custom tiles', function() {
          this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "https://yahoo.com/": { "custom": true },
            "https://www.gmail.com/": { "custom": true }
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.speedDials.filter((tile) => tile.custom);
            chai.expect(customTiles.length).to.equal(2);
          });
        });

        it('do NOT display manually deleted custom tiles', function() {
          this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "https://yahoo.com/": { "custom": true },
            "https://www.gmail.com/": { "custom": false }
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.speedDials.filter((tile) => tile.custom);
            chai.expect(customTiles.length).to.equal(1);
          });
        });

        it('do NOT display manually deleted history tiles', function() {
          this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "http://cliqz.com/": { "history": false },
            "https://www.spiegel.com/": { "custom": true }
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.speedDials.filter((tile) => tile.custom),
                historyTiles = result.speedDials.filter((tile) => !tile.custom);
            chai.expect(result.speedDials.length).to.equal(3);
            chai.expect(historyTiles.length).to.equal(2);
          });
        });

        it('do NOT display history tiles in 1st row when manually added to 2nd row', function() {

          this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "http://cliqz.com/": { "custom": true },
            "https://www.spiegel.com/": { "custom": true }
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.speedDials.filter((tile) => tile.custom),
                historyTiles = result.speedDials.filter((tile) => !tile.custom);
            chai.expect(result.speedDials.length).to.equal(4);
            chai.expect(customTiles.length).to.equal(2);
            chai.expect(historyTiles.length).to.equal(2);
          });
        });

        it('display tiles in 1st row when manually deleted from 2nd row', function() {
          this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
            "http://cliqz.com/": { "custom": false },
            "https://www.spiegel.com/": { "custom": true }
          }));

          return this.module().default.actions.getSpeedDials().then((result) => {
            var customTiles = result.speedDials.filter((tile) => tile.custom),
                historyTiles = result.speedDials.filter((tile) => !tile.custom);
            chai.expect(result.speedDials.length).to.equal(4);
            chai.expect(customTiles.length).to.equal(1);
            chai.expect(historyTiles.length).to.equal(3);
          });
        });
      });

      describe("#addSpeedDial", function () {

        beforeEach(function () {
          // bind action to module
          this.module().default.actions.addSpeedDial = this.module().default.actions.addSpeedDial
            .bind(this.module().default);

          this.module().default.actions.getSpeedDials = function () {
            return Promise.resolve({ speedDials: [] });
          };

          this.deps("core/cliqz").utils.stripTrailingSlash = function(url) { return url; }
        });

        context("no other custom speed dials", function () {
          it("add new custom speed dial", function () {
            const url = "http://cliqz.com";

            return this.module().default.actions.addSpeedDial(url).then((newSpeedDial) => {
              const speedDials = JSON.parse(this.deps("core/cliqz").utils.getPref("extensions.cliqzLocal.freshtab.speedDials"));

              chai.expect(speedDials).to.deep.equal({ [url]: { custom: true }});
              chai.expect(newSpeedDial).to.have.property('title').that.equal(url)
              chai.expect(newSpeedDial).to.have.property('url').that.equal(url);
              chai.expect(newSpeedDial).to.have.property('displayTitle').that.equal(url)
              chai.expect(newSpeedDial).to.have.property('custom').that.equal(true)
              chai.expect(newSpeedDial).to.have.property('logo').that.equal("")

            });
          });
        });

        context("speed dials already present", function () {
          it("add back a speed dial that was previously deleted", function () {
            const url = "http://cliqz.com/";
            this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
              "http://cliqz.com/": { "custom": false },
              "https://www.spiegel.com/": { "custom": true }
            }));

            return this.module().default.actions.addSpeedDial(url).then(() => {
              const actual = JSON.parse(this.deps("core/cliqz").utils.getPref("extensions.cliqzLocal.freshtab.speedDials"));
              const expected = {
                "http://cliqz.com/": { "custom": true },
                "https://www.spiegel.com/": { "custom": true }
              };
              chai.expect(actual).to.deep.equal(expected);
            });
          });

          it("do NOT add duplicate urls (after sanitization)", function() {
            this.deps("core/cliqz").utils.stripTrailingSlash = function(url) { return 'always_the_same'; }

            const url = "https://www.cliqz.com/";

            this.module().default.actions.getSpeedDials = function () {
              return Promise.resolve({
                speedDials: [
                  { url: 'https://www.cliqz.com' }
                ]
              });
            };

            return this.module().default.actions.addSpeedDial(url).then((result) => {
              chai.expect(result).to.deep.equal({ error: true, reason: 'duplicate'});
            });
          });

        });
      });

      describe("#removeSpeedDial", function() {

        beforeEach(function() {
          // bind action to module
          this.module().default.actions.removeSpeedDial = this.module().default.actions.removeSpeedDial
            .bind(this.module().default);
        });

        context("custom speed dials already present", function() {

          it("remove custom speed dial", function() {
            this.deps("core/cliqz").utils.setPref("extensions.cliqzLocal.freshtab.speedDials", JSON.stringify({
              "http://cliqz.com/": { "custom": true },
              "https://www.spiegel.com/": { "custom": true }
            }));

            const speedDial = {
              "url": "http://cliqz.com/",
              "custom": true
            }
            this.module().default.actions.removeSpeedDial(speedDial);
            let speedDials = JSON.parse(this.deps("core/cliqz").utils.getPref("extensions.cliqzLocal.freshtab.speedDials"));
            chai.expect(speedDials["http://cliqz.com/"].custom).to.equal(false);
          });
        });
      });
    });
  }
);
