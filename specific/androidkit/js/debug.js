var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);

CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results'),
	refreshButtons: function(){}
}

CLIQZ.UI.init(urlbar);

function search(e) {
	CLIQZ.UI.main(document.getElementById('results'));
	setTimeout(function(){
		(new CliqzAutocomplete.CliqzResults()).search(e, function(r){
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
}

urlbar.addEventListener('keydown', function(e){
		search(urlbar.value);
});

//TODO: Should be refactored!!!!

function search_mobile(e) {
	urlbar.value = e;
	search(e);
}
