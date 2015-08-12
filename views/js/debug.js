var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
CLIQZ.UI.init(urlbar);

CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results'),
	refreshButtons: function(){}
}
urlbar.addEventListener('keydown', function(e){
	CLIQZ.UI.main(document.getElementById('results'));
	setTimeout(function(){
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){
			if (r._results.length) {
				r._results = [r._results[0]];
			}
			var currentResults = CLIQZ.UI.results({
				q: r._searchString,
				results: r._results.map(function(r){
					r.type = r.style;
					r.url = r.val || '';
					r.title = r.comment || '';
					return r;
				}),
				isInstant: false
			});
		});
	}, 0);
});