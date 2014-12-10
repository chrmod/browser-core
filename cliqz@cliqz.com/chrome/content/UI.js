'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions', 'emphasis', 'empty', 'text',
                 'generic', 'custom', 'clustering', 'series', 'calculator',
                 'entity-search-1', 'entity-news-1', 'weather', 'bitcoin',
                 'images'],

    VERTICALS = {
        'i': 'images',
        'b': 'bundesliga',
        's': 'shopping',
        'g': 'gaming'  ,
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        'q': 'qaa'     ,
        'k': 'science' ,
        'l': 'dictionary'
    },
    PARTIALS = ['url'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {},
    IC = 'cliqz-result-item-box', // result item class
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN],
    IMAGE_HEIGHT = 54,
    IMAGE_WIDTH = 96
    ;

var UI = {
    tpl: {},
    showDebug: false,
    init: function(){
        TEMPLATES.forEach(function(tpl){
            CliqzUtils.httpGet(TEMPLATES_PATH + tpl + '.tpl', function(res){
                UI.tpl[tpl] = Handlebars.compile(res.response);
            });
        });
        for(var v in VERTICALS){
            (function(vName){
                CliqzUtils.httpGet(TEMPLATES_PATH + vName + '.tpl', function(res){
                    UI.tpl[vName] = Handlebars.compile(res.response);
                });
            })(VERTICALS[v]);
        };

        PARTIALS.forEach(function(tpl){
            CliqzUtils.httpGet(TEMPLATES_PATH + tpl + '.tpl', function(res){
                 Handlebars.registerPartial(tpl, res.response);
            });
        });

        registerHelpers();

        UI.showDebug = CliqzUtils.cliqzPrefs.getBoolPref('showQueryDebug');
    },
    main: function(box){
        gCliqzBox = box;

        //check if loading is done
        if(!UI.tpl.main)return;

        box.innerHTML = UI.tpl.main(ResultProviders.getSearchEngines());

        var resultsBox = document.getElementById('cliqz-results',box);

        resultsBox.addEventListener('click', resultClick);

        box.addEventListener('mousemove', resultMove);
        gCliqzBox.resultsBox = resultsBox;

        var suggestionBox = document.getElementById('cliqz-suggestion-box', box);
        suggestionBox.addEventListener('click', suggestionClick);
        gCliqzBox.suggestionBox = suggestionBox;

        var enginesBox = document.getElementById('cliqz-engines-box', box);
        enginesBox.addEventListener('click', enginesClick);
        gCliqzBox.enginesBox = enginesBox;

        gCliqzBox.messageBox = document.getElementById('cliqz-navigation-message', box);

        handlePopupHeight(box);
    },
    results: function(res){
        if (!gCliqzBox)
            return;

        var enhanced = enhanceResults(res);
        process_images_result(res, 120); // Images-layout for Cliqz-Images-Search

        //try to update reference if it doesnt exist
        if(!gCliqzBox.messageBox)
            gCliqzBox.messageBox = document.getElementById('cliqz-navigation-message');

        if(gCliqzBox.messageBox){
            var num = enhanced.results.filter(function(r){ return r.dontCountAsResult == undefined; }).length;
            if(num != 0)gCliqzBox.messageBox.textContent = CliqzUtils.getLocalizedString('numResults').replace('{}', num);
            else gCliqzBox.messageBox.textContent = CliqzUtils.getLocalizedString('noResults');
        }

        //try to recreate main container if it doesnt exist
        if(!gCliqzBox.resultsBox){
            var cliqzBox = CLIQZ.Core.popup.cliqzBox;
            if(cliqzBox){
                UI.main(cliqzBox);
            }
        }
        if(gCliqzBox.resultsBox)
            gCliqzBox.resultsBox.innerHTML = UI.tpl.results(enhanced);

        //might be unset at the first open
        CLIQZ.Core.popup.mPopupOpen = true;

        // try to find and hide misaligned elemets - eg - weather
        setTimeout(function(){ hideMisalignedElements(gCliqzBox.resultsBox); }, 0);

        // set the width
        gCliqzBox.style.width = (res.width +1) + 'px';
    },
    // redraws a result
    // usage: redrawResult('[type="cliqz-cluster"]', 'clustering', {url:...}
    redrawResult: function(filter, template, data){
        var result;
        if(result =$('.' + IC + filter, gCliqzBox))
            result.innerHTML = UI.tpl[template](data);
    },
    suggestions: function(suggestions, q){
        if (!gCliqzBox)
            return;

        if(suggestions){
            gCliqzBox.suggestionBox.innerHTML = UI.tpl.suggestions({
                // do not show a suggestion is it is exactly the query
                suggestions: suggestions.filter(function(s){ return s != q; }),
                q:q
            });
        } else {
            gCliqzBox.suggestionBox.innerHTML = '';
        }
    },
    keyDown: function(ev){
        var sel = getResultSelection();
        switch(ev.keyCode) {
            case UP:
                var nextEl = sel && sel.previousElementSibling;
                setResultSelection(nextEl, true, true);
                trackArrowNavigation(nextEl);
                return true;
            break;
            case DOWN:
                if(sel != gCliqzBox.resultsBox.lastElementChild){
                    var nextEl = sel && sel.nextElementSibling;
                    nextEl = nextEl || gCliqzBox.resultsBox.firstElementChild;
                    setResultSelection(nextEl, true, false);
                    trackArrowNavigation(nextEl);
                }
                return true;
            break;
            case ENTER:
                return onEnter(ev, sel);
            break;
            case TAB:
                suggestionNavigation(ev);
                return true;
            case LEFT:
            case RIGHT:
                // close drop down to avoid firefox autocompletion
                CLIQZ.Core.popup.closePopup();
                return false;
            case KeyEvent.DOM_VK_HOME:
                // set the caret at the beginning of the text box
                ev.originalTarget.setSelectionRange(0, 0);
                // return true to prevent the default action
                // on linux the default action will autocomplete to the url of the first result
                return true;
            default:
                return false;
        }
    },
    entitySearchKeyDown: function(event, value, element) {
      if(event.keyCode==13) {
        var provider_name = element.getAttribute("search-provider");
        var search_url = element.getAttribute("search-url");
        var search_engine = Services.search.getEngineByName(provider_name);
        var google_url = search_url + value
        if (search_engine) {
          var google_url = search_engine.getSubmission(value).uri.spec
        }
        openUILink(google_url);
        CLIQZ.Core.forceCloseResults = true;
        CLIQZ.Core.popup.hidePopup();
        event.preventDefault();

        var action_type = element.getAttribute("logg-action-type");
        var signal = {
          type: 'activity',
          action: action_type
        };
        CliqzUtils.track(signal);
      }
    },
    closeResults: closeResults
};


