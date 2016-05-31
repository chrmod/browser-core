import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - FID');
}


////////////////////////////////////////////////////////////////////////////////
// Generic FID class
export function FID(name) {
  this.name = name;
}

FID.prototype.detectorName = function() {
  return this.name;
};

//////////////////////////////////////////////////////////////////////////////
// API TO IMPLEMENT
//

//
// @brief configure the databases of the current FID
//
FID.prototype.configureDataBases = function(dbsMap) {
  throw new Error('The FID::configureDataBases for ' + this.name + ' should be implemented!');
  //return false;
};

//
// @brief configure the arguments
//
FID.prototype.configureArgs = function(configArgs) {
  throw new Error('The FID::configureArgs for ' + this.name + ' should be implemented!');
  //return false;
};

//
// @brief evaluate the FID. This will return the associated intention value for
//        this particular fid
//
FID.prototype.evaluate = function(intentInput, extras) {
  throw new Error('The FID::evaluate for ' + this.name + ' should be implemented!');
  //return false;
};


