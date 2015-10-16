TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
        'dominik.s@cliqz.com', 'panagiota@cliqz.com', 'sean@cliqz.com', 'elyse@cliqz.com',
        'thuy@cliqz.com', 'stefanie@cliqz.com', 'andrey@cliqz.com', 'tomas@cliqz.com',
        'humera@cliqz.com'
    ],
    subject: '[testing] new dropdown screenshots (width: 900)',
    width: 1262,
    name: 'SmartCliqzScreenshotTest_900',
    upload: {
        dropdown_width: 900
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy)
});
