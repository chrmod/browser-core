var urlbar = document.getElementById('urlbar');
CliqzUtils.init();
CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results'),
	refreshButtons: function(){}
}
urlbar.onkeyup = function(e){
	CLIQZ.UI.main(document.getElementById('results'));

	(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){
		var currentResults = CLIQZ.UI.results({
			q: r._searchString,
			results: r._results.map(function(r){
				r.type = r.style;
				r.url = r.val;
				r.title = r.comment;
				return r;
			}),
			isInstant: false
		});
	});
}