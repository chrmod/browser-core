'use strict';

(function(ctx) {

var TEMPLATES = ['main', 'results', 'suggestions', 'emphasis', 'generic', 'custom', 'f1'],
    VERTICALS = {
        'w': 'weather' ,
        's': 'shopping',
        'g': 'gaming'  ,
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        'q': 'qaa'
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
    IMAGE_WIDTH = 96,
    STATIC_RESULTS = [
        [/(^f1|^form)/i, 'f1', f1_counter, 1406458800]
    ]
    ;

var f1_counter_to;
function f1_counter(end){
    var countdownBox;
    if(countdownBox = $('#cliqz-f1-countdown', gCliqzBox)){
        var now = (new Date().getTime() / 1000),
            seconds = parseInt(end - now);

        if(seconds > 0){
            var hours = parseInt(seconds/3600),
                minutes = parseInt(seconds/60)%60,
                seconds = seconds%60;

            if(hours > 72) return;

            $('#cliqz-f1-unit-h2', countdownBox).innerHTML = hours%10;
            $('#cliqz-f1-unit-h1', countdownBox).innerHTML = parseInt(hours/10);
            $('#cliqz-f1-unit-m2', countdownBox).innerHTML = minutes%10;
            $('#cliqz-f1-unit-m1', countdownBox).innerHTML = parseInt(minutes/10);
            $('#cliqz-f1-unit-s2', countdownBox).innerHTML = seconds%10;
            $('#cliqz-f1-unit-s1', countdownBox).innerHTML = parseInt(seconds/10);

            clearTimeout(f1_counter_to);
            f1_counter_to = setTimeout(f1_counter, 1000, end);
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
        var enhanced = enhanceResults(res);
        gCliqzBox.messageBox.textContent = 'Top ' + enhanced.results.length + ' Ergebnisse'
        gCliqzBox.resultsBox.innerHTML = UI.tpl.results(enhanced);
    },
    suggestions: function(suggestions, q){
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

    footer.addEventListener('mousedown', function(e){
        if(e.target != footer)return;
        start = e.pageY;
        document.addEventListener('mousemove',moveIT)
    });
    document.addEventListener('mouseup', function(){
        height = 36 + +box.resultsBox.style.maxHeight.replace('px','')
        CliqzUtils.setPref('popupHeight', height);
        document.removeEventListener('mousemove', moveIT);
    });


}

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
    if(type === 'cliqz-weather') return 'weather';
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

        r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
        r.logo = generateLogoClass(r.urlDetails);
        r.image = constructImage(r.data);
        r.width = res.width - (r.image && r.image.src ? r.image.width + 14 : 0);
        r.vertical = getPartial(r.type);
    }
    STATIC_RESULTS.forEach(function(s){
        if(res.width > 750 && s[0].test(res.q)){

            //valid static result
            var now = (new Date().getTime() / 1000),
                seconds = parseInt(s[3] - now),
                hours = parseInt(seconds/3600);

            if(seconds < 0 || hours > 72) return;

            res.results.unshift({
                vertical: s[1],
                url:''
            });

            setTimeout(s[2], 500, s[3]);
        }
    });
    return res;
}


function resultClick(ev){
    var el = ev.target,
        newTab = ev.metaKey ||
                 ev.ctrlKey ||
                 (ev.target.getAttribute('newtab') || false);

    while (el){
        if(el.getAttribute('url')){
            var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url'));
            var action = {
                type: 'activity',
                action: 'result_click',
                new_tab: newTab,
                current_position: el.getAttribute('idx'),
                query_length: CLIQZ.Core.urlbar.value.length,
                inner_link: el.className != IC, //link inside the result or the actual result
                position_type: CliqzUtils.encodeResultType(el.getAttribute('type')),
                search: CliqzUtils.isSearch(url)
            };

            CliqzUtils.track(action);

            CliqzUtils.trackResult(el.getAttribute('idx'));

            if(newTab) gBrowser.addTab(url);
            else openUILink(url);
            break;
        }
        if(el.className == IC) break; //do not go higher than a result
        el = el.parentElement;
    }
}

function hashCode(s){
    return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
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
        action = {
            type: 'activity',
            action: 'result_enter',
            current_position: index,
            query_length: inputValue.length,
            search: false
        };

    if(popupOpen && index != -1){
        action.position_type = CliqzUtils.encodeResultType(item.getAttribute('type'))
        action.search = CliqzUtils.isSearch(item.getAttribute('url'));
        openUILink(item.getAttribute('url'));

        CliqzUtils.trackResult(index);
    } else { //enter while on urlbar and no result selected
        // update the urlbar if a suggestion is selected
        var suggestion = $('.cliqz-suggestion[selected="true"]', gCliqzBox.suggestionBox);

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


        if(CliqzUtils.isUrl(inputValue)){
            action.position_type = 'inbar_url';
            action.search = CliqzUtils.isSearch(inputValue);
        }
        else action.position_type = 'inbar_query';
        action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;
        if(action.autocompleted){
            var first = gCliqzBox.resultsBox.children[0],
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
        CliqzUtils.trackResult(index);
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
        return new Handlebars.SafeString(UI.tpl[name](this));
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

        /* one string version
        out = '';
        for(var i=0; i<text.length; i++){
            if(map[i] && !high){
                out += '<em>'+text[i];
                high = true;
            }
            else if(!map[i] && high){
                out += '</em>'+text[i];
                high = false;
            }
            else out += text[i];
        }
        if(high)out += '</em>';
        console.log(new Handlebars.SafeString(out));


        return out.split(/<em>|<\/em>/);
        */
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

ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);
