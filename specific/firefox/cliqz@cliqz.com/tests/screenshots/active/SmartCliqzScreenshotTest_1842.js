TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: ['andrey@cliqz.com'],
    subject: '[testing] new dropdown screenshots (width: 1500)',
    width: 1842,
    name: 'SmartCliqzScreenshotTest_1842',
    upload: {
        dropdown_width: 1500
    },
    queries: QUERIES.top.concat(
        QUERIES.smartcliqz).concat(
        QUERIES.thuy)
});
