var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
CLIQZ.UI.init(urlbar);

CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results'),
	refreshButtons: function(){}
}

//TODO: call search with the right query

urlbar.addEventListener('keydown', function(e){
	search(urlbar.value);
});


function search(q){
	CLIQZ.UI.main(document.getElementById('results'));
	setTimeout(function(){
		(new CliqzAutocomplete.CliqzResults()).search(q, function(r){
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