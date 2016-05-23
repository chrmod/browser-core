import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - DB');
}


////////////////////////////////////////////////////////////////////////////////
// Generic DB class
export function DB(name) {
  this.name = name;
}

DB.prototype.databaseName = function() {
  return this.name;
};

//////////////////////////////////////////////////////////////////////////////
// API TO IMPLEMENT
//

DB.prototype.loadFromDict = function(dict) {
  throw new Error('The database ' + this.name + 'should be implemented!');
  //return false;
};




