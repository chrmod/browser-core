TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: [
        'dominik.s@cliqz.com', 'mds@cliqz.com', 'evgeny@cliqz.com', 'heeren@cliqz.com', 'lucian@cliqz.com'
    ],
    subject: '[testing] new news SmartCliqz screenshots',
    width: 1024,
    name: 'NewsScreenshotTest',
    upload: {
        dropdown_width: 786
    },
    queries: ['bild', 'spiegel.de', 'spigel', 'speigel', 'su', 'sued', 'sz', 'bild', 'kicker', 'focu', 'flüchtlin', 'test', 'angela merkel', 'merkel'],
    test_groups: ['nightly']
});
