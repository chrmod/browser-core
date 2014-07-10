'use strict';

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {},
    IC = 'cliqz-result-item-box', // result item class
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    UP = 38,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN]
    ;

function $(e, ctx){return (ctx || document).querySelector(e); }

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

function getResultSelection(){
    return $('[selected="true"]', gCliqzBox);
}

function clearResultSelection(){
    var el = getResultSelection();
    el && el.removeAttribute('selected');
}

function setResultSelection(el, scroll, scrollTop){
    if(el){
        clearResultSelection();
        el.setAttribute('selected', 'true');
        scroll && el.scrollIntoView(scrollTop);
    }
}

var lastMoveTime = Date.now();
function resultMove(ev){
    if (Date.now() - lastMoveTime > 50) {
        var el = ev.target;
        while (el && el.className != IC) {
            el = el.parentElement;
        }
        clearResultSelection();
        setResultSelection(el, false);
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
    },
    keyDown: function(ev){
        var sel = getResultSelection();
        switch(ev.keyCode) {
            case UP:
                var nextEl = sel && sel.previousElementSibling;
                setResultSelection(nextEl, true, true);
            break;
            case DOWN:
                var nextEl = sel && sel.nextElementSibling;
                if(nextEl != gCliqzBox.resultsBox.lastElementChild){
                    nextEl = nextEl || gCliqzBox.resultsBox.firstElementChild;
                    setResultSelection(nextEl, true, false);
                }
            break;
            case UP:
            break;
            case UP:
            break;
        }


    }
}

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);