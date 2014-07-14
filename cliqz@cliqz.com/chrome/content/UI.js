'use strict';

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions'],
    PARTIALS = ['generic', 'weather'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {},
    IC = 'cliqz-result-item-box', // result item class
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    UP = 38,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN],
    IMAGE_HEIGHT = 54,
    IMAGE_WIDTH = 96
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

function constructImage(data){
    if (data && data.image) {
        var height = IMAGE_HEIGHT,
            img = data.image;
        var ratio = 0;

        switch((data.richData && data.richData.type) || data.type){
            case 'news': //fallthrough
            case 'shopping': //fallthrough
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
                image.text = CliqzUtils.getLocalizedString('arrow') + img.duration;
            }

            image.width = image.width || IMAGE_WIDTH;

            return image
        }
    }
    return null;
}

function generateType(type){
    if(type === 'cliqz-weather') return 'weather';
    return 'generic';

}

function enhanceResults(res){
    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = generateLogoClass(r.urlDetails);
        r.image = constructImage(r.data);
        r.width = res.width - (r.image && r.image.src ? r.image.width + 10 : 0);

        r['partial-' +generateType(r.type)] = true;
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

function suggestionNavigation(ev){
    var suggestions = gCliqzBox.suggestionBox.children,
        SEL = ' cliqz-suggestion-default',
            found = false,
            action = {
                type: 'activity',
                action: 'tab_key',
                current_position : -1
            };

        for(var i =0; i < suggestions.length && !found; i++){
            var s = suggestions[i];

            if(s.className && s.className.indexOf('cliqz-suggestion') != -1 && s.className.indexOf(SEL) != -1){
                s.className = s.className.replace(SEL, '');

                if(i <= suggestions.length - 1){ //not last one
                    if(!ev.shiftKey){ // loop right
                        for(var j=i+1; j < suggestions.length; j++){
                            if(suggestions[j] && suggestions[j].className && suggestions[j].className.indexOf('cliqz-suggestion') != -1){
                                suggestions[j].className += SEL;
                                action.current_position = j;
                                break;
                            }
                        }
                    } else { // loop left
                        for(var j=i-1; j >=0 ; j--){
                            if(suggestions[j] && suggestions[j].className && suggestions[j].className.indexOf('cliqz-suggestion') != -1){
                                suggestions[j].className += SEL;
                                action.current_position = j;
                                break;
                            }
                        }
                    }

                    found = true;
                }
            }
        }
        if(!found){ // none selected
            var position = ev.shiftKey ? suggestions.length-1 : 0;
            suggestions[position].className += ' cliqz-suggestion-default';
            action.current_position = position;
        }
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
                current_position: ev.target.position || ev.target.parentNode.position || -1,
            };

            CliqzUtils.track(action);
        }
    }
}

function onEnter(ev, item){
    //sel && openUILink(sel.getAttribute('url'));
    var index = item ? item.getAttribute('idx'): -1,
        inputValue = CLIQZ.Core.urlbar.value,
        action = {
            type: 'activity',
            action: 'result_enter',
            current_position: index,
            search: false
        };

    if(index != -1){
        action.position_type = CliqzUtils.encodeResultType(item.getAttribute('type'))
        action.search = CliqzUtils.isSearch(item.getAttribute('url'));
        openUILink(item.getAttribute('url'));
    } else { //enter while on urlbar and no result selected
        // update the urlbar if a suggestion is selected
        var suggestions = gCliqzBox.suggestionBox.children,
            SEL = ' cliqz-suggestion-default';

        for(var i=0; i < suggestions.length; i++){
            var s = suggestions[i];

            if(s.className && s.className.indexOf('cliqz-suggestion') != -1 && s.className.indexOf(SEL) != -1){
                CLIQZ.Core.urlbar.mInputField.setUserInput(s.getAttribute('val'));
            }
        }


        if(CliqzUtils.isUrl(inputValue)){
            action.position_type = 'inbar_url';
            action.search = CliqzUtils.isSearch(inputValue);
        }
        else action.position_type = 'inbar_query';
        action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;
        if(action.autocompleted){
            var first = popup.richlistbox.children[0],
                firstUrl = first.getAttribute('url');

            action.source = CliqzUtils.encodeResultType(first.getAttribute('type'));

            if(firstUrl.indexOf(inputValue) != -1){
                CLIQZ.Core.urlbar.value = firstUrl;
            }
        } else {
            var customQuery = ResultProviders.isCustomQuery(inputValue);
            if(customQuery){
                CLIQZ.Core.urlbar.value = customQuery.queryURI;
            }
        }

        return false
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

var UI = {
    tpl: {},
    init: function(){
        TEMPLATES.forEach(function(tpl){
            CliqzUtils.httpGet(TEMPLATES_PATH + tpl + '.tpl', function(res){
                UI.tpl[tpl] = Handlebars.compile(res.response);
            });
        });
        PARTIALS.forEach(function(tpl){
            CliqzUtils.httpGet(TEMPLATES_PATH + tpl + '.tpl', function(res){
                Handlebars.registerPartial(tpl,res.response);
            });
        });
    },
    main: function(box){
        gCliqzBox = box;
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
    },
    results: function(res){
        var enhanced = enhanceResults(res);
        gCliqzBox.messageBox.textContent = 'Top ' + enhanced.results.length + ' Ergebnisse'
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
                return true;
            break;
            case DOWN:
                if(sel != gCliqzBox.resultsBox.lastElementChild){
                    var nextEl = sel && sel.nextElementSibling;
                    nextEl = nextEl || gCliqzBox.resultsBox.firstElementChild;
                    setResultSelection(nextEl, true, false);
                }
                return true;
            break;
            case ENTER:
                return onEnter(ev, sel);
            break;
            case TAB:
                suggestionNavigation(ev);
                return true;
            break;
        }


    }
}

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);