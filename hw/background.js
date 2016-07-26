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
var eventList = ['onDOMContentLoaded'];

// initi


console.log('Initializing...');
var CliqzHumanWeb = __CliqzHumanWeb().execute();
var CliqzBloomFilter = __CliqzBloomFilter().execute();
var CliqzUtils = __CliqzUtils().execute();


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

chrome.browserAction.onClicked.addListener(function(tab) {

    CliqzUtils.log('you press the Q');

    //var bkg = chrome.extension.getBackgroundPage();
    //bkg.console.log('hello');


    //console.log('Hello');
    //var manager_url = chrome.extension.getURL("manager.html");
    //focusOrCreateTab(manager_url);
});
