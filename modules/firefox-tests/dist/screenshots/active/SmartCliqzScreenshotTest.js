TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
        'dominik.s@cliqz.com', 'panagiota@cliqz.com', 'sean@cliqz.com', 'elyse@cliqz.com',
        'thuy@cliqz.com', 'stefanie@cliqz.com', 'andrey@cliqz.com', 'tomas@cliqz.com',
        'humera@cliqz.com', 'ermal@cliqz.com', 'michel@cliqz.com', 'lucian@cliqz.com'
    ],
    subject: '[testing] new dropdown screenshots',
    width: 1024,
    name: 'SmartCliqzScreenshotTest',
    upload: {
        dropdown_width: 786
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy).concat(
        QUERIES.michel),
    test_groups: ['nightly']
});
