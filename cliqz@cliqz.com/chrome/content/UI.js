'use strict';

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions', 'emphasis', 'empty', 'generic', 'custom', 'clustering', 'series', 'oktoberfest'],
    VERTICALS = {
        'b': 'bundesliga',
        'w': 'weather' ,
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
        //try to update reference if it doesnt exist
        if(!gCliqzBox.messageBox)
            gCliqzBox.messageBox = document.getElementById('cliqz-navigation-message');

        if(gCliqzBox.messageBox)
            gCliqzBox.messageBox.textContent = 'Top ' + enhanced.results.length + ' Ergebnisse';

        //try to recreate main container if it doesnt exist
        if(!gCliqzBox.resultsBox){
            var cliqzBox = CLIQZ.Core.popup.cliqzBox;
            if(cliqzBox){
                UI.main(cliqzBox);
            }
        }
        if(gCliqzBox.resultsBox)
            gCliqzBox.resultsBox.innerHTML = UI.tpl.results(enhanced);
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
            break;
        }


    }
};

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

function getPartial(type){
    if(type === 'cliqz-bundesliga') return 'bundesliga';
    if(type === 'cliqz-weather') return 'weather';
    if(type === 'cliqz-cluster') return 'clustering';
    if(type === 'cliqz-series') return 'series';
    if(type.indexOf('cliqz-custom sources-') === 0) return 'custom';
    if(type.indexOf('cliqz-results sources-') == 0){
        // type format: cliqz-results sources-XXXX
        // XXXX -  are the verticals which provided the result
        type = type.substr(22);

        while(type && !VERTICALS[type[0]])type = type.substr(1);

        return VERTICALS[type[0]] || 'generic';
    }
    return 'generic';
}