var forceCloseResults = false;
function closeResults(event, force) {
    if($("[dont-close=true]", gCliqzBox) == null) return;

    if (forceCloseResults || force) {
        forceCloseResults = false;
        return;
    }

    event.preventDefault();
    setTimeout(function(){
      var newActive = document.activeElement;
      if (newActive.getAttribute("dont-close") != "true") {
        forceCloseResults = true;
        CLIQZ.Core.popup.hidePopup();
      }
    }, 0);
}

// hide elements in a context folowing a priority (0-lowest)
//
// looks for all the elements with 'hide-check' attribute and
// hides childrens based on the 'hide-priority' order
function hideMisalignedElements(ctx){
    var elems = $$('[hide-check]', ctx);
    for(var i = 0; elems && i < elems.length; i++){
        var el = elems[i], childrenW = 40 /* paddings */;
        for(var c=0; c<el.children.length; c++)
            childrenW += el.children[c].clientWidth;

        if(childrenW > el.clientWidth){
            var children = [].slice.call($$('[hide-priority]', el)),
                sorted = children.sort(function(a, b){
                    return +a.getAttribute('hide-priority') < +b.getAttribute('hide-priority')
                });

            while(sorted.length && childrenW > el.clientWidth){
                var excluded = sorted.pop();
                childrenW -= excluded.clientWidth;
                excluded.style.display = 'none';
            }
        }
    }
}

function handlePopupHeight(box){
    var MAX=352, MIN =160,
        height = CliqzUtils.getPref('popupHeight', 290),
        start, footer = document.getElementById('cliqz-footer', box);

    function setHeight(delta){
        var t = Math.min(Math.max(height + delta, MIN), MAX);
        box.resultsBox.style.maxHeight = (t - 36) + 'px';

        footer.style.cursor = t == MIN? 's-resize':
                              t == MAX? 'n-resize':
                              'ns-resize';
    }
    setHeight(0);
    //handle resize
    function moveIT(e){
        setHeight(e.pageY - start);
    }

    function mouseReleased(){
        height = 36 + +box.resultsBox.style.maxHeight.replace('px','')
        CliqzUtils.setPref('popupHeight', height);
        document.removeEventListener('mousemove', moveIT);
        document.removeEventListener('mouseup', mouseReleased);
    }

    footer.addEventListener('mousedown', function(e){
        if(e.target != footer)return;
        start = e.pageY;
        document.addEventListener('mousemove',moveIT);
        document.addEventListener('mouseup', mouseReleased);
    });
}

