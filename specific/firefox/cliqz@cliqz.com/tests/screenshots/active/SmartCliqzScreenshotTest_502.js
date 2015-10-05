TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
        'dominik.s@cliqz.com', 'panagiota@cliqz.com', 'sean@cliqz.com', 'elyse@cliqz.com',
        'thuy@cliqz.com', 'stefanie@cliqz.com', 'andrey@cliqz.com'
    ],
    subject: '[testing] new dropdown screenshots (width: 502)',
    width: 600,
    name: 'SmartCliqzScreenshotTest_502',
    upload: {
        dropdown_width: 502
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy)
});
