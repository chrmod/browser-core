  'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CUcrawlTest'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

//
// original name in the standalone ucrawl extension
// git@github.com:mozilla/ucrawl.git
//
//XPCOMUtils.defineLazyModuleGetter(this, 'Ucrawlutils',
//  'chrome://ucrawlmodules/content/Ucrawlutils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;


CliqzUtils.setPref('safe_browsing_events','https://mozilla-ucrawl.cliqz.com');
//CliqzUtils.setPref('safe_browsing_events','http://0.0.0.0:8080');
//CliqzUtils.setPref('safe_browsing_events', CliqzUtils.getPref('safe_browsing_events', 'https://mozilla-ucrawl.cliqz.com'));
//CliqzUtils.setPref('dnt', CliqzUtils.getPref('dnt', false));


var CUcrawlTest = {
    VERSION: 'moz-test 0.01',
    WAIT_TIME: 2000,
    LOG_KEY: 'moz-test-ucrawl',
    debug: true,
    httpCache: {},
    httpCache401: {},
    queryCache: {},
    privateCache: {},
    UrlsCache : {},
    strictMode: false,
    qs_len:30,
    rel_part_len:18,
    doubleFetchTimeInSec: 3600,
    can_urls: {},
    deadFiveMts: 5,
    deadTwentyMts: 20,
    msgType:'moz-test-ucrawl',
    userTransitions: {
        search: {}
    },
    activityDistributor : Components.classes["@mozilla.org/network/http-activity-distributor;1"]
                               .getService(Components.interfaces.nsIHttpActivityDistributor),
    userTransitionsSearchSession: 5*60,
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    },
    parseUri: function (str) {
        //var o   = parseUri.options,
        var m = null;
        var _uri = null;
        var i = null;
        var m   = CUcrawlTest.parser[CUcrawlTest.strictMode ? "strict" : "loose"].exec(str);
        var _uri = {};
        var i   = 14;

        while (i--) _uri[CUcrawlTest.key[i]] = m[i] || "";

        _uri[CUcrawlTest.q.name] = {};
        _uri[CUcrawlTest.key[12]].replace(CUcrawlTest.q.parser, function ($0, $1, $2) { if ($1) { _uri[CUcrawlTest.q.name][$1] = $2; }});
        return _uri;
    },
    maskURL: function(url){
        var url_parts = null;
        var masked_url = null;
        url_parts = CUcrawlTest.parseUri(url);

        if (CUcrawlTest.dropLongURL(url)) {
            //Explicit check for google search url.
            if(url_parts['host'].indexOf('google') > 0){
                if(url_parts['queryKey']['url']){
                    masked_url = url_parts['queryKey']['url'];
                    masked_url = CUcrawlTest.maskURL(decodeURIComponent(''+masked_url));
                    return masked_url;
                }
            }
            masked_url = url_parts.protocol + "://"  + url_parts.authority + "/ (PROTECTED)" ;
            return masked_url;
        }
        return url;
    },
    getTime:function() {
        var d = null;
        var m = null;
        var y = null;
        var hr = null;
        var _ts = null;
        d = (new Date().getUTCDate()  < 10 ? "0" : "" ) + new Date().getUTCDate();
        m = (new Date().getUTCMonth() < 10 ? "0" : "" ) + new Date().getUTCMonth();
        y = new Date().getUTCFullYear();
        _ts = y + "" + m + "" + d;
        return _ts;
    },
    isSuspiciousURL: function(aURI) {
        var url_parts = {};
        var whitelist = ['google','yahoo','bing'];

        url_parts = CUcrawlTest.parseUri(aURI);

        //CliqzUtils.log("Sanitize: " + url_parts.host, CUcrawlTest.LOG_KEY);
        //CliqzUtils.log("Sanitize: " + url_parts.source.indexOf('about:'), CUcrawlTest.LOG_KEY);
        if (url_parts.source.indexOf('about:') == 0){
            return true;
        }

        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(url_parts.host)) {
            return true;
        }

        if (url_parts.user!="" || url_parts.password!="" ) {
            return true;
        }

        //CliqzUtils.log("Sanitize: " + url_parts.port , CUcrawlTest.LOG_KEY);
        if (url_parts.port != "" & (url_parts.port!="80" || url_parts.port!="443")) {
            return true;
        }

        if ( url_parts.protocol != "http"  & url_parts.protocol!="https"  & url_parts.protocol != "") {
            return true;
        }

        if ( url_parts.source.indexOf('#') > -1 & CUcrawlTest.checkIfSearchURL(url_parts.source) != true) {
            if (CUcrawlTest.debug) CliqzUtils.log("Dropped because of # in url: " + decodeURIComponent(aURI)  , CUcrawlTest.LOG_KEY);
            return true;
        }
    },
    dropLongURL: function(url){
        var url_parts = {};

        url_parts = CUcrawlTest.parseUri(url);
        if (url_parts.query.length > CUcrawlTest.qs_len) {
            return true;
        }


        var v = url_parts.relative.split(/[/._ -]/);
        for (let i=0; i<v.length; i++) {
            if (v[i].length > CUcrawlTest.rel_part_len) {
                return true;
            }
        }

        // check for certain patterns, wp-admin  /admin[?#] login[.?#] logout[.?#] edit[.?#] [&?#]sharing [&?#]share WebLogic [&?#]url [&?#]u [&?#]red /url[?#]
        // if they match any, return true


    },
    createTable: function(reason){
        CUcrawlTest.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.test.dbusafe"]));
        var usafe = "create table usafe(\
                url VARCHAR(255) PRIMARY KEY NOT NULL,\
                ref VARCHAR(255),\
                last_visit INTEGER,\
                first_visit INTEGER,\
                hash VARCHAR(2048), \
                reason VARCHAR(256), \
                private BOOLEAN DEFAULT 0,\
                checked BOOLEAN DEFAULT 0, \
                payload VARCHAR(3000) \
                )";

        try{
            CUcrawlTest.dbConn.executeSimpleSQL(usafe)
        }catch(ee){};



    },
    cleanHttpCache: function() {
      for(var key in CUcrawlTest.httpCache) {
        if ((CUcrawlTest.counter - CUcrawlTest.httpCache[key]['time']) > 60*CUcrawlTest.tmult) {
          delete CUcrawlTest.httpCache[key];
        }
      }
      for(var key in CUcrawlTest.httpCache401) {
        if ((CUcrawlTest.counter - CUcrawlTest.httpCache401[key]['time']) > 60*CUcrawlTest.tmult) {
          delete CUcrawlTest.httpCache401[key];
        }
      }
    },
    getHeaders: function(strData) {
      //CliqzUtils.log("In get headers:",CUcrawlTest.LOG_KEY);
      var o = {};
      o['status'] = strData.split(" ")[1];

      var l = strData.split("\n");
      for(var i=0;i<l.length;i++) {
        if (l[i].indexOf('Location: ') == 0) {
          o['loc'] = decodeURIComponent(l[i].split(" ")[1].trim());
        }
        if (l[i].indexOf('WWW-Authenticate: ') == 0) {
          var tmp = l[i].split(" ");
          var tmp = tmp.slice(1, tmp.length).join(" ");
          o['auth'] = tmp;
        }
      }

      return o;
    },
    httpObserver: {
        // check the non 2xx page and report if this is one of the cliqz result
        observeActivity: function(aHttpChannel, aActivityType, aActivitySubtype, aTimestamp, aExtraSizeData, aExtraStringData) {

            try {
                var aChannel = aHttpChannel.QueryInterface(nsIHttpChannel);
                var url = decodeURIComponent(aChannel.URI.spec);
                var ho = CUcrawlTest.getHeaders(aExtraStringData);
                var status = ho['status'];
                var loc = ho['loc'];
                var httpauth = ho['auth'];
                if (status=='301') {
                  CUcrawlTest.httpCache[url] = {'status': status, 'time': CUcrawlTest.counter, 'location': loc};
                }

                if (status=='401') {
                  CUcrawlTest.httpCache401[url] = {'time': CUcrawlTest.counter};
                }

              } catch(ee){}
        }
    },
    linkCache: {},
    cleanLinkCache: function() {
      for(var key in CUcrawlTest.linkCache) {
        if ((CUcrawlTest.counter - CUcrawlTest.linkCache[key]['time']) > 30*CUcrawlTest.tmult) {
          delete CUcrawlTest.linkCache[key];
        }
      }
    },
    scrapeQuery: function(currURL, document) {
        try {
            var val = document.getElementById('ires').attributes['data-async-context'].value;
            if (val.indexOf('query:') == 0) {
               return decodeURIComponent(val.replace('query:','').trim()).trim();
            }
            else return null;
        }
        catch(ee) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('Exception scrapping query: ' + ee, CUcrawlTest.LOG_KEY);
            }
            return null;
        }
        //q = document.getElementById('ires').attributes['data-async-context'].value;
    },
    searchResultsRefine: function(_res){
      var res={};

      //res = {};
      for (var i=0;i<_res.length;i++){
        if(_res[i].href.indexOf('r.search.yahoo.com') > 0){
          res[''+i] = {'u': _res[i].href.split('%2f')[2], 't': _res[i].text};

        }
        else{
          res[''+i] = {'u': CUcrawlTest.maskURL(_res[i].href), 't': _res[i].text};
        }

      }
      //CliqzUtils.log("Yahoo results: " + JSON.stringify(res,undefined,2),CUcrawlTest.LOG_KEY);
      return res;
    },
    searchResults:function(currURL, document){
        var _res = null;
        var query = null;
        var res = {};
        res['t'] = CUcrawlTest.getTime();//new Date().getTime();
        res['r'] = {};
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        res['ctry'] = location;
        res['qurl'] = CUcrawlTest.maskURL(currURL);

        if(currURL.indexOf('google') > 0) {
            var val = document.getElementById('ires').attributes['data-async-context'].value;
            if (val.indexOf('query:') == 0) query = decodeURIComponent(val.replace('query:','').trim()).trim();
            _res = Array.prototype.slice.call(document.querySelectorAll('.r [href]')).filter(function(e){var r = RegExp("^http(s)?\:\/\/((www|encrypted)\.)?google\.(com?\.[a-z]{2}|[a-z]{2,})\/.+");   return !r.test(e.getAttribute('href') );    });
        }
        else if(currURL.indexOf('bing') > 0) {
            query = document.getElementById('sb_form_q').value;
            _res = Array.prototype.slice.call(document.querySelectorAll('h2 [href]')).filter(function(e){var r = RegExp("^http(s)?\\:\\/\\/www\\.bing\\.com\\/(.)*");   return !r.test(e.getAttribute('h2 href') );});
        }
        else if(currURL.indexOf('yahoo') > 0) {
            query = document.getElementById('yschsp').value;
            _res = Array.prototype.slice.call(document.querySelectorAll('h3 [href]')).filter(function(e){var r = RegExp("^http(s)?\\:\\/\\/((.)+\\.)?search\\.yahoo\\.com\\/(.)*");   return !r.test(e.getAttribute('h3 href') );    });
        }

        res['r'] = CUcrawlTest.searchResultsRefine(_res);
        res['q'] = query;

        if (CUcrawlTest.debug) {
            CliqzUtils.log('>>> Results moz-ucrawl: ' +  JSON.stringify(res,undefined,2), CUcrawlTest.LOG_KEY);
        }
        return res;

    },
    checkIfSearchURL:function(activeURL) {
        var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
        var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; // regex for yahoo query
        var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; // regex for yahoo query
        var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
        var rerefurl = /url=(.+?)&/; // regex for the url in google refurl
        if ((requery.test(activeURL) || yrequery.test(activeURL) || brequery.test(activeURL) ) && !reref.test(activeURL)){
            return true;
        }
        else{
            return false;
        }


    },
    getSearchData: function(activeURL, document){
        // here we check if user ignored our results and went to google and landed on the same url
        var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
        var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; // regex for yahoo query
        var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; // regex for yahoo query
        var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
        var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

        //Get google result
        var rq = null;
        if (requery.test(activeURL)) {
            rq = CUcrawlTest.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawlTest.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'go'};
                CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'query', 'payload': rq});
                }
            }
        //Get yahoo result
        if (yrequery.test(activeURL)) {
            rq = CUcrawlTest.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawlTest.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'yahoo'};
                CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'query', 'payload': rq});
                }
            }

         //Get Bing result
        if (brequery.test(activeURL)){
            rq = CUcrawlTest.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawlTest.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'bing'};
                CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'query', 'payload': rq});
                }
        }
        return rq



    },
    userSearchTransition: function(rq){
        // now let's manage the userTransitions.search
        if (rq!=null) {
            var source = rq['qurl'];
            var query = rq['q'].replace(/\s+/g, " ").trim().toLowerCase();

            if (source && query && query.length>0) {
                // we have both the source and the query,
                // let's see if we have done the query

                if (CUcrawlTest.userTransitions['search'][query] == null) {
                    CUcrawlTest.userTransitions['search'][query] = {'time': CUcrawlTest.counter, 'data': []}
                }
                CUcrawlTest.userTransitions['search'][query]['data'].push([source, CUcrawlTest.counter - CUcrawlTest.userTransitions['search'][query]['time']]);
                }
            }

    },
    getParametersQS: function(url) {
        var res = {};
        var KeysValues = url.split(/[\?&]+/);
        for (var i = 0; i < KeysValues.length; i++) {
            var kv = KeysValues[i].split("=");
            if (kv.length==2) res[kv[0]] = kv[1];
        }
        return res;
    },
    getEmbeddedURL: function(targetURL) {
        var ihttps = targetURL.lastIndexOf('https://')
        var ihttp = targetURL.lastIndexOf('http://')
        if (ihttps>0 || ihttp>0) {
            // contains either http or https not ont he query string, very suspicious
            var parqs = CUcrawlTest.getParametersQS(targetURL);
            if (parqs['url']) {
                return decodeURIComponent(parqs['url']);
            }
        }
        else return null;
    },
    auxIsAlive: function() {
        return true;
    },
    auxGetPageData: function(url, onsuccess, onerror) {

        var error_message = null;

        var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
        req.open('GET', url, true);
        req.overrideMimeType('text/html');
        req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS;
        //req.withCredentials = false;
        //req.setRequestHeader("Authorization", "true");

        // CUcrawlTest.auxGetPageData('http://github.com/cliqz/navigation-extension/', function(x) {console.log(x);}, function(y) {})
        // CUcrawlTest.auxGetPageData('https://www.google.de/?gfe_rd=cr&ei=zk_bVNiXIMGo8wfwkYHwBQ&gws_rd=ssl', function(x) {console.log(x);}, function(y) {})

        req.onload = function(){

            if (req.status != 200 && req.status != 0 /* local files */){
                error_message = 'status not valid: ' + req.status;
                if (CUcrawlTest.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawlTest.LOG_KEY);
                req.onerror();
            }
            else {
                // there has been a redirect, we cannot guarantee that cookies were
                // not sent, therefore fail and consider as private
                if (req.responseURL != url) {
                    if (decodeURI(decodeURI(req.responseURL)) != decodeURI(decodeURI(url))) {
                        error_message = 'dangerous redirect';
                        if (CUcrawlTest.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawlTest.LOG_KEY);
                        if (CUcrawlTest.debug) CliqzUtils.log("DANGER: " + url + ' ' + req.responseURL , CUcrawlTest.LOG_KEY);
                        req.onerror();
                        return;
                    }
                }

                var document = Services.appShell.hiddenDOMWindow.document;
                var doc = document.implementation.createHTMLDocument("example");
                doc.documentElement.innerHTML = req.responseText;

                var x = CUcrawlTest.getPageData(url, doc);

                onsuccess(x);

            }
        }

        req.onerror = function() {
            onerror(error_message);
        }
        req.ontimeout = function() {
            error_message = 'timeout';
            if (CUcrawlTest.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawlTest.LOG_KEY);
            req.onerror();
        }

        req.timeout = 10000;
        req.send(null);


    },
    auxIntersection: function(a, b) {
        var ai=0, bi=0;
        var result = new Array();
        while( ai < a.length && bi < b.length ) {
            if      (a[ai] < b[bi] ){ ai++; }
            else if (a[ai] > b[bi] ){ bi++; }
            else {
                result.push(a[ai]);
                ai++;
                bi++;
            }
        }
        return result;
    },
    auxUnion: function(a, b) {
        var h = {};
        for (var i = a.length-1; i >= 0; -- i) h[a[i]] = a[i];
        for (var i = b.length-1; i >= 0; -- i) h[b[i]] = b[i];
        var res = [];
        for (var k in h) {
            if (h.hasOwnProperty(k)) res.push(h[k]);
        }
        return res;
    },
    validDoubleFetch: function(struct_bef, struct_aft) {
        // compares the structure of the page when rendered in Firefox with the structure of
        // the page after.


        if (CUcrawlTest.debug) {
            CliqzUtils.log("xbef: " + JSON.stringify(struct_bef), CUcrawlTest.LOG_KEY);
            CliqzUtils.log("xaft: " + JSON.stringify(struct_aft), CUcrawlTest.LOG_KEY);
        }

        // if any of the titles is null (false), then decline (discard)

        if (!(struct_bef['t'] && struct_aft['t'])) {
            if (CUcrawlTest.debug) CliqzUtils.log("fovalidDoubleFetch: found an empty title", CUcrawlTest.LOG_KEY);
            return false;
        }


        // if any of the two struct has a iall to false decline
        if (!(struct_bef['iall'] && struct_aft['iall'])) {
            if (CUcrawlTest.debug) CliqzUtils.log("fovalidDoubleFetch: found a noindex", CUcrawlTest.LOG_KEY);
            return false;
        }


        // if there is enough html length, do the ratio, if below or above 10% then very imbalance, discard
        var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
        if ((struct_bef['lh'] || 0) > 10*1024) {
            var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
            if (ratio_lh < 0.10 || ratio_lh > 0.90) {
                if (CUcrawlTest.debug) CliqzUtils.log("fovalidDoubleFetch: lh is not balanced", CUcrawlTest.LOG_KEY);
                return false;
            }
        }

        // if there is enough html length, do the ratio, if below or above 10% then very imbalance, discard
        var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
        if ((struct_bef['lh'] || 0) > 30) {
            var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
            if (ratio_nl < 0.10 || ratio_nl > 0.90) {
                if (CUcrawlTest.debug) CliqzUtils.log("fovalidDoubleFetch: nl is not balanced", CUcrawlTest.LOG_KEY);
                return false;
            }
        }


        // compare that titles are equal, if not equal, use the jaccard coefficient, decline if <=0.5
        var t1 = struct_bef['t'] || '';
        var t2 = struct_aft['t'] || '';
        var jc = 1.0;

        if (t1!=t2) {
            // check if they differ only in one term (defined by spaces)
            var vt1 = t1.split(' ').filter(function(el) {el.length>1});
            var vt2 = t2.split(' ').filter(function(el) {el.length>1});;

            jc = CUcrawlTest.auxIntersection(vt1,vt2).length / CUcrawlTest.auxUnion(vt1,vt2).length;
            if (jc <= 0.5) {

                // one last check, perhaps it's an encoding issue

                var tt1 = t1.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
                var tt2 = t2.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');

                if ((tt1.length > t1.length*0.5) && ((tt1.length > t1.length*0.5))) {
                    // if we have not decreased the titles by more than 50%
                    var vtt1 = tt1.split(' ').filter(function(el) {el.length>1});
                    var vtt2 = tt2.split(' ').filter(function(el) {el.length>1});
                    jc = CUcrawlTest.auxIntersection(vtt1,vtt2).length / CUcrawlTest.auxUnion(vtt1,vtt2).length;
                    // we are more demanding on the title overlap now
                    if (jc <= 0.80) {
                        if (CUcrawlTest.debug) CliqzUtils.log("validDoubleFetch: fail title overlap after ascii", CUcrawlTest.LOG_KEY);
                        return false;
                    }
                }
                else {
                  if (CUcrawlTest.debug) CliqzUtils.log("validDoubleFetch: fail title overlap", CUcrawlTest.LOG_KEY);
                  return false;
                }
            }
        }


        if (jc < 1.0) {
            // if the titles are not a perfect match then check for more structural things like number of inputs
            // that are type password and number of forms. This is prone to false positives because when not logged in
            // legitimate sites something prompt you to register


            // if had no password inputs before and it has after, decline
            if ((struct_bef['nip'] == null || struct_aft['nip'] == null) || (struct_bef['nip'] == 0 && struct_aft['nip'] != 0)) {
                if (CUcrawlTest.debug) CliqzUtils.log("validDoubleFetch: fail nip", CUcrawlTest.LOG_KEY);
                return false;
            }

            // if had no forms before and it has after, decline
            if ((struct_bef['nf'] == null || struct_aft['nf'] == null) || (struct_bef['nf'] == 0 && struct_aft['nf'] != 0)) {
                if (CUcrawlTest.debug) CliqzUtils.log("validDoubleFetch: fail text nf", CUcrawlTest.LOG_KEY);
                return false;
            }

        }


        return true;

    },
    doubleFetch: function(url, page_struct_before, page_doc) {

        // one last validation whether should be fetchable or not. If we cannot send that URL because it's
        // private/suspicious/search_result page/etc. we can mark it as private directly

        var isok = true;

        if (page_doc['x'] == null) {
            // this should not happen, but it does. Need to debug why the 'x' field gets lost
            // right now, let's set is a private to avoid any risk
            //
            isok = false
        }

        else {
            if (page_doc['x']['iall'] == false) {
                // the url is marked as noindex
                isok = false;
            }
        }

        if (CUcrawlTest.dropLongURL(url)) {

            if (page_doc['canonical_url']) {
                // the url is to be drop, but it has a canonical URL so it should be public
                if (CUcrawlTest.dropLongURL(page_doc['canonical_url'])) {
                    // wops, the canonical is also bad, therefore mark as private
                    isok = false;
                }
                else {
                    // there we are in the good scenario in which canonical looks ok although
                    // url did not
                    isok = true;
                }
            }
            else {
                isok = false;
            }
        }

        if (isok) {


            CUcrawlTest.auxGetPageData(url, function(data) {

                if (CUcrawlTest.debug) CliqzUtils.log("success on doubleFetch, need further validation", CUcrawlTest.LOG_KEY);

                if (CUcrawlTest.validDoubleFetch(page_struct_before, data)) {
                    if (CUcrawlTest.debug) CliqzUtils.log("success on doubleFetch, need further validation", CUcrawlTest.LOG_KEY);
                    CUcrawlTest.setAsPublic(url);
                    CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'page', 'payload': page_doc});
                }
                else {
                    if (CUcrawlTest.debug) CliqzUtils.log("failure on doubleFetch! " + "structure did not match", CUcrawlTest.LOG_KEY);
                    CUcrawlTest.setAsPrivate(url);
                }
            },
            function(error_message) {
                if (CUcrawlTest.debug) CliqzUtils.log("failure on doubleFetch! " + error_message, CUcrawlTest.LOG_KEY);
                CUcrawlTest.setAsPrivate(url);
            });

        }
        else {
            if (CUcrawlTest.debug) CliqzUtils.log("doubleFetch refused to process this url: " + url, CUcrawlTest.LOG_KEY);
            CUcrawlTest.setAsPrivate(url);
        }

    },
    getPageData: function(url, cd) {

        var len_html = null;
        var len_text = null;
        var title = null;
        var numlinks = null;
        var inputs = null;
        var inputs_nh = null;
        var inputs_pwd = null;
        var forms = null;
        var pg_l = null;
        var metas = null;
        var tag_html = null;
        var iall = true;
        var all = null;
        var canonical_url = null;

        try { len_html = cd.documentElement.innerHTML.length; } catch(ee) {}
        try { len_text = cd.documentElement.textContent.length; } catch(ee) {}
        try { title = cd.getElementsByTagName('title')[0].textContent; } catch(ee) {}
        //title = unescape(encodeURIComponent(title));

        try { numlinks = cd.getElementsByTagName('a').length; } catch(ee) {}
        try {
            inputs = cd.getElementsByTagName('input') || [];
            inputs_nh = 0;
            inputs_pwd = 0;
            for(var i=0;i<inputs.length;i++) {
                if (inputs[i]['type'] && inputs[i]['type']!='hidden') inputs_nh+=1;
                if (inputs[i]['type'] && inputs[i]['type']=='password') inputs_pwd+=1;
            }
        } catch(ee) {}

        try { forms = cd.getElementsByTagName('form'); } catch(ee) {}

        var metas = cd.getElementsByTagName('meta');

        // extract the language of th
        try {
            for (let i=0;i<metas.length;i++) {if (metas[i].getAttribute("http-equiv") == "content-language" || metas[i].getAttribute("name") == "language") {
                pg_l = metas[i].getAttribute("content");
            }};

            if (pg_l == null) {
                tag_html = cd.getElementsByTagName('html');
                pg_l = tag_html[0].getAttribute("lang");
            };
        }catch(ee){}


        // extract if indexable, no noindex on robots meta tag
        try {
            for (let i=0;i<metas.length;i++) {
                var cnt = metas[i].getAttribute('content');
                if (cnt!=null && cnt.indexOf('noindex') > -1) {
                    iall = false;
                }
            }
        }catch(ee){}

        // extract the canonical url if available
        var link_tag = cd.getElementsByTagName('link');
        for (var j=0;j<link_tag.length;j++) {
            if (link_tag[j].getAttribute("rel") == "canonical") canonical_url = link_tag[j].href;
        }


        if (canonical_url != null && canonical_url.length > 0) {
            // check that is not relative
            if (canonical_url[0] == '/') {
                var ourl = CUcrawlTest.parseURL(url);
                // ignore if httpauth or if non standard port
                canonical_url = ourl['protocol'] + '://' + ourl['hostname'] + canonical_url;
            }
        }

        // extract the location of the user (country level)
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){}


        var x = {'lh': len_html, 'lt': len_text, 't': title, 'nl': numlinks, 'ni': (inputs || []).length, 'ninh': inputs_nh, 'nip': inputs_pwd, 'nf': (forms || []).length, 'pagel' : pg_l , 'ctry' : location, 'iall': iall, 'canonical_url': canonical_url };
        //CliqzUtils.log("Testing" + x.ctry, CUcrawlTest.LOG_KEY);
        return x;
    },
    getCDByURL: function(url) {


        var dd_url = url;

        try {
            dd_url = decodeURI(decodeURI(url));
        } catch(ee) {}

        for (var j = 0; j < CUcrawlTest.windowsRef.length; j++) {
            var gBrowser = CUcrawlTest.windowsRef[j].gBrowser;
            if (gBrowser.tabContainer) {
                var numTabs = gBrowser.tabContainer.childNodes.length;
                for (var i=0; i<numTabs; i++) {
                    var currentTab = gBrowser.tabContainer.childNodes[i];
                    var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                    var currURL=''+currentBrowser.contentDocument.location;

                    if (CUcrawlTest.debug) {
                        CliqzUtils.log("getCDByURL: " + (currURL==''+url) + " >> " + url + " " + currURL, CUcrawlTest.LOG_KEY);
                    }

                    if (currURL==''+url) {
                        return currentBrowser.contentDocument;
                    }
                    else {
                        // silent fail is currURL is invalid, we need to ignore that element otherwise
                        // one bad url would prevent any other url to be found
                        //
                        try {
                            if (decodeURI(decodeURI(currURL))==dd_url) return currentBrowser.contentDocument;
                        }
                        catch(ee) {}
                    }
                }
            }
        }

        return null;
    },
    listener: {
        tmpURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            // New location, means a page loaded on the top window, visible tab

            if (aURI.spec == this.tmpURL) return;
            this.tmpURL = aURI.spec;


            // here we check if user ignored our results and went to google and landed on the same url
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
            var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; // regex for yahoo query
            var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; // regex for yahoo query
            var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
            var rerefurl = /url=(.+?)&/; // regex for the url in google refurl
            var currwin = CliqzUtils.getWindow();

            CUcrawlTest.lastActive = CUcrawlTest.counter;
            CUcrawlTest.lastActiveAll = CUcrawlTest.counter;

            var activeURL = CUcrawlTest.currentURL();
            //Check if the URL is know to be bad: private, about:, odd ports, etc.
            if (CUcrawlTest.isSuspiciousURL(activeURL)) return;



            if (activeURL.indexOf('about:')!=0) {
                if (CUcrawlTest.state['v'][activeURL] == null) {
                    // we check for privacy, if not private the function will add the url
                    // to the UrlsCache
                    CUcrawlTest.getPageFromDB(activeURL, function(page) {
                        if ((page!=null) && (page.checked==1) && (page.private==0)) {
                            CUcrawlTest.UrlsCache[activeURL] = true;
                        }
                    });

                    //if ((requery.test(activeURL) || yrequery.test(activeURL) || brequery.test(activeURL) ) && !reref.test(activeURL)) {
                    if (CUcrawlTest.checkIfSearchURL(activeURL)){


                        currwin.setTimeout(function(currURLAtTime) {

                            // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                            if (CUcrawlTest) {
                                try {

                                    // FIXME: this begs for refactoring!!

                                    var activeURL = CUcrawlTest.currentURL();
                                    var document = null;
                                    var searchURL = null;

                                    if (currURLAtTime == activeURL) {
                                        document = currwin.gBrowser.selectedBrowser.contentDocument;
                                        searchURL = activeURL;
                                    }
                                    else{
                                        document = CUcrawlTest.getCDByURL(currURLAtTime);
                                        searchURL = currURLAtTime;

                                    }

                                    var rq = null;
                                    rq = CUcrawlTest.getSearchData(searchURL, document);
                                    CUcrawlTest.userSearchTransition(rq);


                                }
                                catch(ee) {
                                    // silent fail
                                    if (CUcrawlTest.debug) {
                                        CliqzUtils.log('Exception: ' + ee, CUcrawlTest.LOG_KEY);
                                    }
                                }
                            }

                        }, CUcrawlTest.WAIT_TIME, activeURL);
                    }


                    var status = null;

                    if (CUcrawlTest.httpCache[activeURL]!=null) {
                        status = CUcrawlTest.httpCache[activeURL]['status'];
                    }

                    var referral = null;
                    var qreferral = null;
                    if (CUcrawlTest.linkCache[activeURL] != null) {
                        //referral = CUcrawlTest.maskURL(CUcrawlTest.linkCache[activeURL]['s']);
                        referral = CUcrawlTest.linkCache[activeURL]['s'];
                    }


                    CUcrawlTest.state['v'][activeURL] = {'url': activeURL, 'a': 0, 'x': null, 'tin': new Date().getTime(),
                            'e': {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}, 'st': status, 'c': [], 'ref': referral,
                            'tbeg':CUcrawlTest.getTime()};

                    if (referral) {
                        // if there is a good referral, we must inherit the query if there is one
                        if (CUcrawlTest.state['v'][referral] && CUcrawlTest.state['v'][referral]['qr']) {
                            CUcrawlTest.state['v'][activeURL]['qr'] = {}
                            CUcrawlTest.state['v'][activeURL]['qr']['q'] = CUcrawlTest.state['v'][referral]['qr']['q'];
                            CUcrawlTest.state['v'][activeURL]['qr']['t'] = CUcrawlTest.state['v'][referral]['qr']['t'];
                            CUcrawlTest.state['v'][activeURL]['qr']['d'] = CUcrawlTest.state['v'][referral]['qr']['d']+1;

                           //If the depth is greater then two, we need to check if the ref. is of same domain.
                            //If not then drop the QR object, else keep it.
                            if(CUcrawlTest.state['v'][activeURL]['qr']['d'] > 2){
                                delete CUcrawlTest.state['v'][activeURL]['qr'];
                            }
                            else if(CUcrawlTest.state['v'][activeURL]['qr']['d'] == 2){
                                if(CUcrawlTest.parseUri(activeURL)['host'] != CUcrawlTest.parseUri(referral)['host']){
                                    delete CUcrawlTest.state['v'][activeURL]['qr'];
                                }
                            }
                        }
                    }

                    currwin.setTimeout(function(currWin, currURL) {

                        // Extract info about the page, title, length of the page, number of links, hash signature,
                        // 404, soft-404, you name it
                        //

                        try {

                            // we cannot get it directly via
                            // var cd = currWin.gBrowser.selectedBrowser.contentDocument;
                            // because during the time of the timeout there can be win or tab switching
                            //
                            //var activeURL = CUcrawlTest.currentURL();
                            //if (activeURL != currURL) {}




                            var cd = CUcrawlTest.getCDByURL(currURL);
                            if (cd==null) {
                                if (CUcrawlTest.debug) {
                                    CliqzUtils.log("CANNOT GET THE CONTENT OF : " + currURL, CUcrawlTest.LOG_KEY);
                                }
                                return;
                            }

                            var x = CUcrawlTest.getPageData(currURL, cd);


                            if (x['canonical_url']) {
                                CUcrawlTest.can_urls[currURL] = x['canonical_url'];
                            }

                            if (CUcrawlTest.state['v'][currURL] != null) {
                                CUcrawlTest.state['v'][currURL]['x'] = x;
                            }

                            if (CUcrawlTest.queryCache[currURL]) {
                                CUcrawlTest.state['v'][currURL]['qr'] = CUcrawlTest.queryCache[currURL];
                            }

                            if (CUcrawlTest.state['v'][currURL] != null) {
                                CUcrawlTest.addURLtoDB(currURL, CUcrawlTest.state['v'][currURL]['ref'], CUcrawlTest.state['v'][currURL]);
                            }

                        } catch(ee) {
                            if (CUcrawlTest.debug) {
                                CliqzUtils.log("Error fetching title and length of page: " + ee, CUcrawlTest.LOG_KEY);
                            }
                        }

                    }, CUcrawlTest.WAIT_TIME, currwin, activeURL);

                }
                else {
                    // wops, it exists on the active page, probably it comes from a back button or back
                    // from tab navigation
                    CUcrawlTest.state['v'][activeURL]['tend'] = null;
                }

                // they need to be loaded upon each onlocation, not only the first time
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("keypress", CUcrawlTest.captureKeyPressPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousemove", CUcrawlTest.captureMouseMovePage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousedown", CUcrawlTest.captureMouseClickPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("scroll", CUcrawlTest.captureScrollPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("copy", CUcrawlTest.captureCopyPage);

            }
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
            //CliqzUtils.log('state change: ' + aWebProgress, CUcrawlTest.LOG_KEY);
        }
    },
    pacemaker: function() {
        var activeURL = CUcrawlTest.currentURL();

        if (activeURL && (activeURL).indexOf('about:')!=0) {
            if ((CUcrawlTest.counter - CUcrawlTest.lastActive) < 5*CUcrawlTest.tmult) {
                // if there has been an event on the last 5 seconds, if not do no count, the user must
                // be doing something else,
                //
                try {
                    CUcrawlTest.state['v'][activeURL]['a'] += 1;
                } catch(ee) {}
            }
        }


        if ((activeURL==null) && ((CUcrawlTest.counter/CUcrawlTest.tmult) % 10 == 0)) {
            // this one is for when you do not have the page open, for instance, no firefox but console opened
            CUcrawlTest.pushAllData();
        }



        if ((CUcrawlTest.counter/CUcrawlTest.tmult) % 1 == 0) {

            var openPages = CUcrawlTest.getAllOpenPages();
            var tt = new Date().getTime();

            for (var url in CUcrawlTest.state['v']) {
                if (CUcrawlTest.state['v'].hasOwnProperty(url)) {

                    if (openPages.indexOf(url)==-1) {
                        // not opened

                        if (CUcrawlTest.state['v'][url]['tend']==null) {
                            CUcrawlTest.state['v'][url]['tend'] = tt;
                            CUcrawlTest.state['v'][url]['tfin'] = CUcrawlTest.getTime();
                        }

                        if ((tt - CUcrawlTest.state['v'][url]['tend']) > CUcrawlTest.deadFiveMts*60*1000) {
                            // move to "dead pages" after 5 minutes
                            CUcrawlTest.state['m'].push(CUcrawlTest.state['v'][url]);

                            //CliqzUtils.log("Deleted: moved to dead pages after 5 mts.",CUcrawlTest.LOG_KEY);
                            CliqzUtils.log(CUcrawlTest.state['m'],CUcrawlTest.LOG_KEY);
                            CUcrawlTest.addURLtoDB(url, CUcrawlTest.state['v'][url]['ref'], CUcrawlTest.state['v'][url]);
                            delete CUcrawlTest.state['v'][url];
                        }
                    }
                    else {
                        // stil opened, do nothing.
                        if ((tt - CUcrawlTest.state['v'][url]['tin']) > CUcrawlTest.deadTwentyMts*60*1000) {
                            // unless it was opened more than 20 minutes ago, if so, let's move it to dead pages

                            CUcrawlTest.state['v'][url]['tend'] = null;
                            CUcrawlTest.state['v'][url]['tfin'] = null;
                            CUcrawlTest.state['v'][url]['too_long'] = true;
                            CUcrawlTest.state['m'].push(CUcrawlTest.state['v'][url]);
                            CUcrawlTest.addURLtoDB(url, CUcrawlTest.state['v'][url]['ref'], CUcrawlTest.state['v'][url]);
                            delete CUcrawlTest.state['v'][url];
                            //CliqzUtils.log("Deleted: moved to dead pages after 20 mts.",CUcrawlTest.LOG_KEY);
                            //CliqzUtils.log("Deleted: moved to dead pages after 20 mts: " + CUcrawlTest.state['m'].length,CUcrawlTest.LOG_KEY);

                        }
                    }
                }
            }
        }

        if ((CUcrawlTest.counter/CUcrawlTest.tmult) % 10 == 0) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('Pacemaker: ' + CUcrawlTest.counter/CUcrawlTest.tmult + ' ' + activeURL + ' >> ' + CUcrawlTest.state.id, CUcrawlTest.LOG_KEY);
                //CliqzUtils.log(JSON.stringify(CUcrawlTest.state, undefined, 2), CUcrawlTest.LOG_KEY);
                //CliqzUtils.log(JSON.stringify(CUcrawlTest.getAllOpenPages(), undefined, 2), CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.cleanHttpCache();
            CUcrawlTest.cleanUserTransitions(false);
        }

        if ((CUcrawlTest.counter/CUcrawlTest.tmult) % (1*60) == 0) {
            // every minute
            CUcrawlTest.listOfUnchecked(1, CUcrawlTest.doubleFetchTimeInSec, null, CUcrawlTest.processUnchecks);
        }

        if ((CUcrawlTest.counter/CUcrawlTest.tmult) % 10 == 0) {
            var ll = CUcrawlTest.state['m'].length;
            if (ll > 0) {
                var v = CUcrawlTest.state['m'].slice(0, ll);
                CUcrawlTest.state['m'] = CUcrawlTest.state['m'].slice(ll, CUcrawlTest.state['m'].length);

                for(var i=0;i<v.length;i++) {
                    if (CUcrawlTest.UrlsCache.hasOwnProperty(v[i]['url'])) {
                        CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'page', 'payload': v[i]});
                    }
                }
            }
        }

        CUcrawlTest.counter += 1;

    },
    cleanUserTransitions: function(force) {
        for(var query in CUcrawlTest.userTransitions['search']) {
            if ((force) || ((CUcrawlTest.counter - CUcrawlTest.userTransitions['search'][query]['time']) > CUcrawlTest.userTransitionsSearchSession*CUcrawlTest.tmult)) {

                // the query session is more than 5 minutes old or we are forcing the event,
                // if the condition is met and there are more than two elements in data we
                // must create the signal
                //
                if (CUcrawlTest.userTransitions['search'][query]['data'].length > 1) {
                    try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                    var doc = {'q': query, 'sources': CUcrawlTest.userTransitions['search'][query]['data'], 't': CUcrawlTest.getTime(), 'ctry': location};
                    if (CUcrawlTest.debug) {
                        CliqzUtils.log(JSON.stringify(doc,undefined,2), CUcrawlTest.LOG_KEY);
                    }
                    CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'userTransition.search', 'payload': doc});
                }
                delete CUcrawlTest.userTransitions['search'][query];
            }
        }

    },
    pushAllData: function() {

        // force send user Transitions sessions even if not elapsed because the browser is shutting down
        CUcrawlTest.cleanUserTransitions(true);

        var tt = new Date().getTime();
        var res = [];
        for (var url in CUcrawlTest.state['v']) {
            if (CUcrawlTest.state['v'][url]) res.push(url);
        }

        for (var i=0; i<res.length; i++) {
            // move all the pages to m set
            var url = res[i];
            if (CUcrawlTest.state['v'][url]) {
                if (CUcrawlTest.state['v'][url]['tend']==null) {
                    CUcrawlTest.state['v'][url]['tend'] = tt;
                    CUcrawlTest.state['v'][url]['tfin'] = CUcrawlTest.getTime();
                }

                CUcrawlTest.state['m'].push(CUcrawlTest.state['v'][url]);
                delete CUcrawlTest.state['v'][url];
            }
        }

        // send them to track if needed
        var ll = CUcrawlTest.state['m'].length;
        if (ll > 0) {
            var v = CUcrawlTest.state['m'].slice(0, ll);
            CUcrawlTest.state['m'] = CUcrawlTest.state['m'].slice(ll, CUcrawlTest.state['m'].length);

            for(var i=0;i<v.length;i++) {
                if (CUcrawlTest.UrlsCache.hasOwnProperty(v[i]['url'])){
                    CUcrawlTest.track({'type': CUcrawlTest.msgType, 'action': 'page', 'payload': v[i]});
                }
            }
            // do a instant push on whatever is left on the track
            CUcrawlTest.pushTrack();
        }
    },
    destroy: function() {
        //debugger;
        if(!CliqzUtils.getPref("safeBrowsingMoz", false))return;

        CliqzUtils.log('destroy', CUcrawlTest.LOG_KEY);

        // send all the data
        CUcrawlTest.pushAllData();
        CliqzUtils.clearTimeout(CUcrawlTest.pacemakerId);
        CliqzUtils.clearTimeout(CUcrawlTest.trkTimer);
        CliqzUtils.log('end_destroy', CUcrawlTest.LOG_KEY);
    },
    destroyAtBrowser: function(){
        //var activityDistributor = Components.classes["@mozilla.org/network/http-activity-distributor;1"]
        //                              .getService(Components.interfaces.nsIHttpActivityDistributor);
        //CUcrawlTest.activityDistributor.removeObserver(CUcrawlTest.httpObserver);

        CUcrawlTest.activityDistributor.removeObserver(CUcrawlTest.httpObserver);
    },
    currentURL: function() {
        var currwin = CliqzUtils.getWindow();
        if (currwin) {
            var currURL = ''+currwin.gBrowser.selectedBrowser.contentDocument.location;
            try {
                currURL = decodeURIComponent(currURL.trim());
            } catch(ee) {}

            if (currURL!=null || currURL!=undefined) return currURL;
            else return null;
        }
        else return null;
    },
    pacemakerId: null,
    // load from the about:config settings
    captureKeyPress: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['keypress']|0)) > 1 * CUcrawlTest.tmult && ((CUcrawlTest.counter - (CUcrawlTest.lastEv['keypresspage']|0)) > 1 * CUcrawlTest.tmult)) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureKeyPressAll', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['keypress'] = CUcrawlTest.counter;
            CUcrawlTest.lastActiveAll = CUcrawlTest.counter;
        }
    },
    captureMouseMove: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mousemove']|0)) > 1 * CUcrawlTest.tmult && ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mousemovepage']|0)) > 1 * CUcrawlTest.tmult)) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureMouseMoveAll', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['mousemove'] = CUcrawlTest.counter;
            CUcrawlTest.lastActiveAll = CUcrawlTest.counter;
        }
    },
    captureMouseClick: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mouseclick']|0)) > 1 * CUcrawlTest.tmult && ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mouseclickpage']|0)) > 1 * CUcrawlTest.tmult)) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureMouseClickAll', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['mouseclick'] = CUcrawlTest.counter;
            CUcrawlTest.lastActiveAll = CUcrawlTest.counter;
        }
    },
    captureKeyPressPage: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['keypresspage']|0)) > 1 * CUcrawlTest.tmult) {
            if (CUcrawlTest.debug) {
                //CliqzUtils.log('captureKeyPressPage', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['keypresspage'] = CUcrawlTest.counter;
            CUcrawlTest.lastActive = CUcrawlTest.counter;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.state['v'][activeURL]!=null && CUcrawlTest.state['v'][activeURL]['a'] > 1*CUcrawlTest.tmult) {
                CUcrawlTest.state['v'][activeURL]['e']['kp'] += 1;
            }
        }
    },
    captureMouseMovePage: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mousemovepage']|0)) > 1 * CUcrawlTest.tmult) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureMouseMovePage', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['mousemovepage'] = CUcrawlTest.counter;
            CUcrawlTest.lastActive = CUcrawlTest.counter;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.state['v'][activeURL]!=null && CUcrawlTest.state['v'][activeURL]['a'] > 1*CUcrawlTest.tmult) {
                CUcrawlTest.state['v'][activeURL]['e']['mm'] += 1;
            }
        }
    },
    getURLFromEvent: function(ev) {
        try {
            if (ev.target.href!=null || ev.target.href!=undefined) {
                return decodeURIComponent(''+ev.target.href);
            }
            else {
                if (ev.target.parentNode.href!=null || ev.target.parentNode.href!=undefined) {
                    return decodeURIComponent(''+ev.target.parentNode.href);
                }
            }
        }
        catch(ee) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('Error in getURLFromEvent: ' + ee, CUcrawlTest.LOG_KEY);
            }
        }
        return null;
    },
    captureMouseClickPage: function(ev) {

        // if the target is a link of type hash it does not work, it will create a new page without referral
        //

        var targetURL = CUcrawlTest.getURLFromEvent(ev);

        if (targetURL!=null) {

            var embURL = CUcrawlTest.getEmbeddedURL(targetURL);
            if (embURL!=null) targetURL = embURL;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureMouseClickPage>> ' + CUcrawlTest.counter + ' ' + targetURL  + ' : ' + " active: " + activeURL + " " + (CUcrawlTest.state['v'][activeURL]!=null) + " " + ev.target + ' :: ' + ev.target.value  + ' >>' + JSON.stringify(CUcrawlTest.lastEv), CUcrawlTest.LOG_KEY);
            }

            //var activeURL = CUcrawlTest.currentURL();

            if (CUcrawlTest.state['v'][activeURL]!=null) {
                //Fix same link in 'l'
                //Only add if gur. that they are public and the link exists in the double fetch page(Public).it's available on the public page.Such
                //check is not done, therefore we do not push the links clicked on that page. - potential record linkage.

                //CUcrawlTest.state['v'][activeURL]['c'].push({'l': ''+ CUcrawlTest.maskURL(targetURL), 't': CUcrawlTest.counter});
                CUcrawlTest.linkCache[targetURL] = {'s': ''+activeURL, 'time': CUcrawlTest.counter};
                //Need a better fix, can't locate the cache.
                //CUcrawlTest.addURLtoDB(activeURL, CUcrawlTest.state['v'][activeURL]['ref'], CUcrawlTest.state['v'][activeURL]);
            }
        }

        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['mouseclickpage']|0)) > 1 * CUcrawlTest.tmult) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureMouseClickPage', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['mouseclickpage'] = CUcrawlTest.counter;
            CUcrawlTest.lastActive = CUcrawlTest.counter;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.state['v'][activeURL]!=null && CUcrawlTest.state['v'][activeURL]['a'] > 1*CUcrawlTest.tmult) {
                CUcrawlTest.state['v'][activeURL]['e']['md'] += 1;
            }
        }
    },
    captureScrollPage: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['scrollpage']|0)) > 1 * CUcrawlTest.tmult) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureScrollPage ', CUcrawlTest.LOG_KEY);
            }

            CUcrawlTest.lastEv['scrollpage'] = CUcrawlTest.counter;
            CUcrawlTest.lastActive = CUcrawlTest.counter;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.state['v'][activeURL]!=null && CUcrawlTest.state['v'][activeURL]['a'] > 1*CUcrawlTest.tmult) {
                CUcrawlTest.state['v'][activeURL]['e']['sc'] += 1;
            }
        }
    },
    captureCopyPage: function(ev) {
        if ((CUcrawlTest.counter - (CUcrawlTest.lastEv['copypage']|0)) > 1 * CUcrawlTest.tmult) {
            if (CUcrawlTest.debug) {
                CliqzUtils.log('captureCopyPage', CUcrawlTest.LOG_KEY);
            }
            CUcrawlTest.lastEv['copypage'] = CUcrawlTest.counter;
            CUcrawlTest.lastActive = CUcrawlTest.counter;
            var activeURL = CUcrawlTest.currentURL();
            if (CUcrawlTest.state['v'][activeURL]!=null && CUcrawlTest.state['v'][activeURL]['a'] > 1*CUcrawlTest.tmult) {
                CUcrawlTest.state['v'][activeURL]['e']['cp'] += 1;
            }
        }
    },
    counter: 0,
    tmult: 4,
    tpace: 250,
    lastEv: {},
    lastActive: null,
    lastActiveAll: null,
    getAllOpenPages: function() {
        var res = [];
        try {
            for (var j = 0; j < CUcrawlTest.windowsRef.length; j++) {
                var gBrowser = CUcrawlTest.windowsRef[j].gBrowser;
                if (gBrowser.tabContainer) {
                    var numTabs = gBrowser.tabContainer.childNodes.length;
                    for (var i=0; i<numTabs; i++) {
                        var currentTab = gBrowser.tabContainer.childNodes[i];
                        var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                        var currURL=''+currentBrowser.contentDocument.location;
                        if (currURL.indexOf('about:')!=0) {
                            res.push(decodeURIComponent(currURL));
                        }
                    }
                }
            }
            return res;
        }
        catch(ee) {
            return [];
        }
    },
    windowsRef: [],
    windowsMem: {},
    init: function(window) {
        CliqzUtils.log("Init function called:", CUcrawlTest.LOG_KEY)
        CUcrawlTest.initDB();
        var win_id = CliqzUtils.getWindowID()

        if (CUcrawlTest.state == null) {
            CUcrawlTest.state = {};
        }
        else {

            var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
            var win_id = util.outerWindowID;

            if (CUcrawlTest.windowsMem[win_id] == null) {
                CUcrawlTest.windowsMem[win_id] = window;
                CUcrawlTest.windowsRef.push(window);
            }
        }

        var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
        var win_id = util.outerWindowID;

        if (CUcrawlTest.windowsMem[win_id] == null) {
            CUcrawlTest.windowsMem[win_id] = window;
            CUcrawlTest.windowsRef.push(window);
        }

        if (CUcrawlTest.pacemakerId==null) {
            CUcrawlTest.pacemakerId = CliqzUtils.setInterval(CUcrawlTest.pacemaker, CUcrawlTest.tpace, null);
        }


        //Check health
        CliqzUtils.httpGet(CliqzUtils.getPref('safe_browsing_events', null),
            function(res){
            if(res && res.response){
                try {
                    if (CUcrawlTest.debug) {
                        CliqzUtils.log('Healthcheck success', CUcrawlTest.LOG_KEY);
                    }
                } catch(e){}
            }
        }, null, 1000);

    },
    initAtBrowser: function(){
        CUcrawlTest.activityDistributor.addObserver(CUcrawlTest.httpObserver);
    },
    state: {'v': {}, 'm': [], '_id': Math.floor( Math.random() * 1000 ) },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    msgSanitize: function(msg){
        CliqzUtils.log('Sanitize: ' , "CUcrawlTest.pushTrack");

        //Remove time

        msg.ts = CUcrawlTest.getTime();

        delete msg.payload.tend;
        delete msg.payload.tin;

        // FIXME: this cannot be here, track is only for sending logic. The object needs to be
        // handled beforehand!!!
        //Canonical URLs and Referrals.

        if(CUcrawlTest.can_urls[msg.payload.url]){
            msg.payload.url = CUcrawlTest.can_urls[msg.payload.url];
        }

        //Remove ref.
        if(msg.payload.ref){
          delete msg.payload.ref;
        }

        //Check the depth. Just to be extra sure.

        if(msg.payload.qr){
          if(msg.payload.qr.d > 2){
            delete msg.payload.qr;
          }
        }


        //Remove the msg if the query is too long,

        if(msg.action=='query') {
            //Remove the msg if the query is too long,
            if ((msg.payload.q == null) || (msg.payload.q == '')) {
                return null;
            }
            else {
                //Remove the msg if the query is too long,
                if (msg.payload.q.length > 50) return null;
                if (msg.payload.q.split(' ').length > 7) return null;
                //Remove if query looks like an http pass
                if (/[^:]+:[^@]+@/.test(msg.payload.q)) return null;
                //Remove if email
                if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(msg.payload.q)) return null;

                var v = msg.payload.q.split(' ');
                for(let i=0;i<v.length;i++) {
                    if (v[i].length > 20) return null;
                    if (/[^:]+:[^@]+@/.test(v[i])) return null;
                    if (/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(v[i])) return null;
                }

            }
        }


        return msg;


    },
    // ****************************
    // TRACK, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    track: function(msg, instantPush) {
        if (!CUcrawlTest) return; //might be called after the module gets unloaded
        if (CliqzUtils.getPref('dnt', false)) return;

        msg.ver = CUcrawlTest.VERSION;
        msg = CUcrawlTest.msgSanitize(msg);
        if (msg) CUcrawlTest.trk.push(msg);
        CliqzUtils.clearTimeout(CUcrawlTest.trkTimer);
        if(instantPush || CUcrawlTest.trk.length % 100 == 0){
            CUcrawlTest.pushTrack();
        } else {
            CUcrawlTest.trkTimer = CliqzUtils.setTimeout(CUcrawlTest.pushTrack, 60000);
        }
    },
    _track_req: null,
    _track_sending: [],
    _track_start: undefined,
    TRACK_MAX_SIZE: 500,
    pushTrack: function() {
        if(CUcrawlTest._track_req) return;

        // put current data aside in case of failure
        CUcrawlTest._track_sending = CUcrawlTest.trk.slice(0);
        CUcrawlTest.trk = [];
        CUcrawlTest._track_start = (new Date()).getTime();

        CUcrawlTest._track_req = CliqzUtils.httpPost(CliqzUtils.getPref('safe_browsing_events', null), CUcrawlTest.pushTrackCallback, JSON.stringify(CUcrawlTest._track_sending), CUcrawlTest.pushTrackError);
    },
    pushTrackCallback: function(req){
        try {
            var response = JSON.parse(req.response);
            CUcrawlTest._track_sending = [];
            CUcrawlTest._track_req = null;
        } catch(e){}
    },
    pushTrackError: function(req){
        // pushTrack failed, put data back in queue to be sent again later
        CliqzUtils.log('push tracking failed: ' + CUcrawlTest._track_sending.length + ' elements', "CUcrawlTest.pushTrack");
        CUcrawlTest.trk = CUcrawlTest._track_sending.concat(CUcrawlTest.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CUcrawlTest.trk.length - CUcrawlTest.TRACK_MAX_SIZE + 100;
        if(slice_pos > 0){
            CliqzUtils.log('discarding ' + slice_pos + ' old tracking elements', "CUcrawlTest.pushTrack");
            CUcrawlTest.trk = CUcrawlTest.trk.slice(slice_pos);
        }

        CUcrawlTest._track_sending = [];
        CUcrawlTest._track_req = null;
    },
    // ************************ Database ***********************
    // Stolen from modules/CliqzHistory
    // *********************************************************
    initDB: function() {
        if ( FileUtils.getFile("ProfD", ["moz.test.dbusafe"]).exists() ) {
            if (CUcrawlTest.dbConn==null) {
                CUcrawlTest.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.test.dbusafe"]));
                //Load the public url's cache:
                //CUcrawlTest.checkTableExists()
                //if(CUcrawlTest.checkTableExists() == true){

                //}
                //else{
                //    CUcrawlTest.createTable();
                //}

                //var checkTable = "select name from sqlite_master where type='table' and name='usafe'";
                //CliqzUtils.log('Exists table?: ' + CUcrawlTest.dbConn.executeSimpleSQL(checkTable),CUcrawlTest.LOG_KEY);
            }
            return;
        }
        else {
            CUcrawlTest.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.test.dbusafe"]));
            var usafe = "create table usafe(\
                url VARCHAR(255) PRIMARY KEY NOT NULL,\
                ref VARCHAR(255),\
                last_visit INTEGER,\
                first_visit INTEGER,\
                reason VARCHAR(256), \
                private BOOLEAN DEFAULT 0,\
                checked BOOLEAN DEFAULT 0, \
                payload VARCHAR(4096) \
            )";

            CUcrawlTest.dbConn.executeSimpleSQL(usafe);
        }

    },
    dbConn: null,
    auxSameDomain: function(url1, url2) {
        var d1 = CUcrawlTest.parseURL(url1).hostname.replace('www.','');
        var d2 = CUcrawlTest.parseURL(url2).hostname.replace('www.','');
        return d1==d2;
    },
    getPageFromDB: function(url, callback) {
        var res = [];
        var st = CUcrawlTest.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;
        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawlTest.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawlTest.LOG_KEY);
                    callback(null);
                }
                else {
                    if (res.length == 1) {
                        callback(res[0]);
                    }
                    else {
                        callback(null);
                    }
                }
            }
        });
    },
    isPrivate: function(url, callback) {
        // returns 1 is private (because of checked, of because the referrer is private)
        // returns 0 if public
        // returns -1 if not checked yet, handled as public in this cases,

        var res = [];
        var st = CUcrawlTest.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;

        // CUcrawlTest.isPrivate('https://golf.cliqz.com/dashboard/#KPIs_BM')
        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawlTest.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawlTest.LOG_KEY);
                    callback(true);
                }
                else {
                    if (res.length == 1) {
                        // the urls already exists in the DB, it has been seen before
                        if (res[0].ref!='' && res[0].ref!=null) {
                            if (CUcrawlTest.auxSameDomain(res[0].ref, url)) {
                                CUcrawlTest.isPrivate(res[0].ref, function(priv) {
                                    callback(priv);
                                });
                            }
                            else callback(false);
                        }
                        else {
                            callback(false);
                        }
                    }
                else {
                    callback(true);
                }
            }
        }});
    },
    parseHostname: function(hostname) {
        var o = {'hostname': null, 'username': '', 'password': '', 'port': null};

        var h = hostname;
        var v = hostname.split('@');
        if (v.length > 1) {
            var w = v[0].split(':');
            o['username'] = w[0];
            o['password'] = w[1];
            h = v[1];
        }

        v = h.split(':');
        if (v.length > 1) {
            o['hostname'] = v[0];
            o['port'] = parseInt(v[1]);
        }
        else {
            o['hostname'] = v[0];
            o['port'] = 80;
        }

        return o;
    },
    parseURL: function(url) {
        // username, password, port, path, query_string, hostname, protocol
        var o = {};

        var v = url.split('://');
        if (v.length >= 1) {

            o['protocol'] = v[0];
            var s = v.slice(1, v.length).join('://');
            v = s.split('/');

            var oh = CUcrawlTest.parseHostname(v[0]);
            o['hostname'] = oh['hostname'];
            o['port'] = oh['port'];
            o['username'] = oh['username'];
            o['password'] = oh['password'];
            o['path'] = '/';
            o['query_string'] = null;

            if (v.length>1) {
                s = v.splice(1, v.length).join('/');
                v = s.split('?')
                o['path'] = '/' + v[0];
                if (v.length>1) {
                    o['query_string'] = v.splice(1, v.length).join('?');
                }
            }
        }
        else {
            return null;
        }

        return o;

    },
    addURLtoDB: function(url, ref, paylobj) {

        var tt = new Date().getTime();

        var requery = /\/www.google/; // regex for google query
        var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; // regex for yahoo query
        var rysearch = /r.search.yahoo\..*?[#?&;]/ //To handle yahoo redirect.
        var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; // regex for yahoo query
        var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl

        // if the url is a search result page, let's not even store it. In the case that this would not work, the doubleFetch
        // would also not try to fetch it because of noindex or dropLongURLs
        //
        if (requery.test(url) || reref.test(url) || yrequery.test(url) || brequery.test(url) || rysearch.test(url)) return;



        var stmt = CUcrawlTest.dbConn.createStatement("SELECT url, checked FROM usafe WHERE url = :url");
        stmt.params.url = url;

        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({'url': row.getResultByName("url"), 'checked': row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawlTest.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawlTest.LOG_KEY);
                }
                else {
                    if (res.length == 0) {
                        // we never seen it, let's add it
                        paylobj['ft'] = true;

                        if (CUcrawlTest.debug) CliqzUtils.log("insert Pagepayload" + CUcrawlTest.state['v'][url] ,CUcrawlTest.LOG_KEY);

                        var st = CUcrawlTest.dbConn.createStatement("INSERT INTO usafe (url,ref,last_visit,first_visit, reason, private, checked,payload) VALUES (:url, :ref, :last_visit, :first_visit, :reason, :private, :checked, :payload)");
                        st.params.url = url;
                        st.params.ref = ref;
                        st.params.last_visit = tt;
                        st.params.first_visit = tt;
                        st.params.payload = JSON.stringify(paylobj || {});

                        if (paylobj['x']==null) {
                            // page data structure is empty, so no need to double fetch, is private
                            st.params.checked = 1;
                            st.params.private = 1;
                            st.params.reason = 'empty page data';
                        }
                        else if (CUcrawlTest.isSuspiciousURL(url)) {
                            // if the url looks private already add it already as checked and private
                            st.params.checked = 1;
                            st.params.private = 1;
                            st.params.reason = 'susp. url';
                        }
                        else {
                            if (CUcrawlTest.httpCache401[url]) {
                                st.params.checked = 1;
                                st.params.private = 1;
                                st.params.reason = '401';
                            }
                            else {
                                st.params.checked = 0;
                                st.params.private = 0;
                                st.params.reason = '';
                            }
                        }

                        while (st.executeStep()) {};
                    }
                    /*
                    else if ((res.length > 0)) {
                        CliqzUtils.log(JSON.stringify(paylobj || {}), CUcrawlTest.LOG_KEY);

                        var st = CUcrawlTest.dbConn.createStatement("UPDATE usafe SET payload = :payload WHERE url = :url");
                        st.params.url = url;
                        st.params.payload = JSON.stringify(paylobj || {});
                        while (st.executeStep()) {};
                    }
                    */
                    else {
                        //CliqzUtils.log("Res == 0, pushing in DB: " + tt + url + JSON.stringify(paylobj || {}), CUcrawlTest.LOG_KEY);
                        // we have seen it, if it's has been already checked, then ignore, if not, let's update the last_visit
                        if (res[0]['checked']==0) {
                            var st = CUcrawlTest.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload WHERE url = :url");
                            st.params.url = url;
                            st.params.last_visit = tt;
                            st.params.payload = JSON.stringify(paylobj || {});
                            while (st.executeStep()) {};
                        }

                    }

                }
            }
        });
    },
    setAsPrivate: function(url) {
        var st = CUcrawlTest.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
        st.params.url = url;
        st.params.checked = 1;
        st.params.private = 1;
        while (st.executeStep()) {};
        // Update the private cache
    },
    setAsPublic: function(url) {
        var st = CUcrawlTest.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
        st.params.url = url;
        st.params.checked = 1;
        st.params.private = 0;
        while (st.executeStep()) {};
        // Update the main cache
        CUcrawlTest.UrlsCache[url] = true;
    },
    listOfUnchecked: function(cap, sec_old, fixed_url, callback) {
        var tt = new Date().getTime();
        var stmt = null;
        if (fixed_url == null) {
            // all urls
            stmt = CUcrawlTest.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE checked = :checked and last_visit < :last_visit;");
        }
        else {
            stmt = CUcrawlTest.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE checked = :checked and last_visit < :last_visit and url = :url;");
            stmt.params.url = fixed_url;
        }
        stmt.params.last_visit = (tt - sec_old*1000);
        stmt.params.checked = 0;

        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push([row.getResultByName("url"), JSON.parse(row.getResultByName("payload")) ]);
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawlTest.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawlTest.LOG_KEY);
                }
                else {
                    callback(res.splice(0,cap), null);
                }
            }
        });
    },
    processUnchecks: function(listOfUncheckedUrls) {
        for(var i=0;i<listOfUncheckedUrls.length;i++) {
            var url = listOfUncheckedUrls[i][0];
            var page_doc = listOfUncheckedUrls[i][1];
            var page_struct_before = page_doc['x'];

            CUcrawlTest.isPrivate(url, function(isPrivate) {
                if (isPrivate) {
                    var st = CUcrawlTest.dbConn.createStatement("UPDATE usafe SET reason = :reason, checked = :checked, private = :private WHERE url = :url");
                    st.params.url = url;
                    st.params.checked = 1;
                    st.params.private = 1;
                    st.params.reason = 'priv. st.';
                    while (st.executeStep()) {};
                    // Update the Public urls' cache.
                    delete CUcrawlTest.UrlsCache[url];
                }
                else {
                    CUcrawlTest.doubleFetch(url, page_struct_before, page_doc);
                }
            });
        }
    },
    // to invoke in console: CUcrawlTest.listOfUnchecked(1000000000000, 0, null, function(x) {console.log(x)})
    forceDoubleFetch: function(url) {
        CUcrawlTest.listOfUnchecked(1000000000000, 0, url, CUcrawlTest.processUnchecks);
    },
    outOfABTest: function() {
        CUcrawlTest.dbConn.executeSimpleSQL('DROP TABLE usafe;');
    },
    removeTable: function(reason) {
        try{
            CUcrawlTest.dbConn.executeSimpleSQL('DROP TABLE usafe;');
        }catch(ee){};
    },
    debugInterface: function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        try{var win = ww.openWindow(null, "chrome://ucrawlmodules/content/debugInterface",
                        "debugInterface", null, null);}catch(ee){CliqzUtils.log(ee,'debugInterface')}
    }
};
