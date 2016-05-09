'use strict';
/*
 * This module enables right click context menu
 *
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

(function(ctx) {

  var contextMenu,
      CONTEXT_MENU_ITEMS;

  function telemetry(type){
    var signal = {
      type: 'context_menu'
    };

    if(type) {
      signal.action = "click";
      signal.target = type;
    } else {
      signal.action = "open";
      signal.context = "dropdown";
    }

    CliqzUtils.telemetry(signal);
  }

  function openFeedback(e) {
    CLIQZEnvironment.openLink(window, CliqzUtils.FEEDBACK + "?kind=" + e.target.getAttribute('data-kind'), true);
    telemetry('open_feedback');
  }

  function openNewTab(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), true);
    telemetry('open_new_tab');
  }

  function openNewWindow(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), false, true);
    telemetry('open_new_window');
  }

  function openInPrivateWindow(e) {
    CLIQZEnvironment.openLink(window, e.target.getAttribute('data-url'), false, false, true);
    telemetry('open_private_window');
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

      telemetry();
    }
  }

  ctx.CLIQZ.ContextMenu = ContextMenu;

})(this);