function $(e, ctx){return (ctx || document).querySelector(e); }
function $$(e, ctx){return (ctx || document).querySelectorAll(e); }

/**
 * Finds the closest ancestor of @p elem that matches @p selector.
 *
 * @see http://stackoverflow.com/questions/15329167/closest-ancestor-matching-selector-using-native-dom
 */
function closest(elem, selector) {
   var matchesSelector = elem.matches || elem.webkitMatchesSelector || elem.mozMatchesSelector || elem.msMatchesSelector;

    while (elem) {
        if (matchesSelector.bind(elem)(selector)) {
            return elem;
        } else {
            elem = elem.parentElement;
        }
    }
    return false;
}

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

function constructImage(data){
    if (data && data.image) {
        var height = IMAGE_HEIGHT,
            img = data.image;
        var ratio = 0;

        switch((data.richData && data.richData.type) || data.type){
            case 'news': //fallthrough
            case 'shopping':
              height = 64;
              ratio = 1;
              break;
            case 'hq':
                try {
                    if(img.ratio){
                        ratio = parseInt(img.ratio);
                    } else if(img.width && img.height) {
                        ratio = parseInt(img.width) / parseInt(img.height);
                    }
                } catch(e){}
                break;
            case 'video':
                ratio = 16/9;
                break;
            case 'poster':
                height = 67;
                ratio = 214/317;
                break;
            case 'people': //fallthough
            case 'person':
                ratio = 1;
                break;
            default:
                ratio = 0;
                break;
        }
        // only show the image if the ratio is between 0.4 and 2.5
        if(ratio == 0 || ratio > 0.4 && ratio < 2.5){
            var image = { src: img.src }
            if(ratio > 0) {
                image.backgroundSize = height * ratio;
                image.width = height * ratio ;
                image.height = height;
            }
            if (img && img.duration) {
                image.text = img.duration;
            }

            image.width = image.width || IMAGE_WIDTH;

            return image
        }
    }
    return null;
}




    // Cliqz Images Search Layout

    var IMAGES_MARGIN = 6;
    var IMAGES_LINES = 1;
    function getheight(images, width) {
        width -= IMAGES_MARGIN * images.length; //images  margin
        var h = 0;
        for (var i = 0; i < images.length; ++i) {
            // console.log('width (getheight): '+images[i].image_width)
            h += images[i].image_width / images[i].image_height
        }
        return width / h;
    }

    function setheight(images, height) {
        var verif_width = 0;
        var estim_width = 0;
        for (var i = 0; i < images.length; ++i) {
           var width_float = height * images[i].image_width /images[i].image_height;
            verif_width += ( IMAGES_MARGIN + width_float);
            images[i].width = parseInt(width_float);
            estim_width +=  ( IMAGES_MARGIN + images[i].width);
            images[i].height = parseInt(height);
            // console.log('width (new): ' + images[i].width +
            //             ', height (new): ' + images[i].height);
        }

        // Collecting sub-pixel error
        var error = estim_width - parseInt(verif_width)
        //console.log('estimation error:' + error);

        if (error>0) {
            //var int_error = parseInt(Math.abs(Math.ceil(error)));
            // distribute the error on first images each take 1px
            for (var i = 0; i < error; ++i) {
                images[i].width -= 1;
            }
        }
        else {
            error=Math.abs(error)
            //var int_error = parseInt(Math.abs(Math.floor(error)));
            for (var i = 0; i < error; ++i) {
                images[i].width += 1;
            }
        }

        // Sanity check (Test)
        // var verify = 0;
        // for (var i = 0; i < images.length; ++i) {
        //    var width_float = height * images[i].image_width /images[i].image_height;
        //    verify += (images[i].width + IMAGES_MARGIN);
        // }
        // console.log('global width (verif): '+ verify+', verify (float):'+ verif_width +', int verify (float):'+ parseInt(verif_width));
    }

    function resize(images, width) {
        setheight(images, getheight(images, width));
    }


    function process_images_result(res, max_height) {
        // Processing images to fit with max_height and
        var tmp = []
        for(var k=0; k<res.results.length; k++){
            var r = res.results[k];
            if (r.vertical == 'images' && r.data.template == 'images') {
                var size = CLIQZ.Core.urlbar.clientWidth - 15;
                var n = 0;
                var images = r.data.items;
                // console.log('global width: '+ size + ', verif: '+ res.width
                //     +', images nbr: '+images.length) // TODO Define which is the better src for width f(time, scroll_bar_styles)
                w: while ((images.length > 0) && (n<IMAGES_LINES)){
                    var i = 1;
                    while ((i < images.length + 1) && (n<IMAGES_LINES)){
                        var slice = images.slice(0, i);
                        var h = getheight(slice, size);
                        //console.log('height: '+h);
                        if (h < max_height) {
                            setheight(slice, h);
                            //res.results[k].data.results = slice
                            tmp.push.apply(tmp, slice);
                            // console.log('height: '+h);
                            n++;
                            images = images.slice(i);
                            continue w;
                        }
                        i++;
                    }
                    setheight(slice, Math.min(max_height, h));
                    tmp.push.apply(tmp, slice);
                    n++;
                    break;
                }
                res.results[k].data.results = tmp
                // console.log('lines: '+n); // should be 1
                }
            }

        }

    // end image-search layout

