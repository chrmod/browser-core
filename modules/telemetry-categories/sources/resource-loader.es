import { readFile, writeFile, mkdir } from 'core/fs';
import { utils } from 'core/cliqz';

export default class {

  constructor( resourceName, options = {} ) {
    if ( typeof resourceName === 'string' ) {
      resourceName  = [ resourceName ];
    }
    this.resourceName = resourceName;
    this.dataType = options.dataType || 'json';
    this.filePath = [ 'cliqz', ...this.resourceName ];
  }

  load() {
    return readFile( this.filePath ).then( data => {
      return ( new TextDecoder() ).decode( data );
    }).catch( e => {
      return new Promise( (resolve, reject) => {
        let url = utils.System.baseURL + this.resourceName.join('/');
        utils.httpGet( url , res => {
          const data = res.response;
          this.persist(data).then( () => resolve(data) );
        }, reject );
      });
    }).then( data => {
      return JSON.parse(data);
    });
  }

  onUpdate( callback ) {

  }

  stop() {

  }

  persist( data ) {
    let dirPath = this.filePath.slice( 0, -1 );
    return makeDirRecursive( dirPath ).then( () => {
      return writeFile( this.filePath , ( new TextEncoder() ).encode(data) );
    })
  }
}

function makeDirRecursive(path, from = []) {
  let [ first, ...rest ] = path;

  if ( !first ) {
    return Promise.resolve();
  }

  return mkdir( from.concat( first ) ).then( () => {
    return makeDirRecursive( rest, from.concat( first ) );
  });
}
