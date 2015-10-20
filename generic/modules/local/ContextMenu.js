'use strict';
/*
 * This module enables right click context menu
 *
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

(function(ctx) {

  var contextMenu,
      CONTEXT_MENU_ITEMS,
      action = "context_menu";

  function openFeedback(e) {
    CLIQZEnvironment.openLink(window, CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true);

    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_feedback'
    };
    CliqzUtils.telemetry(signal);
  }

  function openNewTab(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), true);
    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_new_tab'
    };
    CliqzUtils.telemetry(signal);
  }

  function openNewWindow(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), false, true);

    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_new_window'
    };
    CliqzUtils.telemetry(signal);
  }

  function openInPrivateWindow(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), false, false, true);

    var signal = {
      type: 'activity',
      action: action,
      menu_open: 'open_private_window'
    };
    CliqzUtils.telemetry(signal);
  }

  var ContextMenu = {
    enableContextMenu: function(box) {
      CONTEXT_MENU_ITEMS = [
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewTab'),         'command': openNewTab,            'displayInDebug': true },
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInNewWindow'),      'command': openNewWindow,         'displayInDebug': true },
        { 'label': CliqzUtils.getLocalizedString('cMenuOpenInPrivateWindow'),  'command': openInPrivateWindow,   'displayInDebug': false },
        { 'label': CliqzUtils.getLocalizedString('cMenuFeedback'),             'command': openFeedback,          'displayInDebug': true }       
      ];

      contextMenu = CLIQZEnvironment.createContextMenu(box, CONTEXT_MENU_ITEMS);
      box.addEventListener('contextmenu', rightClick);
    }
  };

  function rightClick(ev) {
    var children,
        url = CLIQZ.UI.getResultOrChildAttr(ev.target, 'url');

    if(url.trim() != '') {
      children = contextMenu.childNodes;

      for(var i = 0; i < children.length; i++) {
        children[i].setAttribute('data-url', url);
        children[i].setAttribute('data-kind', CLIQZ.UI.getResultOrChildAttr(ev.target, 'kind'));
      }
      CLIQZEnvironment.openPopup(contextMenu, ev, ev.screenX, ev.screenY);

      var signal = {
        type: 'activity',
        action: action
      };
      CliqzUtils.telemetry(signal);
    }
  }

  ctx.CLIQZ.ContextMenu = ContextMenu;

})(this);

