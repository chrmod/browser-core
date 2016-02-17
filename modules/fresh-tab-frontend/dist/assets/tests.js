define('fresh-tab/tests/app.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - .');
  QUnit.test('app.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'app.js should pass jshint.');
  });
});
define('fresh-tab/tests/components/speed-dial.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - components');
  QUnit.test('components/speed-dial.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(false, 'components/speed-dial.js should pass jshint.\ncomponents/speed-dial.js: line 6, col 57, Missing semicolon.\n\n1 error');
  });
});
define('fresh-tab/tests/components/speed-dials.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - components');
  QUnit.test('components/speed-dials.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'components/speed-dials.js should pass jshint.');
  });
});
define('fresh-tab/tests/helpers/destroy-app', ['exports', 'ember'], function (exports, _ember) {
  exports['default'] = destroyApp;

  function destroyApp(application) {
    _ember['default'].run(application, 'destroy');
  }
});
define('fresh-tab/tests/helpers/destroy-app.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - helpers');
  QUnit.test('helpers/destroy-app.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/destroy-app.js should pass jshint.');
  });
});
define('fresh-tab/tests/helpers/module-for-acceptance', ['exports', 'qunit', 'fresh-tab/tests/helpers/start-app', 'fresh-tab/tests/helpers/destroy-app'], function (exports, _qunit, _freshTabTestsHelpersStartApp, _freshTabTestsHelpersDestroyApp) {
  exports['default'] = function (name) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    (0, _qunit.module)(name, {
      beforeEach: function beforeEach() {
        this.application = (0, _freshTabTestsHelpersStartApp['default'])();

        if (options.beforeEach) {
          options.beforeEach.apply(this, arguments);
        }
      },

      afterEach: function afterEach() {
        (0, _freshTabTestsHelpersDestroyApp['default'])(this.application);

        if (options.afterEach) {
          options.afterEach.apply(this, arguments);
        }
      }
    });
  };
});
define('fresh-tab/tests/helpers/module-for-acceptance.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - helpers');
  QUnit.test('helpers/module-for-acceptance.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/module-for-acceptance.js should pass jshint.');
  });
});
define('fresh-tab/tests/helpers/resolver', ['exports', 'fresh-tab/resolver', 'fresh-tab/config/environment'], function (exports, _freshTabResolver, _freshTabConfigEnvironment) {

  var resolver = _freshTabResolver['default'].create();

  resolver.namespace = {
    modulePrefix: _freshTabConfigEnvironment['default'].modulePrefix,
    podModulePrefix: _freshTabConfigEnvironment['default'].podModulePrefix
  };

  exports['default'] = resolver;
});
define('fresh-tab/tests/helpers/resolver.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - helpers');
  QUnit.test('helpers/resolver.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/resolver.js should pass jshint.');
  });
});
define('fresh-tab/tests/helpers/start-app', ['exports', 'ember', 'fresh-tab/app', 'fresh-tab/config/environment'], function (exports, _ember, _freshTabApp, _freshTabConfigEnvironment) {
  exports['default'] = startApp;

  function startApp(attrs) {
    var application = undefined;

    var attributes = _ember['default'].merge({}, _freshTabConfigEnvironment['default'].APP);
    attributes = _ember['default'].merge(attributes, attrs); // use defaults, but you can override;

    _ember['default'].run(function () {
      application = _freshTabApp['default'].create(attributes);
      application.setupForTesting();
      application.injectTestHelpers();
    });

    return application;
  }
});
define('fresh-tab/tests/helpers/start-app.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - helpers');
  QUnit.test('helpers/start-app.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'helpers/start-app.js should pass jshint.');
  });
});
define('fresh-tab/tests/resolver.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - .');
  QUnit.test('resolver.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'resolver.js should pass jshint.');
  });
});
define('fresh-tab/tests/router.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - .');
  QUnit.test('router.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'router.js should pass jshint.');
  });
});
define('fresh-tab/tests/routes/index.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - routes');
  QUnit.test('routes/index.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(false, 'routes/index.js should pass jshint.\nroutes/index.js: line 8, col 33, Missing semicolon.\nroutes/index.js: line 7, col 16, \'Promise\' is not defined.\nroutes/index.js: line 8, col 7, \'$\' is not defined.\n\n3 errors');
  });
});
define('fresh-tab/tests/services/cliqz.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - services');
  QUnit.test('services/cliqz.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(false, 'services/cliqz.js should pass jshint.\nservices/cliqz.js: line 35, col 14, Missing semicolon.\nservices/cliqz.js: line 49, col 14, Missing semicolon.\nservices/cliqz.js: line 27, col 23, \'Promise\' is not defined.\nservices/cliqz.js: line 41, col 23, \'Promise\' is not defined.\n\n4 errors');
  });
});
define('fresh-tab/tests/test-helper', ['exports', 'fresh-tab/tests/helpers/resolver', 'ember-qunit'], function (exports, _freshTabTestsHelpersResolver, _emberQunit) {

  (0, _emberQunit.setResolver)(_freshTabTestsHelpersResolver['default']);
});
define('fresh-tab/tests/test-helper.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - .');
  QUnit.test('test-helper.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'test-helper.js should pass jshint.');
  });
});
define('fresh-tab/tests/unit/services/cliqz-test', ['exports', 'ember-qunit'], function (exports, _emberQunit) {

  (0, _emberQunit.moduleFor)('service:cliqz', 'Unit | Service | cliqz', {
    // Specify the other units that are required for this test.
    // needs: ['service:foo']
  });

  // Replace this with your real tests.
  (0, _emberQunit.test)('it exists', function (assert) {
    var service = this.subject();
    assert.ok(service);
  });
});
define('fresh-tab/tests/unit/services/cliqz-test.jshint', ['exports'], function (exports) {
  'use strict';

  QUnit.module('JSHint - unit/services');
  QUnit.test('unit/services/cliqz-test.js should pass jshint', function (assert) {
    assert.expect(1);
    assert.ok(true, 'unit/services/cliqz-test.js should pass jshint.');
  });
});
/* jshint ignore:start */

require('fresh-tab/tests/test-helper');
EmberENV.TESTS_FILE_LOADED = true;

/* jshint ignore:end */
//# sourceMappingURL=tests.map