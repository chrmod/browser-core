import { DB } from 'goldrush/dbs/db';
import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - GeneralDB');
}



//////////////////////////////////////////////////////////////////////////////

export function GeneralDB() {
  DB.call(this, 'general_db');
  this.data = {};
  this.defaultNotFoundValue = 0.0;
  this.validKeys = ['total_buy_signals', 'avg_total_buying_time'];
}

GeneralDB.prototype = Object.create(DB.prototype);
GeneralDB.prototype.constructor = GeneralDB;

// set a value for a particular key
//
GeneralDB.prototype.addValue = function(k, value) {
  this.data[k] = value;
};

//
// get the value for a particular key
GeneralDB.prototype.getValue = function(k) {
  let v;
  if (this.validKeys.includes(k)) {
    v = this.data[k];
  }
  return v === undefined ? this.defaultNotFoundValue : v;
};

// Load from dict
//
GeneralDB.prototype.loadFromDict = function(dict) {
  log('general_db dict:');
  log(dict);
  return false;
};








