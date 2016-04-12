/* global System */
import config from "core/config";

export default function (window) {
	return Promise.all(
    config.modules.map( moduleName => {
      return new Promise( (resolve, reject) => {
        System.import(moduleName+"/background")
          .then( module => module.default.init(config) )
          .then( () => System.import(moduleName+"/window") )
	        .then( module => { 
	        	var mod = new module.default({ window });
            mod.init();
            resolve();
	        })
          .catch( e => { CliqzUtils.log("Error on loading module: "+moduleName+" - "+e.toString()+" -- "+e.stack, "Extension"); resolve(); })
      });
    })
  );
};