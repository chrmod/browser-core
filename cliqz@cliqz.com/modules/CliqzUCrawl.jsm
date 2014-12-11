'use strict';
/*
 * This module determines the language of visited pages and
 * creates a list of known languages for a user
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

var EXPORTED_SYMBOLS = ['CliqzUCrawl'];

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var nsIAO = Components.interfaces.nsIHttpActivityObserver;
var nsIHttpChannel = Components.interfaces.nsIHttpChannel;


var CliqzUCrawl = {
    VERSION: '0.1',
    WAIT_TIME: 1000,
    LOG_KEY: 'CliqzUCrawl',
    debug: true,
    httpCache: {},
    queryCache: {},
    cleanHttpCache: function() {
      for(var key in CliqzUCrawl.httpCache) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.httpCache[key]['time']) > 30*CliqzUCrawl.tmult) {
          delete CliqzUCrawl.httpCache[key];
        }
      }
    },
    httpObserver: {
        // check the non 2xx page and report if this is one of the cliqz result
        observeActivity: function(aHttpChannel, aActivityType, aActivitySubtype, aTimestamp, aExtraSizeData, aExtraStringData) {
          if (aActivityType == nsIAO.ACTIVITY_TYPE_HTTP_TRANSACTION && aActivitySubtype == nsIAO.ACTIVITY_SUBTYPE_RESPONSE_HEADER) {

              try {
                var aChannel = aHttpChannel.QueryInterface(nsIHttpChannel);

                var url = decodeURIComponent(aChannel.URI.spec);

                var status = aExtraStringData.split(" ")[1];
                var loc = null;
                if (status=='301') {
                  var l = aExtraStringData.split("\n");
                  for(var i=0;i<l.length;i++) {
                    if (l[i].indexOf('Location: ') == 0) {
                      loc = decodeURIComponent(l[i].split(" ")[1].trim());
                    }
                  }
                }
                CliqzUCrawl.httpCache[url] = {'status': status, 'time': CliqzUCrawl.counter, 'location': loc};
                if (loc!=null) {
                  if (CliqzUCrawl.debug) {
                    CliqzUtils.log('HTTP observer: ' + aExtraStringData + ' ' + JSON.stringify(CliqzUCrawl.httpCache[url], undefined, 2), CliqzUCrawl.LOG_KEY);
                  }
                }
              } catch(ee) {
                return;
              }
          }
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
    getRedirects: function(url) {
      var res = []
      for(var key in CliqzUCrawl.httpCache) {
        if (CliqzUCrawl.httpCache[key]['location']!=null && CliqzUCrawl.httpCache[key]['status']=='301') {
          if (CliqzUCrawl.httpCache[key]['location']==url) {
            res.push(key);
          }
        }
      }
      if (res.length==0) return null;
      else return res;
    },
    generateId: function(document) {
      try {
        var id = '';
        var text = document.getElementsByTagName('body')[0].textContent;
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

            //this.currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;

            CliqzUCrawl.lastActive = CliqzUCrawl.counter;
            CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;

            var activeURL = CliqzUCrawl.currentURL();

            if (activeURL.indexOf('about:')!=0) {
              if (CliqzUCrawl.state['v'][activeURL] == null) {

                ////
                if (requery.test(activeURL) && !reref.test(activeURL)) {
                  currwin.setTimeout(function(currURLAtTime) {

                    // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                    if (CliqzUCrawl) {
                      try {

                          // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                          //var currURL = currwin.gBrowser.selectedBrowser.contentDocument.location;

                          var activeURL = CliqzUCrawl.currentURL();

                          if (currURLAtTime == activeURL) {
                            var id_cont = CliqzUCrawl.generateId(currwin.gBrowser.selectedBrowser.contentDocument);
                            var document = currwin.gBrowser.selectedBrowser.contentDocument;
                            var rq = CliqzUCrawl.scrape(activeURL, document);

                            if (rq!=null) {
                              CliqzUCrawl.queryCache[activeURL] = {'d': 0, 'q': rq['q']};
                              CliqzUCrawl.track({'type': 'safe', 'action': 'query', 'payload': rq});
                            }

                          }
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

                ////

                var status = null;

                if (CliqzUCrawl.httpCache[activeURL]!=null) {
                  status = CliqzUCrawl.httpCache[activeURL]['status'];
                }

                var referral = null;
                var qreferral = null;
                if (CliqzUCrawl.linkCache[activeURL] != null) {
                  referral = CliqzUCrawl.linkCache[activeURL]['s'];
                }

                CliqzUCrawl.state['v'][activeURL] = {'url': activeURL, 'a': 0, 'x': null, 'tin': new Date().getTime(),
                        'e': {'cp': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}, 'st': status, 'c': [], 'ref': referral,
                        'red': CliqzUCrawl.getRedirects(activeURL)};

                if (referral) {
                  // if there is a good referral, we must inherit the query if there is one
                  if (CliqzUCrawl.state['v'][referral] && CliqzUCrawl.state['v'][referral]['qr']) {
                    CliqzUCrawl.state['v'][activeURL]['qr'] = {}
                    CliqzUCrawl.state['v'][activeURL]['qr']['q'] = CliqzUCrawl.state['v'][referral]['qr']['q'];
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
                    var cd = currWin.gBrowser.selectedBrowser.contentDocument;

                    len_html = cd.documentElement.innerHTML.length;
                    len_text = cd.documentElement.textContent.length;

                    title = cd.getElementsByTagName('title')[0].textContent;
                    numlinks = cd.getElementsByTagName('a').length;

                  } catch(ee) {
                    if (CliqzUCrawl.debug) {
                      CliqzUtils.log("Error fetching title and length of page: " + ee, CliqzUCrawl.LOG_KEY);
                    }
                  }

                  if (CliqzUCrawl.state['v'][currURL] != null) {
                    CliqzUCrawl.state['v'][currURL]['x'] = {'lh': len_html, 'lt': len_text, 't': title, 'nl': numlinks};
                  }

                  if (CliqzUCrawl.queryCache[currURL]) {
                    CliqzUCrawl.state['v'][currURL]['qr'] = CliqzUCrawl.queryCache[currURL];

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
          //CliqzUtils.log('state change: ' + aWebProgress, CliqzUCrawl.LOG_KEY);
        }
    },
    pacemaker: function() {
      var currwin = CliqzUtils.getWindow();
      var activeURL = CliqzUCrawl.currentURL();

      if (!activeURL) {
        // This is a super hack!!!
        CliqzUtils.log('Pacemaker destroy', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.destroy();
        return;
      }

      if ((activeURL).indexOf('about:')!=0) {
        if ((CliqzUCrawl.counter - CliqzUCrawl.lastActive) < 5*CliqzUCrawl.tmult) {
          // if there has been an event on the last 5 seconds, if not do no count, the user must
          // be doing something else,
          //
          try {
            CliqzUCrawl.state['v'][activeURL]['a'] += 1;
          } catch(ee) {
            if (CliqzUCrawl.debug) {
              //ZZZ FIXME
              CliqzUtils.log('Error! activeURL not found: ' + activeURL, CliqzUCrawl.LOG_KEY);
            }
          }
        }
      }

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
          CliqzUtils.log('Pacemaker: ' + CliqzUCrawl.counter/CliqzUCrawl.tmult + ' ' + activeURL, CliqzUCrawl.LOG_KEY);
          CliqzUtils.log(JSON.stringify(CliqzUCrawl.state, undefined, 2), CliqzUCrawl.LOG_KEY);
          CliqzUtils.log(JSON.stringify(CliqzUCrawl.getAllOpenPages(), undefined, 2), CliqzUCrawl.LOG_KEY);
        }
        CliqzUCrawl.cleanHttpCache();
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

      CliqzUCrawl.counter += 1;

    },
    destroy: function() {
      CliqzUtils.log('destroy', CliqzUCrawl.LOG_KEY);
      CliqzUtils.clearTimeout(CliqzUCrawl.pacemakerId);

      var tt = new Date().getTime();

      /*
      var res = [];
      var currwin = CliqzUtils.getWindow();
      var gBrowser = currwin.gBrowser;
      var numTabs = gBrowser.tabContainer.childNodes.length;
      for (var i=0; i<numTabs; i++) {
        var currentTab = gBrowser.tabContainer.childNodes[i];
        var currentBrowser = gBrowser.getBrowserForTab(currentTab);
        var currURL=''+currentBrowser.contentDocument.location;
        if (currURL.indexOf('about:')!=0) {
          res.push(decodeURIComponent(currURL));
        }
      }
      */

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
      }

      // do a instant push on whatever is left on the track
      CliqzUCrawl.pushTrack();

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
        CliqzUtils.log('captureMouseClickAll', CliqzUCrawl.LOG_KEY);
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
    },
    windowsRef: [],
    windowsMem: {},
    init: function(window) {

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

    },
    state: {'v': {}, 'm': []},
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
      if (CliqzUtils.cliqzPrefs.getBoolPref('dnt')) return;

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
};
