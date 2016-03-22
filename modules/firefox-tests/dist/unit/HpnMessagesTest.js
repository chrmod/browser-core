"use strict";

var expect = chai.expect;
TESTS.HPNMessagesTest = function (CliqzUtils) {
	var CliqzSecureMessage = CliqzUtils.getWindow().CLIQZ.System.get("hpn/main").default;
	function getTodayDate() {
		return (new Date()).toISOString().slice(0,10).replace(/-/g,"");
	}
	function getTodayDateMinutes() {
		return (new Date()).toISOString().slice(0,19).replace(/[-T:]/g,"");
	}
	var sample_message = `{"action": "test-message", "type": "humanweb", "ver": "0", "anti-duplicates": ${Math.floor(Math.random() * 1000000000)}, "payload": {"t": "${getTodayDateMinutes()}"}, "ts": "${getTodayDate()}"}`;
	describe("Monitoring test", function () {
		it("Proxies loaded", function () {
			console.log("XXX");
			var l = CliqzSecureMessage.proxyList.length;
			// .to.equal(4);
			expect(l).to.equal(4);
		});

		it("load message in trk", function () {
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			expect(CliqzSecureMessage.trk.length).to.equal(1);
		});

		it("send message, should be accepted by server", function (){
			expect(CliqzSecureMessage.trk.length).to.equal(1);
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.be.null;
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});

		it("send message, should be dropped locally (duplicate)", function (){
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.equal('dropped-local-check');
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});

		it("send message, should be dropped in the proxy (duplicate)", function () {
			expect(CliqzSecureMessage.trk.length).to.equal(0);
			CliqzSecureMessage.trk.push(JSON.parse(sample_message));
			CliqzSecureMessage.localTemporalUniq = {};
			return CliqzSecureMessage.pushTelemetry()
			.then(results => {
				expect(results.length).to.equal(1);
				expect(results[0]).to.equal('error-promise-failed');
				expect(CliqzSecureMessage.trk.length).to.equal(0);
			});
		});



	});


}

TESTS.HPNTest.MIN_BROWSER_VERSION = 41;

