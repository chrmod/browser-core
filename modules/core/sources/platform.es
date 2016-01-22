export default {

  import(fileName, fnName) {
    let moduleName = `platform/${fileName}`;

    // Load module if it is not loaded yet
    if ( !System.get(moduleName) ) {
      System.import(moduleName);
    }

    return function () {
      let module = System.get(moduleName);
      if ( module && module[fnName] ) {
        return module[fnName].apply(null, arguments);
      } else {
        throw new Error('Not implemented');
      }
    }
  }

}
