'use strict';

var {assert} = require('../lib/assertions');
var setupModule = function (module) {
    module.controller = mozmill.getBrowserController();
    module.CLIQZ = controller.window.CLIQZ;

    //mock the tracking to avoid noise
    controller.window.CliqzUtils.track = function(){ };

    module.CliqzUtils = controller.window.CliqzUtils;
}

function alert(txt){
    controller.window.alert(txt);
}

function assertArrayEqual(a, b){
    assert.equal(a.length, b.length, 'array length not equal')

    for(var i=0; i<a.length; i++){
        for(var k in a[i]){
            assert.equal(a[i][k], b[i][k], 'array: object om pos ' + i + ' not equal for key ' + k)
        }
    }
}

// replaces ',' and '-' in the urlbar if it can be autocompleted and if it contains 'www'
function testUrlBarCleaner() {
    var data = {
        'http://faceboook.com':'http://faceboook.com',
        'http://www.faceboook.com':'http://www.faceboook.com',
        'http://www.faceboook.com/login.html':'http://www.faceboook.com/login.html',
        //do not clean anything in the path
        'http://www.faceboook.com/login,html':'http://www.faceboook.com/login,html',
        'http://www,faceboook.com':'http://www.faceboook.com',
        'http://www.faceboook,com':'http://www.faceboook.com',
        'http://faceboook,com':'http://faceboook,com', // do not clean if no www detected
        'www,faceboook.com':'www.faceboook.com',
        'www.faceboook-com':'www.faceboook.com',
        'www.faceboook,com':'www.faceboook.com',
        'www,faceboook,com':'www.faceboook.com',
        'www-faceboook,com':'www.faceboook.com',
        '192.168.1.1':'192.168.1.1',
        '192,168,1.1':'192,168,1.1',
        'http://192,168,1.1':'http://192,168,1.1'
    }

    for(var k in data){
        assert.equal(CLIQZ.Core.cleanUrlBarValue(k), data[k]);
    }
}

function testFilter() {
    const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
    Cu.import('chrome://cliqzmodules/content/Filter.jsm');

    var TEST = [
            // T1
            [
                [
                    "https://de-de.facebook.com/",
                    "https://www.facebook.com/",
                    "https://pl-pl.facebook.com/",
                    "https://www.facebook.com/login.php",
                    "http://de-de.facebook.com/"
                ],
                [
                    "https://de-de.facebook.com/",
                    "https://www.facebook.com/login.php"
                ]
            ],
            // T2
            [
                [
                    "http://www.facebook.com/",
                    "https://www.facebook.com/",
                    "http://www.facebook.com/login.php",
                    "https://www.facebook.com/login.php"
                ],
                [
                    "https://www.facebook.com/",
                    "https://www.facebook.com/login.php"
                ]
            ],
            // T3
            [
                [
                    "ftp://ftp.xyz.com",
                    "ftp://user:pass@ftp.xyz.com",
                    "http://www.facebook.com/login.php",
                    "https://www.facebook.com/login.php"
                ],
                [
                    "ftp://ftp.xyz.com",
                    "ftp://user:pass@ftp.xyz.com",
                    "https://www.facebook.com/login.php"
                ]
            ],
            // T4
            [
                [
                    "http://192.168.1.1/",
                    "https://192.168.1.1/",
                    "http://192.168.1.1/",
                ],
                [
                    "https://192.168.1.1/",
                ]
            ],
            // T5
            [
                [
                    "www.facebook.com/login.php",
                    "facebook.com/login.php"
                ],
                [
                    "www.facebook.com/login.php",
                ]
            ],
            // T6
            [
                [
                    "www.facebook.com",
                    "www.facebook.com"
                ],
                [
                    "www.facebook.com",
                ]
            ],
            // T7
            [
                [
                    "http://www.inflammable.com/",
                    "https://www.inflammable.com/",
                    "http://chemistry.about.com/od/firecombustionchemistry/f/What-Is-The-Difference-Between-Flammable-And-Inflammable.htm"
                ],
                [
                    "https://www.inflammable.com/",
                    "http://chemistry.about.com/od/firecombustionchemistry/f/What-Is-The-Difference-Between-Flammable-And-Inflammable.htm"
                ]
            ],
            // T8
            [
                [
                     "https://www.xing.com/net/treffpunktfremdsprachen/ich-suche-sprachkurs-seminar-coaching-sprachenevent-sprachentandem-sprachenstammtisch-465652/gesucht-one-week-crash-kurs-englisch-sprachhotel-36536093",
                     "http://www.sn-online.de/Nachrichten/Hannover/Uebersicht/Auslaender-haben-in-Hannover-keine-Chance-auf-Sprachkurs",
                     "http://ebookee.org/dl/PONS-Power-Sprachkurs-russisch-als-Fremdsprache"
                ],
                [
                     "https://www.xing.com/net/treffpunktfremdsprachen/ich-suche-sprachkurs-seminar-coaching-sprachenevent-sprachentandem-sprachenstammtisch-465652/gesucht-one-week-crash-kurs-englisch-sprachhotel-36536093",
                     "http://www.sn-online.de/Nachrichten/Hannover/Uebersicht/Auslaender-haben-in-Hannover-keine-Chance-auf-Sprachkurs",
                     "http://ebookee.org/dl/PONS-Power-Sprachkurs-russisch-als-Fremdsprache"
                ]
            ],
            // T9
            [
                [
                    "http://www.rc-network.de/forum/showthread.php/186973-MPX-FUNJET-motor-Kontronik-480-31-Kira-FUN"
                ],
                [
                    "http://www.rc-network.de/forum/showthread.php/186973-MPX-FUNJET-motor-Kontronik-480-31-Kira-FUN"
                ]
            ]
        ];

    for(var t of TEST){
        var input = t[0],
            expected = t[1];

        // change to expected format
        input = input.map(function(r){ return {val: r}; })
        expected = expected.map(function(r){ return {val: r}; })
        assertArrayEqual(Filter.deduplicate(input, -1, 1, 1), expected);
    }
}

