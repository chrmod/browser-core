window.SCRIPTS["status_info"] = {

  model: function () {
    var cliqzLoyalData = CliqzLoyalty.getAllStatCurrentTerm();
    cliqzLoyalData["stt_meta"] = CliqzLoyalty.getMemStatusMeta();
    return Promise.resolve(cliqzLoyalData);
  },

  ready: function (stats) {
  }
};