export default {
  json(context) {
    return JSON.stringify(context);
  },

  local(key) {
    return chrome.i18n.getMessage(key)
  }
}
