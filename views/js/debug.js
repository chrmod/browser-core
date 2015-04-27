var urlbar = document.getElementById('urlbar');
CliqzUtils.init();

urlbar.onkeyup = function(e){
	CLIQZ.UI.main(document.getElementById('results'));
	CliqzUtils.getCliqzResults(urlbar.value, function(r){
		var res = JSON.parse(r.response)

		var currentResults = CLIQZ.UI.results({
			q: res.q,
			results: res.result.map(function(r){
				//Lucian: we need some more modules in the middle
				r.type='';
				r.title = r.title || '';
				r.text = res.q;
				r.value = r.url;
				return r;
			}),
			isInstant: false
		});
	})
}