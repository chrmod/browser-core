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
define('fresh-tab/components/article-item', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Component.extend({
    isUnderlined: _ember['default'].computed.alias('model.underline'),
    classNameBindings: ['isUnderlined:underline'],
    startEnter: 0,
    elapsed: 0,
    cliqz: _ember['default'].inject.service(),

    click: function click(ev) {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: this.get('target-type'),
        extra: _ember['default'].$(ev.target).attr('extra'),
        target_index: this.get('index')
      });
    },

    mouseEnter: function mouseEnter(ev) {
      this.set('startEnter', new Date().getTime());
    },

    mouseLeave: function mouseLeave(ev) {
      this.set('elapsed', new Date().getTime() - this.get('startEnter'));
      if (this.get('elapsed') > 2000) {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'hover',
          target_type: this.get('target-type'),
          extra: _ember['default'].$(ev.target).attr('extra'),
          hover_time: this.get('elapsed'),
          target_index: this.get('index')
        });
      }
    }
  });
});
define('fresh-tab/components/article-items', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Component.extend({
    pageNum: 0,

    isOnePage: _ember['default'].computed.equal("pages.length", 1),

    page: _ember['default'].computed('pages.[]', 'pageNum', function () {
      return this.get('pages')[this.get("pageNum")];
    }),

    pages: _ember['default'].computed('model.[]', 'pageSize', function () {
      var pageSize = this.get('pageSize');
      var model = this.get("model").toArray();

      var ret = [];

      while (model.length > 0) {
        ret.push(model.splice(0, pageSize));
      }
      return ret;
    }),

    nextPage: function nextPage() {
      var pageNum = this.get("pageNum");
      if (pageNum + 1 === this.get("pages.length")) {
        this.set('pageNum', 0);
      } else {
        this.set('pageNum', this.get('pageNum') + 1);
      }
    },

    autoRotate: (function () {
      var _this = this;

      if (this.get("pageSize") === this.get("model.length")) {
        return;
      }
      _ember['default'].run.cancel(this.get("timer"));
      this.set('timer', _ember['default'].run.later(function () {
        _this.nextPage();
        _this.autoRotate();
      }, 15000));
    }).on('didInsertElement'),

    /*autoRotate: function () {
      Ember.run.later( () => {
        this.nextPage();
        this.autoRotate();
      }, 2000)
    }.on('didInsertElement'),*/

    actions: {
      next: function next() {
        this.nextPage();
      },

      setPage: function setPage(num) {
        this.set("pageNum", num);
        this.autoRotate();
      }
    }

  });
});
define('fresh-tab/components/speed-dial', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Component.extend({
    cliqz: _ember['default'].inject.service(),

    click: function click() {
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'click',
        target_type: 'topsites',
        target_index: this.get('index')
      });
    },
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
define('fresh-tab/components/url-bar', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Component.extend({
    cliqz: _ember['default'].inject.service(),
    keyDown: function keyDown(ev) {
      var _this = this;

      this.get('cliqz').getUrlbar(ev.key);
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'search_keystroke'
      });
      _ember['default'].run.later(function () {
        _this.$('input').val("");
      });
    },
    actions: {
      focus: function focus() {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'search_focus'
        });
      },
      blur: function blur() {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'search_blur'
        });
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
define('fresh-tab/helpers/equal', ['exports', 'ember'], function (exports, _ember) {
  exports.times = times;

  function times(params /*, hash*/) {
    return params[0] === params[1];
  }

  exports['default'] = _ember['default'].Helper.helper(times);
});
define('fresh-tab/helpers/pluralize', ['exports', 'ember-inflector/lib/helpers/pluralize'], function (exports, _emberInflectorLibHelpersPluralize) {
  exports['default'] = _emberInflectorLibHelpersPluralize['default'];
});
define('fresh-tab/helpers/singularize', ['exports', 'ember-inflector/lib/helpers/singularize'], function (exports, _emberInflectorLibHelpersSingularize) {
  exports['default'] = _emberInflectorLibHelpersSingularize['default'];
});
define('fresh-tab/helpers/t', ['exports', 'ember-i18n/helper'], function (exports, _emberI18nHelper) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberI18nHelper['default'];
    }
  });
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
define("fresh-tab/initializers/ember-i18n", ["exports", "fresh-tab/instance-initializers/ember-i18n"], function (exports, _freshTabInstanceInitializersEmberI18n) {
  exports["default"] = {
    name: _freshTabInstanceInitializersEmberI18n["default"].name,

    initialize: function initialize() {
      var application = arguments[1] || arguments[0]; // depending on Ember version
      if (application.instanceInitializer) {
        return;
      }

      _freshTabInstanceInitializersEmberI18n["default"].initialize(application);
    }
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
define("fresh-tab/instance-initializers/ember-i18n", ["exports", "ember", "ember-i18n/stream", "ember-i18n/legacy-helper", "fresh-tab/config/environment"], function (exports, _ember, _emberI18nStream, _emberI18nLegacyHelper, _freshTabConfigEnvironment) {
  exports["default"] = {
    name: 'ember-i18n',

    initialize: function initialize(appOrAppInstance) {
      if (_emberI18nLegacyHelper["default"] != null) {
        (function () {
          // Used for Ember < 1.13
          var i18n = appOrAppInstance.container.lookup('service:i18n');

          i18n.localeStream = new _emberI18nStream["default"](function () {
            return i18n.get('locale');
          });

          _ember["default"].addObserver(i18n, 'locale', i18n, function () {
            this.localeStream.value(); // force the stream to be dirty
            this.localeStream.notify();
          });

          _ember["default"].HTMLBars._registerHelper('t', _emberI18nLegacyHelper["default"]);
        })();
      }
    }
  };
});
define("fresh-tab/locales/de/translations", ["exports"], function (exports) {
  exports["default"] = {
    // "some.translation.key": "Text for some.translation.key",
    //
    // "a": {
    //   "nested": {
    //     "key": "Text for a.nested.key"
    //   }
    // },
    //
    // "key.with.interpolation": "Text with {{anInterpolation}}"
    onboarding: {
      "title": "Juhuuu! CLIQZ wurde erfolgreich installiert.",
      "search-simple": "Suchen direkt im Browser. Einfach in die Browser-Zeile tippen und schon siehst du",
      "suggestions": "Website-Vorschläge.",
      "privacy": "Mehr Privatsphäre.",
      "surf-safe": "Für CLIQZ bist du anonym – auf unseren Servern werden keinerlei Daten über dich gespeichert.",
      "start-fresh": "Startseite: Wenn du den Browser oder einen neuen Tab öffnest, siehst du deine Lieblingsseiten und Nachrichten.",
      "cool-thanks": "OK, verstanden!",
      "learn-more": "Mehr über CLIQZ erfahren",
      "or": "oder",
      "full-tour": "Demo ansehen"
    },
    miniOnboarding: {
      "learn-more": "Mehr erfahren",
      "back_to_old": "Zurück zu alter Startseite"
    }
  };
});
define("fresh-tab/locales/en/config", ["exports"], function (exports) {
  // Ember-I18n includes configuration for common locales. Most users
  // can safely delete this file. Use it if you need to override behavior
  // for a locale or define behavior for a locale that Ember-I18n
  // doesn't know about.
  exports["default"] = {
    // rtl: [true|FALSE],
    //
    // pluralForm: function(count) {
    //   if (count === 0) { return 'zero'; }
    //   if (count === 1) { return 'one'; }
    //   if (count === 2) { return 'two'; }
    //   if (count < 5) { return 'few'; }
    //   if (count >= 5) { return 'many'; }
    //   return 'other';
    // }
  };
});
define("fresh-tab/locales/en/translations", ["exports"], function (exports) {
  exports["default"] = {
    // "some.translation.key": "Text for some.translation.key",
    //
    // "a": {
    //   "nested": {
    //     "key": "Text for a.nested.key"
    //   }
    // },
    //
    // "key.with.interpolation": "Text with {{anInterpolation}}"
    onboarding: {
      "title": "Woohoo! CLIQZ has been successfully installed.",
      "search-simple": "Search effortlessly. Simply start typing in the address bar and instantly get",
      "suggestions": "website suggestions.",
      "privacy": "Protect your privacy.",
      "surf-safe": "We don’t collect any data about you on our servers.",
      "start-fresh": "Start fresh. We populate your homescreen with your favorite sites - plus news we think will interest you.",
      "cool-thanks": "Cool, thanks!",
      "learn-more": "Learn more about CLIQZ",
      "or": "or",
      "full-tour": "take the full tour"
    },
    miniOnboarding: {
      "learn-more": "Learn more",
      "back_to_old": "Go back to old start page"
    }
  };
});
define("fresh-tab/models/news", ["exports", "ember"], function (exports, _ember) {
  exports["default"] = _ember["default"].Object.extend({
    version: _ember["default"].computed.alias("model.version"),
    topNews: _ember["default"].computed.filterBy("model.news", "personalized", false),
    yourNews: _ember["default"].computed.filterBy("model.news", "personalized", true)
  });
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
define('fresh-tab/routes/application', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = _ember['default'].Route.extend({
    cliqz: _ember['default'].inject.service(),
    i18n: _ember['default'].inject.service(),

    beforeModel: function beforeModel() {
      var _this = this;

      return this.get('cliqz').getConfig().then(function (config) {
        _this.set('config', config);
        _this.set('i18n.locale', config.locale);
      });
    },

    model: function model() {
      var config = this.get('config');
      return _ember['default'].Object.create({
        miniOnboarding: config.miniOnboarding
      });
    },

    afterModel: function afterModel() {
      var config = this.get('config');

      if (config.showOnboarding) {
        _ember['default'].run.later(this.send.bind(this, 'openModal', 'onboarding'), 1000);
      }
    },

    actions: {

      openLink: function openLink(url, telemetry) {
        this.get('cliqz').sendTelemetry({
          "type": "onboarding",
          "product": "cliqz",
          "action": "click",
          "action_target": telemetry,
          "version": 1.0
        });
        window.open(url, '_blank');
      },

      openModal: function openModal(modalName) {
        if (modalName === "onboarding") {
          //this.get('cliqz').setCliqzOnboarding();
          this.get('cliqz').sendTelemetry({
            type: "onboarding",
            product: "cliqz",
            action: "show",
            version: "1.0"
          });
        }

        return this.render(modalName, {
          into: "application",
          outlet: "modal"
        });
      },

      closeModal: function closeModal() {
        this.get('cliqz').sendTelemetry({
          type: "onboarding",
          product: "cliqz",
          action: "click",
          action_target: "confirm",
          version: "1.0"
        });

        return this.disconnectOutlet({
          outlet: "modal",
          parentView: "application"
        });
      },

      fullTour: function fullTour() {
        this.get('cliqz').takeFullTour();
      },

      freshTabLearnMore: function freshTabLearnMore(url) {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'click',
          target_type: 'onboarding_more'
        });
        window.open(url, '_blank');
      },

      revertBack: function revertBack() {
        this.get('cliqz').sendTelemetry({
          type: 'home',
          action: 'click',
          target_type: 'onboarding_revert'
        });

        this.get('cliqz').revertBack();

        try {
          window.location = 'about:home';
        } catch (e) {
          window.location = 'about:blank';
        }
      }
    }
  });
});
define("fresh-tab/routes/index", ["exports", "ember", "fresh-tab/models/news"], function (exports, _ember, _freshTabModelsNews) {
  exports["default"] = _ember["default"].Route.extend({
    cliqz: _ember["default"].inject.service('cliqz'),

    model: function model() {
      return _ember["default"].RSVP.hash({
        speedDials: this.get('cliqz').getSpeedDials(),
        news: this.get('cliqz').getNews(),
        customDials: [1, 2, 4]
      }).then(function (model) {
        model.news = _freshTabModelsNews["default"].create({ model: model.news });
        return model;
      });
    },

    afterModel: function afterModel(model) {
      var yourNews = model.news.get('yourNews'),
          topNews = model.news.get('topNews');
      //console.log(model.news, "telemetry")
      //console.log("!!!!", model)
      this.get('cliqz').sendTelemetry({
        type: 'home',
        action: 'display',
        topsites: model.speedDials && model.speedDials.length || 0,
        topnews: topNews && topNews.length || 0,
        topnews_version: model.news.get("version"),
        yournews: yourNews && yourNews.length || 0
      });
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
        console.log("message", ev.data);
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

    getConfig: function getConfig() {
      var _this2 = this;

      console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
      var promise = new Promise(function (resolve) {
        _this2.callbacks.getConfig = resolve;
      });

      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'freshtab',
        action: 'getConfig'
      }), '*');

      return _emberData['default'].PromiseObject.create({ promise: promise });
    },

    takeFullTour: function takeFullTour() {
      this.callbacks.takeFullTour = function () {};
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'freshtab',
        action: 'takeFullTour'
      }), '*');
    },

    getUrlbar: function getUrlbar(value) {
      this.callbacks.getUrlbar = function () {};
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'core',
        action: 'getUrlbar',
        args: [value]
      }), '*');
    },

    revertBack: function revertBack() {
      this.callbacks.revertBack = function () {};
      window.postMessage(JSON.stringify({
        target: 'cliqz',
        module: 'freshtab',
        action: 'revertBack'
      }), '*');
    },

    sendTelemetry: function sendTelemetry(msg) {
      this.callbacks.sendTelemetry = function () {};
      window.postMessage(JSON.stringify({
        target: "cliqz",
        module: "core",
        action: "sendTelemetry",
        args: [msg]
      }), "*");
    },

    getSpeedDials: function getSpeedDials() {
      var _this3 = this;

      var promise = new Promise(function (resolve) {
        _this3.callbacks.getSpeedDials = resolve;
      });

      window.postMessage(JSON.stringify({
        target: "cliqz",
        module: "freshtab",
        action: "getSpeedDials"
      }), "*");

      return _emberData['default'].PromiseArray.create({ promise: promise });
    },

    getNews: function getNews() {
      var _this4 = this;

      var promise = new Promise(function (resolve) {
        _this4.callbacks.getNews = resolve;
      });

      window.postMessage(JSON.stringify({
        target: "cliqz",
        module: "freshtab",
        action: "getNews"
      }), "*");

      return _emberData['default'].PromiseObject.create({ promise: promise });
    }
  });
});
define('fresh-tab/services/i18n', ['exports', 'ember-i18n/services/i18n'], function (exports, _emberI18nServicesI18n) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberI18nServicesI18n['default'];
    }
  });
});
define("fresh-tab/templates/application", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "fragmentReason": false,
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 13,
              "column": 2
            },
            "end": {
              "line": 22,
              "column": 2
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
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "id", "firstTimeOnboarding");
          var el2 = dom.createTextNode("\n      ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("div");
          dom.setAttribute(el2, "class", "options");
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("a");
          dom.setAttribute(el3, "key", "freshtab_learn_more");
          dom.setAttribute(el3, "class", "moreBtn");
          dom.setAttribute(el3, "href", "https://cliqz.com/aboutus/blog/new-startpage");
          var el4 = dom.createTextNode("\n          ");
          dom.appendChild(el3, el4);
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          var el4 = dom.createTextNode("\n        ");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n        ");
          dom.appendChild(el2, el3);
          var el3 = dom.createElement("a");
          dom.setAttribute(el3, "key", "freshtab_back_to_old");
          dom.setAttribute(el3, "class", "revertBtn");
          dom.setAttribute(el3, "href", "#");
          var el4 = dom.createComment("");
          dom.appendChild(el3, el4);
          dom.appendChild(el2, el3);
          var el3 = dom.createTextNode("\n      ");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element0 = dom.childAt(fragment, [1, 1]);
          var element1 = dom.childAt(element0, [1]);
          var element2 = dom.childAt(element0, [3]);
          var morphs = new Array(4);
          morphs[0] = dom.createElementMorph(element1);
          morphs[1] = dom.createMorphAt(element1, 1, 1);
          morphs[2] = dom.createElementMorph(element2);
          morphs[3] = dom.createMorphAt(element2, 0, 0);
          return morphs;
        },
        statements: [["element", "action", ["freshTabLearnMore", "https://cliqz.com/aboutus/blog/new-startpage"], ["on", "click"], ["loc", [null, [16, 37], [16, 125]]]], ["inline", "t", ["miniOnboarding.learn-more"], [], ["loc", [null, [17, 10], [17, 43]]]], ["element", "action", ["revertBack"], ["on", "click"], ["loc", [null, [19, 38], [19, 72]]]], ["inline", "t", ["miniOnboarding.back_to_old"], [], ["loc", [null, [19, 100], [19, 134]]]]],
        locals: [],
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
              "line": 22,
              "column": 2
            },
            "end": {
              "line": 26,
              "column": 2
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
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "id", "learnMore");
          var el2 = dom.createTextNode("\n      ");
          dom.appendChild(el1, el2);
          var el2 = dom.createElement("a");
          dom.setAttribute(el2, "href", "https://cliqz.com/aboutus/blog/new-startpage");
          dom.setAttribute(el2, "title", "Learn more");
          dom.setAttribute(el2, "target", "_blank");
          dom.setAttribute(el2, "class", "learnBtn");
          var el3 = dom.createTextNode("Learn more");
          dom.appendChild(el2, el3);
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
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
            "line": 27,
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
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "cliqzOnboarding");
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
        dom.setAttribute(el1, "id", "onboarding");
        var el2 = dom.createTextNode("\n\n\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(3);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [0]), 1, 1);
        morphs[1] = dom.createMorphAt(dom.childAt(fragment, [2]), 1, 1);
        morphs[2] = dom.createMorphAt(dom.childAt(fragment, [4]), 1, 1);
        return morphs;
      },
      statements: [["content", "outlet", ["loc", [null, [3, 2], [3, 12]]]], ["inline", "outlet", ["modal"], [], ["loc", [null, [7, 2], [7, 20]]]], ["block", "if", [["get", "model.miniOnboarding", ["loc", [null, [13, 8], [13, 28]]]]], [], 0, 1, ["loc", [null, [13, 2], [26, 9]]]]],
      locals: [],
      templates: [child0, child1]
    };
  })());
});
define("fresh-tab/templates/components/all-news", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
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
          "moduleName": "fresh-tab/templates/components/all-news.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "class", "newsBox onlyTopNews");
          dom.setAttribute(el1, "id", "topNewsBox");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var morphs = new Array(1);
          morphs[0] = dom.createMorphAt(dom.childAt(fragment, [1]), 1, 1);
          return morphs;
        },
        statements: [["inline", "article-items", [], ["title", "Top News", "model", ["subexpr", "@mut", [["get", "model.topNews", ["loc", [null, [3, 43], [3, 56]]]]], [], []], "tagName", "ul", "target-type", "topnews", "showLogo", false, "pageSize", 3], ["loc", [null, [3, 4], [3, 119]]]]],
        locals: [],
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
              "line": 6,
              "column": 0
            },
            "end": {
              "line": 13,
              "column": 0
            }
          },
          "moduleName": "fresh-tab/templates/components/all-news.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "class", "newsBox");
          dom.setAttribute(el1, "id", "topNewsBox");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n  ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "class", "newsBox");
          dom.setAttribute(el1, "id", "yourNewsBox");
          var el2 = dom.createTextNode("\n    ");
          dom.appendChild(el1, el2);
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          var el2 = dom.createTextNode("\n  ");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var morphs = new Array(2);
          morphs[0] = dom.createMorphAt(dom.childAt(fragment, [1]), 1, 1);
          morphs[1] = dom.createMorphAt(dom.childAt(fragment, [3]), 1, 1);
          return morphs;
        },
        statements: [["inline", "article-items", [], ["title", "Top News", "model", ["subexpr", "@mut", [["get", "model.topNews", ["loc", [null, [8, 43], [8, 56]]]]], [], []], "pageSize", 3, "tagName", "ul", "target-type", "topnews", "showLogo", true], ["loc", [null, [8, 4], [8, 118]]]], ["inline", "article-items", [], ["title", "Your news", "model", ["subexpr", "@mut", [["get", "model.yourNews", ["loc", [null, [11, 44], [11, 58]]]]], [], []], "tagName", "ul", "target-type", "yournews", "showLogo", true, "pageSize", ["subexpr", "@mut", [["get", "model.yourNews.length", ["loc", [null, [11, 118], [11, 139]]]]], [], []]], ["loc", [null, [11, 4], [11, 141]]]]],
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
            "line": 16,
            "column": 0
          }
        },
        "moduleName": "fresh-tab/templates/components/all-news.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createComment("");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var morphs = new Array(1);
        morphs[0] = dom.createMorphAt(fragment, 0, 0, contextualElement);
        dom.insertBoundary(fragment, 0);
        return morphs;
      },
      statements: [["block", "unless", [["get", "model.yourNews", ["loc", [null, [1, 10], [1, 24]]]]], [], 0, 1, ["loc", [null, [1, 0], [13, 11]]]]],
      locals: [],
      templates: [child0, child1]
    };
  })());
});
define("fresh-tab/templates/components/article-item", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      return {
        meta: {
          "fragmentReason": false,
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 2,
              "column": 2
            },
            "end": {
              "line": 4,
              "column": 2
            }
          },
          "moduleName": "fresh-tab/templates/components/article-item.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "extra", "logo");
          dom.setAttribute(el1, "class", "logo");
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var element0 = dom.childAt(fragment, [1]);
          var morphs = new Array(1);
          morphs[0] = dom.createAttrMorph(element0, 'style');
          return morphs;
        },
        statements: [["attribute", "style", ["concat", [["get", "model.logo.style", ["loc", [null, [3, 44], [3, 60]]]]]]]],
        locals: [],
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
              "line": 6,
              "column": 4
            },
            "end": {
              "line": 8,
              "column": 4
            }
          },
          "moduleName": "fresh-tab/templates/components/article-item.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "extra", "title");
          dom.setAttribute(el1, "class", "title underline");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var morphs = new Array(1);
          morphs[0] = dom.createMorphAt(dom.childAt(fragment, [1]), 0, 0);
          return morphs;
        },
        statements: [["content", "model.title", ["loc", [null, [7, 49], [7, 64]]]]],
        locals: [],
        templates: []
      };
    })();
    var child2 = (function () {
      return {
        meta: {
          "fragmentReason": false,
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 8,
              "column": 4
            },
            "end": {
              "line": 10,
              "column": 4
            }
          },
          "moduleName": "fresh-tab/templates/components/article-item.hbs"
        },
        isEmpty: false,
        arity: 0,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("      ");
          dom.appendChild(el0, el1);
          var el1 = dom.createElement("div");
          dom.setAttribute(el1, "extra", "title");
          dom.setAttribute(el1, "class", "title");
          var el2 = dom.createComment("");
          dom.appendChild(el1, el2);
          dom.appendChild(el0, el1);
          var el1 = dom.createTextNode("\n");
          dom.appendChild(el0, el1);
          return el0;
        },
        buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
          var morphs = new Array(1);
          morphs[0] = dom.createMorphAt(dom.childAt(fragment, [1]), 0, 0);
          return morphs;
        },
        statements: [["content", "model.title", ["loc", [null, [9, 39], [9, 54]]]]],
        locals: [],
        templates: []
      };
    })();
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
            "line": 13,
            "column": 4
          }
        },
        "moduleName": "fresh-tab/templates/components/article-item.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("a");
        dom.setAttribute(el1, "class", "topnews news");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "newsContent");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "extra", "url");
        dom.setAttribute(el3, "class", "url");
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element1 = dom.childAt(fragment, [0]);
        var element2 = dom.childAt(element1, [3]);
        var morphs = new Array(5);
        morphs[0] = dom.createAttrMorph(element1, 'href');
        morphs[1] = dom.createAttrMorph(element1, 'data-index');
        morphs[2] = dom.createMorphAt(element1, 1, 1);
        morphs[3] = dom.createMorphAt(element2, 1, 1);
        morphs[4] = dom.createMorphAt(dom.childAt(element2, [3]), 0, 0);
        return morphs;
      },
      statements: [["attribute", "href", ["concat", [["get", "model.url", ["loc", [null, [1, 11], [1, 20]]]]]]], ["attribute", "data-index", ["concat", [["get", "index", ["loc", [null, [1, 59], [1, 64]]]]]]], ["block", "if", [["get", "showLogo", ["loc", [null, [2, 8], [2, 16]]]]], [], 0, null, ["loc", [null, [2, 2], [4, 9]]]], ["block", "if", [["get", "underline", ["loc", [null, [6, 10], [6, 19]]]]], [], 1, 2, ["loc", [null, [6, 4], [10, 11]]]], ["content", "model.displayUrl", ["loc", [null, [11, 33], [11, 53]]]]],
      locals: [],
      templates: [child0, child1, child2]
    };
  })());
});
define("fresh-tab/templates/components/article-items", ["exports"], function (exports) {
  exports["default"] = Ember.HTMLBars.template((function () {
    var child0 = (function () {
      var child0 = (function () {
        return {
          meta: {
            "fragmentReason": false,
            "revision": "Ember@2.3.0",
            "loc": {
              "source": null,
              "start": {
                "line": 5,
                "column": 6
              },
              "end": {
                "line": 7,
                "column": 6
              }
            },
            "moduleName": "fresh-tab/templates/components/article-items.hbs"
          },
          isEmpty: false,
          arity: 2,
          cachedFragment: null,
          hasRendered: false,
          buildFragment: function buildFragment(dom) {
            var el0 = dom.createDocumentFragment();
            var el1 = dom.createTextNode("        ");
            dom.appendChild(el0, el1);
            var el1 = dom.createElement("div");
            var el2 = dom.createElement("a");
            dom.setAttribute(el2, "href", "#");
            var el3 = dom.createComment("");
            dom.appendChild(el2, el3);
            dom.appendChild(el1, el2);
            dom.appendChild(el0, el1);
            var el1 = dom.createTextNode("\n");
            dom.appendChild(el0, el1);
            return el0;
          },
          buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
            var element0 = dom.childAt(fragment, [1]);
            var element1 = dom.childAt(element0, [0]);
            var morphs = new Array(3);
            morphs[0] = dom.createAttrMorph(element0, 'class');
            morphs[1] = dom.createElementMorph(element1);
            morphs[2] = dom.createMorphAt(element1, 0, 0);
            return morphs;
          },
          statements: [["attribute", "class", ["concat", [["subexpr", "if", [["subexpr", "equal", [["get", "index", ["loc", [null, [6, 32], [6, 37]]]], ["get", "pageNum", ["loc", [null, [6, 38], [6, 45]]]]], [], ["loc", [null, [6, 25], [6, 46]]]], "active"], [], ["loc", [null, [6, 20], [6, 57]]]]]]], ["element", "action", ["setPage", ["get", "index", ["loc", [null, [6, 90], [6, 95]]]]], [], ["loc", [null, [6, 71], [6, 97]]]], ["content", "index", ["loc", [null, [6, 98], [6, 107]]]]],
          locals: ["page", "index"],
          templates: []
        };
      })();
      return {
        meta: {
          "fragmentReason": false,
          "revision": "Ember@2.3.0",
          "loc": {
            "source": null,
            "start": {
              "line": 4,
              "column": 4
            },
            "end": {
              "line": 8,
              "column": 4
            }
          },
          "moduleName": "fresh-tab/templates/components/article-items.hbs"
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
        statements: [["block", "each", [["get", "pages", ["loc", [null, [5, 14], [5, 19]]]]], [], 0, null, ["loc", [null, [5, 6], [7, 15]]]]],
        locals: [],
        templates: [child0]
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
              "line": 12,
              "column": 2
            },
            "end": {
              "line": 14,
              "column": 2
            }
          },
          "moduleName": "fresh-tab/templates/components/article-items.hbs"
        },
        isEmpty: false,
        arity: 2,
        cachedFragment: null,
        hasRendered: false,
        buildFragment: function buildFragment(dom) {
          var el0 = dom.createDocumentFragment();
          var el1 = dom.createTextNode("    ");
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
        statements: [["inline", "article-item", [], ["model", ["subexpr", "@mut", [["get", "article", ["loc", [null, [13, 25], [13, 32]]]]], [], []], "target-type", ["subexpr", "@mut", [["get", "target-type", ["loc", [null, [13, 45], [13, 56]]]]], [], []], "index", ["subexpr", "@mut", [["get", "index", ["loc", [null, [13, 63], [13, 68]]]]], [], []], "class", "clearfix", "tagName", "li", "showLogo", ["subexpr", "@mut", [["get", "showLogo", ["loc", [null, [13, 108], [13, 116]]]]], [], []]], ["loc", [null, [13, 4], [13, 118]]]]],
        locals: ["article", "index"],
        templates: []
      };
    })();
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
            "line": 16,
            "column": 0
          }
        },
        "moduleName": "fresh-tab/templates/components/article-items.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "heading clearfix");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("h2");
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "id", "sliderBtns");
        var el3 = dom.createTextNode("\n");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "class", "content");
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        var el2 = dom.createComment("");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element2 = dom.childAt(fragment, [0]);
        var morphs = new Array(3);
        morphs[0] = dom.createMorphAt(dom.childAt(element2, [1]), 0, 0);
        morphs[1] = dom.createMorphAt(dom.childAt(element2, [3]), 1, 1);
        morphs[2] = dom.createMorphAt(dom.childAt(fragment, [2]), 1, 1);
        return morphs;
      },
      statements: [["content", "title", ["loc", [null, [2, 6], [2, 15]]]], ["block", "unless", [["get", "isOnePage", ["loc", [null, [4, 14], [4, 23]]]]], [], 0, null, ["loc", [null, [4, 4], [8, 15]]]], ["block", "each", [["get", "page", ["loc", [null, [12, 10], [12, 14]]]]], [], 1, null, ["loc", [null, [12, 2], [14, 11]]]]],
      locals: [],
      templates: [child0, child1]
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
        dom.setAttribute(el1, "class", "historyLink");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "cliqz-brand-logo");
        var el3 = dom.createComment("");
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
        var element1 = dom.childAt(element0, [1]);
        var element2 = dom.childAt(element0, [5]);
        var morphs = new Array(7);
        morphs[0] = dom.createAttrMorph(element0, 'data-index');
        morphs[1] = dom.createAttrMorph(element0, 'href');
        morphs[2] = dom.createAttrMorph(element0, 'title');
        morphs[3] = dom.createAttrMorph(element1, 'style');
        morphs[4] = dom.createMorphAt(element1, 0, 0);
        morphs[5] = dom.createMorphAt(dom.childAt(element0, [3]), 0, 0);
        morphs[6] = dom.createElementMorph(element2);
        return morphs;
      },
      statements: [["attribute", "data-index", ["concat", [["get", "index", ["loc", [null, [1, 37], [1, 42]]]]]]], ["attribute", "href", ["concat", [["get", "model.url", ["loc", [null, [1, 54], [1, 63]]]]]]], ["attribute", "title", ["concat", [["get", "model.title", ["loc", [null, [1, 76], [1, 87]]]]]]], ["attribute", "style", ["concat", [["get", "model.logo.style", ["loc", [null, [2, 41], [2, 57]]]]]]], ["content", "model.logo.text", ["loc", [null, [2, 61], [2, 80]]]], ["content", "model.displayTitle", ["loc", [null, [3, 21], [3, 43]]]], ["element", "action", ["remove"], [], ["loc", [null, [4, 24], [4, 43]]]]],
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
        arity: 2,
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
        statements: [["inline", "speed-dial", [], ["model", ["subexpr", "@mut", [["get", "dial", ["loc", [null, [2, 21], [2, 25]]]]], [], []], "index", ["subexpr", "@mut", [["get", "index", ["loc", [null, [2, 32], [2, 37]]]]], [], []], "tagName", "li", "removeAction", "remove"], ["loc", [null, [2, 2], [2, 74]]]]],
        locals: ["dial", "index"],
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
            "line": 3,
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
      statements: [["block", "each", [["get", "model", ["loc", [null, [1, 8], [1, 13]]]]], [], 0, null, ["loc", [null, [1, 0], [3, 9]]]]],
      locals: [],
      templates: [child0]
    };
  })());
});
define("fresh-tab/templates/components/url-bar", ["exports"], function (exports) {
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
            "column": 31
          }
        },
        "moduleName": "fresh-tab/templates/components/url-bar.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "search-icon");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("input");
        dom.setAttribute(el1, "id", "urlbar");
        dom.setAttribute(el1, "placeholder", "Search or enter address");
        dom.setAttribute(el1, "autocomplete", "off");
        dom.setAttribute(el1, "tm-click", "search-bar");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element0 = dom.childAt(fragment, [2]);
        var morphs = new Array(2);
        morphs[0] = dom.createElementMorph(element0);
        morphs[1] = dom.createElementMorph(element0);
        return morphs;
      },
      statements: [["element", "action", ["focus"], ["on", "focusIn"], ["loc", [null, [2, 7], [2, 38]]]], ["element", "action", ["blur"], ["on", "focusOut"], ["loc", [null, [3, 7], [3, 38]]]]],
      locals: [],
      templates: []
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
            "line": 18,
            "column": 0
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
        dom.setAttribute(el1, "class", "wrap");
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "id", "searchContainer");
        dom.setAttribute(el2, "class", "center");
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "id", "newsContainer");
        dom.setAttribute(el2, "class", "clearfix");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createComment("");
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("br");
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        var el1 = dom.createElement("button");
        var el2 = dom.createTextNode("test onboarding");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        var el1 = dom.createTextNode("\n");
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element0 = dom.childAt(fragment, [2]);
        var element1 = dom.childAt(fragment, [8]);
        var morphs = new Array(4);
        morphs[0] = dom.createMorphAt(dom.childAt(fragment, [0]), 1, 1);
        morphs[1] = dom.createMorphAt(dom.childAt(element0, [1]), 1, 1);
        morphs[2] = dom.createMorphAt(dom.childAt(element0, [3]), 1, 1);
        morphs[3] = dom.createElementMorph(element1);
        return morphs;
      },
      statements: [["inline", "speed-dials", [], ["model", ["subexpr", "@mut", [["get", "model.speedDials", ["loc", [null, [2, 22], [2, 38]]]]], [], []], "tagName", "ul"], ["loc", [null, [2, 2], [2, 53]]]], ["content", "url-bar", ["loc", [null, [8, 2], [8, 13]]]], ["inline", "all-news", [], ["model", ["subexpr", "@mut", [["get", "model.news", ["loc", [null, [12, 21], [12, 31]]]]], [], []]], ["loc", [null, [12, 4], [12, 33]]]], ["element", "action", ["openModal", "onboarding"], [], ["loc", [null, [17, 8], [17, 43]]]]],
      locals: [],
      templates: []
    };
  })());
});
define("fresh-tab/templates/mini-onboarding", ["exports"], function (exports) {
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
            "column": 6
          }
        },
        "moduleName": "fresh-tab/templates/mini-onboarding.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "firstTimeOnboarding");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "options");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3, "key", "freshtab_learn_more");
        dom.setAttribute(el3, "class", "moreBtn");
        dom.setAttribute(el3, "href", "https://cliqz.com/aboutus/blog/new-startpage");
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("a");
        dom.setAttribute(el3, "key", "freshtab_back_to_old");
        dom.setAttribute(el3, "class", "revertBtn");
        dom.setAttribute(el3, "href", "#");
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element0 = dom.childAt(fragment, [0, 1]);
        var element1 = dom.childAt(element0, [1]);
        var element2 = dom.childAt(element0, [3]);
        var morphs = new Array(4);
        morphs[0] = dom.createElementMorph(element1);
        morphs[1] = dom.createMorphAt(element1, 0, 0);
        morphs[2] = dom.createElementMorph(element2);
        morphs[3] = dom.createMorphAt(element2, 0, 0);
        return morphs;
      },
      statements: [["element", "action", ["freshTabLearnMore"], ["on", "click"], ["loc", [null, [3, 33], [3, 74]]]], ["inline", "t", ["miniOnboarding.learn-more"], [], ["loc", [null, [3, 144], [3, 177]]]], ["element", "action", ["revertBack"], ["on", "click"], ["loc", [null, [4, 34], [4, 68]]]], ["inline", "t", ["miniOnboarding.back_to_old"], [], ["loc", [null, [4, 96], [4, 130]]]]],
      locals: [],
      templates: []
    };
  })());
});
define("fresh-tab/templates/onboarding", ["exports"], function (exports) {
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
            "line": 41,
            "column": 6
          }
        },
        "moduleName": "fresh-tab/templates/onboarding.hbs"
      },
      isEmpty: false,
      arity: 0,
      cachedFragment: null,
      hasRendered: false,
      buildFragment: function buildFragment(dom) {
        var el0 = dom.createDocumentFragment();
        var el1 = dom.createElement("div");
        dom.setAttribute(el1, "id", "optinContainer");
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "optinBackground");
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n  ");
        dom.appendChild(el1, el2);
        var el2 = dom.createElement("div");
        dom.setAttribute(el2, "class", "optinContent");
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "title");
        var el4 = dom.createComment("");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("ul");
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4, "class", "searchSimple clearfix");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5, "class", "icon");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        var el6 = dom.createTextNode("\n          ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n          ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6, "class", "suggestions");
        dom.setAttribute(el6, "target", "_blank");
        dom.setAttribute(el6, "href", "https://cliqz.com/products/tips");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n      ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4, "class", "surfSafe clearfix");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5, "class", "icon");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        var el6 = dom.createTextNode("\n          ");
        dom.appendChild(el5, el6);
        var el6 = dom.createElement("a");
        dom.setAttribute(el6, "class", "privacy");
        dom.setAttribute(el6, "target", "_blank");
        dom.setAttribute(el6, "href", "https://cliqz.com/whycliqz/privacy");
        var el7 = dom.createComment("");
        dom.appendChild(el6, el7);
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode(" \n          ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n      ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("li");
        dom.setAttribute(el4, "class", "startFresh clearfix");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("span");
        dom.setAttribute(el5, "class", "icon");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createElement("div");
        var el6 = dom.createTextNode("\n          ");
        dom.appendChild(el5, el6);
        var el6 = dom.createComment("");
        dom.appendChild(el5, el6);
        var el6 = dom.createTextNode("\n        ");
        dom.appendChild(el5, el6);
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n      ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "optin-cta-con");
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("div");
        dom.setAttribute(el4, "class", "cqz-optin-btn");
        var el5 = dom.createTextNode("\n        ");
        dom.appendChild(el4, el5);
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        var el5 = dom.createTextNode("\n      ");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n\n    ");
        dom.appendChild(el2, el3);
        var el3 = dom.createElement("div");
        dom.setAttribute(el3, "class", "footer");
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4, "class", "cliqzLearnMore");
        dom.setAttribute(el4, "target", "_blank");
        dom.setAttribute(el4, "href", "https://cliqz.com");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("span");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n      ");
        dom.appendChild(el3, el4);
        var el4 = dom.createElement("a");
        dom.setAttribute(el4, "class", "fullTour");
        dom.setAttribute(el4, "target", "_blank");
        dom.setAttribute(el4, "href", "#");
        var el5 = dom.createComment("");
        dom.appendChild(el4, el5);
        dom.appendChild(el3, el4);
        var el4 = dom.createTextNode("\n    ");
        dom.appendChild(el3, el4);
        dom.appendChild(el2, el3);
        var el3 = dom.createTextNode("\n  ");
        dom.appendChild(el2, el3);
        dom.appendChild(el1, el2);
        var el2 = dom.createTextNode("\n");
        dom.appendChild(el1, el2);
        dom.appendChild(el0, el1);
        return el0;
      },
      buildRenderNodes: function buildRenderNodes(dom, fragment, contextualElement) {
        var element0 = dom.childAt(fragment, [0, 3]);
        var element1 = dom.childAt(element0, [3]);
        var element2 = dom.childAt(element1, [1, 3]);
        var element3 = dom.childAt(element2, [3]);
        var element4 = dom.childAt(element1, [3, 3]);
        var element5 = dom.childAt(element4, [1]);
        var element6 = dom.childAt(element0, [5, 1]);
        var element7 = dom.childAt(element0, [7]);
        var element8 = dom.childAt(element7, [1]);
        var element9 = dom.childAt(element7, [5]);
        var morphs = new Array(15);
        morphs[0] = dom.createMorphAt(dom.childAt(element0, [1]), 0, 0);
        morphs[1] = dom.createMorphAt(element2, 1, 1);
        morphs[2] = dom.createElementMorph(element3);
        morphs[3] = dom.createMorphAt(element3, 0, 0);
        morphs[4] = dom.createElementMorph(element5);
        morphs[5] = dom.createMorphAt(element5, 0, 0);
        morphs[6] = dom.createMorphAt(element4, 3, 3);
        morphs[7] = dom.createMorphAt(dom.childAt(element1, [5, 3]), 1, 1);
        morphs[8] = dom.createElementMorph(element6);
        morphs[9] = dom.createMorphAt(element6, 1, 1);
        morphs[10] = dom.createElementMorph(element8);
        morphs[11] = dom.createMorphAt(element8, 0, 0);
        morphs[12] = dom.createMorphAt(dom.childAt(element7, [3]), 0, 0);
        morphs[13] = dom.createElementMorph(element9);
        morphs[14] = dom.createMorphAt(element9, 0, 0);
        return morphs;
      },
      statements: [["inline", "t", ["onboarding.title"], [], ["loc", [null, [4, 23], [4, 47]]]], ["inline", "t", ["onboarding.search-simple"], [], ["loc", [null, [9, 10], [9, 42]]]], ["element", "action", ["openLink", "https://cliqz.com/products/tips", "suggestion"], ["on", "click"], ["loc", [null, [10, 33], [10, 112]]]], ["inline", "t", ["onboarding.suggestions"], [], ["loc", [null, [10, 168], [10, 198]]]], ["element", "action", ["openLink", "https://cliqz.com/whycliqz/privacy", "privacy"], ["on", "click"], ["loc", [null, [17, 29], [17, 108]]]], ["inline", "t", ["onboarding.privacy"], [], ["loc", [null, [17, 167], [17, 193]]]], ["inline", "t", ["onboarding.surf-safe"], [], ["loc", [null, [18, 10], [18, 38]]]], ["inline", "t", ["onboarding.start-fresh"], [], ["loc", [null, [24, 10], [24, 40]]]], ["element", "action", ["closeModal", "onboarding"], [], ["loc", [null, [30, 33], [30, 69]]]], ["inline", "t", ["onboarding.cool-thanks"], [], ["loc", [null, [31, 8], [31, 38]]]], ["element", "action", ["openLink", "https://cliqz.com", "learnMore"], ["on", "click"], ["loc", [null, [36, 32], [36, 96]]]], ["inline", "t", ["onboarding.learn-more"], [], ["loc", [null, [36, 138], [36, 167]]]], ["inline", "t", ["onboarding.or"], [], ["loc", [null, [37, 12], [37, 33]]]], ["element", "action", ["fullTour"], ["on", "click"], ["loc", [null, [38, 26], [38, 58]]]], ["inline", "t", ["onboarding.full-tour"], [], ["loc", [null, [38, 85], [38, 113]]]]],
      locals: [],
      templates: []
    };
  })());
});
define('fresh-tab/utils/i18n/compile-template', ['exports', 'ember-i18n/utils/i18n/compile-template'], function (exports, _emberI18nUtilsI18nCompileTemplate) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberI18nUtilsI18nCompileTemplate['default'];
    }
  });
});
define('fresh-tab/utils/i18n/missing-message', ['exports', 'ember-i18n/utils/i18n/missing-message'], function (exports, _emberI18nUtilsI18nMissingMessage) {
  Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function get() {
      return _emberI18nUtilsI18nMissingMessage['default'];
    }
  });
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
  require("fresh-tab/app")["default"].create({"name":"fresh-tab","version":"0.0.0+309c59a4"});
}
/* jshint ignore:end */
//# sourceMappingURL=fresh-tab.map