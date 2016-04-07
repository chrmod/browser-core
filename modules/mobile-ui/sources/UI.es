'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

var TEMPLATES = CliqzUtils.TEMPLATES,
    VERTICALS = CliqzUtils.VERTICAL_TEMPLATES,
    resultsBox= null
    ;

var UI = {
    init: function(){},
    main: function(box) {
        //check if loading is done
        if(!CliqzHandlebars.tplCache.main)return;

        box.innerHTML = CliqzHandlebars.tplCache.main();

        resultsBox = document.getElementById('cliqz-results',box);
    },
    results: function(res){
        res = enhanceResults(res);
        //TODO copy async
        resultsBox.innerHTML = CliqzHandlebars.tplCache.results(res);

        return res;
    },
    VIEWS: {}
};

function enhanceResults(res){
    for(var i=0; i<res.results.length; i++) {
        var r = res.results[i];
        r.data = r.data || {};

        enhanceSpecificResult(r);

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
        r.vertical = (r.data.template && TEMPLATES.hasOwnProperty(r.data.template)) ? r.data.template : 'generic';

        //extract debug info from title
        var _tmp = getDebugMsg(r.title);
        r.title = _tmp[0];
        r.debug = _tmp[1];
    }

    res.results = res.results.filter(function(r){ return !(r.data && r.data.adult); });

    return res;
}

// debug message are at the end of the title like this: "title (debug)!"
function getDebugMsg(fullTitle){
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if(fullTitle === null) {
      return [null, null];
    }
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/)
    if(r && r.length >= 3)
        return [r[1], r[2]]
    else
        return [fullTitle, null]
}

function enhanceSpecificResult(r) {
    var specificView;
    if (r.subType && JSON.parse(r.subType).ez) {
        // Indicate that this is a RH result.
        r.type = "cliqz-extra";
    }
    if(r.data.superTemplate && CliqzUtils.TEMPLATES.hasOwnProperty(r.data.superTemplate)) {
        r.data.template = r.data.superTemplate;
    }

    specificView = UI.VIEWS[r.data.template] || UI.VIEWS.generic;
    if (specificView && specificView.enhanceResults) {
        specificView.enhanceResults(r.data);
    }
}

//returns the first child which matches the selector
function $(selector, ctx){return (ctx || document).querySelector(selector); }

//returns all the childs which match the selector
function $$(selector, ctx){return (ctx || document).querySelectorAll(selector); }

//returns the ctx itself if its a match or first child which matches the selector
function $_(selector, ctx){
    if(matches(ctx || document, selector)){
        return ctx || document;
    } else return $(selector, ctx);
}


// returns true if the selector matches the element
function matches(elem, selector) {
    var f = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;
    if(f){
        return f.bind(elem)(selector);
    }
    else {
        //older FF doest have mathes - create our own
        return elem.parentNode && Array.prototype.indexOf.call(elem.parentNode.querySelectorAll(selector), elem) != -1;
    }
}

/**
 * Finds the closest ancestor of @p elem that matches @p selector.
 *
 * @see http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
 */
function closest(elem, selector) {
    while (elem) {
        if (matches(elem, selector)) {
            return elem;
        } else {
            elem = elem.parentElement;
        }
    }
    return false;
}

export default UI;
