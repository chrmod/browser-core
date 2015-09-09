'use strict';

function testParsedURL(actual, expected) {
    // always present keys
    ['protocol', 'username', 'password', 'hostname', 'port', 'path', 'query'].map(function(key) {
        chai.expect(actual[key], key).equals(expected[key]);
    });
    // keys not always specified in testcases
    ['parameters', 'fragment'].map(function(key) {
        var expect = '';
        if(key in expected) {
            expect = expected[key];
        }
        chai.expect(actual[key], key).equals(expect);
    });
    // object keys
    ['query_keys', 'parameter_keys', 'fragment_keys'].map(function(key) {
        var expect = {};
        if(key in expected) {
            expect = expected[key];
        }
        chai.expect(actual[key], key).to.deep.equal(expect);
    });
};

var plain_urls = [
{
    "url": "https://cliqz.com",
    "url_parts": {
        "username": "",
        "protocol": "https",
        "hostname": "cliqz.com",
        "path": "/",
        "query": "",
        "query_keys": {},
        "password": "",
        "port": 80
    }
},
{
    "url": "https://ssl.bbc.co.uk/frameworks/fig/1/fig.js",
    "url_parts": {
        "username": "",
        "protocol": "https",
        "hostname": "ssl.bbc.co.uk",
        "path": "/frameworks/fig/1/fig.js",
        "query": "",
        "query_keys": {},
        "password": "",
        "port": 80
    }
},
{
    "url": "http://www.bbc.co.uk/wwscripts/flag",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "www.bbc.co.uk",
        "path": "/wwscripts/flag",
        "query": "",
        "query_keys": {},
        "password": "",
        "port": 80
    }
}];

