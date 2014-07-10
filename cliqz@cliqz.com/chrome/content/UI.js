'use strict';

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {},
    IC = 'cliqz-result-item-box', // result item class
    gCliqzBox = null
    ;

function generateLogoClass(urlDetails){
    var cls = '';
    // lowest priority: base domain, no tld
    cls += ' logo-' + urlDetails.name;
    // domain.tld
    cls += ' logo-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    if (urlDetails.subdomains.length > 0) {
        // subdomain.domain - to match domains like maps.google.co.uk and maps.google.de with maps-google
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name;
        // subdomain.domain.tld
        cls += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
    }

    return cls;
}


function enhanceResults(res){
    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = generateLogoClass(r.urlDetails);
        r.width = res.width;
    }

    return res;
}

function resultClick(ev){
    var el = ev.target;

    while (el && el.className != IC) el = el.parentElement;

    el && openUILink(el.getAttribute('url'));
}

var lastMoveTime = Date.now();
function resultMove(ev){
    if (Date.now() - lastMoveTime > 50) {
        var el = ev.target;

        while (el && el.className != IC) {
            el = el.parentElement;
        }

        var results = gCliqzBox.querySelectorAll('[selected="true"]');
        for(var i=0; i<results.length; i++)
            results[i].removeAttribute('selected');

        el && el.setAttribute('selected', 'true');

        lastMoveTime = Date.now();
    }
}

var UI = {
    tpl: {},
    init: function(){
        TEMPLATES.forEach(function(tpl){
            CliqzUtils.httpGet(TEMPLATES_PATH + tpl + '.tpl', function(res){
                UI.tpl[tpl] = Handlebars.compile(res.response);
            });
        });
    },
    main: function(box){
        gCliqzBox = box;
        box.innerHTML = UI.tpl.main();

        var resultsBox = document.getElementById('cliqz-results',box);
        resultsBox.addEventListener('click', resultClick);
        box.addEventListener('mousemove', resultMove);

        gCliqzBox.resultsBox = resultsBox;

        var suggestionBox = document.getElementById('cliqz-suggestion-box',box);
        gCliqzBox.suggestionBox = suggestionBox;

    },
    results: function(res){
        var enhanced = enhanceResults(res);
        gCliqzBox.resultsBox.innerHTML = UI.tpl.results(enhanced);
    },
    suggestions: function(suggestions){
        gCliqzBox.suggestionBox.innerHTML = UI.tpl.suggestions(suggestions);
    }
}

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);