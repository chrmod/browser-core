var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
var resultsBox = document.getElementById('results');
var progressIndicator = document.getElementById('progress');

var item_container, currentQuery;

CLIQZ.Core = {
  popup: resultsBox,
  refreshButtons: function(){}
}

// overriding things
CliqzAutocomplete.CliqzResults.prototype.pushTimeoutCallback = function() {}
// end of overriding things
