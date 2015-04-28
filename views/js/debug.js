var urlbar = document.getElementById('urlbar');
CliqzUtils.init();
CLIQZ.Core = {
	urlbar: urlbar,
	popup: document.getElementById('results')
}
urlbar.onkeyup = function(e){
	CLIQZ.UI.main(document.getElementById('results'));
	CliqzUtils.getCliqzResults(urlbar.value, function(r){
		var res = JSON.parse(r.response)
		var extra = (res.extra.results || []).map(function(r){
			r.template = r.data.template;
			r.value = r.url;
			r.type = 'cliqz-extra';
			r.text = res.q;
			return r;
		});

		var currentResults = CLIQZ.UI.results({
			q: res.q,
			results: extra.concat((res.result || []).map(function(r){
				//Lucian: we need some more modules in the middle
				r.type='';
				if(r.snippet){
					r.title = r.snippet.title  || '';
					r.data = {
						description: r.snippet.desc
					};
				}
				r.text = res.q;
				r.value = r.url;
				return r;
			})),
			isInstant: false
		});
	})
}