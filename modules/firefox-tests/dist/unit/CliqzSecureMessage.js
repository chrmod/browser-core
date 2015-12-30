"use strict";

var expect = chai.expect;
TESTS.HPNTest = function (CliqzUtils) {
	var CliqzSecureMessage = CliqzUtils.getWindow().CLIQZ.System.get("hpn/main").default;

	var subject;
	var mc = "";
	var sample_message = '{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}';
	var dummyMessages = [['{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}',"alive2015110909"],['{"action":"attrack.tokens","type":"humanweb","ver":"1.6","payload":{"ver":"0.93","whitelist":"3431576100b20e0a15d4a4c141700f7f","ts":"2015111523","anti-duplicates":3109759,"safeKey":"6bc8710c90f5ac35fbb7ae4ce1660198","data":{"2e7285b81f0da788c9b5fb92e7fe987a":{"08c64a59bc61b81a":{"c":1,"kv":{"6144bb91c094de745cab7863f75f7ba6":{"c5d7165b0d540f62f089442e2df33786":1}}}}}},"ts":"20151116"}','attrack.tokens2015111523{"2e7285b81f0da788c9b5fb92e7fe987a":{"08c64a59bc61b81a":{"c":1,"kv":{"6144bb91c094de745cab7863f75f7ba6":{"c5d7165b0d540f62f089442e2df33786":1}}}}}']];
	var module_enabled = CliqzUtils.getPref('hpn', false);
	var sourceMap = '{"alive":{"keys":["action","payload.t"],"endpoint":"safe-browsing"},"page":{"keys":["payload.url","ts"],"endpoint":"safe-browsing"},"query":{"keys":["payload.q","ts"],"endpoint":"safe-browsing"},"ads_a":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_b":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"ads_c":{"keys":["action","payload.q","ts"],"endpoint":"safe-browsing"},"doorwaypage":{"keys":["action","payload.url","payload.durl"],"endpoint":"safe-browsing"},"linkedin":{"keys":["action","payload.profileLink","ts"],"endpoint":"safe-browsing"},"suspiciousurl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"maliciousurl":{"keys":["action","payload.qurl","ts"],"endpoint":"safe-browsing"},"extension-query":{"keys":["ts"],"endpoint":"query"},"attrack.tokens":{"keys":["action","payload.ts","payload.data"],"static":["data"],"endpoint":"safe-browsing"},"attrack.tp_events":{"keys":["action","ts","payload.data.1.hostname"],"endpoint":"safe-browsing"},"attrack.safekey":{"keys":["action","payload.ts","payload.data"],"static":["data"],"endpoint":"safe-browsing"},"proxy-health":{"keys":["action","anti-duplicates"],"endpoint":"health-stats"}}'
	CliqzSecureMessage.sourceMap = JSON.parse(sourceMap);

	// Set test PK, else signatures will fail
	var pk = "MIIEowIBAAKCAQEAhq3VXODlZXqNHVKuKEPzXZy5H/DhXC0QhzUozMASWK5Px2MQRYrpFlkE81KYUYoBLjSqabY2dBz9nMrnn2B9qEFTDWioZ0co2aHMvEiw72uacmBisOMchV0/Vj7hCh0rDu1NbJM6739u6VFhVX7KfUPecaH7aUfAj1seoRyNyKqWmHovk8SMJDpDwJQwYdQQ6e+r4B6bCOeiahsADO0qXVoC16hEGlPLIDBZexuKf1a2WO7ZPy5b95B9DsXpHbsUXJrAO/1DDVM6i7YH2XJv/b1fGYI9creok5ZJmgAndnJcXPIhMYFvvIz+Z0qBJNYWaHJkMAWfFG7HN34jzZjJUwIDAQABAoIBAHhSGUpPCeJtaGEIGtuSSXwapjFpDI1DHX8N+RNjjYB4yoGBeWoHvlHe2dNguQAv4PocxxqGVYPK2rEXfXMfy2NkaQSTuc/6/P3h1X1pG9nqMiN5BPKvFC35rroolvhoMq21R/R2XLLXEImV0PWGvvTGi5bNdkUKe3gXmfeqAOmCU1E6gScdE7j1SqWes0N10SrDZEbmcCFAt8EamzrukOYrAYnP46DzPThC1emdWwZpwxv8rheI5vuKaTjmGZ20D0k/s6dfBuhkcaC9hbnm9rEjqBtgP8qvoMMTyMVuudLExuF8cPrTgpxe0XIpnPgUxfxbSkdeC4E5JsppEDFNR6ECgYEA+glZO7WzutZJB5z35S/x6g6hfgBKHQs0kVCMdhzoGeQSbQ0zeUOGpwNRcU7C+g1nfgVJHP0NW8DD5dAnGGOzohZs9kC1pgml68mMUCS9UNUvu0QZDhQ+Opza8YfzsLV/S+N2vZAYtTL8lOP5PyjR/7kueiohqCLQzw4Pl6HFLgsCgYEAieQlJfwaRFTj0EdIaTtpDY5J6EG9rD4tzW81jTpDSseqzagrwCh9fDVs7aC/1f4L90AEPRVweFZp7iA32D08RMCgRSm1/vmAQ4irpwqED8I0SBSCxE3V9ZBvMjfhWx9u1D+3u+t5aD3qobOt9HkcB/0YkGejDJcN8dmg8L3xhtkCgYAoZyZSLbRTNpkqb8Tm9e5jYeXalHVlaBAggyGPXHBs7pvDn2R37d9uUWzxoEaFXXEhvfzogEOOVgHRuub2W/YE9Ra6XA5+PAThqvnPYYBt9WT3H7PkwISlt/7xFITeQxXEz4a6bvRvI0QJUyVNfW0ho2zNNM2ne6i+LIl8eRmBrQKBgEYKbdgqgwkceY9M9foF5GmvUdk4s2hvOQK1r2TqKE4ut5K5DmgP6RWTaZ4WXfsLjPZtPPnuDvABLNN46ATdreRaV85pznkSMNWc8Vvq2oPKqJXIXVfrFXgjgmfmvIB1qe0D5Ib+p++MK8cxJnYcomFobPbEvaxiegHUAozmXm2ZAoGBAOlNYDedZp4bRqe4bWxAzNz7a6V7zbwY3oAU3zGUrmJ5ZRWTAF/nGlZt42T8922/JppfmPCRs4UY4LUZiHZ2qplLlpuLuVaXLa5pSXgC53+h3WzLZtI8PAfUZVwhF8nx8XrM2n6DiQhpJbBIhg3Midb3lWzbjksZwHee0Yw4uDzl";
	CliqzUtils.setPref('userPKBeta', pk);
	beforeEach(function () {
		if(!module_enabled) {
			CliqzUtils.setPref('hpn', true);
			mc = new CliqzSecureMessage.messageContext(JSON.parse(sample_message));
		}
  	});

    afterEach(function() {
        // revert module status
        module_enabled = CliqzUtils.getPref('hpn', false);
        if(module_enabled) {
            CliqzUtils.setPref('hpn', false);
        }
    });

	describe("HPN-source map is updated", function () {
		dummyMessages.forEach(function(e){
			var jMessage = JSON.parse(e[0]);
			it(jMessage.action, function () {
				expect(CliqzSecureMessage.getRouteHash(jMessage)).to.equal(e[1]);
			});
		})
	})

	describe("HPN-cryptoJS loaded correctly", function () {
		it("MD5-test", function () {
			expect(CliqzSecureMessage.cryptoJS.MD5("cliqz").toString()).to.equal("b0142f2841340cb81463761e4c1af118");
		});

	})


	describe("HPN-secure-message context", function () {
		it("SHA-256 tested", function () {
			expect(mc.sha256).to.equal("373fcb0485556b80b11b1b3fb034a05bba961dd6b1d2e72e3b3de1cfae4e0221");
		});

		it("dmC rightly calculated", function () {
			expect(mc.dmC).to.equal("0101101101011");
		});

		it("action", function () {
			expect(mc.action).to.equal("alive");
		});

	})

	describe("HPN-RSA signing", function () {
		it("RSA signature", function () {
			var rsa = new CliqzSecureMessage.RSAKey();
			rsa.readPrivateKeyFromPEMString(pk);
			var hSig = rsa.sign(sample_message,"sha256");
			expect(hSig).to.equal("2be67d16d64c93f55af6db28dd83f48ff92761e459e61dab161f475aea010208b3a8437e8acec0f15d463f762e64e00033cbcab1b6017d541b88dbb1258c98cfe9c70436caf6d62effa8edc9f5a54d17e77724ae2864a34a0c6b0877f00f2fa8e5d583b02bafa8f72eadf16b2edd844fdca9440aa93ec6dd88d280831becdeb363ca69ecf4e6d82bdd9a18de3034b3bdc23c557847503924c45dcb3e8ed4d164725068109109fd5ffc3727e41c73e246e9017f497603d6261ffcd0c939857f11b9a2e49bf34e9ab31aaa1d82ba420a8d09517a97c98b176bebeb3b8c97f5bfe148258b268eb95b3916c328584f9b7975a0265198a919e89e507ddb6c9e51f025");
		});

		it("HPN-RSA verification", function () {
			var rsa = new CliqzSecureMessage.RSAKey();
			rsa.readPrivateKeyFromPEMString(CliqzSecureMessage.uPK.privateKey);
			var hSig = rsa.sign(sample_message,"sha256");

			var je = new CliqzSecureMessage.JSEncrypt();
		 	var rsa = new CliqzSecureMessage.RSAKey();
			rsa.setPublic(je.parseKeyValues(CliqzSecureMessage.uPK.publicKeyB64)["n"], "10001");
			var _hSig = rsa.verifyHexSignatureForMessage(hSig, sample_message);
			expect(_hSig).to.equal(true);
		});
	})

}