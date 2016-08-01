// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
chrome.cookies.onChanged.addListener(function(info) {
  console.log("onChanged" + JSON.stringify(info));
});
*/

/*
var eventList = ['onBeforeNavigate', 'onCreatedNavigationTarget',
    'onCommitted', 'onCompleted', 'onDOMContentLoaded',
    'onErrorOccurred', 'onReferenceFragmentUpdated', 'onTabReplaced',
    'onHistoryStateUpdated'];
*/


function observeRequest(requestDetails){
    console.log("Headers request");
    for (var i = 0; i < requestDetails.requestHeaders.length; ++i) {
      //console.log(requestDetails.requestHeaders[i].name);
      if (requestDetails.requestHeaders[i].name === 'Referer') {
           //console.log("Url >>> " + requestDetails.url + " Referrer: >>> "  + requestDetails.requestHeaders[i].value);
           if (CliqzHumanWeb.gadurl.test(requestDetails.url)) {
                CliqzHumanWeb.linkCache[requestDetails.url] = {'s': ''+requestDetails.requestHeaders[i].value, 'time': CliqzHumanWeb.counter};
                console.log('REFZZZ 999', requestDetails.url, { 's': '' + requestDetails.requestHeaders[i].value, 'time': CliqzHumanWeb.counter });
           }
           break;
      }
    }
    return {requestHeaders: requestDetails.requestHeaders}
}

function observeResponse(requestDetails){
    // console.log("Headers rcvd");
    // console.log(requestDetails);

    //for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
    //  console.log("Resp: " + requestDetails.responseHeaders[i].name + " : " + requestDetails.responseHeaders[i].value);
    //}
    CliqzHumanWeb.httpCache[requestDetails.url] = {'status': requestDetails.statusCode, 'time': CliqzHumanWeb.counter}
}

function observeRedirect(requestDetails){
    // console.log("Headers rcvd");
    // console.log(requestDetails);
    for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
      // console.log("Redirect: " + requestDetails.responseHeaders[i].name + " : " + requestDetails.responseHeaders[i].value);
      if (requestDetails.responseHeaders[i].name === 'Location') {
        CliqzHumanWeb.httpCache[requestDetails.url] = {'status': 301, 'time': CliqzHumanWeb.counter, 'location': requestDetails.responseHeaders[i].value};
      }
    }
    // console.log("Url >>> " + requestDetails.url + " Status: >>> "  + requestDetails.statusCode);
}

chrome.webRequest.onBeforeSendHeaders.addListener(observeRequest, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["requestHeaders"]);
chrome.webRequest.onBeforeRedirect.addListener(observeRedirect, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
chrome.webRequest.onResponseStarted.addListener(observeResponse, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);

var eventList = ['onDOMContentLoaded'];

// initi



console.log('Initializing...');
var CliqzChromeDB = __CliqzChromeDB().execute();
var CliqzHumanWeb = __CliqzHumanWeb().execute();
var CliqzBloomFilter = __CliqzBloomFilter().execute();
var CliqzUtils = __CliqzUtils().execute();


// Needed for onLocation Change arguments.
var aProgress = {};
var aRequest = {};
var aURI = {};


// export singleton pacemaker
/*
var pm = new Pacemaker();
pm.register(CliqzHumanWeb.pacemaker);
pm.start();
*/

CliqzHumanWeb.pacemakerId = setInterval(CliqzHumanWeb.pacemaker, 250);

CliqzHumanWeb.initChrome();

/*
eventList.forEach(function(e) {
  chrome.webNavigation[e].addListener(function(data) {
    if (typeof data) {
      //console.log('L >>>', chrome.i18n.getMessage('inHandler'), e, data);
      if (data.frameId === 0) {
        console.log('LOCATION CHANGE: ' + data.url, data);

      }
    }
    else {
      //console.error('E >>>', chrome.i18n.getMessage('inHandlerError'), e);

    }
  });

});
*/

function focusOrCreateTab(url) {
  chrome.windows.getAll({"populate":true}, function(windows) {
    var existing_tab = null;
    for (var i in windows) {
      var tabs = windows[i].tabs;
      for (var j in tabs) {
        var tab = tabs[j];
        if (tab.url == url) {
          existing_tab = tab;
          break;
        }
      }
    }
    if (existing_tab) {
      chrome.tabs.update(existing_tab.id, {"selected":true});
    } else {
      chrome.tabs.create({"url":url, "selected":true});
    }
  });
}


chrome.history.onVisitRemoved.addListener(CliqzHumanWeb.onHistoryVisitRemoved);

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.status == 'complete' && tab.url != undefined) {
        console.log(" Location change>> " + tab.url);
        if (tab.url.startsWith('https://') || tab.url.startsWith('http://')) {
            chrome.tabs.executeScript(tabId, {file: "content.js"});
        }
    }
});

