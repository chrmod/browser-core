import CliqzHumanWeb from "human-web/human-web";
import core from "core/background";

const BW_URL = "https://antiphishing.cliqz.com/api/bwlist?md5=";
const WARNING = 'chrome://cliqz/content/anti-phishing/phishing-warning.html';

function format(currWin, url, md5) {
    let doc = currWin.document;
    doc.getElementById('phishing-url').innerText = url;
    doc.getElementsByClassName('cqz-button-save-out')[0].onclick = function() {
      if (doc.referrer) {
          currWin.location = doc.referrer;
      } else {
          currWin.location = 'about:newtab';
      }
    }
    doc.getElementById('report-safe').onclick = function() {
      CliqzHumanWeb.notification({'url': doc.URL, 'action': 'report'});
      CliqzAntiPhishing.forceWhiteList[md5] = 1;
      currWin.location = url;
    };
    let proceedBt = doc.getElementById('proceed');
    proceedBt.onclick = function() {
      CliqzHumanWeb.notification({'url': doc.URL, 'action': 'ignore'});
      CliqzAntiPhishing.forceWhiteList[md5] = 1;
      currWin.location = url;
    }
};

function alert(currWin, url, md5) {
    if (!CliqzAntiPhishing.isAntiPhishingActive() || md5 in CliqzAntiPhishing.forceWhiteList) {
        return;
    }
    currWin.location = WARNING;  // change it to warning page
    CliqzUtils.setTimeout(function (currWin, url, md5){
        CliqzUtils.currWin = currWin;
        format(currWin, url, md5);
    }, 100, currWin, url, md5)
};

function checkPassword(url, callback) {
  const suspicious = core.queryHTML(url, "input", "type,value,name").then(
    inputs => inputs.some(
      input => Object.keys(input).some(
        attr => attr === "password" || attr === "passwort"
      )
    )
  );

  if (suspicious) {
    callback(url, 'password');
  }
}

function checkSingleScript(script) {
    if (!script) {
      return;
    }

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

function checkHTML(url, callback){
  core.getHTML(url).then( htmls => {
    var html = htmls[0];

    if (!html) {
      return;
    }

    if (html.indexOf('progress-bar-warning') > -1
        && html.indexOf('progress-bar-success') > -1
        || html.indexOf('play-progress') > -1
        && html.indexOf('buffer-progress') > -1) {

      callback(url, 'cheat');
      return;
    }

    if (html.indexOf('security') > -1 &&
        html.indexOf('update') > -1 &&
        html.indexOf('account') > -1) {

      callback(doc.URL, 'password');
    }
  });
}

function checkScript(url, callback) {
  const domain = url.replace('http://', '')
    .replace('https://', '').split("/")[0];

  core.queryHTML(url, "script", "src").then( srcs => {
    const suspicious = srcs.filter( src => src ).some( src => {
      // if the script is from the same domain, fetch it
      var dm = src.replace('http://', '').replace('https://', '').split("/")[0];

      if (dm !== domain) {
        return;
      }

      var req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1'].createInstance();
      req.open('GET', src, false);
      req.send('null');

      var script = req.responseText;
      return checkSingleScript(script);
    });

    if (suspicious) {
      callback(url, 'script');
    }
  });

  core.queryHTML(url, "script", "innerHTML").then( scripts => {
    if (scripts.some( checkSingleScript )) {
      callback(url, 'script');
    };
  });
}

function getDomainMd5(url) {
    var domain = url.replace('http://', '').replace('https://', '').split("/")[0];
    return CliqzHumanWeb._md5(domain);
}

function getSplitDomainMd5(url) {
    var md5 = getDomainMd5(url);
    var md5Prefix = md5.substring(0, md5.length-16);
    var md5Surfix = md5.substring(16, md5.length);
    return [md5Prefix, md5Surfix];
}

function notifyHumanWeb(p) {
    var url = p.url;
    var status = p.status;
    CliqzHumanWeb.state['v'][url]['isMU'] = status;
    // Commenting this line here, it sends empty payload.x to the humanweb and is marked private.
    // CliqzHumanWeb.addURLtoDB(url, CliqzHumanWeb.state['v'][url]['ref'], CliqzHumanWeb.state['v'][url]);
    // CliqzUtils.log("URL is malicious: "  + url + " : " + status, 'antiphishing');
}

function updateSuspiciousStatus(url, status) {
    var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
    CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'suspicious:' + status;
    if (CliqzHumanWeb) {
        var p = {'url': url, 'status': status};

        if (CliqzHumanWeb.state['v'][url]) {
            notifyHumanWeb(p);
        } else {
            // CliqzUtils.log("delay notification", "antiphishing");
            CliqzUtils.setTimeout(notifyHumanWeb, 1000, p);
        }
    }
}

function updateBlackWhiteStatus(req, md5Prefix) {
    var response = req.response;
    var blacklist = JSON.parse(response).blacklist;
    var whitelist = JSON.parse(response).whitelist;
    if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList))
        CliqzAntiPhishing.blackWhiteList[md5Prefix] = {};
    for (var i = 0; i < blacklist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][blacklist[i][0]] = 'black:' + blacklist[i][1];
    }
    for (var i = 0; i < whitelist.length; i++) {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][whitelist[i]] = 'white';
    }
}