//loops though al the source and returns the first one with custom snippet
function getFirstVertical(type){
    while(type && !VERTICALS[type[0]])type = type.substr(1);
    return VERTICALS[type[0]] || 'generic';
}

function getPartial(type){
    if(type === 'cliqz-images') return 'images';
    if(type === 'cliqz-bundesliga') return 'bundesliga';
    if(type === 'cliqz-cluster') return 'clustering';
    if(type === 'cliqz-series') return 'series';
    if(type.indexOf('cliqz-custom sources-') === 0) return 'custom';
    if(type.indexOf('cliqz-results sources-') == 0){
        // type format: cliqz-results sources-XXXX
        // XXXX -  are the verticals which provided the result
        return getFirstVertical(type.substr(22));
    }
    // history and cliqz results, eg: favicon sources-XXXXX
    var combined = type.split(' ');
    if(combined.length == 2 && combined[0].length > 0 && combined[1].length > 8){
        return getFirstVertical(combined[1].substr(8));
    }

    return 'generic';
}

// debug message are at the end of the title like this: "title (debug)!"
function getDebugMsg(fullTitle){
    var r = fullTitle.match(/^(.+) \((.+)\)!$/)
    if(r && r.length >= 3)
        return [r[1], r[2]]
    else
        return [fullTitle, null]
}

// tags are piggybacked in the title, eg: Lady gaga - tag1,tag2,tag3
function getTags(fullTitle){
    var tags, title;
    [, title, tags] = fullTitle.match(/^(.+) \u2013 (.+)$/);

    // Each tag is split by a comma in an undefined order, so sort it
    return [title, tags.split(",").sort()]
}

var TYPE_LOGO_WIDTH = 100; //the width of the type and logo elements in each result
function enhanceResults(res){

    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];
        if(r.type == 'cliqz-extra'){
            var d = r.data;
            if(d){
                if(d.template && TEMPLATES.indexOf(d.template) != -1){
                    r.vertical = d.template;
                    r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
                    r.logo = generateLogoClass(r.urlDetails);
                    if(r.vertical == 'text')r.dontCountAsResult = true;
                } else {
                    // unexpected/unknown template
                    r.invalid = true;
                    r.dontCountAsResult = true;
                }
            }
        } else {
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = generateLogoClass(r.urlDetails);

             if (getPartial(r.type) != 'images'){
                 r.image = constructImage(r.data);
                 r.width = res.width - TYPE_LOGO_WIDTH - (r.image && r.image.src ? r.image.width + 14 : 0);
                }
            r.vertical = getPartial(r.type);

            //extract debug info from title
            [r.title, r.debug] = getDebugMsg(r.title)
            if(!UI.showDebug)
                r.debug = null;

            //extract tags from title
            if(r.type.split(' ').indexOf('tag') != -1)
                [r.title, r.tags] = getTags(r.title);

        }

        // If one of the results is data.only = true Remove all others.
        if (!r.invalid && r.data && r.data.only) {
          res.results = [r];
          return res;
        }
    }

    //prioritize extra (fun-vertical) results
    var first = res.results.filter(function(r){ return r.type === "cliqz-extra"; });
    var last = res.results.filter(function(r){ return r.type !== "cliqz-extra"; });
    res.results = first;
    res.results = res.results.concat(last);
    return res;
}