/*

chrome.webNavigation.onDOMContentLoaded.addListener(function(data) {
  if (data.frameId === 0) {
    console.log("Dom loaded: " + data.url, data);

    // This fails when on chrome urls
    //extensions::lastError:134 Unchecked runtime.lastError while running tabs.executeScript: Cannot access a chrome:// URL
    //at chrome-extension://fapjminjapollpcgopnpdeailebdakkk/background.js:129:
    //
    // to see the effect uncomment the IF and go to chrome://history

    if (data.url.startsWith('https://') || data.url.startsWith('http://')) {
        chrome.tabs.executeScript(null, {file: "content.js"});
    }
  }
  else if(data.tabId == 241){
    console.log("Google: " + data.url, data);
  }
})
*/

chrome.runtime.onConnect.addListener(function(port) {
  var tab = port.sender.tab;
  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  port.onMessage.addListener(function(info) {
    if(info.type == "dom"){
      console.log("current URL??", tab.url, tab);
      CliqzHumanWeb.tempCurrentURL = tab.url;

      console.log("Data rcvd: " + info.title);
      aProgress["isLoadingDocument"] = tab.status;
      aRequest["isChannelPrivate"] = tab.incognito;
      aURI["spec"] = tab.url;
      CliqzHumanWeb.contentDocument[decodeURIComponent(tab.url)] = info.html;
      CliqzHumanWeb.listener.onLocationChange(aProgress, aRequest, aURI);
    }
    else if(info.type == "event_listener"){
      var ev = {};
      ev["target"] = {"baseURI": info.baseURI};
      if(info.targetHref){
        ev["target"] = {"href": info.targetHref};
      }
      if(info.action == "keypress"){
        CliqzHumanWeb.captureKeyPressPage(ev);
      }
      else if(info.action == "mousemove"){
        CliqzHumanWeb.captureMouseMovePage(ev);
      }
      else if(info.action == "mousedown"){
        CliqzHumanWeb.captureMouseClickPage(ev);
      }
      else if(info.action == "scroll"){
        CliqzHumanWeb.captureScrollPage(ev);
      }
      else if(info.action == "copy"){
        CliqzHumanWeb.captureCopyPage(ev);
      }
    }
  });
})

var background = {
  getAllOpenPages: function(){
    return new Promise(function(resolve, reject){
      var res = [];
      chrome.windows.getAll({populate:true},function(windows){
        windows.forEach(function(window){
          window.tabs.forEach(function(tab){
            res.push(tab.url);
          });
        });
        resolve(res);
      });
    });
  }
}
/*
chrome.browserAction.onClicked.addListener(function(tab) {

    console.log('you press the Q');
    chrome.tabs.executeScript(null, {file: "content.js", run_at:"document_end"});
    //var bkg = chrome.extension.getBackgroundPage();
    //bkg.console.log('hello');


    //console.log('Hello');
    //var manager_url = chrome.extension.getURL("manager.html");
    //focusOrCreateTab(manager_url);
});
*/