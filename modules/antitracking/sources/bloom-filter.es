import md5 from 'antitracking/md5';


function BloomFilter(a, k) {  // a the array, k the number of hash function
  var m = a.length * 32,  // 32 bits for each element in a
      n = a.length,
      i = -1;
  this.m = m = n * 32;
  this.k = k;
  // choose data type
  var kbytes = 1 << Math.ceil(Math.log(Math.ceil(Math.log(m) / Math.LN2 / 8)) / Math.LN2),
      array = kbytes === 1 ? Uint8Array : kbytes === 2 ? Uint16Array : Uint32Array,
      kbuffer = new ArrayBuffer(kbytes * k),
      buckets = this.buckets = new Int32Array(n);
  while (++i < n) buckets[i] = a[i];  // put the elements into their bucket
  this._locations = new array(kbuffer);  // stores location for each hash function
}

BloomFilter.prototype.locations = function(a, b) {  // we use 2 hash values to generate k hash values
  var k = this.k,
      m = this.m,
      r = this._locations;
  a = parseInt(a, 16);
  b = parseInt(b, 16);
  var x = a % m;

  for (var i = 0; i < k; ++i) {
    r[i] = x < 0 ? (x + m) : x;
    x = (x + b) % m;
  }
  return r;
};

BloomFilter.prototype.test = function(a, b) {
  // since MD5 will be calculated before hand,
  // we allow using hash value as input to

  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) {
    var bk = l[i];
    if ((buckets[Math.floor(bk / 32)] & (1 << (bk % 32))) === 0) {
      return false;
    }
  }
  return true;
};

BloomFilter.prototype.testSingle = function(x) {
  var md5_hex = md5(x);
  var a = md5_hex.substring(0, 8),
      b = md5_hex.substring(8, 16);
  return this.test(a, b);
};

BloomFilter.prototype.add = function(a, b) {
  // Maybe used to add local safeKey to bloom filter
  var l = this.locations(a, b),
      k = this.k,
      buckets = this.buckets;
  for (var i = 0; i < k; ++i) buckets[Math.floor(l[i] / 32)] |= 1 << (l[i] % 32);
};

BloomFilter.prototype.addSingle = function(x) {
  var md5_hex = md5(x);
  var a = md5_hex.substring(0, 8),
      b = md5_hex.substring(8, 16);
  return this.add(a, b);
};

BloomFilter.prototype.update = function(a) {
  // update the bloom filter, used in minor revison for every 10 min
  var m = a.length * 32,  // 32 bit for each element
      n = a.length,
      i = -1;
  m = n * 32;
  if (this.m != m)
    throw "Bloom filter can only be updated with same length";
  while (++i < n) this.buckets[i] |= a[i];
};


var BLOOMFILTER_BASE_URL = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/',
    BLOOMFILTER_CONFIG = 'https://cdn.cliqz.com/anti-tracking/bloom_filter/config';

function AttrackBloomFilter() {
    this.bloomFilter = null;
    this.version = null;
    this.configURL = BLOOMFILTER_CONFIG;
    this.baseURL = BLOOMFILTER_BASE_URL;
};

AttrackBloomFilter.prototype.save = function() {};

AttrackBloomFilter.prototype.load = function() {};

AttrackBloomFilter.prototype.remoteUpdate = function(major, minor, callback) {
    var url = this.baseURL + major + '/' + minor + '.gz',
        self = this;
    CliqzUtils.httpGet(url, function(req) {
        var bf = JSON.parse(req.response);
        if (minor != 0) {
            self.bloomFilter.update(bf.bkt);
        } else {
            self.bloomFilter = new BloomFilter(bf.bkt, bf.k);
        }
        self.version.major = major;
        self.version.minor = minor;
        callback && callback();
    }, function() {
    }, 10000);
};

AttrackBloomFilter.prototype.checkUpdate = function(callback) {
    // check if the bloom filter version is up to date
    if (this.configURL == null) return;
    var self = this;
    CliqzUtils.httpGet(self.configURL, function(req) {
        var version = JSON.parse(req.response);
        if (self.version === null || this.bloomFilter === null) {  // load the first time
            self.version = {'major': null, 'minor': null};
            self.remoteUpdate(version.major, 0, callback);
            return;  // load the major version and update later
        }
        if (self.version.major == version.major &&
            self.version.minor == version.minor) {  // already at the latest version
            return;  
        }
        if (self.version.major != version.major)
            self.remoteUpdate(version.major, 0, callback);
        else
            self.remoteUpdate(version.major, version.minor, callback);
    }, function() {
    }, 10000);
};

var bloomFilter = new AttrackBloomFilter();

export {
    BloomFilter,
    AttrackBloomFilter,
    bloomFilter
};
