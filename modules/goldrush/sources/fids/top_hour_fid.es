import { utils } from 'core/cliqz';
import { FID } from 'goldrush/fids/fid';
//import Reporter from 'goldrush/reporter';
//import ResourceLoader from 'core/resource-loader';

function log(s){
  utils.log(s, 'GOLDRUSH - TopHourFID');
}

export class TopHourFID extends FID {
  constructor() {
    super('TopHourFID');
    this.datetimeDB = null;
    this.args = {};
    this.topHours = new Set();
  }

  configureDataBases(dbsMap) {
    throw new Error('The FID::configureDataBases for ' + this.name + ' should be implemented!') ;
  }

  configureArgs(configArgs) {
    throw new Error('The FID::configureArgs for ' + this.name + ' should be implemented!');
  }

  evaluate(intentInput, extras) {
    throw new Error('The FID::evaluate for ' + this.name + ' should be implemented!');
  }
}
