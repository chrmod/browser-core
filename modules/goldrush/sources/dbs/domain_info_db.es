import { DB } from 'goldrush/dbs/db';
import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - DomainInfoDB');
}



//////////////////////////////////////////////////////////////////////////////

export function DomainInfoDB() {
  DB.call(this, 'domain_info_db');
  this.data = { 'total_signals' : 0 , 'top_sellers': [], 'checkout_regex': {}};
  this.defaultNotFoundValue = 0.0;
  this.validKeys = ['total_signals', 'top_sellers', 'checkout_regex'];
}

DomainInfoDB.prototype = Object.create(DB.prototype);
DomainInfoDB.prototype.constructor = DomainInfoDB;

DomainInfoDB.prototype.getTotalSignals = function() {
  return this.data['total_signals'];
};

DomainInfoDB.prototype.setTopSellersList = function(topSellers) {
  // Sort array buy second value
  // Each entry has structure [domainId, count]
  // http://stackoverflow.com/questions/9316119/sort-complex-array-of-arrays-by-value-within
  topSellers.sort(function(a,b) {
    var x = a[1];
    var y = b[1];
    return y-x;
  });
  this.data['top_sellers'] = topSellers;
};

DomainInfoDB.prototype.getTopSellersList = function() {
  return this.data['top_sellers'];
};

DomainInfoDB.prototype.getTopSeller = function() {
  return this.data['top_sellers'][0];
};

DomainInfoDB.prototype.setCheckoutRegexMap = function(regexMap) {
  this.data['checkout_regex'] = regexMap;
};

DomainInfoDB.prototype.getCheckoutForDomain = function(domainID) {
  return this.data['checkout_regex'][domainID];
};


// Load from dict
//
DomainInfoDB.prototype.loadFromDict = function(dict) {
  this.data['total_signals'] = dict['total_signals'];
  this.setTopSellersList(dict['top_sellers']);
  this.setCheckoutRegexMap(dict['checkout_regex']);
  // log('DomainInfoDB: loadFromDict');
  // log(this.data);
};




