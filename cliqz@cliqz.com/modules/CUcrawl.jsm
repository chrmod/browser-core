  'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CUcrawl'];

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


//CliqzUtils.setPref('safe_browsing_events','https://mozilla-ucrawl.cliqz.com');
//CliqzUtils.setPref('safe_browsing_events','http://0.0.0.0:8080');
//CliqzUtils.setPref('showDebugLogs', true);

CliqzUtils.setPref('safe_browsing_events', CliqzUtils.getPref('safe_browsing_events', 'https://mozilla-ucrawl.cliqz.com'));
CliqzUtils.setPref('showDebugLogs', CliqzUtils.getPref('showDebugLogs', false));
CliqzUtils.setPref('dnt', CliqzUtils.getPref('dnt', false));


var CUcrawl = {
    VERSION: 'moz-test 0.01',
    WAIT_TIME: 2000,
    LOG_KEY: 'mucrawl',
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
    msgType:'mucrawl',
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
        var m   = CUcrawl.parser[CUcrawl.strictMode ? "strict" : "loose"].exec(str);
        var _uri = {};
        var i   = 14;

        while (i--) _uri[CUcrawl.key[i]] = m[i] || "";

        _uri[CUcrawl.q.name] = {};
        _uri[CUcrawl.key[12]].replace(CUcrawl.q.parser, function ($0, $1, $2) { if ($1) { _uri[CUcrawl.q.name][$1] = $2; }});
        return _uri;
    },
    maskURL: function(url){
        var url_parts = null;
        var masked_url = null;
        url_parts = CUcrawl.parseUri(url);

        if (CUcrawl.dropLongURL(url)) {
            //Explicit check for google search url.
            if(url_parts['host'].indexOf('google') > 0){
                if(url_parts['queryKey']['url']){
                    masked_url = url_parts['queryKey']['url'];
                    masked_url = CUcrawl.maskURL(decodeURIComponent(''+masked_url));
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

        url_parts = CUcrawl.parseUri(aURI);

        //CliqzUtils.log("Sanitize: " + url_parts.host, CUcrawl.LOG_KEY);
        //CliqzUtils.log("Sanitize: " + url_parts.source.indexOf('about:'), CUcrawl.LOG_KEY);
        if (url_parts.source.indexOf('about:') == 0){
            return true;
        }

        if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(url_parts.host)) {
            return true;
        }

        if (url_parts.user!="" || url_parts.password!="" ) {
            return true;
        }

        //CliqzUtils.log("Sanitize: " + url_parts.port , CUcrawl.LOG_KEY);
        if (url_parts.port != "" & (url_parts.port!="80" || url_parts.port!="443")) {
            return true;
        }

        if ( url_parts.protocol != "http"  & url_parts.protocol!="https"  & url_parts.protocol != "") {
            return true;
        }

        if ( url_parts.source.indexOf('#') > -1 & CUcrawl.checkIfSearchURL(url_parts.source) != true) {
            if (CUcrawl.debug) CliqzUtils.log("Dropped because of # in url: " + decodeURIComponent(aURI)  , CUcrawl.LOG_KEY);
            return true;
        }
    },
    dropLongURL: function(url){
        var url_parts = {};

        url_parts = CUcrawl.parseUri(url);
        if (url_parts.query.length > CUcrawl.qs_len) {
            return true;
        }


        var v = url_parts.relative.split(/[/._ -]/);
        for (let i=0; i<v.length; i++) {
            if (v[i].length > CUcrawl.rel_part_len) {
                return true;
            }
        }

        // check for certain patterns, wp-admin  /admin[?#] login[.?#] logout[.?#] edit[.?#] [&?#]sharing [&?#]share WebLogic [&?#]url [&?#]u [&?#]red /url[?#]
        // if they match any, return true


    },
    createTable: function(reason){
        CUcrawl.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.dbusafe"]));
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
            CUcrawl.dbConn.executeSimpleSQL(usafe)
        }catch(ee){};



    },
    cleanHttpCache: function() {
      for(var key in CUcrawl.httpCache) {
        if ((CUcrawl.counter - CUcrawl.httpCache[key]['time']) > 60*CUcrawl.tmult) {
          delete CUcrawl.httpCache[key];
        }
      }
      for(var key in CUcrawl.httpCache401) {
        if ((CUcrawl.counter - CUcrawl.httpCache401[key]['time']) > 60*CUcrawl.tmult) {
          delete CUcrawl.httpCache401[key];
        }
      }
    },
    getHeaders: function(strData) {
      //CliqzUtils.log("In get headers:",CUcrawl.LOG_KEY);
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
                var ho = CUcrawl.getHeaders(aExtraStringData);
                var status = ho['status'];
                var loc = ho['loc'];
                var httpauth = ho['auth'];
                if (status=='301') {
                  CUcrawl.httpCache[url] = {'status': status, 'time': CUcrawl.counter, 'location': loc};
                }

                if (status=='401') {
                  CUcrawl.httpCache401[url] = {'time': CUcrawl.counter};
                }

              } catch(ee) {
                if (CUcrawl.debug) CliqzUtils.log("error httpObserver" + ee,CUcrawl.LOG_KEY);
                return;
              }
        }
    },
    linkCache: {},
    cleanLinkCache: function() {
      for(var key in CUcrawl.linkCache) {
        if ((CUcrawl.counter - CUcrawl.linkCache[key]['time']) > 30*CUcrawl.tmult) {
          delete CUcrawl.linkCache[key];
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
            if (CUcrawl.debug) {
                CliqzUtils.log('Exception scrapping query: ' + ee, CUcrawl.LOG_KEY);
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
          res[''+i] = {'u': CUcrawl.maskURL(_res[i].href), 't': _res[i].text};
        }
        
      }
      //CliqzUtils.log("Yahoo results: " + JSON.stringify(res,undefined,2),CUcrawl.LOG_KEY);
      return res;
    },
    searchResults:function(currURL, document){
        var _res = null;
        var query = null;
        var res = {};
        res['t'] = CUcrawl.getTime();//new Date().getTime();
        res['r'] = {};
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        res['ctry'] = location;
        res['qurl'] = CUcrawl.maskURL(currURL);

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

        res['r'] = CUcrawl.searchResultsRefine(_res);
        res['q'] = query;

        if (CUcrawl.debug) {
            CliqzUtils.log('>>> Results moz-ucrawl: ' +  JSON.stringify(res,undefined,2), CUcrawl.LOG_KEY);
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
            rq = CUcrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'go'};
                CUcrawl.track({'type': CUcrawl.msgType, 'action': 'query', 'payload': rq});
                }
            }
        //Get yahoo result
        if (yrequery.test(activeURL)) {
            rq = CUcrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'yahoo'};
                CUcrawl.track({'type': CUcrawl.msgType, 'action': 'query', 'payload': rq});
                }
            }

         //Get Bing result
        if (brequery.test(activeURL)){
            rq = CUcrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CUcrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'bing'};
                CUcrawl.track({'type': CUcrawl.msgType, 'action': 'query', 'payload': rq});
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

                if (CUcrawl.userTransitions['search'][query] == null) {
                    CUcrawl.userTransitions['search'][query] = {'time': CUcrawl.counter, 'data': []}
                }
                CUcrawl.userTransitions['search'][query]['data'].push([source, CUcrawl.counter - CUcrawl.userTransitions['search'][query]['time']]);
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
            var parqs = CUcrawl.getParametersQS(targetURL);
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

        // CUcrawl.auxGetPageData('http://github.com/cliqz/navigation-extension/', function(x) {console.log(x);}, function(y) {})
        // CUcrawl.auxGetPageData('https://www.google.de/?gfe_rd=cr&ei=zk_bVNiXIMGo8wfwkYHwBQ&gws_rd=ssl', function(x) {console.log(x);}, function(y) {})

        req.onload = function(){

            if (req.status != 200 && req.status != 0 /* local files */){
                error_message = 'status not valid: ' + req.status;
                if (CUcrawl.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawl.LOG_KEY);
                req.onerror();
            }
            else {
                // there has been a redirect, we cannot guarantee that cookies were
                // not sent, therefore fail and consider as private
                if (req.responseURL != url) {
                    if (decodeURI(decodeURI(req.responseURL)) != decodeURI(decodeURI(url))) {
                        error_message = 'dangerous redirect';
                        if (CUcrawl.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawl.LOG_KEY);
                        if (CUcrawl.debug) CliqzUtils.log("DANGER: " + url + ' ' + req.responseURL , CUcrawl.LOG_KEY);
                        req.onerror();
                        return;
                    }
                }

                var document = Services.appShell.hiddenDOMWindow.document;
                var doc = document.implementation.createHTMLDocument("example");
                doc.documentElement.innerHTML = req.responseText;

                var x = CUcrawl.getPageData(url, doc);

                onsuccess(x);

            }
        }

        req.onerror = function() {
            onerror(error_message);
        }
        req.ontimeout = function() {
            error_message = 'timeout';
            if (CUcrawl.debug) CliqzUtils.log("Error on doublefetch: " + error_message, CUcrawl.LOG_KEY);
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


        if (CUcrawl.debug) {
            CliqzUtils.log("xbef: " + JSON.stringify(struct_bef), CUcrawl.LOG_KEY);
            CliqzUtils.log("xaft: " + JSON.stringify(struct_aft), CUcrawl.LOG_KEY);
        }

        // if any of the titles is null (false), then decline (discard)

        if (!(struct_bef['t'] && struct_aft['t'])) {
            if (CUcrawl.debug) CliqzUtils.log("fovalidDoubleFetch: found an empty title", CUcrawl.LOG_KEY);
            return false;
        }


        // if any of the two struct has a iall to false decline
        if (!(struct_bef['iall'] && struct_aft['iall'])) {
            if (CUcrawl.debug) CliqzUtils.log("fovalidDoubleFetch: found a noindex", CUcrawl.LOG_KEY);
            return false;
        }


        // if there is enough html length, do the ratio, if below or above 10% then very imbalance, discard
        var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
        if ((struct_bef['lh'] || 0) > 10*1024) {
            var ratio_lh = (struct_bef['lh'] || 0) / ((struct_bef['lh'] || 0) + (struct_aft['lh'] || 0));
            if (ratio_lh < 0.10 || ratio_lh > 0.90) {
                if (CUcrawl.debug) CliqzUtils.log("fovalidDoubleFetch: lh is not balanced", CUcrawl.LOG_KEY);
                return false;
            }
        }

        // if there is enough html length, do the ratio, if below or above 10% then very imbalance, discard
        var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
        if ((struct_bef['lh'] || 0) > 30) {
            var ratio_nl = (struct_bef['nl'] || 0) / ((struct_bef['nl'] || 0) + (struct_aft['nl'] || 0));
            if (ratio_nl < 0.10 || ratio_nl > 0.90) {
                if (CUcrawl.debug) CliqzUtils.log("fovalidDoubleFetch: nl is not balanced", CUcrawl.LOG_KEY);
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

            jc = CUcrawl.auxIntersection(vt1,vt2).length / CUcrawl.auxUnion(vt1,vt2).length;
            if (jc <= 0.5) {

                // one last check, perhaps it's an encoding issue

                var tt1 = t1.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');
                var tt2 = t2.replace(/[^A-Za-z 0-9 \.,\?""!@#\$%\^&\*\(\)-_=\+;:<>\/\\\|\}\{\[\]`~]*/g, '');

                if ((tt1.length > t1.length*0.5) && ((tt1.length > t1.length*0.5))) {
                    // if we have not decreased the titles by more than 50%
                    var vtt1 = tt1.split(' ').filter(function(el) {el.length>1});
                    var vtt2 = tt2.split(' ').filter(function(el) {el.length>1});
                    jc = CUcrawl.auxIntersection(vtt1,vtt2).length / CUcrawl.auxUnion(vtt1,vtt2).length;
                    // we are more demanding on the title overlap now
                    if (jc <= 0.80) {
                        if (CUcrawl.debug) CliqzUtils.log("validDoubleFetch: fail title overlap after ascii", CUcrawl.LOG_KEY);
                        return false;
                    }
                }
                else {
                  if (CUcrawl.debug) CliqzUtils.log("validDoubleFetch: fail title overlap", CUcrawl.LOG_KEY);
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
                if (CUcrawl.debug) CliqzUtils.log("validDoubleFetch: fail nip", CUcrawl.LOG_KEY);
                return false;
            }

            // if had no forms before and it has after, decline
            if ((struct_bef['nf'] == null || struct_aft['nf'] == null) || (struct_bef['nf'] == 0 && struct_aft['nf'] != 0)) {
                if (CUcrawl.debug) CliqzUtils.log("validDoubleFetch: fail text nf", CUcrawl.LOG_KEY);
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

        if (CUcrawl.dropLongURL(url)) {

            if (page_doc['canonical_url']) {
                // the url is to be drop, but it has a canonical URL so it should be public
                if (CUcrawl.dropLongURL(page_doc['canonical_url'])) {
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


            CUcrawl.auxGetPageData(url, function(data) {

                if (CUcrawl.debug) CliqzUtils.log("success on doubleFetch, need further validation", CUcrawl.LOG_KEY);

                if (CUcrawl.validDoubleFetch(page_struct_before, data)) {
                    if (CUcrawl.debug) CliqzUtils.log("success on doubleFetch, need further validation", CUcrawl.LOG_KEY);
                    CUcrawl.setAsPublic(url);
                    CUcrawl.track({'type': CUcrawl.msgType, 'action': 'page', 'payload': page_doc});
                }
                else {
                    if (CUcrawl.debug) CliqzUtils.log("failure on doubleFetch! " + "structure did not match", CUcrawl.LOG_KEY);
                    CUcrawl.setAsPrivate(url);
                }
            },
            function(error_message) {
                if (CUcrawl.debug) CliqzUtils.log("failure on doubleFetch! " + error_message, CUcrawl.LOG_KEY);
                CUcrawl.setAsPrivate(url);
            });

        }
        else {
            if (CUcrawl.debug) CliqzUtils.log("doubleFetch refused to process this url: " + url, CUcrawl.LOG_KEY);
            CUcrawl.setAsPrivate(url);
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
                var ourl = CUcrawl.parseURL(url);
                // ignore if httpauth or if non standard port
                canonical_url = ourl['protocol'] + '://' + ourl['hostname'] + canonical_url;
            }
        }

        // extract the location of the user (country level)
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){}


        var x = {'lh': len_html, 'lt': len_text, 't': title, 'nl': numlinks, 'ni': (inputs || []).length, 'ninh': inputs_nh, 'nip': inputs_pwd, 'nf': (forms || []).length, 'pagel' : pg_l , 'ctry' : location, 'iall': iall, 'canonical_url': canonical_url };
        //CliqzUtils.log("Testing" + x.ctry, CUcrawl.LOG_KEY);
        return x;
    },       
    getCDByURL: function(url) {


        var dd_url = url;

        try {
            dd_url = decodeURI(decodeURI(url));
        } catch(ee) {}

        for (var j = 0; j < CUcrawl.windowsRef.length; j++) {
            var gBrowser = CUcrawl.windowsRef[j].gBrowser;
            if (gBrowser.tabContainer) {
                var numTabs = gBrowser.tabContainer.childNodes.length;
                for (var i=0; i<numTabs; i++) {
                    var currentTab = gBrowser.tabContainer.childNodes[i];
                    var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                    var currURL=''+currentBrowser.contentDocument.location;

                    if (CUcrawl.debug) {
                        CliqzUtils.log("getCDByURL: " + (currURL==''+url) + " >> " + url + " " + currURL, CUcrawl.LOG_KEY);
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

            CUcrawl.lastActive = CUcrawl.counter;
            CUcrawl.lastActiveAll = CUcrawl.counter;

            var activeURL = CUcrawl.currentURL();
            //Check if the URL is know to be bad: private, about:, odd ports, etc.
            if (CUcrawl.isSuspiciousURL(activeURL)) return;



            if (activeURL.indexOf('about:')!=0) {
                if (CUcrawl.state['v'][activeURL] == null) {
                    // we check for privacy, if not private the function will add the url
                    // to the UrlsCache
                    CUcrawl.getPageFromDB(activeURL, function(page) {
                        if ((page!=null) && (page.checked==1) && (page.private==0)) {
                            CUcrawl.UrlsCache[activeURL] = true;
                        }
                    });                    

                    //if ((requery.test(activeURL) || yrequery.test(activeURL) || brequery.test(activeURL) ) && !reref.test(activeURL)) {
                    if (CUcrawl.checkIfSearchURL(activeURL)){


                        currwin.setTimeout(function(currURLAtTime) {

                            // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                            if (CUcrawl) {
                                try {

                                    // FIXME: this begs for refactoring!!
                                    
                                    var activeURL = CUcrawl.currentURL();
                                    var document = null;  
                                    var searchURL = null;  

                                    if (currURLAtTime == activeURL) {
                                        document = currwin.gBrowser.selectedBrowser.contentDocument;
                                        searchURL = activeURL;
                                    }
                                    else{
                                        document = CUcrawl.getCDByURL(currURLAtTime);  
                                        searchURL = currURLAtTime;

                                    }

                                    var rq = null;
                                    rq = CUcrawl.getSearchData(searchURL, document);
                                    CUcrawl.userSearchTransition(rq);

                                    
                                }
                                catch(ee) {
                                    // silent fail
                                    if (CUcrawl.debug) {
                                        CliqzUtils.log('Exception: ' + ee, CUcrawl.LOG_KEY);
                                    }
                                }
                            }

                        }, CUcrawl.WAIT_TIME, activeURL);
                    }
                

                    var status = null;

                    if (CUcrawl.httpCache[activeURL]!=null) {
                        status = CUcrawl.httpCache[activeURL]['status'];
                    }

                    var referral = null;
                    var qreferral = null;
                    if (CUcrawl.linkCache[activeURL] != null) {
                        //referral = CUcrawl.maskURL(CUcrawl.linkCache[activeURL]['s']);
                        referral = CUcrawl.linkCache[activeURL]['s'];
                    }
                

                    CUcrawl.state['v'][activeURL] = {'url': activeURL, 'a': 0, 'x': null, 'tin': new Date().getTime(),
                            'e': {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}, 'st': status, 'c': [], 'ref': referral,
                            'tbeg':CUcrawl.getTime()};

                    if (referral) {
                        // if there is a good referral, we must inherit the query if there is one
                        if (CUcrawl.state['v'][referral] && CUcrawl.state['v'][referral]['qr']) {
                            CUcrawl.state['v'][activeURL]['qr'] = {}
                            CUcrawl.state['v'][activeURL]['qr']['q'] = CUcrawl.state['v'][referral]['qr']['q'];
                            CUcrawl.state['v'][activeURL]['qr']['t'] = CUcrawl.state['v'][referral]['qr']['t'];
                            CUcrawl.state['v'][activeURL]['qr']['d'] = CUcrawl.state['v'][referral]['qr']['d']+1;

                           //If the depth is greater then two, we need to check if the ref. is of same domain.
                            //If not then drop the QR object, else keep it. 
                            if(CUcrawl.state['v'][activeURL]['qr']['d'] > 2){
                                delete CUcrawl.state['v'][activeURL]['qr'];
                            }
                            else if(CUcrawl.state['v'][activeURL]['qr']['d'] == 2){    
                                if(CUcrawl.parseUri(activeURL)['host'] != CUcrawl.parseUri(referral)['host']){
                                    delete CUcrawl.state['v'][activeURL]['qr'];
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
                            //var activeURL = CUcrawl.currentURL();
                            //if (activeURL != currURL) {}




                            var cd = CUcrawl.getCDByURL(currURL);
                            if (cd==null) {
                                if (CUcrawl.debug) {
                                    CliqzUtils.log("CANNOT GET THE CONTENT OF : " + currURL, CUcrawl.LOG_KEY);
                                }
                                return;
                            }

                            var x = CUcrawl.getPageData(currURL, cd);


                            if (x['canonical_url']) {
                                CUcrawl.can_urls[currURL] = x['canonical_url'];
                            }

                            if (CUcrawl.state['v'][currURL] != null) {
                                CUcrawl.state['v'][currURL]['x'] = x;
                            }

                            if (CUcrawl.queryCache[currURL]) {
                                CUcrawl.state['v'][currURL]['qr'] = CUcrawl.queryCache[currURL];
                            }

                            if (CUcrawl.state['v'][currURL] != null) {
                                CUcrawl.addURLtoDB(currURL, CUcrawl.state['v'][currURL]['ref'], CUcrawl.state['v'][currURL]);
                            }

                        } catch(ee) {
                            if (CUcrawl.debug) {
                                CliqzUtils.log("Error fetching title and length of page: " + ee, CUcrawl.LOG_KEY);
                            }
                        }

                    }, CUcrawl.WAIT_TIME, currwin, activeURL);

                }
                else {
                    // wops, it exists on the active page, probably it comes from a back button or back
                    // from tab navigation
                    CUcrawl.state['v'][activeURL]['tend'] = null;
                }

                // they need to be loaded upon each onlocation, not only the first time
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("keypress", CUcrawl.captureKeyPressPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousemove", CUcrawl.captureMouseMovePage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousedown", CUcrawl.captureMouseClickPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("scroll", CUcrawl.captureScrollPage);
                currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("copy", CUcrawl.captureCopyPage);

            }
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
            //CliqzUtils.log('state change: ' + aWebProgress, CUcrawl.LOG_KEY);
        }
    },
    pacemaker: function() {
        var activeURL = CUcrawl.currentURL();

        if (activeURL && (activeURL).indexOf('about:')!=0) {
            if ((CUcrawl.counter - CUcrawl.lastActive) < 5*CUcrawl.tmult) {
                // if there has been an event on the last 5 seconds, if not do no count, the user must
                // be doing something else,
                //
                try {
                    CUcrawl.state['v'][activeURL]['a'] += 1;
                } catch(ee) {}
            }
        }


        if ((activeURL==null) && ((CUcrawl.counter/CUcrawl.tmult) % 10 == 0)) {
            // this one is for when you do not have the page open, for instance, no firefox but console opened
            CUcrawl.pushAllData();
        }



        if ((CUcrawl.counter/CUcrawl.tmult) % 1 == 0) {

            var openPages = CUcrawl.getAllOpenPages();
            var tt = new Date().getTime();

            for (var url in CUcrawl.state['v']) {
                if (CUcrawl.state['v'].hasOwnProperty(url)) {

                    if (openPages.indexOf(url)==-1) {
                        // not opened

                        if (CUcrawl.state['v'][url]['tend']==null) {
                            CUcrawl.state['v'][url]['tend'] = tt;
                            CUcrawl.state['v'][url]['tfin'] = CUcrawl.getTime();
                        }

                        if ((tt - CUcrawl.state['v'][url]['tend']) > CUcrawl.deadFiveMts*60*1000) {
                            // move to "dead pages" after 5 minutes
                            CUcrawl.state['m'].push(CUcrawl.state['v'][url]);

                            //CliqzUtils.log("Deleted: moved to dead pages after 5 mts.",CUcrawl.LOG_KEY);
                            CliqzUtils.log(CUcrawl.state['m'],CUcrawl.LOG_KEY);
                            CUcrawl.addURLtoDB(url, CUcrawl.state['v'][url]['ref'], CUcrawl.state['v'][url]);
                            delete CUcrawl.state['v'][url];
                        }
                    }
                    else {
                        // stil opened, do nothing.
                        if ((tt - CUcrawl.state['v'][url]['tin']) > CUcrawl.deadTwentyMts*60*1000) {
                            // unless it was opened more than 20 minutes ago, if so, let's move it to dead pages

                            CUcrawl.state['v'][url]['tend'] = null;
                            CUcrawl.state['v'][url]['tfin'] = null;
                            CUcrawl.state['v'][url]['too_long'] = true;
                            CUcrawl.state['m'].push(CUcrawl.state['v'][url]);
                            CUcrawl.addURLtoDB(url, CUcrawl.state['v'][url]['ref'], CUcrawl.state['v'][url]);
                            delete CUcrawl.state['v'][url];
                            //CliqzUtils.log("Deleted: moved to dead pages after 20 mts.",CUcrawl.LOG_KEY);
                            //CliqzUtils.log("Deleted: moved to dead pages after 20 mts: " + CUcrawl.state['m'].length,CUcrawl.LOG_KEY);

                        }
                    }
                }
            }
        }

        if ((CUcrawl.counter/CUcrawl.tmult) % 10 == 0) {
            if (CUcrawl.debug) {
                CliqzUtils.log('Pacemaker: ' + CUcrawl.counter/CUcrawl.tmult + ' ' + activeURL + ' >> ' + CUcrawl.state.id, CUcrawl.LOG_KEY);
                //CliqzUtils.log(JSON.stringify(CUcrawl.state, undefined, 2), CUcrawl.LOG_KEY);
                //CliqzUtils.log(JSON.stringify(CUcrawl.getAllOpenPages(), undefined, 2), CUcrawl.LOG_KEY);
            }
            CUcrawl.cleanHttpCache();
            CUcrawl.cleanUserTransitions(false);
        }

        if ((CUcrawl.counter/CUcrawl.tmult) % (1*60) == 0) {
            // every minute
            CUcrawl.listOfUnchecked(1, CUcrawl.doubleFetchTimeInSec, null, CUcrawl.processUnchecks);
        }

        if ((CUcrawl.counter/CUcrawl.tmult) % 10 == 0) {
            var ll = CUcrawl.state['m'].length;
            if (ll > 0) {
                var v = CUcrawl.state['m'].slice(0, ll);
                CUcrawl.state['m'] = CUcrawl.state['m'].slice(ll, CUcrawl.state['m'].length);

                for(var i=0;i<v.length;i++) {
                    if (CUcrawl.UrlsCache.hasOwnProperty(v[i]['url'])) {
                        CUcrawl.track({'type': CUcrawl.msgType, 'action': 'page', 'payload': v[i]});
                    }
                }
            }
        }
    
        CUcrawl.counter += 1;

    },
    cleanUserTransitions: function(force) {
        for(var query in CUcrawl.userTransitions['search']) {
            if ((force) || ((CUcrawl.counter - CUcrawl.userTransitions['search'][query]['time']) > CUcrawl.userTransitionsSearchSession*CUcrawl.tmult)) {

                // the query session is more than 5 minutes old or we are forcing the event,
                // if the condition is met and there are more than two elements in data we
                // must create the signal
                //
                if (CUcrawl.userTransitions['search'][query]['data'].length > 1) {
                    var doc = {'q': query, 'sources': CUcrawl.userTransitions['search'][query]['data'], 't': CUcrawl.getTime()};
                    if (CUcrawl.debug) {
                        CliqzUtils.log(JSON.stringify(doc,undefined,2), CUcrawl.LOG_KEY);
                    }
                    CUcrawl.track({'type': CUcrawl.msgType, 'action': 'userTransition.search', 'payload': doc});
                }
                delete CUcrawl.userTransitions['search'][query];
            }
        }

    },
    pushAllData: function() {

        // force send user Transitions sessions even if not elapsed because the browser is shutting down
        CUcrawl.cleanUserTransitions(true);

        var tt = new Date().getTime();
        var res = [];
        for (var url in CUcrawl.state['v']) {
            if (CUcrawl.state['v'][url]) res.push(url);
        }

        for (var i=0; i<res.length; i++) {
            // move all the pages to m set
            var url = res[i];
            if (CUcrawl.state['v'][url]) {
                if (CUcrawl.state['v'][url]['tend']==null) {
                    CUcrawl.state['v'][url]['tend'] = tt;
                    CUcrawl.state['v'][url]['tfin'] = CUcrawl.getTime();
                }

                CUcrawl.state['m'].push(CUcrawl.state['v'][url]);
                delete CUcrawl.state['v'][url];
            }
        }

        // send them to track if needed
        var ll = CUcrawl.state['m'].length;
        if (ll > 0) {
            var v = CUcrawl.state['m'].slice(0, ll);
            CUcrawl.state['m'] = CUcrawl.state['m'].slice(ll, CUcrawl.state['m'].length);

            for(var i=0;i<v.length;i++) {
                if (CUcrawl.UrlsCache.hasOwnProperty(v[i]['url'])){
                    CUcrawl.track({'type': CUcrawl.msgType, 'action': 'page', 'payload': v[i]});
                }
            }
            // do a instant push on whatever is left on the track
            CUcrawl.pushTrack();
        }
    },
    destroy: function() {
        //debugger;
        CliqzUtils.log('destroy', CUcrawl.LOG_KEY);

        // send all the data
        CUcrawl.pushAllData();
        CliqzUtils.clearTimeout(CUcrawl.pacemakerId);
        CliqzUtils.clearTimeout(CUcrawl.trkTimer);
        CliqzUtils.log('end_destroy', CUcrawl.LOG_KEY);
    },
    destroyAtBrowser: function(){
        //var activityDistributor = Components.classes["@mozilla.org/network/http-activity-distributor;1"]
        //                              .getService(Components.interfaces.nsIHttpActivityDistributor);
        //CUcrawl.activityDistributor.removeObserver(CUcrawl.httpObserver);

        CUcrawl.activityDistributor.removeObserver(CUcrawl.httpObserver);
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
        if ((CUcrawl.counter - (CUcrawl.lastEv['keypress']|0)) > 1 * CUcrawl.tmult && ((CUcrawl.counter - (CUcrawl.lastEv['keypresspage']|0)) > 1 * CUcrawl.tmult)) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureKeyPressAll', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['keypress'] = CUcrawl.counter;
            CUcrawl.lastActiveAll = CUcrawl.counter;
        }
    },
    captureMouseMove: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['mousemove']|0)) > 1 * CUcrawl.tmult && ((CUcrawl.counter - (CUcrawl.lastEv['mousemovepage']|0)) > 1 * CUcrawl.tmult)) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureMouseMoveAll', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['mousemove'] = CUcrawl.counter;
            CUcrawl.lastActiveAll = CUcrawl.counter;
        }
    },
    captureMouseClick: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['mouseclick']|0)) > 1 * CUcrawl.tmult && ((CUcrawl.counter - (CUcrawl.lastEv['mouseclickpage']|0)) > 1 * CUcrawl.tmult)) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureMouseClickAll', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['mouseclick'] = CUcrawl.counter;
            CUcrawl.lastActiveAll = CUcrawl.counter;
        }
    },
    captureKeyPressPage: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['keypresspage']|0)) > 1 * CUcrawl.tmult) {
            if (CUcrawl.debug) {
                //CliqzUtils.log('captureKeyPressPage', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['keypresspage'] = CUcrawl.counter;
            CUcrawl.lastActive = CUcrawl.counter;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.state['v'][activeURL]!=null && CUcrawl.state['v'][activeURL]['a'] > 1*CUcrawl.tmult) {
                CUcrawl.state['v'][activeURL]['e']['kp'] += 1;
            }
        }
    },
    captureMouseMovePage: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['mousemovepage']|0)) > 1 * CUcrawl.tmult) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureMouseMovePage', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['mousemovepage'] = CUcrawl.counter;
            CUcrawl.lastActive = CUcrawl.counter;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.state['v'][activeURL]!=null && CUcrawl.state['v'][activeURL]['a'] > 1*CUcrawl.tmult) {
                CUcrawl.state['v'][activeURL]['e']['mm'] += 1;
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
            if (CUcrawl.debug) {
                CliqzUtils.log('Error in getURLFromEvent: ' + ee, CUcrawl.LOG_KEY);
            }
        }
        return null;
    },
    captureMouseClickPage: function(ev) {

        // if the target is a link of type hash it does not work, it will create a new page without referral
        //

        var targetURL = CUcrawl.getURLFromEvent(ev);

        if (targetURL!=null) {

            var embURL = CUcrawl.getEmbeddedURL(targetURL);
            if (embURL!=null) targetURL = embURL;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.debug) {
                CliqzUtils.log('captureMouseClickPage>> ' + CUcrawl.counter + ' ' + targetURL  + ' : ' + " active: " + activeURL + " " + (CUcrawl.state['v'][activeURL]!=null) + " " + ev.target + ' :: ' + ev.target.value  + ' >>' + JSON.stringify(CUcrawl.lastEv), CUcrawl.LOG_KEY);
            }

            //var activeURL = CUcrawl.currentURL();

            if (CUcrawl.state['v'][activeURL]!=null) {
                //Fix same link in 'l'
                //Only add if gur. that they are public and the link exists in the double fetch page(Public).it's available on the public page.Such
                //check is not done, therefore we do not push the links clicked on that page. - potential record linkage.

                //CUcrawl.state['v'][activeURL]['c'].push({'l': ''+ CUcrawl.maskURL(targetURL), 't': CUcrawl.counter});
                CUcrawl.linkCache[targetURL] = {'s': ''+activeURL, 'time': CUcrawl.counter};
                //Need a better fix, can't locate the cache.
                //CUcrawl.addURLtoDB(activeURL, CUcrawl.state['v'][activeURL]['ref'], CUcrawl.state['v'][activeURL]);
            }
        }

        if ((CUcrawl.counter - (CUcrawl.lastEv['mouseclickpage']|0)) > 1 * CUcrawl.tmult) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureMouseClickPage', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['mouseclickpage'] = CUcrawl.counter;
            CUcrawl.lastActive = CUcrawl.counter;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.state['v'][activeURL]!=null && CUcrawl.state['v'][activeURL]['a'] > 1*CUcrawl.tmult) {
                CUcrawl.state['v'][activeURL]['e']['md'] += 1;
            }
        }
    },
    captureScrollPage: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['scrollpage']|0)) > 1 * CUcrawl.tmult) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureScrollPage ', CUcrawl.LOG_KEY);
            }

            CUcrawl.lastEv['scrollpage'] = CUcrawl.counter;
            CUcrawl.lastActive = CUcrawl.counter;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.state['v'][activeURL]!=null && CUcrawl.state['v'][activeURL]['a'] > 1*CUcrawl.tmult) {
                CUcrawl.state['v'][activeURL]['e']['sc'] += 1;
            }
        }
    },
    captureCopyPage: function(ev) {
        if ((CUcrawl.counter - (CUcrawl.lastEv['copypage']|0)) > 1 * CUcrawl.tmult) {
            if (CUcrawl.debug) {
                CliqzUtils.log('captureCopyPage', CUcrawl.LOG_KEY);
            }
            CUcrawl.lastEv['copypage'] = CUcrawl.counter;
            CUcrawl.lastActive = CUcrawl.counter;
            var activeURL = CUcrawl.currentURL();
            if (CUcrawl.state['v'][activeURL]!=null && CUcrawl.state['v'][activeURL]['a'] > 1*CUcrawl.tmult) {
                CUcrawl.state['v'][activeURL]['e']['cp'] += 1;
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
            for (var j = 0; j < CUcrawl.windowsRef.length; j++) {
                var gBrowser = CUcrawl.windowsRef[j].gBrowser;
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
        CliqzUtils.log("Init function called:", CUcrawl.LOG_KEY)
        CUcrawl.initDB();
        var win_id = CliqzUtils.getWindowID()

        if (CUcrawl.state == null) {
            CUcrawl.state = {};
        }
        else {

            var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
            var win_id = util.outerWindowID;

            if (CUcrawl.windowsMem[win_id] == null) {
                CUcrawl.windowsMem[win_id] = window;
                CUcrawl.windowsRef.push(window);
            }
        }

        var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
        var win_id = util.outerWindowID;

        if (CUcrawl.windowsMem[win_id] == null) {
            CUcrawl.windowsMem[win_id] = window;
            CUcrawl.windowsRef.push(window);
        }

        if (CUcrawl.pacemakerId==null) {
            CUcrawl.pacemakerId = CliqzUtils.setInterval(CUcrawl.pacemaker, CUcrawl.tpace, null);
        }

        //Check health
        CliqzUtils.httpGet(CliqzUtils.getPref('safe_browsing_events', null),
            function(res){
            if(res && res.response){
                try {
                    if (CUcrawl.debug) {
                        CliqzUtils.log('Healthcheck success', CUcrawl.LOG_KEY);
                    }
                } catch(e){}
            }
        }, null, 1000);

    },
    initAtBrowser: function(){
        CUcrawl.activityDistributor.addObserver(CUcrawl.httpObserver);
    },
    state: {'v': {}, 'm': [], '_id': Math.floor( Math.random() * 1000 ) },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    msgSanitize: function(msg){
        CliqzUtils.log('Sanitize: ' , "CUcrawl.pushTrack");

        //Remove time

        msg.ts = CUcrawl.getTime();
        
        delete msg.payload.tend;
        delete msg.payload.tin;

        // FIXME: this cannot be here, track is only for sending logic. The object needs to be
        // handled beforehand!!!
        //Canonical URLs and Referrals.

        if(CUcrawl.can_urls[msg.payload.url]){
            msg.payload.url = CUcrawl.can_urls[msg.payload.url];
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
               

        return msg;


    },
    // ****************************
    // TRACK, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    track: function(msg, instantPush) {
        if (!CUcrawl) return; //might be called after the module gets unloaded
        if (CliqzUtils.ucrawlPrefs.getBoolPref('dnt')) return;

        msg.ver = CUcrawl.VERSION;
        msg = CUcrawl.msgSanitize(msg);
        CUcrawl.trk.push(msg);
        CliqzUtils.clearTimeout(CUcrawl.trkTimer);
        if(instantPush || CUcrawl.trk.length % 100 == 0){
            CUcrawl.pushTrack();
        } else {
            CUcrawl.trkTimer = CliqzUtils.setTimeout(CUcrawl.pushTrack, 60000);
        }
    },
    _track_req: null,
    _track_sending: [],
    _track_start: undefined,
    TRACK_MAX_SIZE: 500,
    pushTrack: function() {
        if(CUcrawl._track_req) return;

        // put current data aside in case of failure
        CUcrawl._track_sending = CUcrawl.trk.slice(0);
        CUcrawl.trk = [];
        CUcrawl._track_start = (new Date()).getTime();

        CUcrawl._track_req = CliqzUtils.httpPost(CliqzUtils.getPref('safe_browsing_events', null), CUcrawl.pushTrackCallback, JSON.stringify(CUcrawl._track_sending), CUcrawl.pushTrackError);
    },
    pushTrackCallback: function(req){
        try {
            var response = JSON.parse(req.response);
            CUcrawl._track_sending = [];
            CUcrawl._track_req = null;
        } catch(e){}
    },
    pushTrackError: function(req){
        // pushTrack failed, put data back in queue to be sent again later
        CliqzUtils.log('push tracking failed: ' + CUcrawl._track_sending.length + ' elements', "CUcrawl.pushTrack");
        CUcrawl.trk = CUcrawl._track_sending.concat(CUcrawl.trk);

        // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
        var slice_pos = CUcrawl.trk.length - CUcrawl.TRACK_MAX_SIZE + 100;
        if(slice_pos > 0){
            CliqzUtils.log('discarding ' + slice_pos + ' old tracking elements', "CUcrawl.pushTrack");
            CUcrawl.trk = CUcrawl.trk.slice(slice_pos);
        }

        CUcrawl._track_sending = [];
        CUcrawl._track_req = null;
    },
    // ************************ Database ***********************
    // Stolen from modules/CliqzHistory
    // *********************************************************
    initDB: function() {
        if ( FileUtils.getFile("ProfD", ["moz.dbusafe"]).exists() ) {
            if (CUcrawl.dbConn==null) {
                CUcrawl.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.dbusafe"]));
                //Load the public url's cache:
                //CUcrawl.checkTableExists()
                //if(CUcrawl.checkTableExists() == true){
               
                //}
                //else{
                //    CUcrawl.createTable();
                //}
                
                //var checkTable = "select name from sqlite_master where type='table' and name='usafe'";
                //CliqzUtils.log('Exists table?: ' + CUcrawl.dbConn.executeSimpleSQL(checkTable),CUcrawl.LOG_KEY);
            }
            return;
        }
        else {
            CUcrawl.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["moz.dbusafe"]));
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

            CUcrawl.dbConn.executeSimpleSQL(usafe);
        }

    },
    dbConn: null,
    auxSameDomain: function(url1, url2) {
        var d1 = CUcrawl.parseURL(url1).hostname.replace('www.','');
        var d2 = CUcrawl.parseURL(url2).hostname.replace('www.','');
        return d1==d2;
    },
    getPageFromDB: function(url, callback) {
        var res = [];
        var st = CUcrawl.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;
        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawl.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawl.LOG_KEY);
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
        var st = CUcrawl.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
        st.params.url = url;

        // CUcrawl.isPrivate('https://golf.cliqz.com/dashboard/#KPIs_BM')
        var res = [];
        st.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawl.LOG_KEY);
                callback(true);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawl.LOG_KEY);
                    callback(true);
                }
                else {
                    if (res.length == 1) {
                        // the urls already exists in the DB, it has been seen before
                        if (res[0].ref!='' && res[0].ref!=null) {
                            if (CUcrawl.auxSameDomain(res[0].ref, url)) {
                                CUcrawl.isPrivate(res[0].ref, function(priv) {
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

            var oh = CUcrawl.parseHostname(v[0]);
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



        var stmt = CUcrawl.dbConn.createStatement("SELECT url, checked FROM usafe WHERE url = :url");
        stmt.params.url = url;

        var res = [];
        stmt.executeAsync({
            handleResult: function(aResultSet) {
                for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
                    res.push({'url': row.getResultByName("url"), 'checked': row.getResultByName("checked")});
                }
            },
            handleError: function(aError) {
                CliqzUtils.log("SQL error: " + aError.message, CUcrawl.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawl.LOG_KEY);
                }
                else {
                    if (res.length == 0) {
                        // we never seen it, let's add it
                        paylobj['ft'] = true;

                        if (CUcrawl.debug) CliqzUtils.log("insert Pagepayload" + CUcrawl.state['v'][url] ,CUcrawl.LOG_KEY);

                        var st = CUcrawl.dbConn.createStatement("INSERT INTO usafe (url,ref,last_visit,first_visit, reason, private, checked,payload) VALUES (:url, :ref, :last_visit, :first_visit, :reason, :private, :checked, :payload)");
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
                        else if (CUcrawl.isSuspiciousURL(url)) {
                            // if the url looks private already add it already as checked and private
                            st.params.checked = 1;
                            st.params.private = 1;
                            st.params.reason = 'susp. url';
                        }
                        else {
                            if (CUcrawl.httpCache401[url]) {
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
                        CliqzUtils.log(JSON.stringify(paylobj || {}), CUcrawl.LOG_KEY);

                        var st = CUcrawl.dbConn.createStatement("UPDATE usafe SET payload = :payload WHERE url = :url");
                        st.params.url = url;
                        st.params.payload = JSON.stringify(paylobj || {});
                        while (st.executeStep()) {};
                    }
                    */
                    else {
                        //CliqzUtils.log("Res == 0, pushing in DB: " + tt + url + JSON.stringify(paylobj || {}), CUcrawl.LOG_KEY);
                        // we have seen it, if it's has been already checked, then ignore, if not, let's update the last_visit
                        if (res[0]['checked']==0) {
                            var st = CUcrawl.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit, payload = :payload WHERE url = :url");
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
        var st = CUcrawl.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
        st.params.url = url;
        st.params.checked = 1;
        st.params.private = 1;
        while (st.executeStep()) {};
        // Update the private cache
    },
    setAsPublic: function(url) {
        var st = CUcrawl.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
        st.params.url = url;
        st.params.checked = 1;
        st.params.private = 0;
        while (st.executeStep()) {};
        // Update the main cache
        CUcrawl.UrlsCache[url] = true;
    },
    listOfUnchecked: function(cap, sec_old, fixed_url, callback) {
        var tt = new Date().getTime();
        var stmt = null;
        if (fixed_url == null) {
            // all urls
            stmt = CUcrawl.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE checked = :checked and last_visit < :last_visit;");
        }
        else {
            stmt = CUcrawl.dbConn.createAsyncStatement("SELECT url, payload FROM usafe WHERE checked = :checked and last_visit < :last_visit and url = :url;");
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
                CliqzUtils.log("SQL error: " + aError.message, CUcrawl.LOG_KEY);
            },
            handleCompletion: function(aReason) {
                if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
                    CliqzUtils.log("SQL canceled or aborted", CUcrawl.LOG_KEY);
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

            CUcrawl.isPrivate(url, function(isPrivate) {
                if (isPrivate) {
                    var st = CUcrawl.dbConn.createStatement("UPDATE usafe SET reason = :reason, checked = :checked, private = :private WHERE url = :url");
                    st.params.url = url;
                    st.params.checked = 1;
                    st.params.private = 1;
                    st.params.reason = 'priv. st.';
                    while (st.executeStep()) {};
                    // Update the Public urls' cache.
                    delete CUcrawl.UrlsCache[url];
                }
                else {
                    CUcrawl.doubleFetch(url, page_struct_before, page_doc);
                }
            });
        }
    },
    // to invoke in console: CUcrawl.listOfUnchecked(1000000000000, 0, null, function(x) {console.log(x)})
    forceDoubleFetch(url) {
        CUcrawl.listOfUnchecked(1000000000000, 0, url, CUcrawl.processUnchecks);
    },
    outOfABTest: function() {
        CUcrawl.dbConn.executeSimpleSQL('DROP TABLE usafe;');
    },
    removeTable: function(reason) {
        try{
            CUcrawl.dbConn.executeSimpleSQL('DROP TABLE usafe;');
        }catch(ee){};
    },
    debugInterface: function() {
        var ww = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                    .getService(Components.interfaces.nsIWindowWatcher);
        try{var win = ww.openWindow(null, "chrome://ucrawlmodules/content/debugInterface",
                        "debugInterface", null, null);}catch(ee){CliqzUtils.log(ee,'debugInterface')}
    }
};