var query_strings = [
{
    "url": "http://pubads.g.doubleclick.net/gampad/ads?gdfp_req=1&correlator=1810614703467044&output=json_html&callback=googletag.impl.pubads.setAdContentsBySlotForSync&impl=ss&json_a=1&eid=108809047%2C108809030%2C108809035%2C108809050&sc=0&sfv=1-0-2&iu_parts=4817%2Cbbccom.live.site.news%2Csport_live_content&enc_prev_ius=%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2&prev_iu_szs=1x1%2C728x90%7C970x300%7C970x250%7C970x90%7C970x66%7C940x230%7C930x180%7C844x179%2C300x250%7C300x600%7C300x1050%2C1x1&ists=1&prev_scp=slot%3Dwallpaper%7Cslot%3Dleaderboard%26sl%3Dtop%7Cslot%3Dmpu%26sl%3Dmiddle%7Cslot%3Dinterstitial&cust_params=kuid%3Dptbex8ffm%26khost%3Dwww.bbc.com%26frd%3D1%26channel%3Dsport%26sectn%3Dlive%26subsect%3Dcricket%26domain%3Dwww.bbc.com%26story_id%3D32809781%26ctype%3Dcontent%26asset_type%3Dlive_event%26referrer%3Dsport0%26referrer_domain%3Dwww.bbc.com%26esi%3D0&cookie=ID%3D2cdd06c7dff60cd5%3AT%3D1438088344%3AS%3DALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g&lmt=1438251866&dt=1438251866165&frm=20&biw=1132&bih=683&oid=3&adks=4009376745%2C679768530%2C2444114410%2C834144271&gut=v2&ifi=1&u_tz=120&u_his=4&u_h=900&u_w=1440&u_ah=828&u_aw=1440&u_cd=24&u_nplug=2&u_nmime=39&u_sd=2&flash=0&url=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ref=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F&dssz=71&icsg=134217728&std=5&csl=183&vrg=68&vrp=68&ga_vid=1104604060.1437652108&ga_sid=1438251866&ga_hid=1225307609",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "pubads.g.doubleclick.net",
        "path": "/gampad/ads",
        "query": "gdfp_req=1&correlator=1810614703467044&output=json_html&callback=googletag.impl.pubads.setAdContentsBySlotForSync&impl=ss&json_a=1&eid=108809047%2C108809030%2C108809035%2C108809050&sc=0&sfv=1-0-2&iu_parts=4817%2Cbbccom.live.site.news%2Csport_live_content&enc_prev_ius=%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2&prev_iu_szs=1x1%2C728x90%7C970x300%7C970x250%7C970x90%7C970x66%7C940x230%7C930x180%7C844x179%2C300x250%7C300x600%7C300x1050%2C1x1&ists=1&prev_scp=slot%3Dwallpaper%7Cslot%3Dleaderboard%26sl%3Dtop%7Cslot%3Dmpu%26sl%3Dmiddle%7Cslot%3Dinterstitial&cust_params=kuid%3Dptbex8ffm%26khost%3Dwww.bbc.com%26frd%3D1%26channel%3Dsport%26sectn%3Dlive%26subsect%3Dcricket%26domain%3Dwww.bbc.com%26story_id%3D32809781%26ctype%3Dcontent%26asset_type%3Dlive_event%26referrer%3Dsport0%26referrer_domain%3Dwww.bbc.com%26esi%3D0&cookie=ID%3D2cdd06c7dff60cd5%3AT%3D1438088344%3AS%3DALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g&lmt=1438251866&dt=1438251866165&frm=20&biw=1132&bih=683&oid=3&adks=4009376745%2C679768530%2C2444114410%2C834144271&gut=v2&ifi=1&u_tz=120&u_his=4&u_h=900&u_w=1440&u_ah=828&u_aw=1440&u_cd=24&u_nplug=2&u_nmime=39&u_sd=2&flash=0&url=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ref=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F&dssz=71&icsg=134217728&std=5&csl=183&vrg=68&vrp=68&ga_vid=1104604060.1437652108&ga_sid=1438251866&ga_hid=1225307609",
        "query_keys": {
            "flash": "0",
            "u_his": "4",
            "u_nmime": "39",
            "enc_prev_ius": "%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2%2C%2F0%2F1%2F2",
            "icsg": "134217728",
            "correlator": "1810614703467044",
            "ga_hid": "1225307609",
            "csl": "183",
            "output": "json_html",
            "u_h": "900",
            "prev_scp": "slot%3Dwallpaper%7Cslot%3Dleaderboard%26sl%3Dtop%7Cslot%3Dmpu%26sl%3Dmiddle%7Cslot%3Dinterstitial",
            "frm": "20",
            "prev_iu_szs": "1x1%2C728x90%7C970x300%7C970x250%7C970x90%7C970x66%7C940x230%7C930x180%7C844x179%2C300x250%7C300x600%7C300x1050%2C1x1",
            "gdfp_req": "1",
            "ists": "1",
            "u_w": "1440",
            "u_sd": "2",
            "ref": "http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F",
            "ga_vid": "1104604060.1437652108",
            "vrp": "68",
            "bih": "683",
            "sfv": "1-0-2",
            "u_cd": "24",
            "oid": "3",
            "lmt": "1438251866",
            "adks": "4009376745%2C679768530%2C2444114410%2C834144271",
            "u_ah": "828",
            "json_a": "1",
            "vrg": "68",
            "ga_sid": "1438251866",
            "biw": "1132",
            "dt": "1438251866165",
            "cust_params": "kuid%3Dptbex8ffm%26khost%3Dwww.bbc.com%26frd%3D1%26channel%3Dsport%26sectn%3Dlive%26subsect%3Dcricket%26domain%3Dwww.bbc.com%26story_id%3D32809781%26ctype%3Dcontent%26asset_type%3Dlive_event%26referrer%3Dsport0%26referrer_domain%3Dwww.bbc.com%26esi%3D0",
            "std": "5",
            "u_aw": "1440",
            "u_tz": "120",
            "iu_parts": "4817%2Cbbccom.live.site.news%2Csport_live_content",
            "url": "http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781",
            "u_nplug": "2",
            "callback": "googletag.impl.pubads.setAdContentsBySlotForSync",
            "dssz": "71",
            "eid": "108809047%2C108809030%2C108809035%2C108809050",
            "gut": "v2",
            "sc": "0",
            "cookie": "ID%3D2cdd06c7dff60cd5%3AT%3D1438088344%3AS%3DALNI_MY1v4VPWDbtZ4xhDnMydFQI_tzg2g",
            "ifi": "1",
            "impl": "ss"
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://cdn.krxd.net/controltag?confid=JZh7-1tL",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "cdn.krxd.net",
        "path": "/controltag",
        "query": "confid=JZh7-1tL",
        "query_keys": {
            "confid": "JZh7-1tL"
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://sa.bbc.co.uk/bbc/bbc/s?name=sport.cricket.international.live_coverage.32809781.page&app_name=sport&app_version=2.8.1058&app_edition=1&is_app=0&page_type=live_coverage&pal_route=bbc_live_sport&ml_name=barlesque&app_type=responsive&language=en-GB&ml_version=0.26.31&pal_webapp=onesport&prod_name=sport&blq_s=4d&blq_r=2.7&blq_v=default&blq_e=pal&bbc_mc=ad1ps1pf1&screen_resolution=1440x900&bbc_site=&ns_ti=Ashes%202015%3A%20England%20v%20Australia%2C%20third%20Test%2C%20Edgbaston%2C%20day%20two%20-%20BBC%20Sport&ns_c=UTF-8&ns__t=1438251866485&ns_jspageurl=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ns_referrer=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "sa.bbc.co.uk",
        "path": "/bbc/bbc/s",
        "query": "name=sport.cricket.international.live_coverage.32809781.page&app_name=sport&app_version=2.8.1058&app_edition=1&is_app=0&page_type=live_coverage&pal_route=bbc_live_sport&ml_name=barlesque&app_type=responsive&language=en-GB&ml_version=0.26.31&pal_webapp=onesport&prod_name=sport&blq_s=4d&blq_r=2.7&blq_v=default&blq_e=pal&bbc_mc=ad1ps1pf1&screen_resolution=1440x900&bbc_site=&ns_ti=Ashes%202015%3A%20England%20v%20Australia%2C%20third%20Test%2C%20Edgbaston%2C%20day%20two%20-%20BBC%20Sport&ns_c=UTF-8&ns__t=1438251866485&ns_jspageurl=http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781&ns_referrer=http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F",
        "query_keys": {
            "screen_resolution": "1440x900",
            "app_name": "sport",
            "ns_jspageurl": "http%3A%2F%2Fwww.bbc.com%2Fsport%2Flive%2Fcricket%2F32809781",
            "ml_version": "0.26.31",
            "pal_webapp": "onesport",
            "app_type": "responsive",
            "ml_name": "barlesque",
            "app_edition": "1",
            "bbc_mc": "ad1ps1pf1",
            "page_type": "live_coverage",
            "app_version": "2.8.1058",
            "prod_name": "sport",
            "bbc_site": "",
            "blq_s": "4d",
            "blq_r": "2.7",
            "blq_v": "default",
            "ns_ti": "Ashes%202015%3A%20England%20v%20Australia%2C%20third%20Test%2C%20Edgbaston%2C%20day%20two%20-%20BBC%20Sport",
            "blq_e": "pal",
            "pal_route": "bbc_live_sport",
            "name": "sport.cricket.international.live_coverage.32809781.page",
            "language": "en-GB",
            "ns_referrer": "http%3A%2F%2Fwww.bbc.com%2Fsport%2F0%2F",
            "is_app": "0",
            "ns__t": "1438251866485",
            "ns_c": "UTF-8"
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://r.nexac.com/e/getdata.xgi?dt=br&pkey=jtkr94hrnfw22&ru=http://ar.atwola.com/atd?it=7%26iv=%3cna_di%3e%26at=8%26av=%3cna_di2%3e%26ds=7%26ed=%3cna_da%3e%26rand=799496",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "r.nexac.com",
        "path": "/e/getdata.xgi",
        "query": "dt=br&pkey=jtkr94hrnfw22&ru=http://ar.atwola.com/atd?it=7%26iv=%3cna_di%3e%26at=8%26av=%3cna_di2%3e%26ds=7%26ed=%3cna_da%3e%26rand=799496",
        "query_keys": {
            "pkey": "jtkr94hrnfw22",
            "dt": "br",
            "ru": "http://ar.atwola.com/atd?it=7%26iv=%3cna_di%3e%26at=8%26av=%3cna_di2%3e%26ds=7%26ed=%3cna_da%3e%26rand=799496"
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://tags.bluekai.com/site/19275?ret=html&phint=page=Mashable&phint=channel=home&phint=prop2=Channel",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "tags.bluekai.com",
        "path": "/site/19275",
        "query": "ret=html&phint=page=Mashable&phint=channel=home&phint=prop2=Channel",
        "query_keys": {
            "ret": "html",
            "phint_page": "Mashable",
            "phint_channel": "home",
            "phint_prop2": "Channel"
        },
        "password": "",
        "port": 80
    }
}
];

var parameters = [
{
    "url": "http://pixel.quantserve.com/pixel;r=1275226977;a=p-3aud4J6uA4Z6Y;labels=verticalHP.index;fpan=0;fpa=P0-113403507-1437990328261;ns=0;ce=1;cm=;je=0;sr=1440x900x24;enc=n;dst=1;et=1438251870170;tzo=-120;ref=;url=http%3A%2F%2Fwww.buzzfeed.com%2F;ogl=site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "pixel.quantserve.com",
        "path": "/pixel",
        "parameters": "r=1275226977;a=p-3aud4J6uA4Z6Y;labels=verticalHP.index;fpan=0;fpa=P0-113403507-1437990328261;ns=0;ce=1;cm=;je=0;sr=1440x900x24;enc=n;dst=1;et=1438251870170;tzo=-120;ref=;url=http%3A%2F%2Fwww.buzzfeed.com%2F;ogl=site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom",
        "parameter_keys": {
            "r": "1275226977",
            "a": "p-3aud4J6uA4Z6Y",
            "labels": "verticalHP.index",
            "fpan": "0",
            "fpa": "P0-113403507-1437990328261",
            "ns": "0",
            "ce": "1",
            "cm": "",
            "je": "0",
            "sr": "1440x900x24",
            "enc": "n",
            "dst": "1",
            "et": "1438251870170",
            "tzo": "-120",
            "ref": "",
            "url": "http%3A%2F%2Fwww.buzzfeed.com%2F",
            "ogl": "site_name.BuzzFeed%2Ctype.website%2Cdescription.BuzzFeed%20has%20the%20hottest%252C%20most%20social%20content%20on%20the%20web%252E%20We%20feature%20breaking%20bu%2Ctitle.BuzzFeed%2Cimage.http%3A%2F%2Fs3-ak%252Ebuzzfed%252Ecom%2Fstatic%2Fimages%2Fglobal%2Fbuzzfeed%252Ejpg%3Fv%3D201507291520%2Curl.http%3A%2F%2Fwww%252Ebuzzfeed%252Ecom"
        },
        "query": "",
        "query_keys": {},
        "password": "",
        "port": 80
    }
},
];

var fragments = [
{
    "url": "http://s7.addthis.com/js/250/addthis_widget.js#async=1&username=wettercom",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "s7.addthis.com",
        "path": "/js/250/addthis_widget.js",
        "query": "",
        "query_keys": {},
        "fragment": "async=1&username=wettercom",
        "fragment_keys": {
            "async": "1",
            "username": "wettercom"
        },
        "password": "",
        "port": 80
    }
}];

var combined = [
{
    "url": "https://accounts.google.com/o/oauth2/postmessageRelay?parent=http%3A%2F%2Fwww.buzzfeed.com#rpctoken=797034019&forcesecure=1",
    "url_parts": {
        "username": "",
        "protocol": "https",
        "hostname": "accounts.google.com",
        "path": "/o/oauth2/postmessageRelay",
        "query": "parent=http%3A%2F%2Fwww.buzzfeed.com",
        "query_keys": {
            "parent": "http%3A%2F%2Fwww.buzzfeed.com"
        },
        "fragment": "rpctoken=797034019&forcesecure=1",
        "fragment_keys": {
            "rpctoken": "797034019",
            "forcesecure": "1"
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://fast.adobe.demdex.net/dest4.html?d_nsid=0#http%3A%2F%2Fwww.adobe.com%2F%23",
    "url_parts": {
        "username": "",
        "protocol": "http",
        "hostname": "fast.adobe.demdex.net",
        "path": "/dest4.html",
        "query": "d_nsid=0",
        "query_keys": {
            "d_nsid": "0"
        },
        "fragment": "http%3A%2F%2Fwww.adobe.com%2F%23",
        "fragment_keys": {
            "http%3A%2F%2Fwww.adobe.com%2F%23": true
        },
        "password": "",
        "port": 80
    }
},
{
    "url": "http://myname:mypassword@example.com:81/some/path;with=parameters;howmany=2?also=query#andfinally=fragment",
    "url_parts": {
        "protocol": "http",
        "username": "myname",
        "password": "mypassword",
        "hostname": "example.com",
        "port": 81,
        "path": "/some/path",
        "parameters": "with=parameters;howmany=2",
        "parameter_keys": {
            "with": "parameters",
            "howmany": "2"
        },
        "query": "also=query",
        "query_keys": {
            "also": "query"
        },
        "fragment": "andfinally=fragment",
        "fragment_keys": {
            "andfinally": "fragment"
        }
    }
}
]

function testSpecArray(testFn, name, spec) {
    describe(name, function() {
        spec.forEach(function(testcase) {
            var url_desc = testcase['url'];
            if(url_desc.length > 180) url_desc = url_desc.substring(0, 180) + '...';
            it(url_desc, function() {
                testParsedURL(testFn(testcase['url']), testcase['url_parts']);
            });
        });

    });
};

function fullTest(testFn) {
    // behavioural tests
    describe('invalid inputs', function() {
        it('null: should throw exception', function() {
            chai.expect(function() { return testFn(null) }).to.throw('url is null')
        });
        it('empty string: should return null', function() {
            chai.expect(testFn('')).to.be.null;
        });
        ['http://', 'example.com', '/path/to/index.html'].map(function(url) {
            it(url +': should return null', function() {
                chai.expect(testFn(url)).to.be.null;
            });
        });
    });
    // test examples
    testSpecArray(testFn, 'plain urls', plain_urls);
    testSpecArray(testFn, 'query strings', query_strings);
    testSpecArray(testFn, 'parameter strings', parameters);
    testSpecArray(testFn, 'fragment strings', fragments);
    testSpecArray(testFn, 'combined', combined);
}

TESTS.CliqzParseUrlTest = function (CliqzHumanWeb, CliqzAttrack, CliqzUtils) {
    describe('CliqzAttrack.parseURL', function() {

        var testFn = CliqzAttrack.parseURL;
        fullTest(testFn);

    });

    /*describe('CliqzHumanWeb.parseURL', function() {

        var testFn = function(url) {
            var parts = CliqzHumanWeb.parseURL(url);
            // forwards compatibility
            parts['query'] = parts['query_string'] == null ? '' : parts['query_string'];
            parts['query_keys'] = CliqzHumanWeb.getParametersQS(parts['query']);
            parts['parameters'] = '';
            parts['parameter_keys'] = {};
            parts['fragment'] = '';
            parts['fragment_keys'] = {};
            return parts;
        };
        fullTest(testFn);

    });

    describe('CliqzHumanWeb.parseUri', function() {

        var testFn = function(url) {
            var parts = CliqzHumanWeb.parseUri(url);
            // forwards compatibility
            parts['username'] = parts['user'];
            parts['hostname'] = parts['host'];
            if(parts['port'] == '') parts['port'] = 80;
            parts['query_keys'] = CliqzHumanWeb.getParametersQS(parts['query']);
            parts['parameters'] = '';
            parts['parameter_keys'] = {};
            parts['fragment'] = parts['anchor'];
            parts['fragment_keys'] = CliqzHumanWeb.getParametersQS(parts['fragment']);
            return parts;
        };
        fullTest(testFn);

    });*/
};
