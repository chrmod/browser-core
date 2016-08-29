var directoryServicePK = class directoryServicePK {
	constructor(){
        this.dsPubKey = "-----BEGIN PUBLIC KEY-----\
	    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnL0p5VJJ0fuzeXdV/7w6\
	    2vSJfqt6LkK0z05B3kP668d8acyUddk63F4WHO3/ZAautA2C4h5xCErRhehYh170\
	    qf/y7TLYB0wJL6Q1vsPSZedLWVds0/Q5y/nUBobJZSyTFC6ls3xAP2oK8YbO3i4s\
	    YMJ7/iKrgEXLWAPOYxXJHhQ0eCdodwGYEFeeNJLzlBiI9u6j5tIasNFFG/TBqks6\
	    K5bybqqEkHPPEaK8KNbLkhtOg1YC+S8+9XEO5Sd/CNT+7TuA8QaX0KXw/x0wdiHF\
	    jFaGNsrywflvpS1X1AMZpfsMr/tGRtdLdlnQ6UGAxS9UsQT0/s0ydhLA/obaX3qK\
	    pwIDAQAB\
	    -----END PUBLIC KEY-----";
	    this.endPoint = CliqzSecureMessage.BLIND_SIGNER;
	    this.loadKey = new CliqzSecureMessage.JSEncrypt();
	    this.loadKey.setPublicKey(CliqzSecureMessage.signerKey || this.dsPubKey);
	    this.n = this.loadKey.parseKeyValues(this.dsPubKey)['mod'];
	    this.e = '' + this.loadKey.parseKeyValues(this.dsPubKey)['e']; // Needs to be string, else fails on blinding nonce.
	}
};