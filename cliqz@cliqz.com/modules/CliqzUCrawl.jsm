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

//var _winmed = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);


var CliqzUCrawl = {
    WAIT_TIME: 1000,
    LOG_KEY: 'CliqzUCrawl',
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
        if (url==null || url==undefined || url=='') throw('Could not get URL')
        return {'u': url, 't': title};
      }
      catch(ee) {
        CliqzUtils.log('Exception scrapeFurther' + ee, CliqzUCrawl.LOG_KEY);
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
        CliqzUtils.log('>>> Could not get query: ' + ee, CliqzUCrawl.LOG_KEY);
        return null;

      }

      q = document.getElementById('ires').attributes['data-async-context'].value

    },
    scrape: function(currURL, document) {

      CliqzUtils.log('scrape!', CliqzUCrawl.LOG_KEY);

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

              var d = CliqzUCrawl.scrapeFurther(a[i]);

              if (d!=null && cand_url_clean!=d['u']) {
                 CliqzUtils.log('>>> No match between urls  : ' + i + ' >> ' +  cand_url_clean + ' ' + JSON.stringify(d), CliqzUCrawl.LOG_KEY);
              }

            }
            else {
              // WTF is this?
              CliqzUtils.log('>>> WTF this should not happen  : ' + i + ' >> ' +  cand_url, CliqzUCrawl.LOG_KEY);

            }

          }

        if (d!=null) {
          CliqzUtils.log('>>> GOOD : ' + i + ' >> ' +  d['u'], CliqzUCrawl.LOG_KEY);
          res['r'][''+i] = {'u': d['u'], 't': d['t']};

        }
        else {
          CliqzUtils.log('>>> BAD  : ' + i + ' >> ' +  cand_url, CliqzUCrawl.LOG_KEY);
        }
      }

      CliqzUtils.log('>>> Scrape results: ' +  JSON.stringify(res,undefined,2), CliqzUCrawl.LOG_KEY);
      return res;

    },
    listener: {
        currURL: undefined,
        QueryInterface: XPCOMUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),

        onLocationChange: function(aProgress, aRequest, aURI) {
            CliqzUtils.log('location change!', CliqzUCrawl.LOG_KEY);


            if (aURI.spec == this.currentURL) return;
            this.currentURL = aURI.spec;

            // here we check if user ignored our results and went to google and landed on the same url
            var requery = /\.google\..*?[#?&;]q=[^$&]+/; // regex for google query
            var reref = /\.google\..*?\/(?:url|aclk)\?/; // regex for google refurl
            var rerefurl = /url=(.+?)&/; // regex for the url in google refurl

            //var topwin = _winmed.getMostRecentWindow("navigator:browser");

            var currwin = CliqzUtils.getWindow();


            CliqzUtils.log("???" + CliqzUtils.getWindowID(), CliqzUCrawl.LOG_KEY);


            CliqzUtils.log("???" + this.currentURL, CliqzUCrawl.LOG_KEY);
            CliqzUtils.log("???2" + currwin.gBrowser.selectedBrowser.contentDocument.location, CliqzUCrawl.LOG_KEY);

            this.currURL = '' + currwin.gBrowser.selectedBrowser.contentDocument.location;

            CliqzUCrawl.lastActive = CliqzUCrawl.counter;
            CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;


            if (requery.test(this.currentURL) && !reref.test(this.currentURL)) {
              currwin.setTimeout(function(currURLAtTime) {

                // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                if (CliqzUCrawl) {

                  try {
                      CliqzUCrawl.generateId(currwin.gBrowser.selectedBrowser.contentDocument);

                      // HERE THERE WAS AN ADDITION IF FOR THE OBJECT
                      var currURL = currwin.gBrowser.selectedBrowser.contentDocument.location;
                      if (''+currURLAtTime == ''+currURL) {
                        var id_cont = CliqzUCrawl.generateId(currwin.gBrowser.selectedBrowser.contentDocument);
                        CliqzUtils.log(">>>>>>> It's a query with id: " + id_cont, CliqzUCrawl.LOG_KEY);
                        // let's hope that the content has been already loaded!!
                        var document = currwin.gBrowser.selectedBrowser.contentDocument;
                        CliqzUCrawl.scrape(currURL, document);
                      }
                  }
                  catch(ee) {
                    // silent fail
                    CliqzUtils.log('Exception: ' + ee, CliqzUCrawl.LOG_KEY);
                  }
                }
              }, CliqzUCrawl.WAIT_TIME, this.currURL);
            }
            else {
              // NOT A QUERY,

              if (CliqzUCrawl.state['v'][this.currURL] == null) {
                CliqzUCrawl.state['v'][this.currURL] = {'a': 0, 'e': {'se': 0, 'mm': 0, 'kp': 0, 'sc': 0, 'md': 0}};

              }



            }

            currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("keypress", CliqzUCrawl.captureKeyPressPage);
            currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousemove", CliqzUCrawl.captureMouseMovePage);
            currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("mousedown", CliqzUCrawl.captureMouseClickPage);
            currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("scroll", CliqzUCrawl.captureScrollPage);
            currwin.gBrowser.selectedBrowser.contentDocument.addEventListener("select", CliqzUCrawl.captureSelectPage);



        },
        onStateChange: function(aWebProgress, aRequest, aFlag, aStatus) {
        }
    },
    pacemaker: function() {
      var currwin = CliqzUtils.getWindow();
      var activeURL = CliqzUCrawl.currentURL();

      if ((CliqzUCrawl.counter/CliqzUCrawl.tmult) % 20 == 0) {
        CliqzUtils.log('Pacemaker: ' + CliqzUCrawl.counter/CliqzUCrawl.tmult + ' ' + activeURL, CliqzUCrawl.LOG_KEY);
        CliqzUtils.log(JSON.stringify(CliqzUCrawl.state, undefined, 2), CliqzUCrawl.LOG_KEY);
      }

      if ((CliqzUCrawl.counter - CliqzUCrawl.lastActive) < 5*CliqzUCrawl.tmult) {
        CliqzUCrawl.state['v'][activeURL]['a'] += 1;
      }

      CliqzUCrawl.counter += 1;

    },
    currentURL: function() {
      var currURL = CliqzUtils.getWindow().gBrowser.selectedBrowser.contentDocument.location;
      return currURL;
    },
    pacemakerId: null,
    // load from the about:config settings
    captureKeyPress: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['keypress']|0)) > 1 * CliqzUCrawl.tmult && ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['keypresspage']|0)) > 1 * CliqzUCrawl.tmult)) {
        CliqzUtils.log('captureKeyPressAll', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['keypress'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActiveAll = CliqzUCrawl.counter;
      }
    },
    captureMouseMove: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemove']|0)) > 1 * CliqzUCrawl.tmult && ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemovepage']|0)) > 1 * CliqzUCrawl.tmult)) {
        CliqzUtils.log('captureMouseMoveAll', CliqzUCrawl.LOG_KEY);
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
        CliqzUtils.log('captureKeyPressPage', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['keypresspage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        CliqzUCrawl.state['v'][CliqzUCrawl.currentURL()]['e']['kp'] += 1;

      }
    },
    captureMouseMovePage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mousemovepage']|0)) > 1 * CliqzUCrawl.tmult) {
        CliqzUtils.log('captureMouseMovePage', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['mousemovepage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        CliqzUCrawl.state['v'][CliqzUCrawl.currentURL()]['e']['mm'] += 1;
      }
    },
    captureMouseClickPage: function(ev) {
      CliqzUtils.log('captureMouseClickPage>> ' + CliqzUCrawl.counter + ' ' + ev.target  + ' ' + JSON.stringify(CliqzUCrawl.lastEv), CliqzUCrawl.LOG_KEY);

      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['mouseclickpage']|0)) > 1 * CliqzUCrawl.tmult) {
        CliqzUtils.log('captureMouseClickPage', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['mouseclickpage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        CliqzUCrawl.state['v'][CliqzUCrawl.currentURL()]['e']['md'] += 1;

      }
    },
    captureScrollPage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['scrollpage']|0)) > 1 * CliqzUCrawl.tmult) {
        CliqzUtils.log('captureScrollPage', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['scrollpage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        CliqzUCrawl.state['v'][CliqzUCrawl.currentURL()]['e']['sc'] += 1;
      }
    },
    captureSelectPage: function(ev) {
      if ((CliqzUCrawl.counter - (CliqzUCrawl.lastEv['selectpage']|0)) > 1 * CliqzUCrawl.tmult) {
        CliqzUtils.log('captureSelectPage', CliqzUCrawl.LOG_KEY);
        CliqzUCrawl.lastEv['selectpage'] = CliqzUCrawl.counter;
        CliqzUCrawl.lastActive = CliqzUCrawl.counter;
        CliqzUCrawl.state['v'][CliqzUCrawl.currentURL()]['e']['se'] += 1;
      }
    },
    counter: 0,
    tmult: 4,
    tpace: 250,
    lastEv: {},
    lastActive: null,
    lastActiveAll: null,
    init: function(window) {
        CliqzUtils.log('INIT UCRAWL', CliqzUCrawl.LOG_KEY);

        if (CliqzUCrawl.state == null) {
          CliqzUCrawl.state = {};
          CliqzUtils.log('RESET STATE', CliqzUCrawl.LOG_KEY);


        }
        else {
          CliqzUtils.log('REUSE STATE', CliqzUCrawl.LOG_KEY);

        }

        if (CliqzUCrawl.pacemakerId==null) {
          CliqzUCrawl.pacemakerId = CliqzUtils.setInterval(CliqzUCrawl.pacemaker, CliqzUCrawl.tpace, null);

        }


        window.addEventListener("keypress", CliqzUCrawl.captureKeyPress);
        window.addEventListener("mousemove", CliqzUCrawl.captureMouseMove);
        window.addEventListener("mousedown", CliqzUCrawl.captureMouseClick);


    },
    state: {'v': {}},
    hashCode: function(s) {
        return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
    }
};
