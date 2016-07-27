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
      console.log(requestDetails.requestHeaders[i].name);
      if (requestDetails.requestHeaders[i].name === 'Referer') {
           console.log("Url >>> " + requestDetails.url + " Referrer: >>> "  + requestDetails.requestHeaders[i].value);
           break;
      }
    }
    return {requestHeaders: requestDetails.requestHeaders}
}

function observeResponse(requestDetails){
    // console.log("Headers rcvd");
    // console.log(requestDetails);
    for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
      console.log("Resp: " + requestDetails.responseHeaders[i].name + " : " + requestDetails.responseHeaders[i].value);
    }
    console.log("Url >>> " + requestDetails.url + " Status: >>> "  + requestDetails.statusCode);
}

function observeRedirect(requestDetails){
    // console.log("Headers rcvd");
    // console.log(requestDetails);
    for (var i = 0; i < requestDetails.responseHeaders.length; ++i) {
      console.log("Redirect: " + requestDetails.responseHeaders[i].name + " : " + requestDetails.responseHeaders[i].value);
    }
    console.log("Url >>> " + requestDetails.url + " Status: >>> "  + requestDetails.statusCode);
}

chrome.webRequest.onBeforeSendHeaders.addListener(observeRequest, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["requestHeaders"]);
chrome.webRequest.onBeforeRedirect.addListener(observeRedirect, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);
chrome.webRequest.onResponseStarted.addListener(observeResponse, {urls:["http://*/*", "https://*/*"],types:["main_frame"]},["responseHeaders"]);

var eventList = ['onDOMContentLoaded'];

// initi


console.log('Initializing...');
var CliqzHumanWeb = __CliqzHumanWeb().execute();
var CliqzBloomFilter = __CliqzBloomFilter().execute();
var CliqzUtils = __CliqzUtils().execute();

// Needed for onLocation Change arguments.
var aProgress = {};
var aRequest = {};
var aURI = {};


// export singleton pacemaker
var pm = new Pacemaker();
pm.register(CliqzHumanWeb.pacemaker);
pm.start();

CliqzHumanWeb.initChrome();

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


chrome.tabs.onUpdated.addListener(function(tab){
  // console.log(">>> Tab data >>>");
  // console.log(JSON.stringify(tab));
})

chrome.webNavigation.onDOMContentLoaded.addListener(function(data) {
  if (data.frameId === 0) {
    console.log("Dom loaded: " + data.url, data);
    chrome.tabs.executeScript(null, {file: "content.js"});
  }
  else if(data.tabId == 241){
    console.log("Google: " + data.url, data);
  }
})


chrome.runtime.onConnect.addListener(function(port) {
  var tab = port.sender.tab;
  console.log(tab);
  // This will get called by the content script we execute in
  // the tab as a result of the user pressing the browser action.
  port.onMessage.addListener(function(info) {
    console.log("Data rcvd");
    aProgress["isLoadingDocument"] = tab.status;
    aRequest["isChannelPrivate"] = tab.incognito;
    aURI["spec"] = tab.url;
    CliqzHumanWeb.contentDocument[tab.url] = info.html;
    CliqzHumanWeb.listener.onLocationChange(aProgress, aRequest, aURI);
  });
})


chrome.browserAction.onClicked.addListener(function(tab) {

    console.log('you press the Q');
    chrome.tabs.executeScript(null, {file: "content.js"});
    //var bkg = chrome.extension.getBackgroundPage();
    //bkg.console.log('hello');


    //console.log('Hello');
    //var manager_url = chrome.extension.getURL("manager.html");
    //focusOrCreateTab(manager_url);
});