function getResultPosition(el){
    var idx;
    while (el){
        if(idx = el.getAttribute('idx')) return idx;
        if(el.className == IC) return; //do not go higher than a result
        el = el.parentElement;
    }
}

function resultClick(ev){
    var el = ev.target,
        newTab = ev.metaKey ||
                 ev.ctrlKey ||
                 (ev.target.getAttribute('newtab') || false);
    while (el){
        if(el.getAttribute('url')){
            var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url')),
                lr = CliqzAutocomplete.lastResult,
                action = {
                    type: 'activity',
                    action: 'result_click',
                    new_tab: newTab,
                    current_position: getResultPosition(el),
                    query_length: CliqzAutocomplete.lastSearch.length,
                    inner_link: el.className != IC, //link inside the result or the actual result
                    position_type: CliqzUtils.encodeResultType(el.getAttribute('type')),
                    extra: el.getAttribute('extra'), //extra data about the link
                    search: CliqzUtils.isSearch(url),
                    has_image: el.getAttribute('hasimage') || false,
                    clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false,
                    reaction_time: (new Date()).getTime() - CliqzAutocomplete.lastQueryTime,
                    display_time: CliqzAutocomplete.lastDisplayTime ? (new Date()).getTime() - CliqzAutocomplete.lastDisplayTime : null,
                    result_order: lr ? CliqzAutocomplete.getResultsOrder(lr._results) : '',
                };

            if (action.position_type == 'C' && CliqzUtils.getPref("logCluster", false)) {
                action.Ctype = CliqzUtils.getClusteringDomain(url)
            }
            CliqzUtils.track(action);

            var query = CLIQZ.Core.urlbar.value;
            var queryAutocompleted = null;
            if (CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart)
            {
                var first = gCliqzBox.resultsBox.children[0];
                if (!CliqzUtils.isPrivateResultType(CliqzUtils.encodeResultType(first.getAttribute('type'))))
                {
                    queryAutocompleted = query;
                }
                query = query.substr(0, CLIQZ.Core.urlbar.selectionStart);
            }
            CliqzUtils.trackResult(query, queryAutocompleted, getResultPosition(el),
                CliqzUtils.isPrivateResultType(action.position_type) ? '' : url);

            CLIQZ.Core.openLink(url, newTab);
            if(!newTab) CLIQZ.Core.popup.hidePopup();

            break;
        } else if (el.getAttribute('cliqz-action')) {
            // copy calculator answer to clipboard
            if(el.getAttribute('cliqz-action') == 'copy-calc-answer'){
                const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                           .getService(Components.interfaces.nsIClipboardHelper);
                gClipboardHelper.copyString(document.getElementById('calc-answer').innerHTML);
                document.getElementById('calc-copied-btn').style.display = "";
                document.getElementById('calc-copy-btn').style.display = "none";
            }
            /*
             * Hides the current element and displays one of its siblings that
             * was specified in the toggle-with attribute.
             */
            if (el.getAttribute('cliqz-action') == 'toggle') {
                var toggleId = el.getAttribute('toggle-id');
                var context = el.getAttribute('toggle-context');
                if (toggleId && context) {
                    var toggleAttr = el.getAttribute('toggle-attr') || 'cliqz-toggle';
                    var ancestor = closest(el, '.' + context);
                    var toggleElements = $$("[" + toggleAttr + "]", ancestor);
                    for (var i = 0; i < toggleElements.length; i++) {
                        if (toggleElements[i].getAttribute(toggleAttr) == toggleId) {
                            toggleElements[i].style.display = "";
                        } else {
                            toggleElements[i].style.display = "none";
                        }
                    }
                    break;
                }
            }
        }
        if(el.className == IC) break; //do not go higher than a result
        el = el.parentElement;
    }
}

function getResultSelection(){
    return $('.' + IC + '[selected="true"]', gCliqzBox);
}

function clearResultSelection(){
    var el = getResultSelection();
    el && el.removeAttribute('selected');
}

