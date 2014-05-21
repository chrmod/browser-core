'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'HistoryManager',
  'chrome://cliqzmodules/content/HistoryManager.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Autocomplete',
  'chrome://cliqzmodules/content/Autocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Language',
  'chrome://cliqzmodules/content/Language.jsm');

var CLIQZ = CLIQZ || {};
CLIQZ.Core = CLIQZ.Core || {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keydown'],
    _messageOFF: true, // no message shown
    _lastKey:0,
    _updateAvailable: false,
    init: function(){
        CLIQZ.Utils.init();

        var css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/browser.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);
        css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/logo.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);

        if(CLIQZ.Utils.cliqzPrefs.getBoolPref('bwFonts')){
            css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/bw.css?rand='+Math.random());
            CLIQZ.Core.elem.push(css);
        }
        // TEMP - EXPERIMENTAL
        /*
        var scale = CLIQZ.Utils.cliqzPrefs.getIntPref('scale');
        css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/scale' + scale + '.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);

        var logoPosition = CLIQZ.Utils.cliqzPrefs.getIntPref('logoPosition');
        if(logoPosition != 1){
            css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/' + (logoPosition==0?'no':'left')+ 'logo.css?rand='+Math.random());
            CLIQZ.Core.elem.push(css);
        }
        */
        // ENDTEMP
        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = document.getElementById('PopupAutoCompleteRichResult');

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', /*'urlinline */'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResult');

        CLIQZ.Core.popup.addEventListener('onpopuphiding', CLIQZ.Core.onPopupHiding);

        var searchContainer = document.getElementById('search-container');
        CLIQZ.Core._searchContainer = searchContainer.getAttribute('class');
        if (CLIQZ.Utils.cliqzPrefs.getBoolPref('hideQuickSearch')){
            searchContainer.setAttribute('class', CLIQZ.Core._searchContainer + ' hidden');
        }

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.addEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        // add cliqz last search
        var cliqzLastSearch = document.createElement('hbox');
        // FIXME: We should find another way to deal with events that take time
        // to finish, like a disk read. A 250ms wait is not a good solution.
        setTimeout(function () {
            cliqzLastSearch.textContent = CLIQZ.Utils.getLocalizedString('urlBarLastSearch');
        }, 250);

        cliqzLastSearch.className = 'hidden';  // Hide on start
        cliqzLastSearch.addEventListener('click', CLIQZ.Core.returnToLastSearch);
        var sibling = document.getElementById('urlbar-icons');
        sibling.parentNode.insertBefore(cliqzLastSearch, sibling);
        CLIQZ.Core.urlbarCliqzLastSearchContainer = cliqzLastSearch;
        CLIQZ.Core.elem.push(cliqzLastSearch);

        // preferences
        CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Utils.cliqzPrefs.getIntPref('popupHeight') + 'px';

        //check APIs
        CLIQZ.Utils.getCachedResults();
        CLIQZ.Utils.getSuggestions();

        Autocomplete.init();

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            Language.init(window);
            window.gBrowser.addProgressListener(Language.listener);
        }

        CLIQZ.Core.whoAmI(true); //startup
        CLIQZ.Utils.log('Initialized', 'CORE');
    },
    checkSession: function(){
        var prefs = CLIQZ.Utils.cliqzPrefs;
        if (!prefs.prefHasUserValue('session') || prefs.getCharPref('session') == ''){
            CLIQZ.Utils.httpGet('chrome://cliqz/content/source.json',
                function success(req){
                    var source = JSON.parse(req.response).shortName;
                    prefs.setCharPref('session', CLIQZ.Core.generateSession(source));
                },
                function error(){
                    prefs.setCharPref('session', CLIQZ.Core.generateSession());
                }
            );


            CLIQZ.Core.showTutorial(true);
        } else {
            CLIQZ.Core.showTutorial(false);
        }
    },
    generateSession: function(source){
        return Math.random().toString().split('.')[1]
               + '|' +
               CLIQZ.Utils.getDay()
               + '|' +
               (source || 'NONE');
    },
    returnToLastSearch: function () {
        CLIQZ.Core.urlbar.mInputField.focus()
        CLIQZ.Core.urlbar.mInputField.setUserInput(Autocomplete.lastSearch);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CLIQZ.Utils.track(action);
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    showTutorial: function(onInstall){
        return;
        setTimeout(function(){
            var onlyReuse = onInstall ? false: true;
            CLIQZ.Core.openOrReuseTab(CLIQZ.Utils.TUTORIAL_URL, CLIQZ.Utils.INSTAL_URL, onlyReuse);
        }, 100);
    },
    // force component reload at install/uninstall
    reloadComponent: function(el) {
        return el && el.parentNode && el.parentNode.insertBefore(el, el.nextSibling)
    },
    // restoring
    destroy: function(){
        for(var i in CLIQZ.Core.elem){
            var item = CLIQZ.Core.elem[i];
            item && item.parentNode && item.parentNode.removeChild(item);
        }

        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', CLIQZ.Core._autocompletesearch);
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', CLIQZ.Core._autocompletepopup);
        CLIQZ.Core.urlbar.removeEventListener('onpopuphiding', CLIQZ.Core.onPopupHiding);

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.removeEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var searchContainer = document.getElementById('search-container');
        searchContainer.setAttribute('class', CLIQZ.Core._searchContainer);

        // restore preferences
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Core._popupMaxHeight;

        Autocomplete.destroy();

        // remove listners
        if ('gBrowser' in window) {
            window.gBrowser.removeProgressListener(Language.listener);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
    },
    restart: function(){
        CLIQZ.Core.destroy();
        CLIQZ.Core.init();
    },
    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        CLIQZ.Utils.track(action);
    },
    popupClick: function(item) {
        var pos = -1, siblings = item.parentNode.children;
        for(var i in siblings){
            if(siblings[i] == item)
                pos = i;
        }
        var source = item.getAttribute('source');
        if(source.indexOf('action') > -1){
            source = 'tab_result';
        }
        var action = {
            type: 'activity',
            action: 'result_click',
            new_tab: false,
            current_position: pos,
            position_type: source.replace('-', '_').replace('tag', 'bookmark'),
            search: CLIQZ.Utils.isSearch(item.getAttribute('url'))
        };

        CLIQZ.Utils.track(action);
    },
    onPopupHiding:function(){
        CLIQZ.Core.popupEvent(false);
    },
    urlbarfocus: function() {
        CLIQZ.Core.urlbarCliqzLastSearchContainer.className = 'hidden';
        CLIQZ.Core.urlbarEvent('focus');
    },
    urlbarblur: function() {
        CLIQZ.Core.urlbarCliqzLastSearchContainer.className = 'cliqz-urlbar-Last-search';
        CLIQZ.Core.urlbarEvent('blur');
    },
    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CLIQZ.Utils.track(action);
    },
    whoAmI: function(startup){
        // schedule another signal
        setTimeout(function(){ CLIQZ.Core.whoAmI(); }, CLIQZ.Core.INFO_INTERVAL);

        var start = (new Date()).getTime();
        HistoryManager.getStats(function(history){
            CLIQZ.Utils.log((new Date()).getTime() - start,"HISTORY CHECK TIME");
            Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                var info = {
                    type: 'environment',
                    agent: navigator.userAgent,
                    language: navigator.language,
                    version: beVersion,
                    history_days: history.days,
                    history_urls: history.size,
                    startup: startup? true: false,
                    prefs: CLIQZ.Utils.getPrefs()
                };

                CLIQZ.Utils.track(info);
            });
        });
    },
    showUpdateMessage: function(){
        if(CLIQZ.Core._messageOFF){
            CLIQZ.Core._messageOFF = false;
            if(confirm(CLIQZ.Utils.getLocalizedString('updateMessage'))){
                gBrowser.addTab(CLIQZ.Utils.UPDATE_URL);
            }
            CLIQZ.Core._messageOFF = true;
        }
    },
    _lastProgress: Date.now(),
    updateProgress: function(el, itemCount){
        if (Date.now() - CLIQZ.Core._lastProgress > 30) {
          var height = el.clientHeight, scrollHeight,
              top = el.scrollTop;
          if(itemCount){
            scrollHeight = Math.max(
                CLIQZ.Core.ITEM_HEIGHT * Math.min(itemCount, CLIQZ.Core.urlbarPrefs.getIntPref('maxRichResults')),
                CLIQZ.Core.POPUP_HEIGHT
            );
          } else {
            scrollHeight = el.scrollHeight;
          }

          if(CLIQZ.Core._prog == null){
            CLIQZ.Core._prog = document.getElementById('cliqz-progress');
          }
          CLIQZ.Core._prog.width = Math.min(1, (top + height) / scrollHeight) * CLIQZ.Core.urlbar.clientWidth;
          CLIQZ.Core._lastProgress = Date.now();
        }
        else {
          clearTimeout(CLIQZ.Core._progressTimeout);
          CLIQZ.Core._progressTimeout = setTimeout(function(){ CLIQZ.Core.updateProgress(el); }, 30);
        }
    },
    locationChangeTO: null,
    urlbarkeydown: function(ev){
        var code = ev.keyCode,
            popup = CLIQZ.Core.popup;

        CLIQZ.Core._lastKey = ev.keyCode;

        if(code == 13){
            let index = popup.selectedIndex,
                inputValue = CLIQZ.Core.urlbar.value,
                action = {
                    type: 'activity',
                    action: 'result_enter',
                    current_position: index,
                    search: false
                };
            if(index != -1){
                let item = popup.richlistbox._currentItem;

                var source = item.getAttribute('source');
                if(source.indexOf('action') > -1){
                    source = 'tab_result';
                }
                action.position_type = source.replace('-', '_').replace('tag', 'bookmark');
                action.search = CLIQZ.Utils.isSearch(item.getAttribute('url'));

                //if this url is currently previewed do not load it again
                if(inputValue == item.getAttribute('url')){
                    ev.preventDefault();
                    popup.closePopup();
                }
            } else { //enter while on urlbar and no result selected

                if(CLIQZ.Utils.isUrl(inputValue)){
                    action.position_type = 'inbar_url';
                    action.search = CLIQZ.Utils.isSearch(inputValue);
                }
                else action.position_type = 'inbar_query';
                action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;
                if(action.autocompleted){
                    let first = popup.richlistbox.childNodes[0],
                        firstUrl = first.getAttribute('url');

                    action.source = CLIQZ.Utils.encodeResultType(first.getAttribute('type'));

                    if(firstUrl.indexOf(inputValue) != -1){
                        CLIQZ.Core.urlbar.value = firstUrl;
                    }
                } else {
                    var customEngine = CLIQZ.Utils.hasCustomEngine(inputValue);
                    if(customEngine){
                        var q = inputValue.substring(customEngine.prefix.length)
                        CLIQZ.Core.urlbar.value = customEngine.getSubmission(q).uri.spec;
                    }
                }
                // TEMP - EXPERIMENTAL
                /*
                if(CLIQZ.Utils.cliqzPrefs.getBoolPref('enterLoadsFirst')){
                    ev.preventDefault();

                    CLIQZ.Utils.log(popup.richlistbox.childNodes[0].getAttribute('url'), "AAAAA");
                    var item = popup.richlistbox.childNodes[0],
                        value = item.getAttribute('url');

                    if(item.getAttribute('type') === 'cliqz-suggestions'){
                        value = Services.search.defaultEngine.getSubmission(value).uri.spec;
                    }
                    else if(value.indexOf('http') !== 0) value = 'http://' + value;

                    gBrowser.selectedBrowser.contentDocument.location = value;
                    popup.closePopup();
                }
                */
                // ENDTEMP

            }
            CLIQZ.Utils.track(action);
        }

        if(code == 38 || code == 40){
            clearTimeout(CLIQZ.Core.locationChangeTO);
            // postpone navigation to allow richlistbox update
            setTimeout(function(){
                CLIQZ.Utils.navigateToItem(
                    gBrowser,
                    popup.selectedIndex,
                    popup.richlistbox._currentItem,
                    'arrow_key'
                );
            },0);

            // avoid looping through results
            if((code == 40 && popup.selectedIndex === CLIQZ.Core.urlbar.popup._currentIndex - 1) ||
               (code == 38 && popup.selectedIndex === - 1)) {
                ev.preventDefault();
            }
        }
    },
    // autocomplete query inline
    autocompleteQuery: function(firstResult){
        if(CLIQZ.Core._lastKey === KeyEvent.DOM_VK_BACK_SPACE ||
           CLIQZ.Core._lastKey === KeyEvent.DOM_VK_DELETE ||
           CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart){
            return;
        }

        let urlBar = CLIQZ.Core.urlbar,
            endPoint = urlBar.value.length;

        if(firstResult.indexOf('://') !== -1){
           firstResult = firstResult.split('://')[1];
        }

        firstResult = firstResult.replace('www.', '');

        if(firstResult.indexOf(urlBar.value) === 0) {
            urlBar.value += firstResult.substr(endPoint);
            urlBar.setSelectionRange(endPoint, urlBar.value.length);
        }
    },
    // redirects a tab in which oldUrl is loaded to newUrl
    openOrReuseTab: function(newUrl, oldUrl, onlyReuse) {
        // optimistic search
        if(gBrowser.selectedTab.linkedBrowser.contentWindow.location.href == oldUrl){
            gBrowser.selectedTab.linkedBrowser.contentWindow.location.href = newUrl;
            return;
        }

        // heavy hearch
        CLIQZ.Utils.openOrReuseAnyTab(newUrl, oldUrl, onlyReuse);
    }
};
