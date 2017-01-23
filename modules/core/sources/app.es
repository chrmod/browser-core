import System from 'system';
import config from './config';
import console from './console';
import { subscribe } from './events';
import prefs from './prefs';
import { Window, mapWindows, forEachWindow } from '../platform/browser';

function shouldEnableModule(name) {
  const pref = `modules.${name}.enabled`;
  return !prefs.has(pref) || prefs.get(pref) === true;
}

export default class {
  constructor() {
    this.priorityModulesLoaded = false;
    this.availableModules = config.modules.reduce((hash, moduleName) => {
      hash[moduleName] = new Module(moduleName);
      return hash;
    }, Object.create(null));
  }

  modules() {
    const notPriority = Object.keys(this.availableModules)
                          .filter((m) => config.priority.indexOf(m) === -1);
    const modules = this.priorityModulesLoaded ? notPriority : config.priority;
    return modules.map(
      moduleName => this.availableModules[moduleName]
    );
  }

  enabledModules() {
    return config.modules.map(name => this.availableModules[name]).filter(module => module.isEnabled);
  }

  setDefaultPrefs() {
    if ('default_prefs' in config) {
      Object.keys(config.default_prefs).forEach(pref => {
        if (!prefs.has(pref)) {
          console.log('App', 'set up preference', `"${pref}"`);
          prefs.set(pref, config.default_prefs[pref]);
        }
      });
    }
  }

  load() {
    console.log('App', 'Set up default parameters for new modules');
    this.setDefaultPrefs();
    console.log('App', 'Loading modules started');
    const backgroundPromises = this.modules()
      .map(module => {

        if (shouldEnableModule(module.name)) {
          try {
            return module.enable()
              .catch(e => console.error('App', 'Error on loading module:', module.name, e));
          } catch (e) {
            console.error('App module:', `"${module.name}"`, ' -- something went wrong', e);
            return Promise.resolve();
          }
        } else {
          // TODO: should not be here
          return System.import(module.name + '/background');
        }
      });

    this.prefchangeEventListener = subscribe('prefchange', this.onPrefChange, this);

    return Promise.all(backgroundPromises).then(() => {
      console.log('App', 'Loading modules -- all background loaded');
    }).catch(e => {
      console.error('App', 'Loading modules failed', e);
    });
  }

  unload({ quick } = { quick: false }) {
    this.prefchangeEventListener.unsubscribe();

    console.log('App', 'unload background modules');
    this.enabledModules().reverse().forEach(module => {
      try {
        console.log('App', 'unload background module: ', module.name);
        module.disable({ quick });
      } catch (e) {
        console.error(`Error unloading module: ${module.name}`, e);
      }
    });
    console.log('App', 'unload background modules finished');

    this.priorityModulesLoaded = false;
  }

  loadWindow(window) {
    const CLIQZ = {
      System,
      Core: {
        windowModules: {},
      }, // TODO: remove and all clients
    };

    // TODO: remove CLIQZ from window
    if(!window.CLIQZ){
      Object.defineProperty(window, 'CLIQZ', {
        configurable: true,
        value: CLIQZ,
      });
    }

    const windowModulePromises = this.enabledModules().map(module => {
      console.log('App window', 'loading module', `"${module.name}"`, 'started');
      return module.loadWindow(window)
        .catch(e => {
          console.error('App window', `Error loading module: ${module.name}`, e);
        });
    });

    return Promise.all(windowModulePromises).then(() => {
      console.log('App', 'Window loaded');
    }).then(() => {
      if (this.priorityModulesLoaded) {
        return Promise.resolve();
      }
      this.priorityModulesLoaded = true;
      return this.load().then(() => {
        return this.loadWindow(window);
      }).then(() => {
        this.isFullyLoaded = true;
      });
    });
  }

