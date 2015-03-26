'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzUCrawl'];

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;


var CliqzUCrawl = {
    VERSION: '0.07',
    WAIT_TIME: 2000,
    LOG_KEY: 'CliqzUCrawl',
    debug: false,
    httpCache: {},
    httpCache401: {},
    queryCache: {},
    privateCache: {},
    key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
    q:   {
        name:   "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    },
    searchEngines: [], //Variable for content extraction fw.
    rArray: [], //Variable for content extraction fw.
    extractRules: {}, //Variable for content extraction fw.
    payloads: {}, //Variable for content extraction fw.
    messageTemplate: {},
    idMappings: {},
    patternsURL: 'http://cdn.cliqz.com/safe-browsing/patterns',
    searchCache: {},
    parseUri: function (str) {
        //var o   = parseUri.options,
        var m = null;
        var _uri = null;
        var i = null;
        var m   = CliqzUCrawl.parser[CliqzUCrawl.strictMode ? "strict" : "loose"].exec(str);
        var _uri = {};
        var i   = 14;

        while (i--) _uri[CliqzUCrawl.key[i]] = m[i] || "";

        _uri[CliqzUCrawl.q.name] = {};
        _uri[CliqzUCrawl.key[12]].replace(CliqzUCrawl.q.parser, function ($0, $1, $2) { if ($1) { _uri[CliqzUCrawl.q.name][$1] = $2; }});
        return _uri;
    },
    maskURL: function(url){
        var url_parts = null;
        var masked_url = null;
        url_parts = CliqzUCrawl.parseUri(url);

        if(url_parts['host'].indexOf('msn') > 0){
            if(url_parts['queryKey']['u']){
                masked_url = url_parts['queryKey']['u'];
                return masked_url;
            }
        }
        return url;
    },
    cleanHttpCache: function() {
      for(var key in CliqzUCrawl.httpCache) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.httpCache[key]['time']) > 60*CliqzUCrawl.tmult) {
          delete CliqzUCrawl.httpCache[key];
        }
      }
      for(var key in CliqzUCrawl.httpCache401) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.httpCache401[key]['time']) > 60*CliqzUCrawl.tmult) {
          delete CliqzUCrawl.httpCache401[key];
        }
      }

    },
    getHeaders: function(strData) {
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
          //if (aActivityType == nsIAO.ACTIVITY_TYPE_HTTP_TRANSACTION && aActivitySubtype == nsIAO.ACTIVITY_SUBTYPE_RESPONSE_HEADER) {

              try {
                var aChannel = aHttpChannel.QueryInterface(nsIHttpChannel);
                var url = decodeURIComponent(aChannel.URI.spec);

                var ho = CliqzUCrawl.getHeaders(aExtraStringData);
                var status = ho['status'];
                var loc = ho['loc'];
                var httpauth = ho['auth'];


                if (status=='301' || status == '302') {
                  CliqzUCrawl.httpCache[url] = {'status': '301', 'time': CliqzUCrawl.counter, 'location': loc};
                }

                if (status=='401') {
                  CliqzUCrawl.httpCache401[url] = {'time': CliqzUCrawl.counter};
                }

              } catch(ee) {
                return;
              }
          //}
        }
    },
    linkCache: {},
    cleanLinkCache: function() {
      for(var key in CliqzUCrawl.linkCache) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.linkCache[key]['time']) > 30*CliqzUCrawl.tmult) {
          delete CliqzUCrawl.linkCache[key];
        }
      }
    },
    getRedirects: function(url, res) {
        var res = res || []
        for(var key in CliqzUCrawl.httpCache) {
            if (CliqzUCrawl.httpCache[key]['location']!=null && CliqzUCrawl.httpCache[key]['status']=='301') {
                if (CliqzUCrawl.httpCache[key]['location']==url) {;
                    res.unshift(key)
                    CliqzUCrawl.getRedirects(key, res);
                }
            }
        }
        return res;
    },
    generateHashId: function(text) {
      try {
        var id = '';
        //var text = document.getElementsByTagName('body')[0].textContent;
        //var text = document.documentElement.innerHTML;
        var rpos = [102, 901, 15234, 212344, 909091, 234, 98924, 2304, 502002, 23455, 8289, 288345, 23429, 99852, 3453452, 2452234569964, 454353345, 6345245, 26563, 235235, 60993546, 546562, 565566];
        for(let i=0;i<rpos.length;i++) {
          id = id + text[rpos[i]%text.length];
        }
        if (id==null || id=='') throw('could not figure out the id of the page');
        else return id
      }
      catch(ee) {
        CliqzUtils.log('Exception: Could not get id of content' + ee, CliqzUCrawl.LOG_KEY);
      }
    },
    scrapeFurther: function(element) {
      try {
        var url = element.parentElement.parentElement.parentElement.parentElement.childNodes[0].children[0].attributes['href'].value;
        var title = element.parentElement.parentElement.parentElement.parentElement.childNodes[0].children[0].textContent;
        if (url==null || url==undefined || url=='') throw('Could not get URL');
        return {'u':  decodeURIComponent(url), 't': title};
      }
      catch(ee) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('Exception scrapeFurther' + ee, CliqzUCrawl.LOG_KEY);
        }
        return null;
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
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('Exception scrapping query: ' + ee, CliqzUCrawl.LOG_KEY);
        }
        return null;

      }
      q = document.getElementById('ires').attributes['data-async-context'].value

    },
    scrape: function(currURL, document) {
      var res = {};

      res['qurl'] = ''+currURL;
      res['q'] = CliqzUCrawl.scrapeQuery(currURL, document);
      res['t'] = new Date().getTime();
      res['r'] = {};
      try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
      res['ctry'] = location;



      var a = document.getElementsByTagName('cite');
      for(let i=0; i < a.length; i++) {
        var cand_url = a[i].textContent;
        var d = null;

          if (cand_url.indexOf('...')!=-1 || cand_url.indexOf(' ')!=-1) {
            // it's long URL or it contains spaces
            var d = CliqzUCrawl.scrapeFurther(a[i]);

          }
          else {
            if (cand_url.indexOf('/')!=-1) {
              // it's a clean cand

              var cand_url_clean = null;

              if (cand_url.indexOf('http')!=0) {
                cand_url_clean = 'http://' + cand_url;
              }
              else {
                cand_url_clean = cand_url;
              }

              cand_url_clean = decodeURIComponent(cand_url_clean);

              var d = CliqzUCrawl.scrapeFurther(a[i]);

              if (d!=null && cand_url_clean!=d['u']) {
                if (CliqzUCrawl.debug) {
                  CliqzUtils.log('>>> No match between urls  : ' + i + ' >> ' +  cand_url_clean + ' ' + JSON.stringify(d), CliqzUCrawl.LOG_KEY);
                }
              }
            }
            else {
              // WTF is this?
              if (CliqzUCrawl.debug) {
                CliqzUtils.log('>>> WTF this should not happen  : ' + i + ' >> ' +  cand_url, CliqzUCrawl.LOG_KEY);
              }
            }
          }

        if (d!=null) {
          //CliqzUtils.log('>>> GOOD : ' + i + ' >> ' +  d['u'], CliqzUCrawl.LOG_KEY);
          res['r'][''+i] = {'u': d['u'], 't': d['t']};

        }
        else {
          //CliqzUtils.log('>>> BAD  : ' + i + ' >> ' +  cand_url, CliqzUCrawl.LOG_KEY);
        }
      }

      if (CliqzUCrawl.debug) {
        CliqzUtils.log('>>> Scrape results: ' +  JSON.stringify(res,undefined,2), CliqzUCrawl.LOG_KEY);
      }
      return res;

    },
    searchResultsRefine: function(_res){
      var res={};

      //res = {};
      for (var i=0;i<_res.length;i++){
        if(_res[i].href.indexOf('r.search.yahoo.com') > 0){
          res[''+i] = {'u': _res[i].href.split('%2f')[2], 't': _res[i].text};

        }
        else{
          res[''+i] = {'u': _res[i].href, 't': _res[i].text};
        }

      }
      //Ucrawlutils.log("Yahoo results: " + JSON.stringify(res,undefined,2),CUcrawl.LOG_KEY);
      return res;
    },
    searchResults:function(currURL, document){
        var _res = null;
        var query = null;
        var res = {};
        res['t'] = new Date().getTime();
        res['r'] = {};
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        res['ctry'] = location;
        res['qurl'] = currURL;

        if(currURL.indexOf('google') > 0) {
            var val = document.getElementById('ires').attributes['data-async-context'].value;
            if (val.indexOf('query:') == 0) query = decodeURIComponent(val.replace('query:','').trim()).trim();
            _res = Array.prototype.slice.call(document.querySelectorAll('.r [href]')).filter(function(e){var r = RegExp("^http(s)?\:\/\/((www|encrypted)\.)?google\.(com?\.[a-z]{2}|[a-z]{2,})\/.+");   return !r.test(e.getAttribute('href') );    });
        }
        else if(currURL.indexOf('bing') > 0) {
            query = document.getElementById('sb_form_q').value;
            _res = Array.prototype.slice.call(document.querySelectorAll('.b_algo h2 [href]')).filter(function(e){var r = RegExp("^http(s)?\\:\\/\\/www\\.bing\\.com\\/(.)*");   return !r.test(e.getAttribute('.b_algo h2 href') );});
        }
        else if(currURL.indexOf('yahoo') > 0) {
            query = document.getElementById('yschsp').value;
            _res = Array.prototype.slice.call(document.querySelectorAll('h3 [href]')).filter(function(e){var r = RegExp("^http(s)?\\:\\/\\/((.)+\\.)?search\\.yahoo\\.com\\/(.)*");   return !r.test(e.getAttribute('h3 href') );    });
        }

        res['r'] = CliqzUCrawl.searchResultsRefine(_res);
        res['q'] = query;

        if (CliqzUCrawl.debug) {
            CliqzUtils.log('>>> Results moz-ucrawl: ' +  JSON.stringify(res,undefined,2), CliqzUCrawl.LOG_KEY);
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
        CliqzUtils.log('>>> Results moz-ucrawl: Get search results', CliqzUCrawl.LOG_KEY);
        // here we check if user ignored our results and went to google and landed on the same url
        var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
        var yrequery = /.search.yahoo\..*?[#?&;]p=[^$&]+/; // regex for yahoo query
        var brequery = /\.bing\..*?[#?&;]q=[^$&]+/; // regex for yahoo query
        var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
        var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

        //Get google result
        var rq = null;
        if (requery.test(activeURL)) {
            rq = CliqzUCrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CliqzUCrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'go'};
                CliqzUCrawl.track({'type': CliqzUCrawl.msgType, 'action': 'query', 'payload': rq});
                }
            }
        //Get yahoo result
        if (yrequery.test(activeURL)) {
            rq = CliqzUCrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CliqzUCrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'yahoo'};
                CliqzUCrawl.track({'type': CliqzUCrawl.msgType, 'action': 'query', 'payload': rq});
                }
            }

         //Get Bing result
        if (brequery.test(activeURL)){
            rq = CliqzUCrawl.searchResults(activeURL, document);
            if (rq!=null) {
                CliqzUCrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q'], 't': 'bing'};
                CliqzUCrawl.track({'type': CliqzUCrawl.msgType, 'action': 'query', 'payload': rq});
                }
        }
        return rq ;
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
    getParameterByName: function(url, name)  {
      /*
      name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
      var results = regex.exec(url.search);

      return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
      */
    },
    getEmbeddedURL: function(targetURL) {

      var ihttps = targetURL.lastIndexOf('https://')
      var ihttp = targetURL.lastIndexOf('http://')
      if (ihttps>0 || ihttp>0) {
        // contains either http or https not ont he query string, very suspicious
        var parqs = CliqzUCrawl.getParametersQS(targetURL);
        if (parqs['url']) {
          return decodeURIComponent(parqs['url']);
        }
      }
      else return null;
    },
    doubleFetch: function(url, hash) {
      if (CliqzUCrawl.debug) {
        CliqzUtils.log("doubleFetch for: " + url, CliqzUCrawl.LOG_KEY);
      }
      CliqzUtils.log("doubleFetch for: " + CliqzUCrawl.debug, CliqzUCrawl.LOG_KEY);
      var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();

      // hack to modify,
      //
      // http://stackoverflow.com/questions/6132755/retrieve-and-modify-content-of-an-xmlhttprequest

      /*
      var oldOpen = XMLHttpRequest.prototype.open;
      // overwrite open with our own function
      XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
        // intercept readyState changes
        this.addEventListener("readystatechange", function() {
            // your code goes here...
            CliqzUtils.log('HELLO: ' + this.readyState + ' ' + this.status, CliqzUCrawl.LOG_KEY);
            CliqzUtils.log('>>>: ' + this.getAllResponseHeaders(), CliqzUCrawl.LOG_KEY);
            var ho = CliqzUCrawl.getHeaders(this.getAllResponseHeaders());
            //if (ho['auth']) {

            CliqzUtils.log('>>>: ' + JSON.stringify(ho, undefined, 2), CliqzUCrawl.LOG_KEY);

            //if (ho['auth']) {
            //  req.abort();
            //}

        }, false);
        // finally call the original open method
        oldOpen.call(this, method, url, async, user, pass);
      };
      */

      //req.open('GET', url, true, ' ', null);
      try{
        req.open('GET', url, true);
        req.overrideMimeType('text/html');
        req.channel.loadFlags |= Ci.nsIRequest.LOAD_ANONYMOUS;
        }
        catch(ee){
            //Cases where in url starting from resource:// get loaded, should be handled at the starting.
            CliqzUCrawl.setAsPrivate(url);
            return;
        }

      // thank God to standard: http://www.w3.org/TR/XMLHttpRequest/
      //req.setRequestHeader("Authorization", "true");

      req.onload = function(){
        if(req.status != 200 && req.status != 0 /* local files */){
          req.onerror();
        }
        else {
          if (CliqzUCrawl.debug) {
            CliqzUtils.log("success on doubleFetch!", CliqzUCrawl.LOG_KEY);
          }

          var document = Services.appShell.hiddenDOMWindow.document;
          var doc = document.implementation.createHTMLDocument("example");
          doc.documentElement.innerHTML = req.responseText;
          var x = CliqzUCrawl.getPageData(doc);

          CliqzUCrawl.setAsPublic(url);
          CliqzUCrawl.track({'type': 'safe', 'action': 'doublefetch', 'payload': {'url': url, 'xaft': x, 'xbef': hash}});
        }
      }
      req.onerror = function() {
        if (CliqzUCrawl.debug) CliqzUtils.log("failure on doubleFetch! " + req.status, CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.setAsPrivate(url);
        CliqzUCrawl.track({'type': 'safe', 'action': 'doublefetch', 'payload': {'url': url, 'error': 'could not get page on double fetch', 'st': req.status}});
      }
      req.ontimeout = function(){
        req.onerror();
      }

      req.timeout = 10000;
      req.send(null);

    },
    getMetaRefresh: function(cd, url){
        var metas = null;
        var redURL = null;
        var title = null;
        try{redURL = cd.split('URL=')[1].split('>')[0].replace('"','').replace("'","")}catch(ee){};
        CliqzUCrawl.httpCache[url] = {'status': '301', 'time': CliqzUCrawl.counter, 'location': redURL};

        //Get first redirection.. for yahoo and stuff
        if(url.indexOf('r.search.yahoo.com') > -1){
            try{var _url = CliqzUCrawl.linkCache[decodeURIComponent(url)]['s']}catch(ee){var _url = url}
            CliqzUCrawl.linkCache[decodeURIComponent(redURL.replace("'",""))] = {'s': ''+_url, 'time': CliqzUCrawl.counter};
        }
        return redURL;

    },
    scrapeLinkedinFurther: function(element,cd){
        var payloadProf = {}
        //CliqzUtils.log("data pipeline: " + index, CliqzUCrawl.LOG_KEY);
        var imageLink = null;
        var fullName = null;
        var profileLink = null;
        var currentWork = null;
        var profileID = null;
        var url = '' + cd.location;

        //Do not log anything for private search
        if(url.indexOf('vsearch') > -1){
            return;
        }

        try {imageLink = element.querySelector('.photo,.entity-img,.profile-picture img').getAttribute('src')}catch(ee){};
        try {fullName = element.querySelector('h2 a,.title,.full-name').textContent.trim()}catch(ee){};

        //This changes as different URLs on linkedin.
        // View-public-profile
        try{
            profileLink = element.querySelector('h2 a,.title,.view-public-profile').getAttribute('href');
            if(!profileLink){
                profileLink =  Array.prototype.slice.call(cd.querySelectorAll('.view-public-profile'))[0].getAttribute('href');
                if(!profileLink){
                    profileLink = cd.location.href;
                }
            }
        }catch(ee){profileLink = cd.location.href;};

        try {currentWork = element.querySelector('.vcard-basic .title,.description,.editable-item .title').textContent}catch(ee){} ;
        try {profileID = element.getAttribute('data-li-entity-id')}catch(ee){};

        payloadProf = {"imgl" : imageLink, "fn": fullName, "pl" : profileLink,"cw" : currentWork,"pid" : profileID}
        CliqzUtils.log("data pipeline: " + JSON.stringify(payloadProf), CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.track({'type': 'safe', 'action': 'lprofile', 'payload': payloadProf});
        return;

    },
    scrapeLinkedin: function(cd){
        var vCards = Array.prototype.slice.call(cd.querySelectorAll('.vcard,.result'));
        vCards.forEach(function(e){CliqzUCrawl.scrapeLinkedinFurther(e,cd)});
    },
    checkLinkedin: function(cd){
        CliqzUtils.log("In data pipeline" + cd.location,CliqzUCrawl.LOG_KEY);
        //var linkedin_regex = "^https?://((www|\w\w)\.)?linkedin.com/((in/[^/]+/?)|(pub/[^/]+/((\w|\d)+/?){3}))$"
        var url = '' + cd.location;
        if(url.indexOf('linkedin.com') > -1){
            CliqzUtils.log("In data pipeline : yes",CliqzUCrawl.LOG_KEY);
            CliqzUCrawl.scrapeLinkedin(cd);
        }
    },
    dataPipeline: function(cd){
        //This will form the basis of data pipeline.
        //Currently need to check whether if it is a linkedin page or not.
        CliqzUCrawl.checkLinkedin(cd);

    },
    eventDoorWayPage: function(cd){
        var payload = {};
        var url = cd.location.href;
        var doorwayURL = cd.getElementsByTagName('a')[0].href;
        try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
        var orignalDomain = CliqzUCrawl.parseUri(url).host;
        var dDomain = CliqzUCrawl.parseUri(doorwayURL).host;
        if(orignalDomain == dDomain) return;
        payload = {"url":url, "durl":doorwayURL,"ctry": location};
        CliqzUCrawl.track({'type': CliqzUCrawl.msgType, 'action': 'doorwaypage', 'payload': payload});

    },
    getPageData: function(cd) {

      var len_html = null;
      var len_text = null;
      var title = null;
      var numlinks = null;
      var inputs = null;
      var inputs_nh = null;
      var forms = null;
      var pg_l = null;
      var metas = null;
      var tag_html = null;
      var iall =  'yes';
      var all = null;
      var canonical_url = null;

      try { len_html = cd.documentElement.innerHTML.length; } catch(ee) {}
      try { len_text = cd.documentElement.textContent.length; } catch(ee) {}
      try { title = cd.getElementsByTagName('title')[0].textContent; } catch(ee) {}
      try { numlinks = cd.getElementsByTagName('a').length; } catch(ee) {}
      try {
        inputs = cd.getElementsByTagName('input') || [];
        inputs_nh = 0;
        for(var i=0;i<inputs.length;i++) if (inputs[i]['type'] && inputs[i]['type']!='hidden') inputs_nh+=1;
      } catch(ee) {}


      try {
      metas = cd.getElementsByTagName('meta');
      for (i=0;i<metas.length;i++){if (metas[i].getAttribute("http-equiv") == "content-language" || metas[i].getAttribute("name") == "language")
       {
         pg_l = metas[i].getAttribute("content");
      }};

      if (pg_l == null)
      {
       tag_html = cd.getElementsByTagName('html');
       pg_l = tag_html[0].getAttribute("lang");
      };
      }catch(ee){}

      try {
      metas = cd.getElementsByTagName('meta');
      for (i=0;i<metas.length;i++){if (metas[i].getAttribute("name") == "robots")
       {
         all = metas[i]['content'];
         if(all.indexOf('noindex') > -1)
         {
           iall = 'no';
        }

      }};

      }catch(ee){};

    // extract the canonical url if available
    var link_tag = cd.getElementsByTagName('link');
    for (var j=0;j<link_tag.length;j++) {
            if (link_tag[j].getAttribute("rel") == "canonical") canonical_url = link_tag[j].href;
    }

      try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){}

      try { forms = cd.getElementsByTagName('form'); } catch(ee) {}

      //Detect doorway pages
      if(numlinks == 1 && cd.location){
        CliqzUCrawl.eventDoorWayPage(cd);
      }

      var x = {'lh': len_html, 'lt': len_text, 't': title, 'nl': numlinks, 'ni': (inputs || []).length, 'ninh': inputs_nh, 'nf': (forms || []).length, 'pagel' : pg_l , 'ctry' : location, 'iall': iall, 'canonical_url': canonical_url };
      return x;
    },
    getCDByURL: function(url) {


        var dd_url = url;

        try {
            dd_url = decodeURI(decodeURI(url));
        } catch(ee) {}

        for (var j = 0; j < CliqzUCrawl.windowsRef.length; j++) {
            var gBrowser = CliqzUCrawl.windowsRef[j].gBrowser;
            if (gBrowser.tabContainer) {
                var numTabs = gBrowser.tabContainer.childNodes.length;
                for (var i=0; i<numTabs; i++) {
                    var currentTab = gBrowser.tabContainer.childNodes[i];
                    var currentBrowser = gBrowser.getBrowserForTab(currentTab);
                    var currURL=''+currentBrowser.contentDocument.location;

                    if (CliqzUCrawl.debug) {
                        CliqzUtils.log("getCDByURL: " + (currURL==''+url) + " >> " + url + " " + currURL, CliqzUCrawl.LOG_KEY);
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
            var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
            var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

            var currwin = CliqzUtils.getWindow();
            var _currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;

            //This needs to go away. Should get the content from contentDocument, but it is coming as null right now.
            if(_currURL.indexOf('t.co/') > -1){
                CliqzUtils.httpGet(_currURL,
                function(res){
                    if(res && res.response){
                        try {
                         var _metaCD = res.response;

                         var redURL = CliqzUCrawl.getMetaRefresh(_metaCD,_currURL );
                        } catch(e){}
                    }
                }, null, 2000);
            }
            else if(_currURL.indexOf('r.search.yahoo.com') > -1){
                CliqzUtils.httpGet(_currURL,
                function(res){
                    if(res && res.response){
                        try {
                         var _metaCD = res.response;
                         var redURL = CliqzUCrawl.getMetaRefresh(_metaCD,_currURL );
                        } catch(e){}
                    }
                }, null, 2000);
            }

            //this.currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;

            CliqzUCrawl.lastActive = CliqzUCrawl.counter;
            CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;

            var activeURL = CliqzUCrawl.currentURL();

            if (activeURL.indexOf('about:')!=0) {
              if (CliqzUCrawl.state['v'][activeURL] == null) {

                //// if it was a Google query
                //if (requery.test(activeURL) && !reref.test(activeURL)) {

                //if (CliqzUCrawl.checkIfSearchURL(activeURL)){
                var se = CliqzUCrawl.checkSearchURL(activeURL);
                if (se > -1){
                  currwin.setTimeout(function(currURLAtTime) {

                    // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                    if (CliqzUCrawl) {
                      try {

                          // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                          //var currURL = currwin.gBrowser.selectedBrowser.contentDocument.location;

                            var activeURL = CliqzUCrawl.currentURL();
                            var document = null;
                            var searchURL = null;

                            if (currURLAtTime == activeURL) {
                                document = currwin.gBrowser.selectedBrowser.contentDocument;
                                searchURL = activeURL;
                            }
                            else{
                                    document = CliqzUCrawl.getCDByURL(currURLAtTime);
                                    searchURL = currURLAtTime;

                                }

                            //var rq = null;
                            //rq = CliqzUCrawl.getSearchData(searchURL, document);

                            //Under testing
                            CliqzUCrawl.checkURL(document);
                            CliqzUCrawl.queryCache[searchURL] = {'d': 0, 'q': CliqzUCrawl.searchCache[se]['q'], 't': CliqzUCrawl.searchCache[se]['t']};
                      }
                      catch(ee) {
                        // silent fail
                        if (CliqzUCrawl.debug) {
                          CliqzUtils.log('Exception: ' + ee, CliqzUCrawl.LOG_KEY);
                        }
                      }
                    }
                  }, CliqzUCrawl.WAIT_TIME, activeURL);
                }

                var status = null;

                if (CliqzUCrawl.httpCache[activeURL]!=null) {
                  status = CliqzUCrawl.httpCache[activeURL]['status'];
                }

                var referral = null;
                var qreferral = null;
                if (CliqzUCrawl.linkCache[activeURL] != null) {
                  referral = CliqzUCrawl.linkCache[activeURL]['s'];
                }

                //Get redirect chain
                var red = [];
                red = CliqzUCrawl.getRedirects(activeURL, red);
                if(red.length == 0){
                    red = null;
                }
                //Set referral for the first redirect in the chain.
                if (red && referral == null) {
                        var redURL = red[0];
                        var refURL = CliqzUCrawl.linkCache[redURL];
                        if(refURL){
                            referral = refURL['s'];
                        }

                        //Update query cache with the redirected URL

                        if (CliqzUCrawl.queryCache[redURL]) {
                            CliqzUCrawl.queryCache[activeURL] = CliqzUCrawl.queryCache[redURL];
                        }
                }

                CliqzUCrawl.state['v'][activeURL] = {'url': activeURL, 'a': 0, 'x': null, 'tin': new Date().getTime(),
                        'e': {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}, 'st': status, 'c': [], 'ref': referral,
                        'red': red};

                if (referral) {
                  // if there is a good referral, we must inherit the query if there is one
                  if (CliqzUCrawl.state['v'][referral] && CliqzUCrawl.state['v'][referral]['qr']) {
                    CliqzUCrawl.state['v'][activeURL]['qr'] = {}
                    CliqzUCrawl.state['v'][activeURL]['qr']['q'] = CliqzUCrawl.state['v'][referral]['qr']['q'];
                    CliqzUCrawl.state['v'][activeURL]['qr']['t'] = CliqzUCrawl.state['v'][referral]['qr']['t'];
                    CliqzUCrawl.state['v'][activeURL]['qr']['d'] = CliqzUCrawl.state['v'][referral]['qr']['d']+1;
                  }
                }

                currwin.setTimeout(function(currWin, currURL) {

                  var len_html = null;
                  var len_text = null;
                  var title = null;
                  var numlinks = null;

                  // Extract info about the page, title, length of the page, number of links, hash signature,
                  // 404, soft-404, you name it
                  //

                  try {
                    if (CliqzUCrawl.debug) {
                      CliqzUtils.log("CurrURL: " + currURL + " >>> Currwin: " + currWin.gBrowser.selectedBrowser.contentDocument.location.href , CliqzUCrawl.LOG_KEY);
                    }

                    //var cd = currWin.gBrowser.selectedBrowser.contentDocument;
                    //var cd = currURL.gBrowser.selectedBrowser.contentDocument;
                    var cd = CliqzUCrawl.getCDByURL(currURL);
                    if (CliqzUCrawl.debug) {
                      CliqzUtils.log("CurrURL: " + currURL + " >>> Currwin: " + cd.location.href , CliqzUCrawl.LOG_KEY);
                    }

                    //Check if the page is not a search engine:

                    var se = CliqzUCrawl.checkSearchURL(currURL);


                    if (se == -1){
                        CliqzUCrawl.checkURL(cd);
                    }

                    var x = CliqzUCrawl.getPageData(cd);

                    if (CliqzUCrawl.state['v'][currURL] != null) {
                      CliqzUCrawl.state['v'][currURL]['x'] = x;
                    }

                    if (CliqzUCrawl.queryCache[currURL]) {
                      CliqzUCrawl.state['v'][currURL]['qr'] = CliqzUCrawl.queryCache[currURL];
                    }

                    if (CliqzUCrawl.state['v'][currURL] != null) {
                      CliqzUCrawl.addURLtoDB(currURL, CliqzUCrawl.state['v'][currURL]['ref'], CliqzUCrawl.state['v'][currURL]['x']);
                    }

                  } catch(ee) {
                    if (CliqzUCrawl.debug) {
                      CliqzUtils.log("Error fetching title and length of page: " + ee, CliqzUCrawl.LOG_KEY);
                    }
                  }


                }, CliqzUCrawl.WAIT_TIME, currwin, activeURL);

              }
              else {
                // wops, it exists on the active page, probably it comes from a back button or back
                // from tab navigation
                CliqzUCrawl.state['v'][activeURL]['tend'] = null;
              }

              // they need to be loaded upon each onlocation, not only the first time
              currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("keypress", CliqzUCrawl.captureKeyPressPage);
              currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousemove", CliqzUCrawl.captureMouseMovePage);
              currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousedown", CliqzUCrawl.captureMouseClickPage);
              currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("scroll", CliqzUCrawl.captureScrollPage);
              currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("copy", CliqzUCrawl.captureCopyPage);

            }
        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
         // CliqzUtils.log('state change: ' + aFlag, CliqzUCrawl.LOG_KEY);


        }
    },
    pacemaker: function() {
      var activeURL = CliqzUCrawl.currentURL();

      if (activeURL && (activeURL).indexOf('about:')!=0) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.lastActive) < 5*CliqzUCrawl.tmult) {
          // if there has been an event on the last 5 seconds, if not do no count, the user must
          // be doing something else,
          //
          try {
            CliqzUCrawl.state['v'][activeURL]['a'] += 1;
          } catch(ee) {
            if (CliqzUCrawl.debug) {
              //CliqzUtils.log('Not an error, activeURL not found in state, it was removed already: ' + activeURL, CliqzUCrawl.LOG_KEY);
            }
          }
        }
      }

      if ((activeURL==null) && ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 10 == 0)) {
        CliqzUCrawl.pushAllData();
      }

      /*
      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 10 == 0) {
        CliqzUCrawl.doubleFetch('https://golf.cliqz.com/dashboard/#KPIs_BM', function() {});
      }
      */


      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 1 == 0) {

        var openPages = CliqzUCrawl.getAllOpenPages();
        var tt = new Date().getTime();

        for (var url in CliqzUCrawl.state['v']) {
          if (CliqzUCrawl.state['v'].hasOwnProperty(url)) {

            if (openPages.indexOf(url)==-1) {
              // not opened

              if (CliqzUCrawl.state['v'][url]['tend']==null) {
                CliqzUCrawl.state['v'][url]['tend'] = tt;
              }

              if ((tt - CliqzUCrawl.state['v'][url]['tend']) > 5*60*1000) {
                // move to "dead pages" after 5 minutes
                CliqzUCrawl.state['m'].push(CliqzUCrawl.state['v'][url]);
                delete CliqzUCrawl.state['v'][url];
              }

            }
            else {
              // stil opened, do nothing.
              if ((tt - CliqzUCrawl.state['v'][url]['tin']) > 20*60*1000) {
                // unless it was opened more than 20 minutes ago, if so, let's move it to dead pages

                CliqzUCrawl.state['v'][url]['tend'] = null;
                CliqzUCrawl.state['v'][url]['too_long'] = true;
                CliqzUCrawl.state['m'].push(CliqzUCrawl.state['v'][url]);
                delete CliqzUCrawl.state['v'][url];

              }

            }
          }
        }

      }

      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 10 == 0) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('Pacemaker: ' + CliqzUCrawl.counter/CliqzUCrawl.tmult + ' ' + activeURL + ' >> ' + CliqzUCrawl.state.id, CliqzUCrawl.LOG_KEY);
          //CliqzUtils.log(JSON.stringify(CliqzUCrawl.state, undefined, 2), CliqzUCrawl.LOG_KEY);
          //CliqzUtils.log(JSON.stringify(CliqzUCrawl.getAllOpenPages(), undefined, 2), CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.cleanHttpCache();
      }

      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % (1*60) == 0) {
        // every minute
        CliqzUCrawl.listOfUnchecked(1, 3600, CliqzUCrawl.processUnchecks);
      }

      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 10 == 0) {
        var ll = CliqzUCrawl.state['m'].length;
        if (ll > 0) {
          var v = CliqzUCrawl.state['m'].slice(0, ll);
          CliqzUCrawl.state['m'] = CliqzUCrawl.state['m'].slice(ll, CliqzUCrawl.state['m'].length);

          for(var i=0;i<v.length;i++) {
            CliqzUCrawl.track({'type': 'safe', 'action': 'page', 'payload': v[i]});
          }
        }
      }

      //Load patterns config
        if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % (60 * 60 * 24) == 0) {
            if (CliqzUCrawl.debug) {
                CliqzUtils.log('Load pattern config', CliqzUCrawl.LOG_KEY);
            }
            CliqzUCrawl.loadContentExtraction();
      }

      CliqzUCrawl.counter += 1;

    },
    pushAllData: function() {
      var tt = new Date().getTime();
      var res = [];
      for (var url in CliqzUCrawl.state['v']) {
        if (CliqzUCrawl.state['v'][url]) res.push(url);
      }

      for (var i=0; i<res.length; i++) {
        // move all the pages to m set
        var url = res[i];
        if (CliqzUCrawl.state['v'][url]) {
          if (CliqzUCrawl.state['v'][url]['tend']==null) {
            CliqzUCrawl.state['v'][url]['tend'] = tt;
          }

          CliqzUCrawl.state['m'].push(CliqzUCrawl.state['v'][url]);
          delete CliqzUCrawl.state['v'][url];
        }
      }

      // send them to track if needed
      var ll = CliqzUCrawl.state['m'].length;
      if (ll > 0) {
        var v = CliqzUCrawl.state['m'].slice(0, ll);
        CliqzUCrawl.state['m'] = CliqzUCrawl.state['m'].slice(ll, CliqzUCrawl.state['m'].length);

        for(var i=0;i<v.length;i++) {
          CliqzUCrawl.track({'type': 'safe', 'action': 'page', 'payload': v[i]});
        }
        // do a instant push on whatever is left on the track
        CliqzUCrawl.pushTrack();

      }
    },
    destroy: function() {
      CliqzUtils.log('destroy', CliqzUCrawl.LOG_KEY);
      CliqzUCrawl.pushAllData();
      CliqzUtils.clearTimeout(CliqzUCrawl.pacemakerId);
      CliqzUtils.clearTimeout(CliqzUCrawl.trkTimer);
      CliqzUtils.log('end_destroy', CliqzUCrawl.LOG_KEY);
    },
    currentURL: function() {
      var currwin = CliqzUtils.getWindow();
      if (currwin) {
        var currURL = ''+currwin.gBrowser.selectedBrowser.contentDocument.location;
        currURL = decodeURIComponent(currURL.trim());
        if (currURL!=null || currURL!=undefined) return currURL;
        else return null;
      }
      else return null;
    },
    pacemakerId: null,
    // load from the about:config settings
    captureKeyPress: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['keypress']|0)) > 1 * CliqzUCrawl.tmult && ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['keypresspage']|0)) > 1 * CliqzUCrawl.tmult)) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureKeyPressAll', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['keypress'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;
      }
    },
    captureMouseMove: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemove']|0)) > 1 * CliqzUCrawl.tmult && ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemovepage']|0)) > 1 * CliqzUCrawl.tmult)) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureMouseMoveAll', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['mousemove'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;
      }
    },
    captureMouseClick: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mouseclick']|0)) > 1 * CliqzUCrawl.tmult && ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mouseclickpage']|0)) > 1 * CliqzUCrawl.tmult)) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureMouseClickAll', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['mouseclick'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;
      }
    },
    captureKeyPressPage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['keypresspage']|0)) > 1 * CliqzUCrawl.tmult) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureKeyPressPage', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['keypresspage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        var activeURL = CliqzUCrawl.currentURL();
        if (CliqzUCrawl.state['v'][activeURL]!=null && CliqzUCrawl.state['v'][activeURL]['a'] > 1*CliqzUCrawl.tmult) {
          CliqzUCrawl.state['v'][activeURL]['e']['kp'] += 1;
        }

      }
    },
    captureMouseMovePage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemovepage']|0)) > 1 * CliqzUCrawl.tmult) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureMouseMovePage', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['mousemovepage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        var activeURL = CliqzUCrawl.currentURL();
        if (CliqzUCrawl.state['v'][activeURL]!=null && CliqzUCrawl.state['v'][activeURL]['a'] > 1*CliqzUCrawl.tmult) {
          CliqzUCrawl.state['v'][activeURL]['e']['mm'] += 1;
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
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('Error in getURLFromEvent: ' + ee, CliqzUCrawl.LOG_KEY);
        }
      }

      return null;
    },
    captureMouseClickPage: function(ev) {

      // if the target is a link of type hash it does not work, it will create a new page without referral
      //

      var targetURL = CliqzUCrawl.getURLFromEvent(ev);

      if (targetURL!=null) {

        var embURL = CliqzUCrawl.getEmbeddedURL(targetURL);
        if (embURL!=null) targetURL = embURL;

        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureMouseClickPage>> ' + CliqzUCrawl.counter + ' ' + targetURL  + ' : ' + ev.target + ' :: ' + ev.target.value  + ' >>' + JSON.stringify(CliqzUCrawl.lastEv), CliqzUCrawl.LOG_KEY);
        }

        var activeURL = CliqzUCrawl.currentURL();

        if (CliqzUCrawl.state['v'][activeURL]!=null) {
          CliqzUCrawl.state['v'][activeURL]['c'].push({'l': ''+targetURL, 't': CliqzUCrawl.counter});
          CliqzUCrawl.linkCache[targetURL] = {'s': ''+activeURL, 'time': CliqzUCrawl.counter};

          /*
          if (CliqzUCrawl.state['v'][activeURL]['qr']) {
            CliqzUCrawl.linkCache[targetURL]['qr'] = {}
            CliqzUCrawl.linkCache[targetURL]['qr']['q'] = CliqzUCrawl.state['v'][activeURL]['qr']['q'];
            CliqzUCrawl.linkCache[targetURL]['qr']['d'] = CliqzUCrawl.state['v'][activeURL]['qr']['d']+1;
          }
          */

        }
      }

      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mouseclickpage']|0)) > 1 * CliqzUCrawl.tmult) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureMouseClickPage', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['mouseclickpage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        var activeURL = CliqzUCrawl.currentURL();
        if (CliqzUCrawl.state['v'][activeURL]!=null && CliqzUCrawl.state['v'][activeURL]['a'] > 1*CliqzUCrawl.tmult) {
          CliqzUCrawl.state['v'][activeURL]['e']['md'] += 1;
        }

      }
    },
    captureScrollPage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['scrollpage']|0)) > 1 * CliqzUCrawl.tmult) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureScrollPage', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['scrollpage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        var activeURL = CliqzUCrawl.currentURL();
        if (CliqzUCrawl.state['v'][activeURL]!=null && CliqzUCrawl.state['v'][activeURL]['a'] > 1*CliqzUCrawl.tmult) {
          CliqzUCrawl.state['v'][activeURL]['e']['sc'] += 1;
        }

      }
    },
    captureCopyPage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['copypage']|0)) > 1 * CliqzUCrawl.tmult) {
        if (CliqzUCrawl.debug) {
          CliqzUtils.log('captureCopyPage', CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.lastEv['copypage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        var activeURL = CliqzUCrawl.currentURL();
        if (CliqzUCrawl.state['v'][activeURL]!=null && CliqzUCrawl.state['v'][activeURL]['a'] > 1*CliqzUCrawl.tmult) {
          CliqzUCrawl.state['v'][activeURL]['e']['cp'] += 1;
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
        for (var j = 0; j < CliqzUCrawl.windowsRef.length; j++) {
          var gBrowser = CliqzUCrawl.windowsRef[j].gBrowser;
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
        CliqzUCrawl.initDB();
        var win_id = CliqzUtils.getWindowID()

        if (CliqzUCrawl.state == null) {
          CliqzUCrawl.state = {};
        }
        else {

          var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
          var win_id = util.outerWindowID;

          if (CliqzUCrawl.windowsMem[win_id] == null) {
            CliqzUCrawl.windowsMem[win_id] = window;
            CliqzUCrawl.windowsRef.push(window);
          }

        }

        var util = window.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowUtils);
        var win_id = util.outerWindowID;

        if (CliqzUCrawl.windowsMem[win_id] == null) {
          CliqzUCrawl.windowsMem[win_id] = window;
          CliqzUCrawl.windowsRef.push(window);
        }

        if (CliqzUCrawl.pacemakerId==null) {
          CliqzUCrawl.pacemakerId = CliqzUtils.setInterval(CliqzUCrawl.pacemaker, CliqzUCrawl.tpace, null);
        }


        var activityDistributor = Components.classes["@mozilla.org/network/http-activity-distributor;1"]
                                    .getService(Components.interfaces.nsIHttpActivityDistributor);

        activityDistributor.addObserver(CliqzUCrawl.httpObserver);
        //Needs to be more generic.
        CliqzUCrawl.loadContentExtraction();

    },
    state: {'v': {}, 'm': [], '_id': Math.floor( Math.random() * 1000 ) },
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    },
    // ****************************
    // TRACK, PREFER NOT TO SHARE WITH CliqzUtils for safety, blatant rip-off though
    // ****************************
    trk: [],
    trkTimer: null,
    track: function(msg, instantPush) {
      if (!CliqzUCrawl) return; //might be called after the module gets unloaded
      if (CliqzUtils.getPref('dnt', false)) return;
      msg.ts = (new Date()).getTime();
      msg.ver = CliqzUCrawl.VERSION;

      CliqzUCrawl.trk.push(msg);
      CliqzUtils.clearTimeout(CliqzUCrawl.trkTimer);
      if(instantPush || CliqzUCrawl.trk.length % 100 == 0){
        CliqzUCrawl.pushTrack();
      } else {
        CliqzUCrawl.trkTimer = CliqzUtils.setTimeout(CliqzUCrawl.pushTrack, 60000);
      }
    },
    _track_req: null,
    _track_sending: [],
    _track_start: undefined,
    TRACK_MAX_SIZE: 500,
    pushTrack: function() {
      if(CliqzUCrawl._track_req) return;

      // put current data aside in case of failure
      CliqzUCrawl._track_sending = CliqzUCrawl.trk.slice(0);
      CliqzUCrawl.trk = [];
      CliqzUCrawl._track_start = (new Date()).getTime();

      CliqzUtils.log('push tracking data: ' + CliqzUCrawl._track_sending.length + ' elements', "CliqzUCrawl.pushTrack");

      CliqzUCrawl._track_req = CliqzUtils.httpPost(CliqzUtils.SAFE_BROWSING, CliqzUCrawl.pushTrackCallback, JSON.stringify(CliqzUCrawl._track_sending), CliqzUCrawl.pushTrackError);
    },
    pushTrackCallback: function(req){
      try {
        CliqzUtils.log('push tracking successful', "CliqzUCrawl.pushTrack");
        var response = JSON.parse(req.response);
        CliqzUCrawl._track_sending = [];
        CliqzUCrawl._track_req = null;
      } catch(e){}
    },
    pushTrackError: function(req){
      // pushTrack failed, put data back in queue to be sent again later
      CliqzUtils.log('push tracking failed: ' + CliqzUCrawl._track_sending.length + ' elements', "CliqzUCrawl.pushTrack");
      CliqzUCrawl.trk = CliqzUCrawl._track_sending.concat(CliqzUCrawl.trk);

      // Remove some old entries if too many are stored, to prevent unbounded growth when problems with network.
      var slice_pos = CliqzUCrawl.trk.length - CliqzUCrawl.TRACK_MAX_SIZE + 100;
      if(slice_pos > 0){
        CliqzUtils.log('discarding ' + slice_pos + ' old tracking elements', "CliqzUCrawl.pushTrack");
        CliqzUCrawl.trk = CliqzUCrawl.trk.slice(slice_pos);
      }

      CliqzUCrawl._track_sending = [];
      CliqzUCrawl._track_req = null;
    },
    // ************************ Database ***********************
    // Stolen from modules/CliqzHistory
    // *********************************************************
    initDB: function() {
      CliqzUtils.log('Exists DB?: ' +  FileUtils.getFile("ProfD", ["cliqz.dbusafe"]).exists(), CliqzUCrawl.LOG_KEY);
      if ( FileUtils.getFile("ProfD", ["cliqz.dbusafe"]).exists() ) {
        if (CliqzUCrawl.dbConn==null) {
          CliqzUCrawl.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbusafe"]));
        }
        return;
      }
      else {
        CliqzUCrawl.dbConn = Services.storage.openDatabase(FileUtils.getFile("ProfD", ["cliqz.dbusafe"]));
        var usafe = "create table usafe(\
            url VARCHAR(255) PRIMARY KEY NOT NULL,\
            ref VARCHAR(255),\
            last_visit INTEGER,\
            first_visit INTEGER,\
            hash VARCHAR(2048), \
            reason VARCHAR(256), \
            private BOOLEAN DEFAULT 0,\
            checked BOOLEAN DEFAULT 0 \
            )";

        CliqzUCrawl.dbConn.executeSimpleSQL(usafe);
      }

    },
    dbConn: null,
    auxSameDomain: function(url1, url2) {
      var d1 = CliqzUCrawl.parseURL(url1).hostname.replace('www.','');
      var d2 = CliqzUCrawl.parseURL(url2).hostname.replace('www.','');
      return d1==d2;
    },
    isPrivate: function(url, depth, callback) {
      // returns 1 is private (because of checked, of because the referrer is private)
      // returns 0 if public
      // returns -1 if not checked yet, handled as public in this cases,

      var res = [];
      var st = CliqzUCrawl.dbConn.createStatement("SELECT * FROM usafe WHERE url = :url");
      st.params.url = url;

      var res = [];
      st.executeAsync({
        handleResult: function(aResultSet) {
          for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            res.push({"url": row.getResultByName("url"), "ref": row.getResultByName("ref"), "private": row.getResultByName("private"), "checked": row.getResultByName("checked")});
          }
        },
        handleError: function(aError) {
          CliqzUtils.log("SQL error: " + aError.message, CliqzUCrawl.LOG_KEY);
          callback(true);
        },
        handleCompletion: function(aReason) {
          if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
            CliqzUtils.log("SQL canceled or aborted", CliqzUCrawl.LOG_KEY);
            callback(true);
          }
          else {
            if (res.length == 1) {
              if (res[0].ref!='' && res[0].ref!=null) {
                if (depth < 10) {
                    if (CliqzUCrawl.auxSameDomain(res[0].ref, url)) {
                      CliqzUCrawl.isPrivate(res[0].ref, depth+1, function(priv) {
                        callback(priv);
                      });
                    }
                    else callback(false);
                }
                else {
                  // set to private (becasue we are not sure so beter safe than sorry),
                  // there is a loop of length > 10 between a <- b <- .... <- a, so if we do not
                  // break recursion it will continue to do the SELECT forever
                  //
                  callback(true);
                }

              }
              else {
                callback(false);
              }
            }
            else {
              callback(true);
            }
          }
        }
      });
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

        var oh = CliqzUCrawl.parseHostname(v[0]);
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
    suspiciousURL: function(url) {

      var u1 = CliqzUCrawl.parseURL(url);

      if ([80, 443].indexOf(u1.port) == -1) {
        // not a standard port
        return true;
      }

      if (u1.username!='' || u1.password!='') {
        // contains http pass
        return true;
      }

      var h = u1.hostname.replace(/\./g,'');
      if (''+parseInt(h) == h) {
        // hostname is an ip address
        return true;
      }

      // More to come

      return false;
    },
    addURLtoDB: function(url, ref, obj) {
      var tt = new Date().getTime();

      //var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
      var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
      // CliqzUtils.log("URL?? " + url + " " + requery.test(url) + " " + reref.test(url), CliqzUCrawl.LOG_KEY);


      var se = CliqzUCrawl.checkSearchURL(url);
      if (se > -1 || reref.test(url)){
        return
      }
      //if (requery.test(url) || reref.test(url)) return;

      var stmt = CliqzUCrawl.dbConn.createStatement("SELECT url, checked FROM usafe WHERE url = :url");
      stmt.params.url = url;

      var res = [];
      stmt.executeAsync({
        handleResult: function(aResultSet) {
          for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            res.push({'url': row.getResultByName("url"), 'checked': row.getResultByName("checked")});
          }
        },
        handleError: function(aError) {
          CliqzUtils.log("SQL error: " + aError.message, CliqzUCrawl.LOG_KEY);
        },
        handleCompletion: function(aReason) {
          if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
            CliqzUtils.log("SQL canceled or aborted", CliqzUCrawl.LOG_KEY);
          }
          else {
            if (res.length == 0) {
              // we never seen it, let's add it

              var st = CliqzUCrawl.dbConn.createStatement("INSERT INTO usafe (url,ref,last_visit,first_visit, hash, reason, private, checked) VALUES (:url, :ref, :last_visit, :first_visit, :hash, :reason, :private, :checked)");
              st.params.url = url;
              st.params.ref = ref;
              st.params.last_visit = tt;
              st.params.first_visit = tt;
              st.params.hash = JSON.stringify(obj || {});;

              if (CliqzUCrawl.suspiciousURL(url)) {
                // if the url looks private already add it already as checked and private
                st.params.checked = 1;
                st.params.private = 1;
                st.params.reason = 'susp. url';
                CliqzUCrawl.track({'type': 'safe', 'action': 'doublefetch', 'payload': {'url': url, 'r': 'susp. url'}});
              }
              else {

                if (CliqzUCrawl.httpCache401[url]) {
                  st.params.checked = 1;
                  st.params.private = 1;
                  st.params.reason = '401';
                  CliqzUCrawl.track({'type': 'safe', 'action': 'doublefetch', 'payload': {'url': url, 'r': '401'}});

                }
                else {
                  st.params.checked = 0;
                  st.params.private = 0;
                  st.params.reason = '';
                }
              }
              while (st.executeStep()) {};

            }
            else {
              // we have seen it, if it's has been already checked, then ignore, if not, let's update the last_visit
              if (res[0]['checked']==0) {
                var st = CliqzUCrawl.dbConn.createStatement("UPDATE usafe SET last_visit = :last_visit WHERE url = :url");
                st.params.url = url;
                st.params.last_visit = tt;
                while (st.executeStep()) {};
              }
            }
          }
        }
      });
    },
    setAsPrivate: function(url) {
      var st = CliqzUCrawl.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
      st.params.url = url;
      st.params.checked = 1;
      st.params.private = 1;
      while (st.executeStep()) {};
    },
    setAsPublic: function(url) {
      var st = CliqzUCrawl.dbConn.createStatement("UPDATE usafe SET checked = :checked, private = :private WHERE url = :url");
      st.params.url = url;
      st.params.checked = 1;
      st.params.private = 0;
      while (st.executeStep()) {};
    },
    listOfUnchecked: function(cap, sec_old, callback) {
      var tt = new Date().getTime();
      var stmt = CliqzUCrawl.dbConn.createAsyncStatement("SELECT url, hash FROM usafe WHERE checked = :checked and last_visit < :last_visit LIMIT :cap;");
      stmt.params.cap = cap;
      stmt.params.last_visit = (tt - sec_old*1000);
      stmt.params.checked = 0;

      var res = [];
      stmt.executeAsync({
        handleResult: function(aResultSet) {
          for (let row = aResultSet.getNextRow(); row; row = aResultSet.getNextRow()) {
            res.push([row.getResultByName("url"), JSON.parse(row.getResultByName("hash"))]);
          }
        },
        handleError: function(aError) {
          CliqzUtils && CliqzUtils.log("SQL error: " + aError.message, CliqzUCrawl.LOG_KEY);
        },
        handleCompletion: function(aReason) {
          //might get called after uninstall
          if(!Components || !CliqzUtils) return;

          if (aReason != Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
            CliqzUtils.log("SQL canceled or aborted", CliqzUCrawl.LOG_KEY);
          }
          else {
            callback(res.splice(0,cap));
          }
        }
      });
    },
    processUnchecks: function(listOfUncheckedUrls) {
      for(var i=0;i<listOfUncheckedUrls.length;i++) {
        var url = listOfUncheckedUrls[i][0];
        var hash = listOfUncheckedUrls[i][1];

        CliqzUCrawl.isPrivate(url, 0, function(isPrivate) {
          if (isPrivate) {
            var st = CliqzUCrawl.dbConn.createStatement("UPDATE usafe SET reason = :reason, checked = :checked, private = :private WHERE url = :url");
            st.params.url = url;
            st.params.checked = 1;
            st.params.private = 1;
            st.params.reason = 'priv. st.';
            while (st.executeStep()) {};
            CliqzUCrawl.track({'type': 'safe', 'action': 'doublefetch', 'payload': {'url': url, 'r': 'prov. st.'}});
          }
          else {
            CliqzUCrawl.doubleFetch(url, hash);
          }

        })
      }
    },
    outOfABTest: function() {
      CliqzUCrawl.dbConn.executeSimpleSQL('DROP TABLE usafe;');
    },
    loadContentExtraction: function(){
        //Check health
        CliqzUtils.httpGet(CliqzUCrawl.patternsURL,
          function success(req){
            if(!CliqzUCrawl) return;

            var patternConfig = JSON.parse(req.response);
            CliqzUCrawl.searchEngines = patternConfig["searchEngines"];
            CliqzUCrawl.extractRules = patternConfig["scrape"];
            CliqzUCrawl.payloads = patternConfig["payloads"];
            CliqzUCrawl.idMappings = patternConfig["idMapping"];
            CliqzUCrawl.rArray = [];
            patternConfig["urlPatterns"].forEach(function(e){
              CliqzUCrawl.rArray.push(new RegExp(e));
            })
          },
          function error(res){
            CliqzUtils.log('Error loading config. ', CliqzUCrawl.LOG_KEY)
            });
    },
    checkURL: function(cd){
        var url = cd.location.href;
        var pageContent = cd;
        //var rArray = new Array(new RegExp(/\.google\..*?[#?&;]q=[^$&]+/), new RegExp(/.search.yahoo\..*?[#?&;]p=[^$&]+/), new RegExp(/.linkedin.*?\/pub\/dir+/),new RegExp(/\.bing\..*?[#?&;]q=[^$&]+/),new RegExp(/.*/))
        //scrap(4, pageContent)
        for(var i=0;i<CliqzUCrawl.rArray.length;i++){
            if(CliqzUCrawl.rArray[i].test(url)){
                CliqzUCrawl.extractContent(i, pageContent);

                //Do not want to continue after search engines...
                if(CliqzUCrawl.searchEngines.indexOf(''+i) != -1 ){return;}
                if (CliqzUCrawl.debug) {
                    CliqzUtils.log('Continue further after search engines ', CliqzUCrawl.LOG_KEY);
                }
            }
      }
    },
    checkSearchURL: function(url){
        //var url = cd.location.href;
        //var pageContent = cd;
        //var rArray = new Array(new RegExp(/\.google\..*?[#?&;]q=[^$&]+/), new RegExp(/.search.yahoo\..*?[#?&;]p=[^$&]+/), new RegExp(/.linkedin.*?\/pub\/dir+/),new RegExp(/\.bing\..*?[#?&;]q=[^$&]+/),new RegExp(/.*/))
        //scrap(4, pageContent)
        var idx = null;
        var reref = /\.google\..*?\/(?:url|aclk)\?/;
        for(var i=0;i<CliqzUCrawl.rArray.length;i++){
            if(CliqzUCrawl.rArray[i].test(url)){
                //Do not want to continue after search engines... && !reref.test(url)
                if(CliqzUCrawl.searchEngines.indexOf(''+i) != -1 ){;
                    idx = i;
                    return idx;
                }
                else{
                    if (CliqzUCrawl.debug) {
                        CliqzUtils.log('Not search engine ' + i + CliqzUCrawl.searchEngines, CliqzUCrawl.LOG_KEY);
                    }
                    return -1;
                }
            }
        }
    },
    extractContent: function(ind, cd){
        var scrapeResults = {};
        var eventMsg = {};
        var rules = {};
        var key = "";
        var rule = "";
        rules = CliqzUCrawl.extractRules[ind];
        CliqzUtils.log('rules' + rules + ind, CliqzUCrawl.LOG_KEY);
        var urlArray = [];
        var titleArray = [];
        for(key in rules){
            var _keys = Object.keys(rules[key]);
            if (CliqzUCrawl.debug) {
                CliqzUtils.log('keys' + _keys, CliqzUCrawl.LOG_KEY);
            }
            var innerDict = {};
            _keys.forEach(function(each_key){
                    if(rules[key][each_key]['type'] == 'standard'){

                        //Depending on etype, currently only supporting url. Maybe ctry too.
                        if(rules[key][each_key]['etype'] == 'url'){
                            var qurl = cd.location.href;
                            innerDict[each_key] = [qurl];
                        }

                        if(rules[key][each_key]['etype'] == 'ctry'){
                            try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                            innerDict[each_key] = [location];
                        }


                    }
                    else if(rules[key][each_key]['type'] == 'searchQuery'){
                        urlArray = CliqzUCrawl._getAttribute(cd,key,rules[key][each_key]['item'], rules[key][each_key]['etype'], rules[key][each_key]['keyName'],(rules[key][each_key]['functionsApplied'] || null))
                        //console.log(urlArray);
                        innerDict[each_key] = urlArray;
                        CliqzUCrawl.searchCache[ind] = {'q' : urlArray[0], 't' : CliqzUCrawl.idMappings[ind]};
                    }
                    else{
                        urlArray = CliqzUCrawl._getAttribute(cd,key,rules[key][each_key]['item'], rules[key][each_key]['etype'], rules[key][each_key]['keyName'],(rules[key][each_key]['functionsApplied'] || null))
                        //console.log(urlArray);
                        innerDict[each_key] = urlArray;
                    }
            })

            if(CliqzUCrawl.messageTemplate[ind]){
                CliqzUCrawl.messageTemplate[ind][key] = innerDict;
            }
            else{
                CliqzUCrawl.messageTemplate[ind] = {};
                CliqzUCrawl.messageTemplate[ind][key] = innerDict;

            }

            //Check if array has values.
            var _mergeArr = CliqzUCrawl.mergeArr(CliqzUCrawl.messageTemplate[ind][key]);
            if(_mergeArr.length > 0){
                scrapeResults[key] = _mergeArr;
            }
        }

        for(rule in CliqzUCrawl.payloads[ind]){
            CliqzUCrawl.createPayload(scrapeResults, ind, rule)
        }
    },
    mergeArr: function(arrS){
        var messageList = [];
        var allKeys = [];
        allKeys =  Object.keys(arrS);
        arrS[allKeys[0]].forEach(function(e,idx){var innerDict ={};messageList.push(allKeys.map(function(e,_idx,arr){innerDict[e]=arrS[e][idx];return innerDict})[0])})
        return messageList;
    },
    _getAttribute: function(cd,parentItem,item,attrib,keyName,functionsApplied){
        var arr = [];
        var refineFuncMappings = {
           "splitF":CliqzUCrawl.refineSplitFunc,
           "parseU":CliqzUCrawl.refineParseURIFunc
        }
        var rootElement = Array.prototype.slice.call(cd.querySelectorAll(parentItem));
        for(var i=0;i<rootElement.length;i++){
            var val = rootElement[i].querySelector(item);
            if (val){
                //Not Null
                var innerDict = {};
                var attribVal = val[attrib] || val.getAttribute(attrib);

                // Check if the value needs to be refined or not.
                if(functionsApplied){
                    attribVal = functionsApplied.reduce(function(attribVal, e){
                        return refineFuncMappings[e[0]](attribVal,e[1],e[2]);
                    },attribVal)

                }
                arr.push(innerDict[keyName] = attribVal);
            }
            else{
                var innerDict = {}
                arr.push(innerDict[keyName] = val);
            }
        }
        return arr;
    },
    createPayload: function(scrapeResults, idx, key){
        try{
            var payloadRules = CliqzUCrawl.payloads[idx][key];
            if (payloadRules['type'] == 'single' && payloadRules['results'] == 'single' ){
                scrapeResults[key].forEach(function(e){
                    try {var location = CliqzUtils.getPref('config_location', null)} catch(ee){};
                    e['ctry'] = location;
                    CliqzUCrawl.sendMessage(payloadRules, e)
                })
            }
            else if (payloadRules['type'] == 'single' && payloadRules['results'] == 'custom' ){
                    var payload = {};
                    payloadRules['fields'].forEach(function(e){
                        try{payload[e[1]] = scrapeResults[e[0]][0][e[1]]}catch(ee){};
                        CliqzUCrawl.sendMessage(payloadRules, payload)
                    })
            }
            else if (payloadRules['type'] == 'query' && payloadRules['results'] == 'clustered'){
                var payload = {};
                payloadRules['fields'].forEach(function(e){
                    if (e.length > 2){
                        var joinArr = {};
                        for(var i=0;i<scrapeResults[e[0]].length;i++){
                                joinArr['' + i] = scrapeResults[e[0]][i];
                        }
                        payload[e[1]] = joinArr;
                    }
                    else{
                        payload[e[1]] = scrapeResults[e[0]][0][e[1]];
                    }

                })
                CliqzUCrawl.sendMessage(payloadRules, payload);
            }
            else if (payloadRules['type'] == 'query' && payloadRules['results'] == 'scattered'){
                var payload = {};
                payloadRules['fields'].forEach(function(e){
                    if (e.length > 2){
                        var joinArr = {};
                        var counter = 0;
                        e[0].forEach(function(eachPattern){
                            for(var i=0;i<scrapeResults[eachPattern].length;i++){
                                joinArr['' + counter] = scrapeResults[eachPattern][i];
                                counter += 1;
                            }
                        })
                        if(Object.keys(joinArr).length > 0){
                            payload[e[1]] = joinArr;
                        }
                    }
                    else{
                        payload[e[1]] = scrapeResults[e[0]][0][e[1]];
                    }

                })
                CliqzUCrawl.sendMessage(payloadRules, payload)
            }
    }
    catch(ee){}
    },
    sendMessage: function(payloadRules, payload){
        if (CliqzUCrawl.debug) {
            CliqzUtils.log("sendMessage" , CliqzUCrawl.LOG_KEY);
        }
        var c = true;
        var e = "";
        var allKeys =  Object.keys(payload);
        for(e in payloadRules['fields']){
            if (allKeys.indexOf(payloadRules['fields'][e][1]) == -1){
                c = false;
            }
            else{
                allKeys.forEach(function(each_field){
                    if (!(payload[each_field])){
                        c = false;
                    }
                })
            }
        }
        if(c){
            CliqzUCrawl.track({'type': CliqzUCrawl.msgType, 'action': payloadRules['action'], 'payload':payload})
        }
        CliqzUCrawl.messageTemplate = {};
    },
    refineSplitFunc: function(splitString, splitON, arrPos){
        var result = splitString.split(splitON)[arrPos];
        if(result){
            return decodeURIComponent(result);
        }
        else{

            return decodeURIComponent(splitString);
        }
    },
    refineParseURIFunc: function(url, extractType, keyName){
        var result = CliqzUCrawl.parseUri(url);
        if(extractType == 'key'){
            if(result[keyName]){
                return decodeURIComponent(result[keyName]);
            }
            else{
                return url;
            }
        }
        else if(extractType == 'qs'){
            if(result['queryKey'][keyName]){
                return decodeURIComponent(result['queryKey'][keyName]);
            }
            else{
                return url;
            }
        }

    },
    refineReplaceFunc: function(replaceString, replaceWhat, replaceWith ){
        var result = decodeURIComponent(replaceString.replace("",replaceWhat,replaceWith));
        return result;
    }
};

