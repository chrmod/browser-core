var urlbar = document.getElementById('urlbar');
urlbar.onkeyup = function(e){
	CLIQZ.UI.main(document.getElementById('results'));
	CliqzUtils.getCliqzResults(urlbar.value, function(r){
		var res = JSON.parse(r.response)
		console.log('return', res);


      /*for(var i=0; i<popup._matchCount; i++) {
          data.push({
            title: ctrl.getCommentAt(i),
            url: unEscapeUrl(ctrl.getValueAt(i)),
            type: ctrl.getStyleAt(i),
            text: q,
            data: lastRes && lastRes.getDataAt(i),
          });
      }*/

      var currentResults = CLIQZ.UI.results({
        q: res.q,
        results: res.result.map(function(r){
        	r.type='';
        	r.title = r.title || '';
        	r.text = res.q;
        	return r;
        }),
        isInstant: false
      });
	})
}