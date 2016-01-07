import chrome from 'core/chrome';
import { utils } from 'core/cliqz';

function clickHandler(info) {
  var query = info.selectionText;
  var urlbar = utils.getWindow().document.getElementById("urlbar");

  urlbar.mInputField.focus();
  urlbar.mInputField.setUserInput(query);
}

export default {
  init() {
    this.menuId = chrome.contextMenus.create({
      "title": 'Search CLIQZ for "%s"',
      "contexts": ["selection"],
      "onclick" : clickHandler
    });
  },

  unload() {
    chrome.contextMenu.remove(this.menuId);
  }
};
