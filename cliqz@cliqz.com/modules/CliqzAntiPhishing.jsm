'use strict';
/*
 * This module injects warning message when user visit a phishing site
 *
 */

const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHumanWeb',
  'chrome://cliqzmodules/content/CliqzHumanWeb.jsm');

var EXPORTED_SYMBOLS = ['CliqzAntiPhishing'];
// the urls need to be changed
var UNSAFE_URL = "http://antiphishing.clyqz.com/api/unsafe?md5=";
var WL_URL = "http://antiphishing.clyqz.com/api/safe?md5=";

var domSerializer = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
        .createInstance(Components.interfaces.nsIDOMSerializer);

function alert(doc, md5, tp) {
    var fe = doc.querySelector("body>*");
    CliqzUtils.log(fe, 'antiphishing');
    var el = doc.createElement("DIV");
    var els = doc.createElement("SCRIPT");
    el.setAttribute("style", "width: 100% !important; height: 100%; position: fixed; opacity: 0.95; background: grey;top: 0; left: 0; z-index: 999999999999999999999;");
    el.onclick = function(e) {
        e.stopPropagation();
    };
    var d = doc.createElement('div');
    d.align = 'center';
    var bt = doc.createElement('input');
    bt.type = 'button';
    bt.value = "I don't care, take me to it";
    el.innerHTML = "<div align=\"center\"><h1>This is a phishing site</h1></div>";
    d.appendChild(bt);
    var bt2 = doc.createElement('input');
    bt2.type = 'button';
    bt2.value = "This is not a phishing site, report to CLIQZ";
    d.appendChild(bt2);
    el.appendChild(d);
    bt.onclick = function() {
        doc.body.removeChild(el);
        // CliqzAntiPhishing.forceWhiteList[md5] = 1;
        CliqzHumanWeb.notification({'url': doc.URL, 'action': 'ignore'});
    };
    bt2.onclick = function() {
        doc.body.removeChild(el);
        CliqzAntiPhishing.forceWhiteList[md5] = 1;
        CliqzHumanWeb.notification({'url': doc.URL, 'action': 'report'});
    };
    els.innerHTML = "window.onbeforeunload = function () {}";
    doc.body.insertBefore(el, fe);
    doc.body.appendChild(els);
}

function checkPassword(doc, callback) {
    var inputs = doc.querySelectorAll('input');
    for (var i=0; i<inputs.length; i++) {
        if (inputs[i].type == 'password' ||
            inputs[i].value == 'password' && inputs[i].name == 'password' ||
            inputs[i].value == 'passwort' && inputs[i].name == 'passwort')
            callback(doc.URL, 'password');
    }

    var html = domSerializer.serializeToString(doc);
    if (html.indexOf('security') > -1 &&
        html.indexOf('update') > -1 &&
        html.indexOf('account') > -1)
        callback(doc.URL, 'password');
}

function checkSingleScript(script) {
    // if someone try to get the current date
    if (script.indexOf('getTime') > -1 &&
        script.indexOf('getDay') > -1 &&
        script.indexOf('getDate') > -1)
        return true;

    // if someone try to block exiting
    if (script.indexOf('onbeforeunload') > -1)
        return true;

    if (script.indexOf('downloadEXEWithName') > -1)
        return true;
    return false;
}

function checkCheat(doc, callback){
    var html = domSerializer.serializeToString(doc);
    if (html.indexOf('progress-bar-warning') > -1 && html.indexOf('progress-bar-success') > -1 ||
        html.indexOf('play-progress') > -1 && html.indexOf('buffer-progress') > -1)
        callback(doc.URL, 'cheat');
}

function checkScript(doc, callback) {
    var scripts = doc.querySelectorAll('script');
    var domain = doc.URL.replace('http://', '').replace('https://', '').split("/")[0];
    for (var i=0; i<scripts.length; i++) {
        var script = '';
        if (scripts[i].src) {
            // if the script is from the same domain, fetch it
            var dm = scripts[i].src.replace('http://', '').replace('https://', '').split("/")[0];
            if (dm == domain) {
                var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
                req.open('GET', scripts[i].src, false);
                req.send('null');
                script = req.responseText;
            }
        } else {
            script = scripts[i].innerHTML;
        }
        if (checkSingleScript(script))
            callback(doc.URL, 'script');
    }
}

function checkSuspicious(doc, callback) {
    checkScript(doc, callback);
    checkCheat(doc, callback);
    checkPassword(doc, callback);
}

function onPageLoad(event) {
    let doc = event.originalTarget;
    // CliqzAntiPhishing.isSuspiciousDOM(doc, CliqzUtils.log);  // here just a test
    let url = doc.URL;
    if (url[0] != "h") return;
    // get md5 of url
    var domain = url.replace('http://', '').replace('https://', '').split("/")[0];
    var md5 = CliqzHumanWeb._md5(domain);
    if (md5 in CliqzAntiPhishing.forceWhiteList) return;
    var md5Prefix = md5.substring(0, md5.length-16);

    CliqzUtils.httpGet(UNSAFE_URL + md5Prefix,
                       function success(req) {
                           var blacklist = JSON.parse(req.response).blacklist;
                           CliqzUtils.log(blacklist, "antiphishing");
                           for (var i=0; i < blacklist.length; i++) {
                               if (md5Prefix + blacklist[i][0] == md5) {
                                   var tp = blacklist[i][1];
                                   // send log
                                   CliqzHumanWeb.notification({'url': doc.URL, 'action': 'block'});
                                   alert(doc, md5, tp);
                                   return;
                               }
                           }
                       });
}


var CliqzAntiPhishing = {
    forceWhiteList: {},
    whiteList: {},
    _loadHandler: onPageLoad,
    isSuspiciousDOM: function(doc, callback) {
        var url = doc.URL;
        if (url[0] != 'h') return;
        var domain = url.replace('http://', '').replace('https://', '').split("/")[0];
        var md5 = CliqzHumanWeb._md5(domain);
        if (md5 in CliqzAntiPhishing.whiteList) return;
        var md5Prefix = md5.substring(0, md5.length-16);
        
        CliqzUtils.httpGet(WL_URL + md5Prefix,
                           function success(req) {
                               var whitelist = JSON.parse(req.response).whitelist;
                               for (var i=0; i < whitelist.length; i++) {
                                   if (md5Prefix + whitelist[i] == md5)
                                       return;
                               }
                               CliqzAntiPhishing.whiteList[md5] = true;
                               checkSuspicious(doc, callback);
                           });
    }
};
