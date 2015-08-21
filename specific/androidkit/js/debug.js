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
		var currentScrollInfo = {
			page: 0,
			totalOffset: 0,
			pageOffset: 0
		};
		(new CliqzAutocomplete.CliqzResults()).search(urlbar.value, function(r){

			resultsBox.style['transform'] = 'translate3d(0px, 0px, 0px)';

			var w = window.innerWidth;
			var isLoadingGoogle = false;

			var offset = 0;
			var showGooglethis = (r._results.length ? 1 : 0);
			resultsBox.style.width = (window.innerWidth * (r._results.length + showGooglethis)) + 'px';
			item_container.style.width = resultsBox.style.width;
			var validCount = 0;

			var currentResults = CLIQZ.UI.results({
				q: r._searchString,
				results: r._results.map(function(r, idx){
					r.type = r.style;
					r.left = (window.innerWidth * validCount);
					r.frameWidth = window.innerWidth;
					r.url = r.val || '';
					r.title = r.comment || '';

					if (!r.invalid) {
						validCount++;
						console.log("validCount", validCount);
					}
					return r;
				}),
				isInstant: false,
				googleThis: {
					left: (window.innerWidth * validCount),
					add: showGooglethis,
					frameWidth: window.innerWidth
				}
			});
			validCount += showGooglethis;
			console.log("validCount", validCount);



			resultsBox.style['transform'] = 'translate3d(' + Math.min((offset * w), (window.innerWidth * validCount)) + 'px, 0px, 0px)';
			var googleAnim = document.getElementById("googleThisAnim");

			(function (numberPages) {

				var invalidateScroll = function () {
				  	resultsBox.style['transform'] = 'translate3d(' + (offset * w) + 'px, 0px, 0px)';
				  	if (googleAnim) {
				  		if (currentScrollInfo['page'] >= numberPages - 2) {
				  			googleAnim.style['transform'] = 'rotateZ(' + (currentScrollInfo['pageOffset'] * 360) + 'deg)';
				  		}
				  		if (currentScrollInfo['totalOffset'] >= numberPages - 0.9 && !isLoadingGoogle) {
				  			isLoadingGoogle = true;
				  			history.replaceState({"currentCliqzQuery": urlbar.value}, "", window.location.href + "?q=" + urlbar.value);
				  			CLIQZEnvironment.openLink("http://www.google.com/#q=" + urlbar.value);
				  		}
				  	}
				};

				var vp = new ViewPager(resultsBox, {
				  pages: numberPages,
				  dragSize: window.innerWidth,
				  prevent_all_native_scrolling: true,
				  vertical: false,
				  onPageScroll : function (scrollInfo) {
				  	currentScrollInfo = scrollInfo;
				    offset = -scrollInfo.totalOffset;
				    invalidateScroll();
				  },

				  onPageChange : function (page) {
				    console.log('page', page);
				  }
				});
			})(validCount);

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
