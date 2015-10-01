TESTS.SmartCliqzTest = prepareScreenshotTest({
    emails: ['andrey@cliqz.com'],
    subject: 'Test screenshots report',
    width: 600,
    name: 'SmartCliqzScreenshotTest_600',
    upload: {
        dropdown_width: 502
    },
    queries: {
          'top':
              ['google.de', 'g', 'f', 'y', 'goo', 'fa', 'www.google.de', 'face',
               'go', 'web.de', 'you', 'gmx.de', 'ebay.de', 'google', 'bild.de', 'fac',
               'ama', 'amazon.de', 'ebay', 'we'],
          'smartcliqz':
              ['flug LH76', '500 EUR in USD', '5m in inch',
               'aktuelle uhrzeit los angeles', 'aktie apple',
               'wetter in muenchen',
               'spiegel.de', 'amazon.de', 'dkb.de'],
          'thuy':
              ['wetter m', 'wetter ber', 'bier',
               'http://www.imdb.com/title/tt0499549', 'imdb ava',
               'http://allrecipes.com/Recipe/Beef-Pho',
               'http://www.imdb.com/title/tt0121766']
    }
});
