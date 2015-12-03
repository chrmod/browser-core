var backup, lang = 'fr';

TESTS.VodScreenshotFrTest = prepareScreenshotTest({
    emails: [
        'harry@cliqz.com', 'thuy@cliqz.com',
        'roberto@cliqz.com', 'dominik.s@cliqz.com'
    ],
    subject: '[testing] fr VOD screenshots',
    width: 600,
    name: 'VodScreenshotTestFr',
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
    queries: QUERIES.vod
});
