let app;

export class ModuleMissingError extends Error {
  constructor(moduleName) {
    super();
    this.name = 'ModuleMissingError';
    this.message = `module '${moduleName}' is missing`;
  }
}

export class ModuleDisabledError extends Error {
  constructor(moduleName) {
    super();
    this.name = 'ModuleDisabledError';
    this.message = `module '${moduleName}' is disabled`;
  }
}

class ModuleWrapper {
  constructor(moduleName) {
    this.moduleName = moduleName;
  }

  action(actionName, ...args) {
    const module = app.availableModules[this.moduleName];

    if (!module) {
      return Promise.reject(new ModuleMissingError(this.moduleName));
    }

    if (!module.isEnabled && !module.isLoading) {
      return Promise.reject(new ModuleDisabledError(this.moduleName));
    }

    return module.isReady()
      .then(() => module.background.actions[actionName](...args));
  }
}

export default {
  /**
   * Gets a module wrapper.
   * @param {string} -  moduleName Name of the module to be injected
   */
  module(moduleName) {
    return new ModuleWrapper(moduleName);
  },
};

export function setGlobal(cliqzApp) {
  app = cliqzApp;
}
