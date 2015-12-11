TESTS.QualityRaterScreenshotsTest = prepareScreenshotTest({
    width: 600,
    name: 'QualityRaterScreenshotsTest',
    upload: {
        dropdown_width: 502,
        bucket: 'tests-dropdown-appearance-dynamic-out',
        key_prefix: 'quality-rating-queries',
        flat_upload: true,
        no_mosaic: true,
        public_read: true
    },
    file_prefix: '',
    // must stay, left empty on purpose
    queries: [],
    test_groups: ['quality']
    // the following will be parsed by test_runner.py to fill queries:
    // queries_source: s3://tests-dropdown-appearance-dynamic-in/quality-rating-queries/
});
