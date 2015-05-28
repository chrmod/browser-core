'use strict';
/*
 * This module enables right click context menu
 *
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

(function(ctx) {

var ContextMenu = {
  enableContextMenu: function(resultsBox) {
    contextMenu.setAttribute('onpopupshowing', '');
    contextMenu.setAttribute('onpopuphiding', '');
    contextMenu.style.zIndex = "100";
    appendContextMenuItems(CONTEXT_MENU_ITEMS);
    resultsBox.addEventListener('contextmenu', rightClick);
  }
};
  
  function appendContextMenuItems(config) {
    if(contextMenu) {
      for(var item = 0; item < config.length; item++) {
        console.log("ITEM: " + config[item].label);
        var menuItem = document.createElement('menuitem');
        menuItem.setAttribute('label', config[item].label);
        menuItem.setAttribute('hidden', 'true');
        menuItem.setAttribute('id', config[item].id);
        menuItem.addEventListener("command", config[item].command, false);
        contextMenu.appendChild(menuItem); 
      }
      contextMenu.addEventListener('popuphiding', hideContextMenuItem, true);
    }
  }
  
  function rightClick(ev) {
    /*document.browser = ev.target.ownerDocument.defaultView;
                                  .QueryInterface(Ci.nsIInterfaceRequestor)
                                  .getInterface(Ci.nsIWebNavigation)
                                  .QueryInterface(Ci.nsIDocShell)
                                  .chromeEventHandler;
    document.popupNode = ev.target;
    gContextMenu = new nsContextMenu(ev.target, ev.shiftKey);*/
  
    var children = contextMenu.childNodes;
    
    //hide all elements
    for(var i = 0; i < contextMenu.childNodes.length; i++) {
      var child = contextMenu.children[i];
      child.hidden = true;
      child.className += ' ' + 'context-menu-hidden';
    }
  
    //show Feedback & Open in New tab menu items
    for(var i = 0; i < CONTEXT_MENU_ITEMS.length; i++) {
      var item = document.getElementById(CONTEXT_MENU_ITEMS[i].id);
      item.hidden = false;
      item.className = '';
      item.setAttribute('data-url', CLIQZ.UI.getResultOrChildAttr(ev.target, 'url'));
      item.setAttribute('data-kind', CLIQZ.UI.getResultOrChildAttr(ev.target, 'kind'));
    }
    document.popupNode = ev.target;
    return contextMenu.openPopupAtScreen(ev.screenX, ev.screenY, false);  
  }
  
  function openFeedback(e) {
    CLIQZ.Core.openLink(CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true); 
  }
  
  function openNewTab(e) {
    CLIQZ.Core.openLink(e.target.getAttribute('data-url'), true);
  }
  
  function openNewWindow(e) {
    window.open(e.target.getAttribute('data-url'), '_blank');
  }
  
  function hideContextMenuItem(e) {
    if(contextMenu) {
      contextMenu.setAttribute('onpopupshowing', _popupshowing);
      contextMenu.setAttribute('onpopuphiding', _popuphiding);
    
      for(var i = 0; i < contextMenu.childNodes.length; i++) {
        var child = contextMenu.children[i];
        child.className = child.className.replace(/\bcontext-menu-hidden\b/,'');
      }
    
      for(var i = 0; i < CONTEXT_MENU_ITEMS.length; i++) {
        var item = document.getElementById(CONTEXT_MENU_ITEMS[i].id);
        item.setAttribute('hidden', true);
        item.className = 'context-menu-hidden';
      }
    }  
  }
  
ctx.CLIQZ.ContextMenu = ContextMenu;
  
var CONTEXT_MENU_ITEMS = [
      {
        'id': 'openNewTabItem',
        'label': 'Open Link in New Tab',
        'command': CLIQZ.ContextMenu.openNewTab
      },
      {
        'id': 'openNewWindowItem',
        'label': 'Open Link in New Window',
        'command': CLIQZ.ContextMenu.openNewWindow
      },
      {
        'id': 'feedbackItem',
        'label': 'Feedback for CLIQZ',
        'command': CLIQZ.ContextMenu.openFeedback
      }
    ],
    contextMenu = document.getElementById('contentAreaContextMenu'),
    _popupshowing = contextMenu.getAttribute('onpopupshowing'),
    _popuphiding = contextMenu.getAttribute('onpopuphiding');

})(this);


