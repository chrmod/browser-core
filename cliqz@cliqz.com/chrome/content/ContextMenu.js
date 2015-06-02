'use strict';
/*
 * This module enables right click context menu
 *
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

(function(ctx) {

  var contextMenu,
      CONTEXT_MENU_ITEMS = [
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewTab'),     'command': openNewTab },
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewWindow'),  'command': openNewWindow },
        { 'label': CliqzUtils.getLocalizedString('cMenuFeedback'),         'command': openFeedback }
      ];

  function openFeedback(e) {
    CLIQZ.Core.openLink(CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true);
  }

  function openNewTab(e) {
    CLIQZ.Core.openLink(e.target.getAttribute('data-url'), true);
  }

  function openNewWindow(e) {
    window.open(e.target.getAttribute('data-url'), '_blank');
  }

  var ContextMenu = {
    enableContextMenu: function(box) {
      contextMenu = document.createElement('menupopup');
      box.appendChild(contextMenu);

      for(var item = 0; item < CONTEXT_MENU_ITEMS.length; item++) {
          var menuItem = document.createElement('menuitem');
          menuItem.setAttribute('label', CONTEXT_MENU_ITEMS[item].label);
          menuItem.addEventListener("command", CONTEXT_MENU_ITEMS[item].command, false);
          contextMenu.appendChild(menuItem);
      }

      box.addEventListener('contextmenu', rightClick);
    }
  };


  function rightClick(ev) {
    var children = contextMenu.childNodes;

    for(var i = 0; i < children.length; i++) {
      children[i].setAttribute('data-url', CLIQZ.UI.getResultOrChildAttr(ev.target, 'url'));
      children[i].setAttribute('data-kind', CLIQZ.UI.getResultOrChildAttr(ev.target, 'kind'));
    }
    contextMenu.openPopupAtScreen(ev.screenX, ev.screenY, false);
  }

  ctx.CLIQZ.ContextMenu = ContextMenu;

})(this);

