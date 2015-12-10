var backup, lang = 'en';

TESTS.VodScreenshotEnTest = prepareScreenshotTest({
    emails: [
        'harry@cliqz.com', 'thuy@cliqz.com',
        'roberto@cliqz.com', 'dominik.s@cliqz.com'
    ],
    subject: '[testing] en VOD screenshots',
    width: 600,
    name: 'VodScreenshotTestEn',
    extraBefore: [
        function() {
            backup = fakeLanguage(lang);
        }
    ],
    extraAfter: [
        function() {
            restoreLanguage(backup);
        }
    ],
    upload: {
        dropdown_width: 502
    },
    queries: QUERIES.vod,
    test_groups: ['nightly']
});