  unloadWindow(window) {
    console.log('App window', 'unload window modules');
    this.enabledModules().reverse().forEach(module => {
      try {
        module.unloadWindow(window);
      } catch (e) {
        console.error('App window', `error on unload module ${module.name}`, e);
      }
    });
    /* eslint-disable */
    delete window.CLIQZ;
    /* eslint-enable */
  }

  onPrefChange(pref) {
    if (!pref.startsWith('modules.')) {
      return;
    }

    const prefParts = pref.split('.');
    if (prefParts.pop() !== 'enabled') {
      return;
    }

    const isEnabled = prefs.get(pref);
    const moduleName = prefParts.pop();
    const module = this.availableModules[moduleName];

    if (!module) {
      // pref for non-existing module - just ignore
      return;
    }

    if (isEnabled === true && !module.isEnabled) {
      this.enableModule(module.name);
    } else if (isEnabled === false && module.isEnabled) {
      this.disableModule(module.name);
    } else {
      // prefchange tends to fire with no change - just ignore
    }
  }

  // use in runtime not startup
  enableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (module.isEnabled) {
      return Promise.resolve();
    }

    return module.enable().then(() => {
      return Promise.all(
        mapWindows(module.loadWindow.bind(module))
      ).then(() => {
        prefs.set(`modules.${moduleName}.enabled`, true);
      });
    });
  }

  // use in runtime not startup
  disableModule(moduleName) {
    const module = this.availableModules[moduleName];

    if (!module.isEnabled) {
      return Promise.resolve();
    }

    forEachWindow(module.unloadWindow.bind(module));
    module.disable();
    prefs.set(`modules.${moduleName}.enabled`, false);
  }
}

class Module {

  constructor(name) {
    this.name = name;
    this.isEnabled = false;
    this.loadingTime = null;
    this.windows = Object.create(null);
  }

  enable() {
    console.log('Module', this.name, 'start loading');
    const loadingStartedAt = Date.now();
    if (this.isEnabled) {
      throw new Error('Module already enabled');
    }
    return System.import(`${this.name}/background`)
      .then(({ default: background }) => background.init(config.settings))
      .then(() => {
        this.isEnabled = true;
        this.loadingTime = Date.now() - loadingStartedAt;
        console.log('Module: ', this.name, ' -- Background loaded');
      });
  }

  disable({ quick } = { quick: false }) {
    console.log('Module', this.name, 'start unloading');
    const background = System.get(`${this.name}/background`).default;

    if (quick) {
      // background does not need to have beforeBrowserShutdown defined
      const quickShutdown = background.beforeBrowserShutdown ||
        function beforeBrowserShutdown() {};
      quickShutdown.call(background);
    } else {
      background.unload();
      this.isEnabled = false;
      this.loadingTime = null;
    }
    console.log('Module', this.name, 'unloading finished');
  }

  /**
   * return window module
   */
  loadWindow(window) {
    console.log('Module window:', `"${this.name}"`, 'loading');

    if(window.CLIQZ.Core.windowModules[this.name]){
      return Promise.resolve();
    }

    const loadingStartedAt = Date.now();
    return System.import(`${this.name}/window`)
      .then(({ default: WindowModule }) =>
        new WindowModule({
          settings: config.settings,
          window,
        })
      )
      .then(module => {
        return Promise.resolve(module.init()).then(() => module);
      })
      .then(windowModule => {
        const win = new Window(window);
        this.windows[win.id] = {
          loadingTime: Date.now() - loadingStartedAt,
        };
        console.log('Module window:', `"${this.name}"`, 'loading finished');
        window.CLIQZ.Core.windowModules[this.name] = windowModule;
      });
  }

  unloadWindow(window) {
    const win = new Window(window);
    console.log('Module window', `"${this.name}"`, 'unloading');
    window.CLIQZ.Core.windowModules[this.name].unload();
    delete window.CLIQZ.Core.windowModules[this.name];
    delete this.windows[win.id];
    console.log('Module window', `"${this.name}"`, 'unloading finished');
  }

  status() {
    return {
      isEnabled: this.isEnabled,
    };
  }
}
