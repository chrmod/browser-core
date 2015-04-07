'use strict';
/*
 * This is the module which creates the UI for the results
 *   - uses handlebars templates
 *   - attaches all the needed listners (keyboard/mouse)
 */

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistory',
  'chrome://cliqzmodules/content/CliqzHistory.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryPattern',
  'chrome://cliqzmodules/content/CliqzHistoryPattern.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm');

//XPCOMUtils.defineLazyModuleGetter(this, 'CliqzImages',
//  'chrome://cliqzmodules/content/CliqzImages.jsm');

(function(ctx) {


var TEMPLATES = CliqzUtils.TEMPLATES, //temporary
    MESSAGE_TEMPLATES = ['adult', 'footer-message'],
    VERTICALS = {
        //'s': 'shopping',
        //'g': 'gaming'  ,
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        //'q': 'qaa'     ,
        //'k': 'science' ,
        //'l': 'dictionary'
    },
    PARTIALS = ['url', 'logo', 'EZ-category', 'EZ-history', 'feedback'],
    TEMPLATES_PATH = 'chrome://cliqz/content/templates/',
    tpl = {},
    IC = 'cqz-result-box', // result item class
    gCliqzBox = null,
    TAB = 9,
    ENTER = 13,
    LEFT = 37,
    UP = 38,
    RIGHT = 39,
    DOWN = 40,
    KEYS = [TAB, ENTER, UP, DOWN],
    IMAGE_HEIGHT = 64,
    IMAGE_WIDTH = 114,
    DEL = 46,
    BACKSPACE = 8,
    currentResults,
    adultMessage = 0 //0 - show, 1 - temp allow, 2 - temp dissalow
    ;

function lg(msg){
    CliqzUtils.log(msg, 'CLIQZ.UI');
}

function fetchTemplate(tName, isPartial) {
    try {
        CliqzUtils.httpGet(TEMPLATES_PATH + tName + '.tpl', function(res){
            if(isPartial === true)
                Handlebars.registerPartial(tName, res.response);
            else
                UI.tpl[tName] = Handlebars.compile(res.response);
        });
    } catch(e){
        lg('ERROR loading template ' + tName);
    }
}

var UI = {
    tpl: {},
    showDebug: false,
    preventFirstElementHighlight: false,
    lastInputTime: 0,
    lastInput: "",
    lastSelectedUrl: null,
    mouseOver: false,
    init: function(){
        //patch this method to avoid any caching FF might do for components.xml
        CLIQZ.Core.popup._appendCurrentResult = function(){
            if(CLIQZ.Core.popup._matchCount > 0 && CLIQZ.Core.popup.mInput){
              CLIQZ.UI.handleResults();
            }
        }

        Object.keys(TEMPLATES).forEach(fetchTemplate);
        MESSAGE_TEMPLATES.forEach(fetchTemplate);
        PARTIALS.forEach(function(tName){ fetchTemplate(tName, true); });

        registerHelpers();

        UI.showDebug = CliqzUtils.getPref('showQueryDebug', false);
    },
    main: function(box){
        gCliqzBox = box;

        //check if loading is done
        if(!UI.tpl.main)return;

        box.innerHTML = UI.tpl.main();

        var resultsBox = document.getElementById('cliqz-results',box);
        var messageContainer = document.getElementById('cliqz-message-container');


        resultsBox.addEventListener('mouseup', resultClick);
        resultsBox.addEventListener('mouseout', function(){
            XULBrowserWindow.updateStatusField();
        });
        messageContainer.addEventListener('mouseup', messageClick);
        gCliqzBox.messageContainer = messageContainer;
        resultsBox.addEventListener('scroll', resultScroll);

        box.addEventListener('mousemove', resultMove);
        gCliqzBox.resultsBox = resultsBox;


        handlePopupHeight(box);
    },
    handleResults: function(){
      var popup = CLIQZ.Core.urlbar.popup,
        data = [],
        ctrl = popup.mInput.controller,
        q = ctrl.searchString.replace(/^\s+/, '').replace(/\s+$/, ''),
        lastRes = CliqzAutocomplete.lastResult;

      //popup.style.height = "302px";

      for(var i=0; i<popup._matchCount; i++) {
          data.push({
            title: ctrl.getCommentAt(i),
            url: unEscapeUrl(ctrl.getValueAt(i)),
            type: ctrl.getStyleAt(i),
            text: q,
            data: lastRes && lastRes.getDataAt(i),
          });
      }

      var currentResults = CLIQZ.UI.results({
        q: q,
        results: data,
        isInstant: lastRes && lastRes.isInstant
      });

      var curResAll = currentResults.results
      if(curResAll && curResAll.length > 0 && !curResAll[0].url && curResAll[0].type == "cliqz-pattern")
        curResAll[0].url = curResAll[0].data.urls[0].href;

      if(curResAll && curResAll.length > 0 && curResAll[0].url)
        CLIQZ.Core.autocompleteQuery(CliqzUtils.cleanMozillaActions(curResAll[0].url), curResAll[0].title);

      XULBrowserWindow.updateStatusField();
    },
    results: function(res){
        if (!gCliqzBox)
            return;

        //try to recreate main container if it doesnt exist
        if(!gCliqzBox.resultsBox){
            var cliqzBox = CLIQZ.Core.popup.cliqzBox;
            if(cliqzBox){
                UI.main(cliqzBox);
            }
        }

        currentResults = enhanceResults(res);
        // Images-layout for Cliqz-Images-Search
        //CliqzImages.process_images_result(res,
        //   CliqzImages.IM_SEARCH_CONF.CELL_HEIGHT-CliqzImages.IM_SEARCH_CONF.MARGIN,
        //                                  CLIQZ.Core.urlbar.clientWidth  - (CliqzUtils.isWindows(window)?20:15));


        if(gCliqzBox.resultsBox) {
            var now = Date.now();
            UI.lastDispatch = now;
            UI.dispatchRedraw(UI.tpl.results(currentResults), now, res.q);
          }

        //might be unset at the first open
        CLIQZ.Core.popup.mPopupOpen = true;

        var width = Math.max(CLIQZ.Core.urlbar.clientWidth,500)

        // set the width
        gCliqzBox.style.width = width + 1 + "px"
        gCliqzBox.resultsBox.style.width = width + (CliqzUtils.isWindows(CliqzUtils.getWindow())?-1:1) + "px"

        // try to find and hide misaligned elemets - eg - weather
        setTimeout(function(){ hideMisalignedElements(gCliqzBox.resultsBox); }, 0);

        // find out if scrolling is possible
        CliqzAutocomplete.resultsOverflowHeight =
            gCliqzBox.resultsBox.scrollHeight - gCliqzBox.resultsBox.clientHeight;

        return currentResults;
    },
    nextRedraw: 0,
    lastDispatch: 0,
    dispatchRedraw: function(html, id, q) {
      var now = Date.now();
      if(id < UI.lastDispatch) return;
      if(now < UI.nextRedraw) {
        setTimeout(UI.dispatchRedraw, 100, html, id, q);
      } else {
        UI.redrawResultHTML(html, q);
      }
    },
    lastInstantLength: 0,
    lastQuery: "",
    redrawResultHTML: function(newHTML, query) {
      var box = gCliqzBox.resultsBox;

      if(query && query.indexOf(UI.lastQuery) == -1) box.innerHTML = "";
      if(query) UI.lastQuery = query;

      var oldBox = box.cloneNode(true);
      var newBox = box.cloneNode(true);
      newBox.innerHTML = newHTML;

      // Extract old/new results
      var oldResults = oldBox.getElementsByClassName("cqz-result-box");
      var newResults = newBox.getElementsByClassName("cqz-result-box");

      if (CliqzAutocomplete.lastResultIsInstant) UI.lastInstantLength = newResults.length;
      // Process Instant Results
      if (CliqzAutocomplete.lastResultIsInstant && newResults.length <= oldResults.length) {
        for(var i=0; i<newResults.length; i++) {
          var oldChild = oldResults[i];
          var curUrls = UI.extractResultUrls(oldChild.innerHTML);
          var newUrls = newResults[i] ? UI.extractResultUrls(newResults[i].innerHTML) : null;
          if(!UI.urlListsEqual(curUrls, newUrls)) {
            box.replaceChild(newResults[i], box.children[i]);
          }
        }
        if(CliqzAutocomplete.highlightFirstElement) UI.selectFirstElement();
        return;
      }


      var max = oldResults.length > newResults.length ? oldResults.length : newResults.length;
      box.innerHTML = newHTML;
      newResults = box.getElementsByClassName("cqz-result-box");

      // Result animation
      var delay = 0;
      for(var i=UI.lastInstantLength; i<max; i++) {
        var oldRes = oldResults[i];
        var newRes = newResults[i];
        if(i != 0 && !oldRes && newRes && newRes.getAttribute("type").indexOf("cliqz-pattern") == -1) {
          //newRes.style.left = "-500px";
          newRes.style.opacity = 0;
          setTimeout(function(r){r.className += " fadeIn"}, delay, newRes);
          delay += 100;
        }
      }
      var t = Date.now() + delay + (delay>0?700:0);
      if(t > UI.nextRedraw) UI.nextRedraw = t;
      if(CliqzAutocomplete.highlightFirstElement) UI.selectFirstElement();
    },
    // Returns a concatenated string of all urls in a result list
    extractResultUrls: function(str) {
      return str.match(/((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi);
    },
    urlListsEqual: function(a, b) {
      var s, l, m;
      if(a.length > b.length) {
        s = b;
        l = a;
      } else {
        s = a;
        l = b;
      }
      for(var i=0; i<s.length; i++) {
        if (l.indexOf(s[i]) == -1) return false;
      }
      return true;
    },
    // redraws a result
    // usage: redrawResult('[type="cliqz-cluster"]', 'clustering', {url:...}
    redrawResult: function(filter, template, data){
        var result;
        if(result =$('.' + IC + filter, gCliqzBox))
            result.innerHTML = UI.tpl[template](data);
    },
    keyDown: function(ev){
        var sel = getResultSelection(),
            //allArrowable should be cached
            allArrowable = Array.prototype.slice.call($$('[arrow]', gCliqzBox));

        allArrowable = allArrowable.filter(function(el){
            if(!el.getAttribute('arrow-if-visible')) return true;

            // check if the element is visible
            //
            // for now this check is enough but we might be forced to switch to a
            // more generic approach - maybe using document.elementFromPoint(x, y)
            if(el.offsetLeft + el.offsetWidth > el.parentElement.offsetWidth)
                return false
            return true;
        });

        var pos = allArrowable.indexOf(sel);

        UI.lastInputTime = (new Date()).getTime()
        if(UI.popupClosed) {
          gCliqzBox.resultsBox.innerHTML = "";
          UI.popupClosed = false;
        }
        switch(ev.keyCode) {
            case TAB:
                if (!CLIQZ.Core.popup.mPopupOpen) return false;
                // move up if SHIFT key is held down
                if (ev.shiftKey) {
                    selectPrevResult(pos, allArrowable);
                } else {
                    selectNextResult(pos, allArrowable);
                }
                return true;
            case UP:
                selectPrevResult(pos, allArrowable);
                return true;
            break;
            case DOWN:
                selectNextResult(pos, allArrowable);
                return true;
            break;
            case ENTER:
                UI.lastInput = "";
                return onEnter(ev, sel);
            break;
            case RIGHT:
            case LEFT:
                var urlbar = CLIQZ.Core.urlbar;
                var selection = UI.getSelectionRange(ev.keyCode, urlbar.selectionStart, urlbar.selectionEnd, ev.shiftKey, ev.altKey, ev.ctrlKey | ev.metaKey);
                urlbar.setSelectionRange(selection.selectionStart, selection.selectionEnd);

                if (CliqzAutocomplete.spellCorr.on) {
                    CliqzAutocomplete.spellCorr.override = true
                }

                return true;
            case KeyEvent.DOM_VK_HOME:
                // set the caret at the beginning of the text box
                ev.originalTarget.setSelectionRange(0, 0);
                // return true to prevent the default action
                // on linux the default action will autocomplete to the url of the first result
                return true;
            case BACKSPACE:
            case DEL:
                UI.lastInput = "";
                if (CliqzAutocomplete.spellCorr.on && CliqzAutocomplete.lastSuggestions) {
                    CliqzAutocomplete.spellCorr.override = true
                    // correct back the last word if it was changed
                    var words = CLIQZ.Core.urlbar.mInputField.value.split(' ');
                    var wrongWords = CliqzAutocomplete.lastSuggestions[1].split(' ');
                    CliqzUtils.log(JSON.stringify(words), 'spellcorr');
                    CliqzUtils.log(JSON.stringify(wrongWords), 'spellcorr');
                    CliqzUtils.log(words[words.length-1].length, 'spellcorr');
                    if (words[words.length-1].length == 0 && words[words.length-2] != wrongWords[wrongWords.length-2]) {
                        CliqzUtils.log('hi', 'spellcorr');
                        words[words.length-2] = wrongWords[wrongWords.length-2];
                        CLIQZ.Core.urlbar.mInputField.value = words.join(' ');
                        var signal = {
                            type: 'activity',
                            action: 'del_correct_back'
                        };
                        CliqzUtils.telemetry(signal);
                    }
                } else {
                    var signal = {
                        type: 'activity',
                        action: 'keystroke_del'
                    };
                    CliqzUtils.telemetry(signal);
                }
                UI.preventFirstElementHighlight = true;
                UI.lastSelectedUrl = "";
                clearResultSelection();
                return false;
            default:
                UI.lastInput = "";
                UI.nextRedraw = (Date.now() + 150 > UI.nextRedraw) ? (Date.now() + 150) : UI.nextRedraw;
                UI.preventFirstElementHighlight = false;
                UI.cursor = CLIQZ.Core.urlbar.selectionStart;
                return false;
        }
    },
    entitySearchKeyDown: function(event, element) {
      if(event.keyCode==13) {
        event.preventDefault();
        navigateToEZinput(element);
      }
    },
    animationEnd: 0,
    selectFirstElement: function() {
      // Skip timeout if element was selected before
      if ($('[arrow]', gCliqzBox) && UI.lastSelectedUrl == $('[arrow]', gCliqzBox).getAttribute("url")) {
        setResultSelection($('[arrow]', gCliqzBox), true, false);
        return;
      }
      // Timeout to wait for user to finish keyboard input
      // and prevent multiple animations at once
      setTimeout(function() {
        var time = (new Date()).getTime();
        if(time - UI.lastInputTime > 300) {
          if (!UI.preventFirstElementHighlight && time > UI.animationEnd
            && gCliqzBox && CliqzAutocomplete.highlightFirstElement) {
            UI.animationEnd = (new Date()).getTime() + 330;
            setResultSelection($('[arrow]', gCliqzBox), true, false);
          }
        }
      },300);

    },
    cursor: 0,
    getSelectionRange: function(key, curStart, curEnd, shift, alt, meta) {
      var start = curStart, end = curEnd;
      if (key == LEFT) {
        if (shift && meta) {
            start = 0;
            UI.cursor = start;
        } else if (meta) {
            start = 0;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == end) {
                end = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
                start = curStart;
                UI.cursor = end;
            } else {
                start = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
                end = curEnd;
                UI.cursor = start;
            }
        } else if(alt) {
            start = selectWord(CLIQZ.Core.urlbar.mInputField.value, LEFT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == end) {
                end -= 1;
                UI.cursor = end;
            } else {
                if(start >= 1) start -= 1;
                UI.cursor = start;
            }
          // Default action
        } else {
            if (start != end) {
                end = start;
            } else {
                start -= 1;
                end = start;
            }
            UI.cursor = start;
        }
      } else if (key == RIGHT) {
        if (shift && meta) {
            end = CLIQZ.Core.urlbar.mInputField.value.length;
            UI.cursor = end;
        }
        else if (meta) {
            start = CLIQZ.Core.urlbar.mInputField.value.length;
            end = start;
            UI.cursor = start;
        } else if(alt && shift) {
            if (start != end && UI.cursor == start) {
                start = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
                end = curEnd;
                UI.cursor = start;
            } else {
                end = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
                start = curStart;
                UI.cursor = end;
            }
        } else if(alt) {
            start = selectWord(CLIQZ.Core.urlbar.mInputField.value, RIGHT);
            end = start;
            UI.cursor = start;
        } else if (shift) {
            if (start != end && UI.cursor == start) {
                start += 1;
                UI.cursor = start;
            } else {
                if(end < CLIQZ.Core.urlbar.mInputField.value.length) end += 1;
                UI.cursor = end;
            }
        // Default action
        } else {
          if (start != end) {
              start = end;
          } else {
              start += 1;
              end = start;
          }
          UI.cursor = end;
        }
      }

      return {
        selectionStart: start,
        selectionEnd: end
      };
    },
    closeResults: closeResults,
    sessionEnd: sessionEnd
};


function navigateToEZinput(element){
    var provider_name = element.getAttribute("search-provider"),
        search_url = element.getAttribute("search-url"),
        value = element.value,
        search_engine = Services.search.getEngineByName(provider_name),
        dest_url = search_url + value;

    if (search_engine) {
        dest_url = search_engine.getSubmission(value).uri.spec
    }
    openUILink(dest_url);
    CLIQZ.Core.allowDDtoClose = true;
    CLIQZ.Core.popup.hidePopup();

    var action_type = element.getAttribute("logg-action-type");
    var signal = {
      type: 'activity',
      action: action_type
    };
    CliqzUtils.telemetry(signal);
}

function selectWord(input, direction) {
  var start = 0, end = 0;
  var cursor = UI.cursor;
  input = input.replace(/\W/g, ' ');

  if(direction == LEFT) {
    if(cursor > 0) cursor -= 1;
    for(;input[cursor] == ' ' && cursor >= 0;cursor--);
    for(; cursor>=0 && input[cursor] != " "; cursor--);
    return cursor+1;
  } else {
    for(;input[cursor] == ' ' && cursor < input.length;cursor++);
    for(; cursor<input.length && input[cursor] != " "; cursor++);
    return cursor;
  }
}

//called on urlbarBlur
function sessionEnd(){
    adultMessage = 0; //show message in the next session
}

var allowDDtoClose = false;
function closeResults(event) {
    var urlbar = CLIQZ.Core.urlbar;

    if($("[dont-close=true]", gCliqzBox) == null) return;

    if (allowDDtoClose) {
        allowDDtoClose = false;
        return;
    }

    event.preventDefault();
    setTimeout(function(){
      var newActive = document.activeElement;
      if (newActive.getAttribute("dont-close") != "true") {
        allowDDtoClose = true;
        CLIQZ.Core.popup.hidePopup();
        gBrowser.selectedTab.linkedBrowser.focus();
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

function handlePopupHeight(box){/*
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
    });*/
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
            var image = { src: img.src };
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

//loops though al the source and returns the first one with custom snippet
function getFirstVertical(type){
    while(type && !VERTICALS[type[0]])type = type.substr(1);
    return VERTICALS[type[0]] || 'generic';
}

function getPartial(type){
    if(type === 'cliqz-images') return 'images';
    if(type === 'cliqz-cluster') return 'clustering';
    if(type.indexOf('cliqz-pattern') === 0) return 'pattern';
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
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/)
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

function unEscapeUrl(url){
  return Components.classes['@mozilla.org/intl/texttosuburi;1'].
            getService(Components.interfaces.nsITextToSubURI).
            unEscapeURIForUI('UTF-8', url)
}

var TYPE_LOGO_WIDTH = 100; //the width of the type and logo elements in each result
function enhanceResults(res){
    var adult = false;

    for(var i=0; i<res.results.length; i++){
        var r = res.results[i];

        if(r.data && r.data.adult) adult = true;


        if(r.type == 'cliqz-extra' || r.type.indexOf('cliqz-pattern') == 0){
            var d = r.data;
            if(d){
                if(d.template && TEMPLATES.hasOwnProperty(d.template)){
                    r.vertical = d.template;
                    r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
                    r.logo = CliqzUtils.getLogoDetails(r.urlDetails);
                    if(r.vertical == 'text')r.dontCountAsResult = true;
                } else {
                    // double safety - to be removed
                    r.invalid = true;
                    r.dontCountAsResult = true;
                }

            }
        } else {
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

             if (getPartial(r.type) != 'images'){
                 r.image = constructImage(r.data);
                 //r.width = res.width;// - TYPE_LOGO_WIDTH - (r.image && r.image.src ? r.image.width + 14 : 0);
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

        r.width = res.width > 500 ? res.width : 500;

        if(r.data && r.data.generic) {// this entry combines several domains, so show CLIQZ logo
            r.logo.logo_url = "https://cliqz.com"; // Clicking on the logo should take the user here
            r.logo.style = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(r.logo.logo_url)).style;
            if(r.logo.style.indexOf('background-image') == -1){
                //add local cliqz image if there is no internet
                r.logo.style += ";background-image:url(chrome://cliqzres/content/skin/img/cliqzLogo.svg)"
            }
            r.logo.add_logo_url = true;
        }

    }

    //filter adult results
    if(adult) {
        var level = CliqzUtils.getPref('adultContentFilter', 'moderate');
        if(level != 'liberal' && adultMessage != 1)
            res.results = res.results.filter(function(r){ return !(r.data && r.data.adult); });

        if(level == 'moderate' && adultMessage == 0){
            updateMessageState("show", {
                "adult": {
                  "adultConfig": CliqzUtils.getAdultFilterState()
                }
             });
        }
    }
    else if (notSupported()) {
      updateMessageState("show", {
          "footer-message": getNotSupported()
       });
    }
    else if(CliqzUtils.getPref('changeLogState', 0) == 1){
      updateMessageState("show", {
        "footer-message": {
          message: CliqzUtils.getLocalizedString('updateMessage'),
          telemetry: 'changelog',
          options: [{
              text: CliqzUtils.getLocalizedString('updatePage'),
              action: 'update-show',
              state: 'default'
            }, {
              text: CliqzUtils.getLocalizedString('updateDismiss'),
              action: 'update-dismiss',
              state: 'gray'
            }
          ]
        }
      });
    }
    else {
      updateMessageState("hide");
    }

    return res;
}

function notSupported(r){
    // Has the user seen our warning about cliqz not being optimized for their country, but chosen to ignore it? (i.e: By clicking OK)
    // or he is in germany
    if(CliqzUtils.getPref("ignored_location_warning", false) ||
        CliqzUtils.getPref("config_location", "de") == 'de') return false

    //if he is not in germany he might still be  german speaking
    var lang = navigator.language.toLowerCase();
    return lang != 'de' && lang.split('-')[0] != 'de';
}

function getNotSupported(){
  return {
    message: CliqzUtils.getLocalizedString('OutOfCoverageWarning'),
    telemetry: 'international',
    type: 'cqz-message-alert',
    options: [{
        text: CliqzUtils.getLocalizedString('keep-cliqz'),
        action: 'keep-cliqz',
        state: 'success'
      }, {
        text: CliqzUtils.getLocalizedString('disable-cliqz'),
        action: 'disable-cliqz',
        state: 'error'
      }
    ]
  }
}

 /*
  * Updates the state of the messages box at the bottom of the suggestions popup.
  * @param state the new state, One of ("show", "hide"). Default Vaule: "hide"
  *
  * @param messages the dictionary of messages that will be updated,
  * specified by the name of the template, excluding the .tpl extension.
  * The name should be in MESSAGE_TEMPLATES, so the template can be automatically rendered.
  * In the dictionary, the key is the name of the template, and the value is the dictinary
  * of template arguments. e.g:
  * If state == "hide", then messages_list is ignored and all messages are hidden.
  * If state == "show", the messages in messages_list will be displayed to the user, in the same order.
  *
  * example: updateMessageState("show", {
                "adult": {
                  "adultConfig": CliqzUtils.getAdultFilterState()
                }
             });
  * You can also pass multiple messages at once, e.g:

             updateMessageState("show", {
                "adult": {
                    "adultConfig": CliqzUtils.getAdultFilterState()
                },
                "footer-message": {
                  // Template has no arguments.
                }
             });
  */

function updateMessageState(state, messages) {
  switch (state) {
    case "show":
      gCliqzBox.messageContainer.innerHTML = "";
      Object.keys(messages).forEach(function(tpl_name){
          gCliqzBox.messageContainer.innerHTML += UI.tpl[tpl_name](messages[tpl_name]);
      });
      break;
    case "hide":
    default:
      gCliqzBox.messageContainer.innerHTML = "";
      break;
  }
}

function getResultPosition(el){
    return getResultOrChildAttr(el, 'idx');
}

function getResultKind(el){
    return getResultOrChildAttr(el, 'kind').split(';');
}

function getResultOrChildAttr(el, attr){
    var ret;
    while (el){
        if(ret = el.getAttribute(attr)) return ret;
        if(el.className == IC) return ''; //do not go higher than a result
        el = el.parentElement;
    }
    return '';
}

function urlIndexInHistory(url, urlList) {
    var index = 0;
    for(var key in urlList) {
      if (urlList[key].href == url) {
        index = urlList.indexOf(urlList[key]);
        if (currentResults.results[0].data.cluster === true) {
          index += 1;
        }
        break;
      }
    }
    return index;
}

function messageClick(ev) {
  var el = ev.target;
  // Handle adult results

  while (el && (ev.button == 0 || ev.button == 1) && !CliqzUtils.hasClass(el, "cliqz-message-container") ) {
      var action = el.getAttribute('cliqz-action');
      /*********************************/
      /* BEGIN "Handle message clicks" */

      switch (action) {
        case 'adult':
          handleAdultClick(ev);
          break;
        case 'footer-message-action':
          // "Cliqz is not optimized for your country" message */
          var state = ev.originalTarget.getAttribute('state');
          switch(state) {
              //not supported country
              case 'disable-cliqz':
                  CliqzUtils.setPref("cliqz_core_disabled", true);
                  updateMessageState("hide");
                  var enumerator = Services.wm.getEnumerator('navigator:browser');

                  //remove cliqz from all windows
                  while (enumerator.hasMoreElements()) {
                      var win = enumerator.getNext();
                      win.CLIQZ.Core.unload(true);
                  }
                  CliqzUtils.refreshButtons();
                  break;
              case 'keep-cliqz':
                  updateMessageState("hide");
                  // Lets us know that the user has ignored the warning
                  CliqzUtils.setPref('ignored_location_warning', true);
                  break;


              //changelog
              case 'update-show':
                  CLIQZ.Core.openLink(CliqzUtils.CHANGELOG, true);
              case 'update-dismiss':
                  updateMessageState("hide");
                  CliqzUtils.setPref('changeLogState', 2);
                  break;
              default:
                  break;
            break;
          }
          CliqzUtils.telemetry({
            type: 'setting',
            setting: el.getAttribute('cliqz-telemetry'),
            value: state
          });
          setTimeout(function(){ CliqzUtils.refreshButtons(); }, 0);
            break;
        default:
            break;
      }
      /* Propagate event up the DOM tree */
      el = el.parentElement;
    }

    /*  END "Handle message clicks"  */
    /*********************************/

}



function logUIEvent(el, historyLogType, extraData, query) {
  if(!query) var query = CLIQZ.Core.urlbar.value;
  var queryAutocompleted = null;
  if (CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart) {
      var first = gCliqzBox.resultsBox.children[0];
      if (!CliqzUtils.isPrivateResultType(getResultKind(first)))
          queryAutocompleted = query;
      query = query.substr(0, CLIQZ.Core.urlbar.selectionStart);
  }
  if(el && !el.getAttribute) el.getAttribute = function(k) { return this[k]; }

  if(el && el.getAttribute('url')){
      var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url')),
          lr = CliqzAutocomplete.lastResult,
          extra = el.getAttribute('extra'), //extra data about the link
          result_order = currentResults.results.map(function(r){ return r.data.kind; }),
          action = {
              type: 'activity',
              current_position: getResultPosition(el),
              query_length: CliqzAutocomplete.lastSearch.length,
              inner_link: el.className ? el.className != IC : false, //link inside the result or the actual result
              position_type: getResultKind(el),
              extra: extra,
              search: CliqzUtils.isSearch(url),
              has_image: el.getAttribute('hasimage') || false,
              clustering_override: lr && lr._results[0] && lr._results[0].override ? true : false,
              reaction_time: (new Date()).getTime() - CliqzAutocomplete.lastQueryTime,
              display_time: CliqzAutocomplete.lastDisplayTime ? (new Date()).getTime() - CliqzAutocomplete.lastDisplayTime : null,
              result_order: result_order,
              v: 1
          };
      for(var key in extraData) {
        action[key] = extraData[key];
      }
      CliqzUtils.telemetry(action);
      CliqzUtils.resultTelemetry(query, queryAutocompleted, getResultPosition(el),
          CliqzUtils.isPrivateResultType(action.position_type) ? '' : url, result_order, extra);
    }
    CliqzHistory.updateQuery(query);
    CliqzHistory.setTabData(window.gBrowser.selectedTab.linkedPanel, "type", historyLogType);
}

// user scroll event
function resultScroll(ev) {
    CliqzAutocomplete.hasUserScrolledCurrentResults = true;
}

function resultClick(ev){

    var el = ev.target,
        newTab = ev.metaKey || ev.button == 1 ||
                 ev.ctrlKey ||
                 (ev.target.getAttribute('newtab') || false);


    while (el && (ev.button == 0 || ev.button == 1)) {
        if(el.getAttribute('url')){
            logUIEvent(el, "result", {
              action: "result_click",
              new_tab: newTab
            }, CliqzAutocomplete.lastSearch);
            var url = CliqzUtils.cleanMozillaActions(el.getAttribute('url'));
            CLIQZ.Core.openLink(url, newTab);
            CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, url);
            if(!newTab) CLIQZ.Core.popup.hidePopup();
            break;
        } else if (el.getAttribute('cliqz-action')) {
            switch(el.getAttribute('cliqz-action')) {
                case 'stop-click-event-propagation':
                    return;
                case 'copy-calc-answer':
                    var gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"]
                                               .getService(Components.interfaces.nsIClipboardHelper);
                    gClipboardHelper.copyString(document.getElementById('calc-answer').innerHTML);
                    document.getElementById('calc-copied-msg').style.display = "";
                    document.getElementById('calc-copy-msg').style.display = "none";
                    break;
                case 'toggle':
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
                        return;
                    }
                case 'searchEZbutton':
                    ev.preventDefault();
                    navigateToEZinput($('input',el));
                    return;
                case 'alternative-search-engine':
                    enginesClick(ev);
                    break;
                case 'news-toggle':
                    setTimeout(function(){
                      var trends = document.getElementById('trends', el.parentElement).checked;
                      CliqzUtils.setPref('news-toggle-state', trends);
                      CliqzUtils.telemetry({
                        type: 'activity',
                        action: 'news-toggle',
                        setting: trends ? 'trends' : 'latest'
                      });
                    }, 0);
                    
                    return;
                default:
                    break;
            }
        }
        if(el.className == IC) break; //do not go higher than a result
        el = el.parentElement;
    }
}



function handleAdultClick(ev){
    var state = ev.originalTarget.getAttribute('state'),
        ignored_location_warning = CliqzUtils.getPref("ignored_location_warning"),
        user_location = CliqzUtils.getPref("config_location");

    switch(state) {
        case 'yes': //allow in this session
            adultMessage = 1;
            UI.handleResults();
            updateMessageState("hide");
            if (user_location != "de" && !ignored_location_warning)
              updateMessageState("show", {
                  "footer-message": getNotSupported()
              });
            break;
        case 'no':
            adultMessage = 2;
            UI.handleResults();
            updateMessageState("hide");
            if (user_location != "de" && !ignored_location_warning)
              updateMessageState("show", {
                  "footer-message": getNotSupported()
               });
            break;
        default:
            var rules = CliqzUtils.getAdultFilterState();
            if(rules[state]){
                CliqzUtils.setPref('adultContentFilter', state);
                updateMessageState("hide");
                UI.handleResults();
                if (user_location != "de" && !ignored_location_warning)
                  updateMessageState("show", {
                      "footer-message": getNotSupported()
                   });
            }
            else {
                //click on options btn
            }
            break;

    }
    if(state && state != 'options'){ //optionsBtn
        CliqzUtils.telemetry({
            type: 'setting',
            setting: 'adultFilter',
            value: state
        });
    }
    setTimeout(function(){ CliqzUtils.refreshButtons(); }, 0);
}

function getResultSelection(){
    return $('[arrow="true"]', gCliqzBox);
}

function clearResultSelection(){
    UI.keyboardSelection = null;
    var el = getResultSelection();
    el && el.setAttribute('arrow', 'false');
    var arrow = $('.cqz-result-selected', gCliqzBox);
    arrow && arrow.removeAttribute('active');
    clearTextSelection();
}

function clearTextSelection() {
    var el = getResultSelection();
    var title = $('.cqz-ez-title', el) || $('.cqz-result-title', el) || $('.cliqz-pattern-element-title', el) || el;
    title && (title.style.textDecoration = "none");
}

function smooth_scroll_to(element, target, duration) {
    target = Math.round(target);
    duration = Math.round(duration);
    if (duration < 0) return
    if (duration === 0) {
        element.scrollTop = target;
        return
    }

    var start_time = Date.now();
    var end_time = start_time + duration;
    var start_top = element.scrollTop;
    var distance = target - start_top;

    // based on http://en.wikipedia.org/wiki/Smoothstep
    var smooth_step = function(start, end, point) {
        if(point <= start) { return 0; }
        if(point >= end) { return 1; }
        var x = (point - start) / (end - start); // interpolation
        return x*x*x*(x*(x*6 - 15) + 10);//x*x*(3 - 2*x);
    }

    var previous_top = element.scrollTop;

    // This is like a think function from a game loop
    var scroll_frame = function() {
        if(element.scrollTop != previous_top) return;

        // set the scrollTop for this frame
        var now = Date.now();
        var point = smooth_step(start_time, end_time, now);
        var frameTop = Math.round(start_top + (distance * point));
        element.scrollTop = frameTop;

        // check if we're done!
        if(now >= end_time) return;

        // If we were supposed to scroll but didn't, then we
        // probably hit the limit, so consider it done; not
        // interrupted.
        if(element.scrollTop === previous_top && element.scrollTop !== frameTop) return;
        previous_top = element.scrollTop;

        // schedule next frame for execution
        setTimeout(function(){ scroll_frame(); }, 0);
    }
    // boostrap the animation process
    setTimeout(function(){ scroll_frame(); }, 0);
}

function selectNextResult(pos, allArrowable) {
    if (pos != allArrowable.length - 1) {
        var nextEl = allArrowable[pos + 1];
        setResultSelection(nextEl, true, false, true);
        arrowNavigationTelemetry(nextEl);
    }
}

function selectPrevResult(pos, allArrowable) {
    var nextEl = allArrowable[pos - 1];
    setResultSelection(nextEl, true, true, true);
    arrowNavigationTelemetry(nextEl);
}

function setResultSelection(el, scroll, scrollTop, changeUrl, mouseOver){
    if(el && el.getAttribute("url")){
        //focus on the title - or on the aroww element inside the element
        var target = $('.cqz-ez-title', el) || $('[arrow-override]', el) || el;
        var arrow = $('.cqz-result-selected', gCliqzBox);

        if(!target.hasAttribute('arrow-override') &&
          el.getElementsByClassName("cqz-ez-title").length != 0 && mouseOver) return;

        // Clear Selection
        clearResultSelection();

        if(target != el){
            //arrow target is now on an inner element
            el.removeAttribute('arrow');
            target.setAttribute('url', el.getAttribute('url'));
        }
        arrow.className = arrow.className.replace(" notransition", "");
        if(!mouseOver && el.getAttribute("url") == UI.lastSelectedUrl) arrow.className += " notransition";
        UI.lastSelectedUrl = el.getAttribute("url");

        var offset = target.offsetTop;

        if(el.hasAttribute('arrow-override')){
          offset += closest(el, '.cqz-result-box').offsetTop;
        }

        if(target.className.indexOf("cliqz-pattern") != -1) {
          var context;
          if(context = $('.cqz-result-pattern', gCliqzBox))
            offset += context.parentElement.offsetTop;
        }
        var scroll = parseInt(offset/303) * 303;
        if(!mouseOver) smooth_scroll_to(gCliqzBox.resultsBox, scroll, 800);

        target.setAttribute('arrow', 'true');
        arrow.style.top = (offset + target.offsetHeight/2 - 7) + 'px';
        arrow.setAttribute('active', 'true');
        var title = $('.cqz-ez-title', el) || $('.cqz-result-title', el) || $('.cliqz-pattern-element-title', el) || el;
        if(title && title.className.indexOf("title") != -1 && mouseOver) title.style.textDecoration = 'underline';

        // update the URL bar with the selected URL
        if (UI.lastInput == "") {
            if (CLIQZ.Core.urlbar.selectionStart !== CLIQZ.Core.urlbar.selectionEnd)
                UI.lastInput = CLIQZ.Core.urlbar.value.substr(0, CLIQZ.Core.urlbar.selectionStart);
            else
                UI.lastInput = CLIQZ.Core.urlbar.value;
        }
        if(changeUrl)
            CLIQZ.Core.urlbar.value = el.getAttribute("url");

        if (!mouseOver)
          UI.keyboardSelection = el;

    } else if (changeUrl && UI.lastInput != "") {
        CLIQZ.Core.urlbar.value = UI.lastInput;
        UI.lastSelectedUrl = "";
        clearResultSelection();
    }
}

function getStatus(ev, el){
  var oTarget = ev.originalTarget;

  return /* newtab */ (oTarget.hasAttribute('newtab') && el.getAttribute('url') ?
          CliqzUtils.getLocalizedString("openInNewTab", el.getAttribute('url')) : ''
     )
     ||
     //deepUrl
     (oTarget.hasAttribute('show-status') &&
        (oTarget.getAttribute('url')
          ||
         oTarget.parentElement.hasAttribute('show-status') && oTarget.parentElement.getAttribute('url'))
     )
     ||
     //arrowUrl
     (el.hasAttribute('arrow') ? el.getAttribute('url') : '');
}

var lastMoveTime = Date.now();
function resultMove(ev){
    if (Date.now() - lastMoveTime > 50) {
        var el = ev.target;
        while (el && el.className != IC && !el.hasAttribute('arrow')) {
            el = el.parentElement;
        }
        clearTextSelection();
        setResultSelection(el, false, false, false, true);
        lastMoveTime = Date.now();

        if(!el) return;
        XULBrowserWindow.setOverLink(getStatus(ev, el));
    }
}

function onEnter(ev, item){
  var urlbar = CLIQZ.Core.urlbar;
  var input = urlbar.mInputField.value;
  var cleanInput = input;
  var lastAuto = CliqzAutocomplete.lastAutocomplete ? CliqzAutocomplete.lastAutocomplete : "";
  var urlbar_time = CliqzAutocomplete.lastFocusTime ? (new Date()).getTime() - CliqzAutocomplete.lastFocusTime: null;
  var newTab = ev.metaKey || ev.ctrlKey;

  // Check if protocols match
  if(input.indexOf("://") == -1 && lastAuto.indexOf("://") != -1) {
    if(CliqzHistoryPattern.generalizeUrl(lastAuto)
    == CliqzHistoryPattern.generalizeUrl(input))
      input = lastAuto;
  }

  // Check for login url
  if(input.indexOf("@") != -1 &&
    input.split("@")[0].indexOf(":") != -1) {
      if(input.indexOf("://") == -1)
        input = "http://" + input;
      var login = input.substr(input.indexOf("://")+3, input.indexOf("@")-input.indexOf("://")-2);
      cleanInput = input.replace(login, "");
  }

  // Logging
  // Autocomplete
  if (CliqzHistoryPattern.generalizeUrl(lastAuto)
  == CliqzHistoryPattern.generalizeUrl(input) &&
  urlbar.selectionStart !== 0 && urlbar.selectionStart !== urlbar.selectionEnd) {
    logUIEvent(UI.keyboardSelection, "autocomplete", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      autocompleted: CliqzAutocomplete.lastAutocompleteType,
      position_type: ['inbar_url'],
      source: getResultKind(item),
      current_position: -1,
      new_tab: newTab
    });
  }
  // Google
  else if (!CliqzUtils.isUrl(input) && !CliqzUtils.isUrl(cleanInput)) {
    logUIEvent({url: input}, "google", {
      action: "result_enter",
      position_type: ['inbar_query'],
      urlbar_time: urlbar_time,
      current_position: -1
    });
    CLIQZ.Core.triggerLastQ = true;

    var customQuery = ResultProviders.isCustomQuery(input);
    if(customQuery){
        urlbar.value = customQuery.queryURI;
    }
    return false;
  }
  // Typed
  else if (!getResultSelection()){
    logUIEvent({url: input}, "typed", {
      action: "result_enter",
      position_type: ['inbar_url'],
      urlbar_time: urlbar_time,
      current_position: -1,
      new_tab: newTab
    });
    CLIQZ.Core.triggerLastQ = true;
  // Result
  } else {
    logUIEvent(UI.keyboardSelection, "result", {
      action: "result_enter",
      urlbar_time: urlbar_time,
      new_tab: newTab
    }, CliqzAutocomplete.lastSearch);
  }

  CLIQZ.Core.openLink(input, newTab);
  CliqzHistoryManager.updateInputHistory(CliqzAutocomplete.lastSearch, input);
  return true;
}

function enginesClick(ev){
    var engineName;
    var el = ev.target;

    if(engineName = ev && ((el && el.getAttribute('engine')) || (el.parentElement && el.parentElement.getAttribute('engine')))){
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

            CliqzUtils.telemetry(action);
        }
    }
}

function arrowNavigationTelemetry(el){
    var action = {
        type: 'activity',
        action: 'arrow_key',
        current_position: getResultPosition(el),
    };
    if(el){
        // for inner link info
        if(el.getAttribute('extra'))
            action.extra = el.getAttribute('extra');

        action.position_type = getResultKind(el);
        var url = getResultOrChildAttr(el, 'url');
        action.search = CliqzUtils.isSearch(url);
    }
    CliqzUtils.telemetry(action);
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
    Handlebars.registerHelper('show_main_iframe', function(){
        if (CliqzUtils.IFRAME_SHOW)
            return "inherit";
        return "none";
    });
    Handlebars.registerHelper('partial', function(name, options) {
        var template = UI.tpl[name] || UI.tpl.empty;
        return new Handlebars.SafeString(template(this));
    });

    Handlebars.registerHelper('get_array_element', function(arr, idx, subelement) {
      if (typeof(subelement) == undefined)
        return arr && arr[idx];
      else
        return arr && arr[idx] && arr[idx][subelement];
    });

    Handlebars.registerHelper('agoline', function(ts, options) {
        if(!ts) return '';
        var now = (new Date().getTime() / 1000),
            seconds = parseInt(now - ts),
            i=0, slot;

        while (slot = AGO_CEILINGS[i++])
            if (seconds < slot[0])
                return CliqzUtils.getLocalizedString(slot[1], parseInt(seconds / slot[2]))
        return '';
    });

    Handlebars.registerHelper('sec_to_duration', function(seconds) {
        if(!seconds)return null;
        try {
            var s = parseInt(seconds);
            return Math.floor(s/60) + ':' + ("0" + (s%60)).slice(-2);
        } catch(e) {
            return null;
        }
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

    Handlebars.registerHelper('local', function() {
        return CliqzUtils.getLocalizedString.apply(null, arguments);
    });

    Handlebars.registerHelper('views_helper', function(val) {
        if(!val || val == '-1')return '';

        try {
            return parseFloat(val).toLocaleString() + ' ' + CliqzUtils.getLocalizedString('views');
        } catch(e) {
            return ''
        }
    });

    Handlebars.registerHelper('wikiEZ_height', function(data_richData){
        if (data_richData.hasOwnProperty('images') && data_richData.images.length > 0)
            if ( (this.type === 'cliqz-extra') || (this.data === CliqzAutocomplete.lastResult._results[0].data))  // is the first result in the show list
                return 'cqz-result-h2';
            // BM hq result, but not the 1st result -> remove images
            data_richData.images = [];

        return 'cqz-result-h3';
    });

    Handlebars.registerHelper('limit_images_shown', function(idx, max_idx){
        return idx < max_idx;
    });

    Handlebars.registerHelper('json', function(value, options) {
        return JSON.stringify(value);
    });

    Handlebars.registerHelper('log', function(value, key) {
        console.log('TEMPLATE LOG HELPER', value);
    });

    Handlebars.registerHelper('emphasis', function(text, q, minQueryLength, cleanControlChars) {
        // lucian: questionable solution performance wise
        // strip out all the control chars
        // eg :text = "... \u001a"
        q = q.trim();
        if(text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ')

        if(!text || !q || q.length < (minQueryLength || 2)) return text;

        var map = Array(text.length),
            tokens = q.toLowerCase().split(/\s+|\.+/).filter(function(t){ return t && t.length>1; }),
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

    Handlebars.registerHelper('hasimage', function(image) {
        if(image && image.src &&
            !(image.src.indexOf('xing') !== -1 && image.src.indexOf('nobody_') !==-1))
            return true;
        else
            return false
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

    Handlebars.registerHelper("logic", function(lvalue, operator, rvalue, options) {
        return {
            "|": lvalue | rvalue,
            "||": lvalue || rvalue,
            "&": lvalue & rvalue,
            "&&": lvalue & rvalue,
            "^": lvalue ^ rvalue,
            "is": lvalue == rvalue,
            "starts_with": lvalue.indexOf(rvalue) == 0
        }[operator];
    });

    Handlebars.registerHelper('nameify', function(str) {
        return str[0].toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('reduce_width', function(width, reduction) {
        return width - reduction;
    });

    Handlebars.registerHelper('kind_printer', function(kind) {
        //we need to join with semicolon to avoid conflicting with the comma from json objects
        return kind ? kind.join(';'): '';
    });

    Handlebars.registerHelper('links_or_sources', function(richData) {
        return (richData.internal_links && richData.internal_links.length > 0) ?
                  richData.internal_links : richData.additional_sources
    });

    Handlebars.registerHelper('pref', function(key) {
        return CliqzUtils.getPref(key, false);
    });
}
ctx.CLIQZ = ctx.CLIQZ || {};
ctx.CLIQZ.UI = UI;

})(this);
