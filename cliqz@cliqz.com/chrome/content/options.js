'use strict';

var changedOptions = {};
var CLIQZ = CLIQZ || {};
CLIQZ.Options = CLIQZ.Options || {
    changed: {},
    init: function() {
        $('.btn').click(CLIQZ.Options.btnClick);
        CLIQZ.Utils.isWindows() && $('#buttonContainer').css('direction', 'rtl');

        CLIQZ.Options.loadpref();
        $(document).keydown(function(e) {
            // ESCAPE key pressed
            if (e.keyCode == 27) {
                window.close();
            }
        });
    },
    loadpref: function(){
        var prefs = CLIQZ.Utils.cliqzPrefs,
            self = this;

        //POPUP HEIGHT
        //tmp 24.04.2014
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
                changedOptions['popupHeight'] = el.value * 64;
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
            changedOptions['bwFonts'] = bw;
        });

        //inPrivate
        if(prefs.getBoolPref('inPrivateWindows')){
            $('#inPrivateWindows').attr('checked', 'checked');
        }
        $('#inPrivateWindows').change(function(){
            changedOptions['inPrivateWindows'] = this.checked;
        });

        //searchEngines
        var $searchEngines = $('#searchEngines');
        $.each(CLIQZ.Utils.getSearchEngines(), function(key, engine) {
               $searchEngines
                 .append($('<option></option>')
                 .attr('value',engine.name)
                 .text('[' + engine.prefix + '] ' + engine.name));
        });
        $searchEngines.val(Services.search.currentEngine.name);
        $searchEngines.change(function(){
            //on save
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
            case 'restore':
                // UNUSED atm
                CLIQZ.Utils.cliqzPrefs.setBoolPref('bwFonts', false);
                //$('#bw_fonts').removeAttr('checked');
                $('#color_fonts').click();
                CLIQZ.Utils.cliqzPrefs.setIntPref('popupHeight', 160);
                changedOptions = {};
                CLIQZ.Options.loadpref();
                return;
            case 'save':
                for(var pref in changedOptions) {
                    CLIQZ.Utils.setPref(pref, changedOptions[pref]);
                }
                CLIQZ.Utils.setCurrentSearchEngine($('#searchEngines').val());
                CLIQZ.Utils.extensionRestart();
                break;
            case 'close':
                break;
        }
        url != CLIQZ.Utils.CLIQZ_URL && CLIQZ.Utils.openOrReuseAnyTab(url, url, false);
        window.close();
    }
}

CLIQZ.Options.init();