function checkSuspicious(url, callback) {
  CliqzUtils.log('check ' + url, 'antiphishing');
  checkScript(url, callback);
  checkHTML(url, callback);
  checkPassword(url, callback);
}

function checkStatus(url, md5Prefix, md5Surfix, currWin) {
    var bw = CliqzAntiPhishing.blackWhiteList[md5Prefix];
    if (md5Surfix in bw) {  // black, white, suspicious or checking
        if (bw[md5Surfix].indexOf('black') > -1) {  // black
            CliqzHumanWeb.notification({'url': url, 'action': 'block'});
            // show the block html page
            alert(currWin, url, md5Prefix + md5Surfix);
        }
    } else {
        CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix] = 'checking';
        // alert humanweb if it is suspicious
        checkSuspicious(url, updateSuspiciousStatus);
    }
}

/**
 * This module injects warning message when user visits a phishing site
 * @class AntiPhishing
 * @namespace anti-phishing
 */
var CliqzAntiPhishing = {
    forceWhiteList: {},
    blackWhiteList: {},
    /**
    * @method auxOnPageLoad
    * @param url {string}
    */
    auxOnPageLoad: function(url, currWin) {
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        // alert(currWin, url, md5Prefix + md5Surfix);
        if (md5Prefix in CliqzAntiPhishing.blackWhiteList)
            checkStatus(url, md5Prefix, md5Surfix, currWin);
        else
            CliqzUtils.httpGet(
                BW_URL + md5Prefix,
                function success(req) {
                    updateBlackWhiteStatus(req, md5Prefix);
                    checkStatus(url, md5Prefix, md5Surfix, currWin);
                },
                function onerror() {
                },
                3000
            );
    },
    /**
    * @method getDomainStatus
    * @param url {string}
    */
    getDomainStatus: function(url) {
        var [md5Prefix, md5Surfix] = getSplitDomainMd5(url);
        if (!(md5Prefix in CliqzAntiPhishing.blackWhiteList) ||
            !(md5Surfix in CliqzAntiPhishing.blackWhiteList[md5Prefix]))
            return [null, null];
        var status = CliqzAntiPhishing.blackWhiteList[md5Prefix][md5Surfix];
        if (status == 'white')
            return [status, null];
        else {
            var statusItems = status.split(':');
            if (statusItems.length == 2)
                return statusItems;
            else
                return [null, null];
        }
    },
    isAntiPhishingActive: function() {
        return CliqzUtils.getPref('cliqz-anti-phishing-enabled', false);
    }
};

export default CliqzAntiPhishing;