function enhanceResults(res){
    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];
        if(r.type == 'cliqz-extra'){
            var d = r.data;
            if(d){
                if(d.template && TEMPLATES.indexOf(d.template) != -1){
                    r.vertical = d.template;
                }
            }
        } else {
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = generateLogoClass(r.urlDetails);
            r.image = constructImage(r.data);
            r.width = res.width - (r.image && r.image.src ? r.image.width + 14 : 0);
            r.vertical = getPartial(r.type);
        }
    }
    //prioritize extra (fun-vertical) results
    var first = res.results.filter(function(r){ return r.type === "cliqz-extra"; });
    var last = res.results.filter(function(r){ return r.type !== "cliqz-extra"; });
    res.results = first.concat(last);
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
                    clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false
                };

            if (action.position_type == 'C' && CliqzUtils.getPref("logCluster", false)) {
                action.Ctype = CliqzUtils.getClusteringDomain(url)
            }
            CliqzUtils.track(action);

            if(newTab) gBrowser.addTab(url);
            else {
                openUILink(url);
                CLIQZ.Core.popup.hidePopup()
            }
            break;
        } else if (el.getAttribute('cliqz-action')) {
            /*
             * Hides the current element and displays one of its siblings that
             * was specified in the toggle-with attribute.
             */
            if (el.getAttribute('cliqz-action') == 'toggle') {
                var hideAttr = el.getAttribute('toggle-hide');
                var showAttr = el.getAttribute('toggle-show');
                var context = el.getAttribute('toggle-context');
                var ancestor = closest(el, '.' + context);
                if (hideAttr && showAttr && context) {
                    var toHide = $$("[" + hideAttr + "]", ancestor);
                    for (var i = 0; i < toHide.length; i++) {
                        toHide[i].style.display = "none";
                    }
                    var toShow = $$("[" + showAttr + "]", ancestor);
                    for (var i = 0; i < toShow.length; i++) {
                        toShow[i].style.display = "block";
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
        action = {
            type: 'activity',
            action: 'result_enter',
            current_position: index,
            query_length: CliqzAutocomplete.lastSearch.length,
            search: false,
            has_image: item && item.getAttribute('hasimage') || false,
            clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false
        };

    if(popupOpen && index != -1){
        var url = CliqzUtils.cleanMozillaActions(item.getAttribute('url'));
        action.position_type = CliqzUtils.encodeResultType(item.getAttribute('type'))
        action.search = CliqzUtils.isSearch(url);
        if (action.position_type == 'C' && CliqzUtils.getPref("logCluster", false)) { // if this is a clustering result, we track the clustering domain
            action.Ctype = CliqzUtils.getClusteringDomain(url)
        }
        openUILink(url);


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
                CLIQZ.Core.urlbar.value = firstUrl;
            }
        } else {
            var customQuery = ResultProviders.isCustomQuery(inputValue);
            if(customQuery){
                CLIQZ.Core.urlbar.value = customQuery.queryURI;
            }
            else { // not autocomplete, not custom query

                // run A-B test if present
                if (CliqzUtils.getPref("historyExperiment")) {
                    //var testQueries = ['bitcoin', 'futurama', 'barcelona',
                                       //'ghost in the shell',
                                       //'bitcoin value', 'firefox browser',
                                       //'javascript array',
                                       //'bootstrap css',
                                       //'haskell', 'duct tape for engineers',
                                       //'python emr',
                                       //'ruby array', 'tapas madrid',
                                       //];
                    ////start test loop
                    //for (var jj = 0; jj < testQueries.length; jj++) {
                        //inputValue = testQueries[jj];
                    if (!CliqzHistoryManager.historyModel) {
                        CliqzHistoryManager.getHistoryModel(function(model) {
                            CliqzHistoryManager.historyModel = model;
                            runHistoryExperiment(inputValue);
                        });
                    }
                    else {
                        runHistoryExperiment(inputValue);
                    }
                    //} // end test loop

                } // end A-B test if
            }
        }
        CliqzUtils.track(action);

        //CLIQZ.Core.popup.closePopup();
        //gBrowser.selectedBrowser.contentDocument.location = 'chrome://cliqz/content/cliqz.html';
        //return true;
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
                gBrowser.addTab(url);
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
    [120          , 'vor einer Minute' , 1],
    [3600         , 'vor %d Minuten'   , 60],
    [7200         , 'vor einer Stunde' , 1],
    [86400        , 'vor %d Stunden'   , 3600],
    [172800       , 'gestern'          , 1],
    [604800       , 'vor %d Tagen'     , 86400],
    [4838400      , 'vor einem Monat'  , 1],
    [29030400     , 'vor %d Monaten'   , 2419200],
    [58060800     , 'vor einem Jahr'   , 1],
    [2903040000   , 'vor %d Jaren'     , 29030400],
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
                return slot[1].replace('%d', parseInt(seconds / slot[2]))
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
}

function runHistoryExperiment(inputValue) {
    setTimeout(
        function(inputValue) { 

            // reorder the given suggestions by their similarity to the corpus
            function reorder(sugs) {
                var scores = [];
                for (var i = 0; i < sugs.length; i++) {
                    var sc = CliqzHistoryManager.historyModel.similarity(sugs[i].value);
                    scores.push({score: sc, value: sugs[i].value});
                }
                // sort in reverse
                scores.sort(function(a, b) {return b.score - a.score});
                var reordered = [];
                for (var i = 0; i < scores.length; i++) {
                    //CliqzUtils.log(scores[i].score + " " + scores[i].value);
                    reordered.push(scores[i]);
                }
                return reordered;
            };

            var results = {};
            function suggesterCallback(req) {
                var sugs = JSON.parse(req.response);
                var s1_pos = -1,
                    s2_pos = -1;
                for (var i = 0; i < sugs.length; i++) {
                    if (sugs[i].value == inputValue) {
                        s1_pos = i;
                    }
                }
                var reordered = reorder(sugs),
                    maxScore = 0.0;
                for (var i = 0; i < reordered.length; i++) {
                    if (reordered[i].value == inputValue) {
                        s2_pos = i;
                    }
                    maxScore = Math.max(maxScore, reordered[i].score);
                }

                results[qkey] = {s1: s1_pos, s2: s2_pos, max: maxScore};
                if (Object.keys(results).length == 4) {
                    var qAction = {
                        type: 'experiments-v1',
                        qlen: inputValue.length,
                        qwords: inputValue.split(/\s+/).length,
                        action: {
                            'q3': results['q3'],
                            'q5': results['q5'],
                            'qw': results['qw'],
                            'ql': results['ql'],
                        }
                    };
                    CliqzUtils.track(qAction);
                }
            };
            // take first 3 chars
            var cliqzQuery3 = inputValue.substring(0, 3);
            var cliqzQuery5 = inputValue.substring(0, 5);
            var cliqzQueryW = inputValue.lastIndexOf(' ') == -1 ?
                inputValue : inputValue.substring(0, inputValue.indexOf(' '));
            var cliqzQueryL = inputValue.lastIndexOf(' ') == -1 ?
                inputValue.substring(0, 1) : inputValue.substring(0, inputValue.lastIndexOf(' ')+2);
            var suggesterUrl = "http://54.90.135.180/api/suggestions?q=";
            var qkey = '', qq = '';
            CliqzUtils.httpGet(suggesterUrl + cliqzQuery3,
                function (req) { qkey = 'q3', qq = cliqzQuery3; suggesterCallback(req); },
                function() { CliqzUtils.log("Suggester error!"); });
            CliqzUtils.httpGet(suggesterUrl + cliqzQuery5,
                function (req) { qkey = 'q5', qq = cliqzQuery5; suggesterCallback(req); },
                function() { CliqzUtils.log("Suggester error!"); });
            CliqzUtils.httpGet(suggesterUrl + cliqzQueryW,
                function (req) { qkey = 'qw', qq = cliqzQueryW; suggesterCallback(req); },
                function() { CliqzUtils.log("Suggester error!"); });
            CliqzUtils.httpGet(suggesterUrl + cliqzQueryL,
                function (req) { qkey = 'ql', qq = cliqzQueryL; suggesterCallback(req); },
                function() { CliqzUtils.log("Suggester error!"); });

        },
    0, inputValue);
}

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);
