"use strict";
/* jshint ignore:start */

/* jshint ignore:end */

define('fresh-tab/app', ['exports', 'ember', 'fresh-tab/resolver', 'ember-load-initializers', 'fresh-tab/config/environment'], function (exports, _ember, _freshTabResolver, _emberLoadInitializers, _freshTabConfigEnvironment) {

  var App = undefined;

  _ember['default'].MODEL_FACTORY_INJECTIONS = true;

  App = _ember['default'].Application.extend({
    modulePrefix: _freshTabConfigEnvironment['default'].modulePrefix,
    podModulePrefix: _freshTabConfigEnvironment['default'].podModulePrefix,
    Resolver: _freshTabResolver['default']
  });

  (0, _emberLoadInitializers['default'])(App, _freshTabConfigEnvironment['default'].modulePrefix);

  exports['default'] = App;
});
define('fresh-tab/components/app-version', ['exports', 'ember-cli-app-version/components/app-version', 'fresh-tab/config/environment'], function (exports, _emberCliAppVersionComponentsAppVersion, _freshTabConfigEnvironment) {

  var name = _freshTabConfigEnvironment['default'].APP.name;
  var version = _freshTabConfigEnvironment['default'].APP.version;

  exports['default'] = _emberCliAppVersionComponentsAppVersion['default'].extend({
    version: version,
    name: name
  });
});
define("fresh-tab/components/speed-dial", ["exports", "ember"], function (exports, _ember) {
  exports["default"] = _ember["default"].Component.extend({
    actions: {
      remove: function remove() {
        this.sendAction("removeAction", this.get('model'));
      }
    }
  });
});
define("fresh-tab/components/speed-dials", ["exports", "ember"], function (exports, _ember) {
  exports["default"] = _ember["default"].Component.extend({
    actions: {
      remove: function remove(el) {
        this.get("model").removeObject(el);
      }
    }
  });
});
define('fresh-tab/controllers/array', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Controller;
});
define('fresh-tab/controllers/object', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Controller;
});
define('fresh-tab/helpers/pluralize', ['exports', 'ember-inflector/lib/helpers/pluralize'], function (exports, _emberInflectorLibHelpersPluralize) {
  exports['default'] = _emberInflectorLibHelpersPluralize['default'];
});
define('fresh-tab/helpers/singularize', ['exports', 'ember-inflector/lib/helpers/singularize'], function (exports, _emberInflectorLibHelpersSingularize) {
  exports['default'] = _emberInflectorLibHelpersSingularize['default'];
});
define('fresh-tab/initializers/app-version', ['exports', 'ember-cli-app-version/initializer-factory', 'fresh-tab/config/environment'], function (exports, _emberCliAppVersionInitializerFactory, _freshTabConfigEnvironment) {
  exports['default'] = {
    name: 'App Version',
    initialize: (0, _emberCliAppVersionInitializerFactory['default'])(_freshTabConfigEnvironment['default'].APP.name, _freshTabConfigEnvironment['default'].APP.version)
  };
});
define('fresh-tab/initializers/container-debug-adapter', ['exports', 'ember-resolver/container-debug-adapter'], function (exports, _emberResolverContainerDebugAdapter) {
  exports['default'] = {
    name: 'container-debug-adapter',

    initialize: function initialize() {
      var app = arguments[1] || arguments[0];

      app.register('container-debug-adapter:main', _emberResolverContainerDebugAdapter['default']);
      app.inject('container-debug-adapter:main', 'namespace', 'application:main');
    }
  };
});
define('fresh-tab/initializers/data-adapter', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `data-adapter` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'data-adapter',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define('fresh-tab/initializers/ember-data', ['exports', 'ember-data/setup-container', 'ember-data/-private/core'], function (exports, _emberDataSetupContainer, _emberDataPrivateCore) {

  /*
  
    This code initializes Ember-Data onto an Ember application.
  
    If an Ember.js developer defines a subclass of DS.Store on their application,
    as `App.StoreService` (or via a module system that resolves to `service:store`)
    this code will automatically instantiate it and make it available on the
    router.
  
    Additionally, after an application's controllers have been injected, they will
    each have the store made available to them.
  
    For example, imagine an Ember.js application with the following classes:
  
    App.StoreService = DS.Store.extend({
      adapter: 'custom'
    });
  
    App.PostsController = Ember.ArrayController.extend({
      // ...
    });
  
    When the application is initialized, `App.ApplicationStore` will automatically be
    instantiated, and the instance of `App.PostsController` will have its `store`
    property set to that instance.
  
    Note that this code will only be run if the `ember-application` package is
    loaded. If Ember Data is being used in an environment other than a
    typical application (e.g., node.js where only `ember-runtime` is available),
    this code will be ignored.
  */

  exports['default'] = {
    name: 'ember-data',
    initialize: _emberDataSetupContainer['default']
  };
});
define('fresh-tab/initializers/export-application-global', ['exports', 'ember', 'fresh-tab/config/environment'], function (exports, _ember, _freshTabConfigEnvironment) {
  exports.initialize = initialize;

  function initialize() {
    var application = arguments[1] || arguments[0];
    if (_freshTabConfigEnvironment['default'].exportApplicationGlobal !== false) {
      var value = _freshTabConfigEnvironment['default'].exportApplicationGlobal;
      var globalName;

      if (typeof value === 'string') {
        globalName = value;
      } else {
        globalName = _ember['default'].String.classify(_freshTabConfigEnvironment['default'].modulePrefix);
      }

      if (!window[globalName]) {
        window[globalName] = application;

        application.reopen({
          willDestroy: function willDestroy() {
            this._super.apply(this, arguments);
            delete window[globalName];
          }
        });
      }
    }
  }

  exports['default'] = {
    name: 'export-application-global',

    initialize: initialize
  };
});
define('fresh-tab/initializers/injectStore', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `injectStore` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'injectStore',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define('fresh-tab/initializers/store', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `store` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'store',
    after: 'ember-data',
    initialize: _ember['default'].K
  };
});
define('fresh-tab/initializers/transforms', ['exports', 'ember'], function (exports, _ember) {

  /*
    This initializer is here to keep backwards compatibility with code depending
    on the `transforms` initializer (before Ember Data was an addon).
  
    Should be removed for Ember Data 3.x
  */

  exports['default'] = {
    name: 'transforms',
    before: 'store',
    initialize: _ember['default'].K
  };
});
define("fresh-tab/instance-initializers/ember-data", ["exports", "ember-data/-private/instance-initializers/initialize-store-service"], function (exports, _emberDataPrivateInstanceInitializersInitializeStoreService) {
  exports["default"] = {
    name: "ember-data",
    initialize: _emberDataPrivateInstanceInitializersInitializeStoreService["default"]
  };
});
define('fresh-tab/resolver', ['exports', 'ember-resolver'], function (exports, _emberResolver) {
  exports['default'] = _emberResolver['default'];
});
define('fresh-tab/router', ['exports', 'ember', 'fresh-tab/config/environment'], function (exports, _ember, _freshTabConfigEnvironment) {

  var Router = _ember['default'].Router.extend({
    location: _freshTabConfigEnvironment['default'].locationType
  });

  Router.map(function () {});

  exports['default'] = Router;
});
define('fresh-tab/routes/index', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Route.extend({
    cliqz: _ember['default'].inject.service('cliqz'),

    beforeModel: function beforeModel() {
      return new Promise(function (resolve) {
        $(document).ready(resolve);
      });
    },

    model: function model() {
      return {
        speedDials: this.get('cliqz').getSpeedDials(),
        news: this.get('cliqz').getNews(),
        customDials: [1, 2, 4]
      };
    }
  });
});
define('fresh-tab/services/ajax', ['exports', 'ember-ajax/services/ajax'], function (exports, _emberAjaxServicesAjax) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberAjaxServicesAjax['default'];
    }
  });
});
define('fresh-tab/services/cliqz', ['exports', 'ember', 'ember-data'], function (exports, _ember, _emberData) {
  exports['default'] = _ember['default'].Service.extend({
    init: function init() {
      var _this = this;

      this._super.apply(this, arguments);

      this.callbacks = Object.create(null);

      window.addEventListener("message", function (ev) {
        var message = {};

        try {
          message = JSON.parse(ev.data);
        } catch (e) {
          // non CLIQZ or invalid message should be ignored
        }

        if (message.type === "response") {
          console.log("RESPONSE");
          _this.callbacks[message.action].call(null, message.response);
        }
      });
    },

    getSpeedDials: function getSpeedDials() {
      var _this2 = this;

      var promise = new Promise(function (resolve) {
        _this2.callbacks.getSpeedDials = resolve;
      });

      window.postMessage(JSON.stringify({
        target: "cliqz",
        module: "freshtab",
        action: "getSpeedDials"
      }), "*");

      return _emberData['default'].PromiseArray.create({ promise: promise });
    },

    getNews: function getNews() {
      var _this3 = this;

      var promise = new Promise(function (resolve) {
        _this3.callbacks.getNews = resolve;
      });

      window.postMessage(JSON.stringify({
        target: "cliqz",
        module: "freshtab",
        action: "getNews"
      }), "*");

      return _emberData['default'].PromiseArray.create({ promise: promise });
    }
  });
});
define("fresh-tab/templates/application", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    return {
      meta: {
        "fragmentReason": {
          "name": "triple-curlies"
        },
        "revision": "Ember@2.3.0",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 5,
            "column": 6
          }
        },
        "moduleName": "fresh-tab/templates/application.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "container");
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(1);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [0]), 1, 1);
        return morphs;
      },
      statements: [["content", "outlet", ["loc", [null, [3, 2], [3, 12]]]]],
      locals: [],
      templates: []
    };
  })());
});
define("fresh-tab/templates/components/speed-dial", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    return {
      meta: {
        "fragmentReason": {
          "name": "triple-curlies"
        },
        "revision": "Ember@2.3.0",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 6,
            "column": 0
          }
        },
        "moduleName": "fresh-tab/templates/components/speed-dial.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("a");
        dom.setAttribute(el1, "title", "Facebook");
        dom.setAttribute(el1, "href", "https://www.facebook.com/");
        dom.setAttribute(el1, "data-index", "0");
        dom.setAttribute(el1, "class", "historyLink");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "style", "background-color: #5267a2;color:#fff;background-image:url(https://cdn.cliqz.com/brands-database/database/1452759183853/logos/facebook/$.svg); text-indent: -10em;");
        dom.setAttribute(el2, "class", "cliqz-brand-logo");
        var el3 = dom.createTextNode("Fa");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "title");
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("button");
        dom.setAttribute(el2, "class", "close");
        var el3 = dom.createTextNode("X");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element0 = dom.childAt(fragment, [0]);
        var element1 = dom.childAt(element0, [5]);
        var morphs = new Array(2);
        morphs[0] = dom.createMorphAt(dom.childAt(element0, [3]), 0, 0);
        morphs[1] = dom.createElementMorph(element1);
        return morphs;
      },
      statements: [["content", "model", ["loc", [null, [3, 21], [3, 30]]]], ["element", "action", ["remove"], [], ["loc", [null, [4, 24], [4, 43]]]]],
      locals: [],
      templates: []
    };
  })());
});
define("fresh-tab/templates/components/speed-dials", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "fragmentReason": {
            "name": "missing-wrapper",
            "problems": ["wrong-type"]
          },
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 1,
              "column": 0
            },
            "end": {
              "line": 3,
              "column": 0
            }
          },
          "moduleName": "fresh-tab/templates/components/speed-dials.hbs"
        },
        isEmpty: false,
        arity: 1,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createComment("");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var morphs = new Array(1);
          morphs[0] = dom.createMorphAt(fragment, 1, 1, contextualElement);
          return morphs;
        },
        statements: [["inline", "speed-dial", [], ["model", ["subexpr", "@mut", [["get", "dial", ["loc", [null, [2, 21], [2, 25]]]]], [], []], "tagName", "li", "removeAction", "remove"], ["loc", [null, [2, 2], [2, 62]]]]],
        locals: ["dial"],
        templates: []
      };
    })();
    var child1 = (function () {
      return {
        meta: {
          "fragmentReason": false,
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 3,
              "column": 0
            },
            "end": {
              "line": 5,
              "column": 0
            }
          },
          "moduleName": "fresh-tab/templates/components/speed-dials.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  Nothing to show, sorry\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes() {
          return [];
        },
        statements: [],
        locals: [],
        templates: []
      };
    })();
    return {
      meta: {
        "fragmentReason": {
          "name": "missing-wrapper",
          "problems": ["wrong-type"]
        },
        "revision": "Ember@2.3.0",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 5,
            "column": 9
          }
        },
        "moduleName": "fresh-tab/templates/components/speed-dials.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(1);
        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
        dom.insertBoundary(fragment, 0);
        dom.insertBoundary(fragment, null);
        return morphs;
      },
      statements: [["block", "each", [["get", "model", ["loc", [null, [1, 8], [1, 13]]]]], [], 0, 1, ["loc", [null, [1, 0], [5, 9]]]]],
      locals: [],
      templates: [child0, child1]
    };
  })());
});
define("fresh-tab/templates/index", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    return {
      meta: {
        "fragmentReason": {
          "name": "missing-wrapper",
          "problems": ["multiple-nodes"]
        },
        "revision": "Ember@2.3.0",
        "loc": {
          "source": null,
          "start": {
            "line": 1,
            "column": 0
          },
          "end": {
            "line": 7,
            "column": 6
          }
        },
        "moduleName": "fresh-tab/templates/index.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "topVisited");
        dom.setAttribute(el1, "class", "center");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "topVisited");
        dom.setAttribute(el1, "class", "center");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(2);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [0]), 1, 1);
        morphs[1] = dom.createMorphAt(dom.childAt(fragment, [2]), 1, 1);
        return morphs;
      },
      statements: [["inline", "speed-dials", [], ["model", ["subexpr", "@mut", [["get", "model.speedDials", ["loc", [null, [2, 22], [2, 38]]]]], [], []], "tagName", "ul"], ["loc", [null, [2, 2], [2, 53]]]], ["inline", "speed-dials", [], ["model", ["subexpr", "@mut", [["get", "model.news", ["loc", [null, [6, 22], [6, 32]]]]], [], []], "tagName", "ul"], ["loc", [null, [6, 2], [6, 47]]]]],
      locals: [],
      templates: []
    };
  })());
});
/* jshint ignore:start */

/* jshint ignore:end */

/* jshint ignore:start */

define('fresh-tab/config/environment', ['ember'], function(Ember) {
  var prefix = 'fresh-tab';
/* jshint ignore:start */

try {
  var metaName = prefix + '/config/environment';
  var rawConfig = Ember['default'].$('meta[name="' + metaName + '"]').attr('content');
  var config = JSON.parse(unescape(rawConfig));

  return { 'default': config };
}
catch(err) {
  throw new Error('Could not read config from meta tag with name "' + metaName + '".');
}

/* jshint ignore:end */

});

/* jshint ignore:end */

/* jshint ignore:start */
if (!runningTests) {
  require("fresh-tab/app")["default"].create({"name":"fresh-tab","version":"0.0.0+4f87ca6d"});
}
/* jshint ignore:end */
//# sourceMappingURL=fresh-tab.map