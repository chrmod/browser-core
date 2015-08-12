var urlbar = document.getElementById('urlbar');
CliqzUtils.init(window);
var resultsBox = document.getElementById('results');
CLIQZ.UI.init(urlbar);
var item_container;

CLIQZ.Core = {
	urlbar: urlbar,
	popup: resultsBox,
	refreshButtons: function(){}
}
urlbar.addEventListener('keydown', function(e){
	setTimeout(function(){
		CLIQZ.UI.main(resultsBox);
		item_container = document.getElementById('cliqz-results');
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){
			/* if (r._results.length) {
				r._results = [r._results[0]];
			} */
			resultsBox.style.width = (window.innerWidth * r._results.length) + 'px';
			item_container.style.width = resultsBox.style.width;
			var currentResults = CLIQZ.UI.results({
				q: r._searchString,
				results: r._results.map(function(r, idx){
					r.type = r.style;
					r.left = (window.innerWidth * idx);
					r.frameWidth = window.innerWidth;
					r.url = r.val || '';
					r.title = r.comment || '';
					return r;
				}),
				isInstant: false
			});
			
			var w = window.innerWidth;
			var offset = 0;
			var vp = new ViewPager(resultsBox, {
			  pages: r._results.length,
			  vertical: false,
			  onPageScroll : function (scrollInfo) {
			    console.log('onPageScroll', scrollInfo);
			    offset = -scrollInfo.totalOffset;
			    invalidateScroll();
			  },

			  onPageChange : function (page) {
			    console.log('page', page);
			  }
			});

			function invalidateScroll() {
			  resultsBox.style['-webkit-transform'] = 'translate3d(' + (offset * w * r._results.length) + 'px, 0px, 0px)';
			}

			window.addEventListener('resize', function () {
			  w = resultsBox.getBoundingClientRect().width;
			  invalidateScroll();
			});
		});
	
	}, 300);
});
	