function setResultSelection(el, scroll, scrollTop){
    clearResultSelection();
    if(el){
        el.setAttribute('selected', 'true');
        if(scroll){
            var rBox = gCliqzBox.resultsBox,
                firstOffset = rBox.children[0].offsetTop;

            if(scrollTop && rBox.scrollTop > (el.offsetTop - firstOffset))
                el.scrollIntoView(true);
            else if(!scrollTop &&
                (rBox.scrollTop + rBox.offsetHeight <
                    (el.offsetTop - firstOffset) + el.offsetHeight))
                el.scrollIntoView(false);
        }
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

function selectSuggestion(suggestions, right, pos){
    function isValid(el){
        return el.offsetTop == suggestions[0].offsetTop;
    }

    var el, next = right? 'nextElementSibling' : 'previousElementSibling';
    if(pos)el = suggestions[pos][next];
    else el = suggestions[right ? 0 : suggestions.length-1];

    while(el && !isValid(el)) el = el[next];

    if(el){
        el.setAttribute('selected', 'true');
        return el.getAttribute('idx');
    } else {
        return -1;
    }
}

function suggestionNavigation(ev){
    var box = gCliqzBox.suggestionBox,
        suggestions = box.children,
        action = {
            type: 'activity',
            action: 'tab_key',
            current_position : -1
        },
        selected = $('.cliqz-suggestion[selected="true"]', box);

        if(selected) selected.removeAttribute('selected');

        action.current_position = selectSuggestion(suggestions, !ev.shiftKey, selected && selected.getAttribute('idx'))

        action.direction = ev.shiftKey? 'left' : 'right';
        CliqzUtils.track(action);
}

function suggestionClick(ev){
    if(ev && ev.target){
        var suggestionVal = ev.target.getAttribute('val') || ev.target.parentNode.getAttribute('val');
        if(suggestionVal){
            CLIQZ.Core.urlbar.mInputField.focus();
            CLIQZ.Core.urlbar.mInputField.setUserInput(suggestionVal);

            var action = {
                type: 'activity',
                action: 'suggestion_click',
                query_length: CLIQZ.Core.urlbar.value.length,
                current_position: ev.target.getAttribute('idx') ||
                                  ev.target.parentNode.getAttribute('idx') ||
                                  -1,
            };

            CliqzUtils.track(action);
        }
    }
}

function onEnter(ev, item){
    var index = item ? item.getAttribute('idx'): -1,
        inputValue = CLIQZ.Core.urlbar.value,
        popupOpen = CLIQZ.Core.popup.popupOpen,
        lr = CliqzAutocomplete.lastResult,
        currentTime = (new Date()).getTime(),
        action = {
            type: 'activity',
            action: 'result_enter',
            current_position: index,
            query_length: CliqzAutocomplete.lastSearch.length,
            search: false,
            has_image: item && item.getAttribute('hasimage') || false,
            clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false,
            reaction_time: currentTime - CliqzAutocomplete.lastQueryTime,
            display_time: CliqzAutocomplete.lastDisplayTime ? currentTime - CliqzAutocomplete.lastDisplayTime : null,
            urlbar_time: CliqzAutocomplete.lastFocusTime ? currentTime - CliqzAutocomplete.lastFocusTime: null,
            result_order: lr ? CliqzAutocomplete.getResultsOrder(lr._results) : '',
        };

    var query = inputValue;
    var queryAutocompleted = null;
    if (CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart)
    {
        var first = gCliqzBox.resultsBox.children[0];
        if (!CliqzUtils.isPrivateResultType(CliqzUtils.encodeResultType(first.getAttribute('type'))))
        {
            queryAutocompleted = query;
        }
        query = query.substr(0, CLIQZ.Core.urlbar.selectionStart);
    }

    if(popupOpen && index != -1){
        var url = CliqzUtils.cleanMozillaActions(item.getAttribute('url'));
        action.position_type = CliqzUtils.encodeResultType(item.getAttribute('type'));
        action.search = CliqzUtils.isSearch(url);
        if (action.position_type == 'C' && CliqzUtils.getPref("logCluster", false)) { // if this is a clustering result, we track the clustering domain
            action.Ctype = CliqzUtils.getClusteringDomain(url)
        }
        CLIQZ.Core.openLink(url, false);
        CliqzUtils.trackResult(query, queryAutocompleted, index,
            CliqzUtils.isPrivateResultType(action.position_type) ? '' : url);

    } else { //enter while on urlbar and no result selected
        // update the urlbar if a suggestion is selected
        var suggestion = gCliqzBox && $('.cliqz-suggestion[selected="true"]', gCliqzBox.suggestionBox);

        if(popupOpen && suggestion){
            CLIQZ.Core.urlbar.mInputField.setUserInput(suggestion.getAttribute('val'));
            action = {
                type: 'activity',
                action: 'suggestion_enter',
                query_length: inputValue.length,
                current_position: suggestion.getAttribute('idx')
            }
            CliqzUtils.track(action);
            return true;
        }

        action.current_position = -1;
        if(CliqzUtils.isUrl(inputValue)){
            action.position_type = 'inbar_url';
            action.search = CliqzUtils.isSearch(inputValue);
        }
        else action.position_type = 'inbar_query';
        action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;
        if(action.autocompleted && gCliqzBox){
            var first = gCliqzBox.resultsBox.children[0],
                firstUrl = first.getAttribute('url');

            action.source = CliqzUtils.encodeResultType(first.getAttribute('type'));
            if (action.source == 'C' && CliqzUtils.getPref("logCluster", false)) {  // if this is a clustering result, we track the clustering domain
                action.Ctype = CliqzUtils.getClusteringDomain(firstUrl)
            }
            if(firstUrl.indexOf(inputValue) != -1){
                CLIQZ.Core.urlbar.value = CliqzUtils.cleanMozillaActions(firstUrl);
            }
            CliqzUtils.trackResult(query, queryAutocompleted, index,
                CliqzUtils.isPrivateResultType(action.source) ? '' : CliqzUtils.cleanMozillaActions(firstUrl));
        } else {
            var customQuery = ResultProviders.isCustomQuery(inputValue);
            if(customQuery){
                CLIQZ.Core.urlbar.value = customQuery.queryURI;
            }
            var url = CliqzUtils.isUrl(inputValue) ? inputValue : null;
            CliqzUtils.trackResult(query, queryAutocompleted, index, url);
        }
        if (CLIQZ.Core.urlbar.value.length > 0)
            CliqzUtils.track(action);

        CLIQZ.Core.triggerLastQ = true;
        return false;
    }
    CliqzUtils.track(action);
    return true;
}

function enginesClick(ev){
    var engineName;
    if(engineName = ev && ev.target && ev.target.getAttribute('engine')){
        var engine;
        if(engine = Services.search.getEngineByName(engineName)){
            var urlbar = CLIQZ.Core.urlbar,
                userInput = urlbar.value;

            // avoid autocompleted urls
            if(urlbar.selectionStart &&
               urlbar.selectionEnd &&
               urlbar.selectionStart != urlbar.selectionEnd){
                userInput = userInput.slice(0, urlbar.selectionStart);
            }

            var url = engine.getSubmission(userInput).uri.spec,
                action = {
                    type: 'activity',
                    action: 'visual_hash_tag',
                    engine: ev.target.getAttribute('engineCode') || -1
                };

            if(ev.metaKey || ev.ctrlKey){
                CLIQZ.Core.openLink(url, true);
                action.new_tab = true;
            } else {
                gBrowser.selectedBrowser.contentDocument.location = url;
                CLIQZ.Core.popup.closePopup();
                action.new_tab = false;
            }

            CliqzUtils.track(action);
        }
    }
}

function trackArrowNavigation(el){
    var action = {
        type: 'activity',
        action: 'arrow_key',
        current_position: el ? el.getAttribute('idx') : -1,
    };
    if(el){
        action.position_type = CliqzUtils.encodeResultType(el.getAttribute('type'));
        action.search = CliqzUtils.isSearch(el.getAttribute('url'));
    }
    CliqzUtils.track(action);
}
var AGO_CEILINGS=[
    [0            , '',                , 1],
    [120          , 'ago1Minute' , 1],
    [3600         , 'agoXMinutes'   , 60],
    [7200         , 'ago1Hour' , 1],
    [86400        , 'agoXHours'   , 3600],
    [172800       , 'agoYesterday'          , 1],
    [604800       , 'agoXDays'     , 86400],
    [4838400      , 'ago1Month'  , 1],
    [29030400     , 'agoXMonths'   , 2419200],
    [58060800     , 'ago1year'   , 1],
    [2903040000   , 'agoXYears'     , 29030400],
];
function registerHelpers(){
    Handlebars.registerHelper('partial', function(name, options) {
        var template = UI.tpl[name] || UI.tpl.empty;
        return new Handlebars.SafeString(template(this));
    });

    Handlebars.registerHelper('agoline', function(ts, options) {
        if(!ts) return '';
        var now = (new Date().getTime() / 1000),
            seconds = parseInt(now - ts),
            i=0, slot;

        while (slot = AGO_CEILINGS[i++])
            if (seconds < slot[0])
                return CliqzUtils.getLocalizedString(slot[1]).replace('{}', parseInt(seconds / slot[2]))
        return '';
    });

    Handlebars.registerHelper('generate_logo', function(url, options) {
        return generateLogoClass(CliqzUtils.getDetailsFromUrl(url));
    });

    Handlebars.registerHelper('shopping_stars_width', function(rating) {
        return rating * 14;
    });

    Handlebars.registerHelper('even', function(value, options) {
        if (value%2) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    Handlebars.registerHelper('local', function(key, v1, v2 ) {
        return CliqzUtils.getLocalizedString(key).replace('{}', v1).replace('{}', v2);
    });

    Handlebars.registerHelper('json', function(value, options) {
        return JSON.stringify(value);
    });

    Handlebars.registerHelper('emphasis', function(text, q, minQueryLength, cleanControlChars) {
        if(!text || !q || q.length < (minQueryLength || 2)) return text;


        // lucian: questionable solution performance wise
        // strip out all the control chars
        // eg :text = "... \u001a"
        if(cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ')

        var map = Array(text.length),
            tokens = q.toLowerCase().split(/\s+/),
            lowerText = text.toLowerCase(),
            out, high = false;

        tokens.forEach(function(token){
            var poz = lowerText.indexOf(token);
            while(poz !== -1){
                for(var i=poz; i<poz+token.length; i++)
                    map[i] = true;
                poz = lowerText.indexOf(token, poz+1);
            }
        });
        out=[];
        var current = ''
        for(var i=0; i<text.length; i++){
            if(map[i] && !high){
                out.push(current);
                current='';
                current += text[i];
                high = true;
            }
            else if(!map[i] && high){
                out.push(current);
                current='';
                current +=text[i];
                high = false;
            }
            else current += text[i];
        }
        out.push(current);

        return new Handlebars.SafeString(UI.tpl.emphasis(out));
    });

    Handlebars.registerHelper('suggestionEmphasis', function(text, q) {
        if(!text || !q ) return text;

        if(text.indexOf(q) == 0){
            var out = [q, text.substr(q.length)]
            return new Handlebars.SafeString(UI.tpl.emphasis(out));
        } else return text
    });

    Handlebars.registerHelper('video_provider', function(host) {
        if(host.indexOf('youtube') === 0)
          return "YouTube";
    });

    Handlebars.registerHelper('hasimage', function(image) {
        if(image && image.src &&
            !(image.src.indexOf('xing') !== -1 && image.src.indexOf('nobody_') !==-1))
            return true;
        else
            return false
    });

    Handlebars.registerHelper('video_views', function(views) {
        if(views > 1e8)
          return "100mio";
        if(views > 1e7)
          return "10mio";
        if(views > 1e6)
          return "1mio";
        return false;
    });

    Handlebars.registerHelper('date', function(date) {
        var d = new Date(date);
        var date = d.getDate();
        var month = d.getMonth();
        month++;
        var year = d.getFullYear();
        var formatedDate = date + '/' + month + '/' + year;
        return formatedDate;
    });

    Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        return {
            "+": lvalue + rvalue,
            "-": lvalue - rvalue,
            "*": lvalue * rvalue,
            "/": lvalue / rvalue,
            "%": lvalue % rvalue
        }[operator];
    });

    Handlebars.registerHelper('twitter_image_id', function(title) {
        // Because we have different colored twitter images we want to "randomly"
        // match them with users that don't have a picture
        var random = 0;
        for (var i = 0; i < title.length; i++) {
          random += title.charCodeAt(i);
        }
        return random % 7 // We have only 0 - 6 images

    });

    Handlebars.registerHelper('is_twitter', function(url) {
        var twitter_url_regex = /^https?:\/\/twitter\.com/;
        if(url.match(twitter_url_regex))
          return true;
        else
          return false;
    });

    Handlebars.registerHelper('is_facebook', function(url) {
        var twitter_url_regex = /^https?:\/\/(www\.)?facebook\.com/;
        if(url.match(twitter_url_regex))
          return true;
        else
          return false;
    });

    Handlebars.registerHelper('is_xing', function(url) {
        var twitter_url_regex = /^https?:\/\/(www\.)?xing\.com/;
        if(url.match(twitter_url_regex))
          return true;
        else
          return false;
    });

    Handlebars.registerHelper('reduce_width', function(width, reduction) {
        return width - reduction;
    });
}

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);
