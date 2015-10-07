TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
        'dominik.s@cliqz.com', 'panagiota@cliqz.com', 'sean@cliqz.com', 'elyse@cliqz.com',
        'thuy@cliqz.com', 'stefanie@cliqz.com', 'andrey@cliqz.com'
    ],
    subject: '[testing] new dropdown screenshots (width: 1500)',
    width: 1862,
    name: 'SmartCliqzScreenshotTest_1500',
    upload: {
        dropdown_width: 1500
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy)
});
