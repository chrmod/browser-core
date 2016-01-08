Components.utils.import("resource://gre/modules/BrowserUtils.jsm");

export default class {
  constructor(settings) {
    this.window = settings.window;
    this.contextMenu = this.window
                           .document.getElementById('contentAreaContextMenu');
    this.onPopupShowing = this.onPopupShowing.bind(this);
  }

  init() {
    this.window.addEventListener(
        'contextmenu', this.onPopupShowing, false);
  }

  unload() {
    this.window.removeEventListener('contextmenu', this.onPopupShowing);
  }

  onPopupShowing() {
    let selectionInfo = BrowserUtils.getSelectionDetails(this.window);

    // it should imitate https://github.com/mozilla/gecko-dev/blob/eabb5f6400b0de544a260d0b9519425ecd6395bc/browser/base/content/nsContextMenu.js#L44
    CliqzEvents.pub("core:chrome:context-menu-showing", {
      menu: this.contextMenu,
      isTextSelected: selectionInfo.text.length !== 0,
      selectionText: selectionInfo.text,
      isFrame: false,
      isContentSelected: false,
      onTextInput: false,
      onLink: false,
      onImage: false,
      onAudio: false,
      onCanvas: false,
      onEditableArea: false
    });
  }
};
