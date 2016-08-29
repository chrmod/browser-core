/**
Load Directory Service Public key.
*/
var secureLogger = class secureLogger {
  constructor(){
        var publicKey = "-----BEGIN PUBLIC KEY-----\
    MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA6uMuZy8dh7LbPOkIDZeG\
    P1bboUhp5gav84cUDTp6JTW9eFVNopEHdCmntZCHUtenihV8DqpiNWT2QXManqzX\
    uMHpEwKWQIBVyXGJiFkPU4cjfbhGlwnyRONM604ZyECM9iRxHDXSHjbw5UhRWlv/\
    jJTBu5GiUPfleE4eSprq4aHit2VhmYU/RKaW461Vow//AczVo4i+m4vQqE7yGvuo\
    NUOCZImk6cFejvqQNBDgBdEoD505ChrtCAh+KOd0kW9/44MttSWwK6qWf1rm3AC0\
    CiO+xyWKHY3jRydUClcSHwiJJdKgdLXcOyyUa624JLnZqxFb/scoBwP/hM9HWoem\
    ovqvuYWzYZuuST/tRcFYlRnLDmdt6nNbmeplnp+j5JwQKTvHMfTSYMC96ortqXRz\
    OXu5gw1NBy+PxKgCuB3UjiroD2yWUZ/9O41wEn/xsJ0eqTnhhy00V/wTTUTEmqFm\
    ZKJU58V+LKO/4+qCoNm9bTjKj31LaTwf1jYOP14PUREYz6yK2+jCeFpRuXvhba4z\
    GivthMn/3mki1q0ZqeMzy1C2xSio0qlIlVg6W/Zp+RFqjRfInQir77G4bCzOU94v\
    dtQe1OOHW62l+32vrDqPfg2fX5/osLdQ/Nu9Y2PiNIurPfeqU9nv9gZGQYAM9i53\
    EsiZM3tW+RjxPuNPElTkDgUCAwEAAQ==\
    -----END PUBLIC KEY-----";
    this.keyObj = new JSEncrypt();
    this.keyObj.setPublicKey(publicKey);
  }
};