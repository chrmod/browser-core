var CliqzTranslation = {
    PREFERRED_LANGUAGE: null,
    LANGS: {'de': 'de', 'en': 'en', 'fr': 'fr'},
    locale: {},
    currLocale: null,

    getLanguageFromLocale: function (locale) {
        return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
    },

    getLanguage: function (win) {
        return CliqzTranslation.LANGS[CliqzTranslation.getLanguageFromLocale(win.navigator.language)] || 'en';
    },

    loadLocale: function (lang_locale, callback) {
        // The default language
        $.getJSON("locale/de/cliqz.json", function (json) {
            CliqzTranslation.locale['default'] = json;
        });

        var loc = CliqzTranslation.getLanguageFromLocale(lang_locale);

        CliqzTranslation.currLocale = loc;
        $.getJSON("locale/" + loc + "/cliqz.json", function (json) {
            CliqzTranslation.locale[loc] = json;
        }).always(callback);
    },

    runLocalization: function (doc) {
        var locale = doc.querySelectorAll('[data-cliqz-localize]');
        for (var i = 0; i < locale.length; i++) {
            var el = locale[i];
            el.textContent = CliqzTranslation.getLocalizedString(el.getAttribute('data-cliqz-localize-key'));
        }
    },

    getLocalizedString: function (key) {
        var ret = key;
        // Check if we have Current lang, if we have Dictionaryfor that lang and if the Translation is in the dictionaty
        if (CliqzTranslation.currLocale != null && CliqzTranslation.locale[CliqzTranslation.currLocale] && CliqzTranslation.locale[CliqzTranslation.currLocale][key]) {
            ret = CliqzTranslation.locale[CliqzTranslation.currLocale][key].message;
            console.log('translation: ', ret);
        }
        // If no we take from Default
        else if (CliqzTranslation.locale['default'] && CliqzTranslation.locale['default'][key]) {
            ret = CliqzTranslation.locale['default'][key].message;
        }

        if (arguments.length > 1) {
            var i = 1, args = arguments;
            ret = ret.replace(/{}/g, function (k) {
                return args[i++] || k;
            })
        }

        return ret;
    },

    init: function (win) {
        if (win && win.navigator) {
            // See http://gu.illau.me/posts/the-problem-of-user-language-lists-in-javascript/
            var nav = win.navigator;
            CliqzTranslation.PREFERRED_LANGUAGE = nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en',
                CliqzTranslation.loadLocale(CliqzTranslation.PREFERRED_LANGUAGE, function () {
                    CliqzTranslation.runLocalization(window.document);
                });
        }
    }
}