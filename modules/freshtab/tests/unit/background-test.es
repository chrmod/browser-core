export default describeModule("freshtab/background",
  function () {
    return {
      "freshtab/main": {
        default: { shutdown() { } }
      },
      "freshtab/news": {
        default: { unload() { } }
      },
      "freshtab/history": {},
      "core/cliqz": {},
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
  }
);
