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

CLIQZ.UI.init(urlbar);

function search(e) {
	setTimeout(function(){
		CLIQZ.UI.main(resultsBox);
		item_container = document.getElementById('cliqz-results');
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){

			var w = window.innerWidth;
			var offset = 0;
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

			resultsBox.style['transform'] = 'translate3d(' + Math.min((offset * w), (window.innerWidth * currentResults.results.length)) + 'px, 0px, 0px)';
			



			var vp = new ViewPager(resultsBox, {
			  pages: currentResults.results.length,
			  dragSize: window.innerWidth,
			  prevent_all_native_scrolling: true,
			  vertical: false,
			  onPageScroll : function (scrollInfo) {
			    offset = -scrollInfo.totalOffset;
			    invalidateScroll();
			  },

			  onPageChange : function (page) {
			    console.log('page', page);
			  }
			});

			function invalidateScroll() {
				// setTimeout(function() { 
			  	resultsBox.style['transform'] = 'translate3d(' + (offset * w) + 'px, 0px, 0px)';
				// }, 0);
			}

			window.addEventListener('resize', function () {
			  var w = window.innerWidth;
			  invalidateScroll();
			});
		});
	
	}, 100);
}

urlbar.addEventListener('keydown', function(e){
		search(urlbar.value);
});

//TODO: Should be refactored!!!!

function search_mobile(e) {
	urlbar.value = e;
	search(e);
}
