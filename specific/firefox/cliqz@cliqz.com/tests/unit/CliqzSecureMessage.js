"use strict";

var expect = chai.expect;
TESTS.HPNTest = function (CliqzUtils) {
	var CliqzSecureMessage = CliqzUtils.getWindow().CLIQZ.System.get("hpn/main").default;

	var subject;
	var mc = "";
	var sample_message = '{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}';
	var dummyMessages = [['{"action": "alive", "type": "humanweb", "ver": "1.5", "payload": {"status": true, "ctry": "de", "t": "2015110909"}, "ts": "20151109"}',"alive2015110909"],['{"action":"attrack.tokens","type":"humanweb","ver":"1.6","payload":{"ver":"0.93","whitelist":"3431576100b20e0a15d4a4c141700f7f","ts":"2015111523","anti-duplicates":3109759,"safeKey":"6bc8710c90f5ac35fbb7ae4ce1660198","data":{"2e7285b81f0da788c9b5fb92e7fe987a":{"08c64a59bc61b81a":{"c":1,"kv":{"6144bb91c094de745cab7863f75f7ba6":{"c5d7165b0d540f62f089442e2df33786":1}}}}}},"ts":"20151116"}','attrack.tokens2015111523{"2e7285b81f0da788c9b5fb92e7fe987a":{"08c64a59bc61b81a":{"c":1,"kv":{"6144bb91c094de745cab7863f75f7ba6":{"c5d7165b0d540f62f089442e2df33786":1}}}}}']];

	beforeEach(function () {
	  mc = new CliqzSecureMessage.messageContext(JSON.parse(sample_message));
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
			rsa.readPrivateKeyFromPEMString(CliqzSecureMessage.uPK.privateKey);
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