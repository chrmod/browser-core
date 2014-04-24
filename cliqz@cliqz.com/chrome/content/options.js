'use strict';

var CLIQZ = CLIQZ || {};
CLIQZ.Options = CLIQZ.Options || {
	init: function() {
		$('.btn').click(CLIQZ.Options.btnClick);

		CLIQZ.Options.loadpref();
	},
	loadpref: function(){
		var prefs = CLIQZ.Utils.cliqzPrefs;

		//POPUP HEIGHT
		//tmp
		if(prefs.getIntPref('popupHeight') < 165) prefs.setIntPref('popupHeight', 160); // 2.5 results
		if(prefs.getIntPref('popupHeight') > 352) prefs.setIntPref('popupHeight', 352); // 5.5 results

		var results = prefs.getIntPref('popupHeight') / 64;
		//round things up
		results = parseInt(results*2)/2;

		$('#lblresults').text(results);
		$('#results-slider').slider({
			min: 2.5,
			max: 5.5,
			value: results,
			create: function( event, ui ) {
		      var el = event.target;
		      var $slider =  $(el);
			    var max =  $slider.slider('option', 'max');
			    var min =  $slider.slider('option', 'min');
			    var spacing =  92 / (max - min);

			    $slider.find('.ui-slider-tick-mark').remove();
			    for (var i = 0; i <= max-min ; i++) {
			        $('<span class="ui-slider-tick-mark"></span>').css('left', (spacing * i) +  '%').appendTo($slider);
			    }
		    },
		    change: function(ev, el) {
		    	prefs.setIntPref('popupHeight', el.value * 64);
				$('#lblresults').text(el.value);
		    }
		});


		//BW FONTS
		if(prefs.getBoolPref('bwFonts')){
			$('#bw_fonts').attr('checked', 'checked');
		} else {
			$('#color_fonts').attr('checked', 'checked');
		}

		$('#bwFonts').buttonset();

		$('#bwFonts input[type=radio]').change(function() {
			var bw = this.value == 'true' ? true: false;
		    CLIQZ.Utils.cliqzPrefs.setBoolPref('bwFonts', bw);
		    //alert(this.value + ' ' + prefs.getBoolPref('bwFonts'));
		});
	},
	btnClick: function(el){
		var url = CLIQZ.Utils.CLIQZ_URL;
		switch ($(el.target).data('action')){
			case 'tutorial':
				url += 'tutorial';
				break;
			case 'feedback':
				url += 'feedback/';
				CLIQZ.Utils.version(function(version){
					url += version
					CLIQZ.Utils.openOrReuseAnyTab(url, url, false);
					window.close();
				})
				return;
			case 'faq':
				url += 'faq';
				break;
			case 'privacy':
				url += 'img/privacy.jpg';
				break;

		}
		url != CLIQZ.Utils.CLIQZ_URL && CLIQZ.Utils.openOrReuseAnyTab(url, url, false);
		CLIQZ.Utils.extensionRestart();
		window.close();
	}
}

CLIQZ.Options.init();