/*
    This is an example of config values that can be specified when creating a screenshot test.

    The most basic values, which need to be specified every time, are 'queries' and 'emails',
    all other fields are optional (actually, these two are optional too, but without them
    a test just doesn't make sense).

*/
TESTS.SmartCliqzTest = prepareScreenshotTest({
    // The following keys are the basic test configuration
    // and are not related to our testing framework
    queries: [
        'google.de', 'g', 'f'
    ],
    subject: 'Test screenshots report',
    emails: ['andrey@cliqz.com', 'andrey@cliqz.com'],
    name: 'ExampleTest',
    template: 'grid',
    timeout: 10000,

    // The following keys specify which mocha hooks we would like to use / override.
    // There is a default implementation for before(), beforeEach() and after() hooks,
    // which can be disabled by setting you own function (or any value) to the corresponding key.
    before: function(){
        console.log('Running custom before');
    },
    extraBefore: [
        function() {
            console.log('Running extra before #1');
        },
        function() {
            console.log('Running extra before #2');
        }
    ],
    beforeEach: function() {
        console.log('Running custom beforeEach');

    },
    extraBeforeEach: [
        function() {
            console.log('Running extra beforeEach #1');
        },
        function() {
            console.log('Running extra beforeEach #2');
        }
    ],
    after: function(){
        console.log('Running custom after');
    },
    extraAfter: [
        function() {
            console.log('Running extra after #1');
        },
        function() {
            console.log('Running extra after #2');
        }
    ],
    afterEach: function(){
        console.log('Running custom afterEach');
    },
    extraAfterEach: [
        function() {
            console.log('Running extra afterEach #1');
        },
        function() {
            console.log('Running extra afterEach #2');
        }
    ]
});
