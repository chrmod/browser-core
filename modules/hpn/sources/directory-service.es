import CliqzSecureMessage from 'hpn/main';

/**
Load Directory Service Public key.
*/
export default class{
  constructor(){
    // This certainly needs to find a better place.
    this.dsPubKey = "-----BEGIN PUBLIC KEY-----\
    MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA5IUb5B02se1hKWjWNN6D\
    dG4EQ8AiKtUAn3qdnQ1cJOeIqUjAu4FsaLJyndrYIOlfyEiJSeb4rJOmkUaVUoKF\
    7vmvfNug7IugiVrm4rgGMUIzXm5nHhZf+ntA803Rg5J+C0xt9IrIj4CBgcYxnQFQ\
    uhdFN7cWTmcoJqs74wUM4j1Q0gRGV+wp2WG+dp1n04uagRGIU7Ego06Xxk4wO6S4\
    Ceqk5tWHt7IzqNWRZO5JMaSulne6Otq47jf3PGIW1Ok8ze2PmgM/5ars/H7UWDFr\
    avbGMlYe3bhaTKusUoqgcKmPzsroE/tJMwh7cqPaXTfYdesOoTNfP2lsDC0fsW3X\
    HGwZaWcaoJWnOFboIWFInrrEKmTO/rugKIMnUuES6eEgJXPHLcemg45ZvvCG9gqq\
    7TsIFtyyhXxBJgcOnFPdV2DUa61Oe+Ew0wRv3dVH0wx+ar5RN8Bbg080GhP3wyZ+\
    yjqvlcypuq+Qzd3xWF61ZmFyzlUnjKESLB8PpvTnsTvMPNpCbF6I3AyQ79mi9SM6\
    Urh6hU90zpidn7kYTrIvkHkvEtVpALliIji/6XnGpNYIpw0CWTbqU/fMOt+ITcKg\
    rWMymdRofsl0g6+abRETWEg+8uu7pLlDVehM9sPZPhtOGd/Vl+05FDUhNsbszdOE\
    vUNtCY8pX4SI5pnA/FjWHOkCAwEAAQ==\
    -----END PUBLIC KEY-----"
    this.endPoint = "http://securebrowsingbeta-1342316385.us-east-1.elb.amazonaws.com/sign";//"http://10.10.73.207/sign";
    this.loadKey = new CliqzSecureMessage.JSEncrypt();
    this.loadKey.setPublicKey(CliqzSecureMessage.signerKey || this.dsPubKey);
    this.n = this.loadKey.parseKeyValues(this.dsPubKey)['mod'];
    this.e = '' + this.loadKey.parseKeyValues(this.dsPubKey)['e']; // Needs to be string, else fails on blinding nonce.
  }
};