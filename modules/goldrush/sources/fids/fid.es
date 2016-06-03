import { utils } from 'core/cliqz';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - FID');
}

////////////////////////////////////////////////////////////////////////////////
// Generic FID class
export class FID {
  constructor(name) {
    this.name = name;
  }

  get detectorName() {
    return this.name;
  }

  configureDataBases(dbsMap) {
    throw new Error('The FID::configureDataBases for ' + this.name + ' should be implemented!');
  }

  configureArgs(configArgs) {
      throw new Error('The FID::configureArgs for ' + this.name + ' should be implemented!');
  }

  evaluate(intentInput, extras) {
     throw new Error('The FID::evaluate for ' + this.name + ' should be implemented!');
  }
}



