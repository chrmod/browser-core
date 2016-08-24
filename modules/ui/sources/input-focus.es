// taken from: https://addons.mozilla.org/en-US/firefox/addon/key-config/
// licensed under MIT

// global to satify inputFocus scope
let document;

// eslint-disable
/**
 * Returns true if focus is on an element which takes some sort of input. in
 * that case, we do not want to catch key presses.
 */
function inputFocus() {
  var focusedEl = document.commandDispatcher.focusedElement;

  // check if focused element takes input
  if (focusedEl) {
    var focusedElLn = focusedEl.localName.toLowerCase();
    if (focusedElLn === "input"
    ||  focusedElLn === "textarea"
    ||  focusedElLn === "select"
    ||  focusedElLn === "button"
    ||  focusedElLn === "isindex") {
      return true;
    } else if (focusedElLn === "div") { // XXX edge-case for the wall input field at facebook
        if (focusedEl.attributes.getNamedItem("contenteditable").nodeValue === "true") {
            return true;
        }
    }
  }

  // check if focused element has designMode="on"
  var focusedWin = document.commandDispatcher.focusedWindow;
  if (focusedWin) {
    if(focusedWin.document.designMode === "on") {
      return true;
    }
  }

  // if we got this far, we should be able to catch key presses without
  // messing up something else; return false
  return false;
}
// eslint-enable

export default function (window) {
  document = window.document;
  return inputFocus();
}
