'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryManager',
  'chrome://cliqzmodules/content/CliqzHistoryManager.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzTimings',
  'chrome://cliqzmodules/content/CliqzTimings.jsm?v=0.4.13');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzABTests',
  'chrome://cliqzmodules/content/CliqzABTests.jsm');


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
    lastQueryInTab:{},
    init: function(){
        CliqzUtils.init();

        var css = CliqzUtils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/browser.css??v=0.4.13');
        CLIQZ.Core.elem.push(css);
        css = CliqzUtils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/logo.css??v=0.4.13');
        CLIQZ.Core.elem.push(css);

        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = document.getElementById('PopupAutoCompleteRichResult');

        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');

        CLIQZ.Core.checkSession();

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', /*'urlinline */'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResult');

        CLIQZ.Core._onpopuphiding = CLIQZ.Core.popup.getAttribute('onpopuphiding');
        CLIQZ.Core.popup.setAttribute('onpopuphiding',
            'CLIQZ.Core.popupEvent(false) ' + CLIQZ.Core.popup.getAttribute('onpopuphiding'));


        var searchContainer = document.getElementById('search-container');
        if(searchContainer){
            CLIQZ.Core._searchContainer = searchContainer.getAttribute('class');
            if (CliqzUtils.cliqzPrefs.getBoolPref('hideQuickSearch')){
                searchContainer.setAttribute('class', CLIQZ.Core._searchContainer + ' hidden');
            }
        }

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.addEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var urlbarIcons = document.getElementById('urlbar-icons');
        // add cliqz last search
        var cliqzLastSearch = document.createElement('hbox');
        // FIXME: We should find another way to deal with events that take time
        // to finish, like a disk read. A 250ms wait is not a good solution.
        setTimeout(function () {
            cliqzLastSearch.textContent = CliqzUtils.getLocalizedString('urlBarLastSearch');
        }, 250);

        cliqzLastSearch.className = 'hidden';  // Hide on start
        cliqzLastSearch.addEventListener('click', CLIQZ.Core.returnToLastSearch);

        urlbarIcons.parentNode.insertBefore(cliqzLastSearch, urlbarIcons);
        CLIQZ.Core.urlbarCliqzLastSearchContainer = cliqzLastSearch;
        CLIQZ.Core.elem.push(cliqzLastSearch);

        // browser handlers
        gBrowser.tabContainer.addEventListener("TabSelect", CLIQZ.Core.tabChange, false);
        gBrowser.tabContainer.addEventListener("TabClose", CLIQZ.Core.tabRemoved, false);
        // preferences
        CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        CLIQZ.Core.popup.style.maxHeight = CliqzUtils.cliqzPrefs.getIntPref('popupHeight') + 'px';

        //check APIs
        CliqzUtils.getCliqzResults('');
        CliqzUtils.getSuggestions('');

        CliqzAutocomplete.init();

        CliqzTimings.init();

        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);

        // detecting the languages that the person speak
        if ('gBrowser' in window) {
            CliqzLanguage.init(window);
            window.gBrowser.addProgressListener(CliqzLanguage.listener);
        }

        CLIQZ.Core.whoAmI(true); //startup
        CliqzUtils.log('Initialized', 'CORE');
    },
    checkSession: function(){
        var prefs = CliqzUtils.cliqzPrefs;
        if (!prefs.prefHasUserValue('session') || prefs.getCharPref('session') == ''){
            CliqzUtils.httpGet('chrome://cliqz/content/source.json?v=0.4.13',
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
               CliqzUtils.getDay()
               + '|' +
               (source || 'NONE');
    },
    returnToLastSearch: function (ev) {
        CLIQZ.Core.urlbar.mInputField.focus();
        CLIQZ.Core.urlbar.mInputField.setUserInput(ev.target.query);

        var action = {
            type: 'activity',
            action: 'last_search'
        };

        CliqzUtils.track(action);
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    showTutorial: function(onInstall){
        setTimeout(function(){
            var onlyReuse = onInstall ? false: true;
            CLIQZ.Core.openOrReuseTab(CliqzUtils.TUTORIAL_URL, CliqzUtils.INSTAL_URL, onlyReuse);
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
        CLIQZ.Core.popup.setAttribute('onpopuphiding', CLIQZ.Core._onpopuphiding);

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.removeEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var searchContainer = document.getElementById('search-container');
        if(CLIQZ.Core._searchContainer){
            searchContainer.setAttribute('class', CLIQZ.Core._searchContainer);
        }

        gBrowser.tabContainer.removeEventListener("TabSelect", CLIQZ.Core.tabChange, false);
        gBrowser.tabContainer.removeEventListener("TabClose", CLIQZ.Core.tabRemoved, false);

        // restore preferences
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Core._popupMaxHeight;

        CliqzAutocomplete.destroy();

        // remove listners
        if ('gBrowser' in window) {
            window.gBrowser.removeProgressListener(CliqzLanguage.listener);
        }
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
    },
    restart: function(){
        CLIQZ.Core.destroy();
        CLIQZ.Core.init();
    },
    updatePopupHeight: function(){

        var newHeight = Math.min(Math.max(CLIQZ.Core.popup.height, 160), 352);

        CliqzUtils.cliqzPrefs.setIntPref('popupHeight', newHeight);
        CLIQZ.Core.popup.style.maxHeight = newHeight;
    },
    tabChange: function(ev){
        //clean last search to avoid conflicts
        CliqzAutocomplete.lastSearch = '';

        if(CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel])
            CLIQZ.Core.showLastQuery(CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel]);
        else CLIQZ.Core.hideLastQuery();
    },
    tabRemoved: function(ev){
        delete CLIQZ.Core.lastQueryInTab[ev.target.linkedPanel];
    },
    popupEvent: function(open) {
        var action = {
            type: 'activity',
            action: 'dropdown_' + (open ? 'open' : 'close')
        };

        CliqzUtils.track(action);
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
            search: CliqzUtils.isSearch(item.getAttribute('url'))
        };

        CliqzUtils.track(action);
    },
    isAutocomplete: function(base, candidate){
        if(base.indexOf('://') !== -1){
           base = base.split('://')[1];
        }
        base = base.replace('www.', '');

        return base.indexOf(candidate) == 0;
    },
    lastQuery: function(){
        var val = CLIQZ.Core.urlbar.value.trim(),
            lastQ = CliqzAutocomplete.lastSearch.trim();

        if(lastQ && val && !CliqzUtils.isUrl(lastQ) && (val == lastQ || !CLIQZ.Core.isAutocomplete(val, lastQ) )){
            CLIQZ.Core.showLastQuery(lastQ);
            CLIQZ.Core.lastQueryInTab[gBrowser.selectedTab.linkedPanel] = lastQ;
        } else {
            // remove last query if the user ended his search session
            if(CliqzUtils.isUrl(lastQ))
                delete CLIQZ.Core.lastQueryInTab[gBrowser.selectedTab.linkedPanel];
        }
    },
    hideLastQuery: function(){
        CLIQZ.Core.urlbarCliqzLastSearchContainer.className = 'hidden';
    },
    showLastQuery: function(q){
        var lastQContainer = CLIQZ.Core.urlbarCliqzLastSearchContainer;
        lastQContainer.className = 'cliqz-urlbar-Last-search';
        lastQContainer.textContent = q;
        lastQContainer.tooltipText = q;
        lastQContainer.query = q;
    },
    urlbarfocus: function() {
        CLIQZ.Core.hideLastQuery();
        CLIQZ.Core.urlbarEvent('focus');
    },
    urlbarblur: function(ev) {
        CLIQZ.Core.lastQuery();
        CLIQZ.Core.urlbarEvent('blur');
    },
    urlbarEvent: function(ev) {
        var action = {
            type: 'activity',
            action: 'urlbar_' + ev
        };

        CliqzUtils.track(action);
    },
    whoAmI: function(startup){
        // schedule another signal
        setTimeout(function(){ CLIQZ.Core.whoAmI(); }, CLIQZ.Core.INFO_INTERVAL);

        CLIQZ.Core.handleTimings();
        CliqzABTests.check();

        var start = (new Date()).getTime();
        CliqzHistoryManager.getStats(function(history){
            CliqzUtils.log((new Date()).getTime() - start,"HISTORY CHECK TIME");
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
                    prefs: CliqzUtils.getPrefs()
                };

                CliqzUtils.track(info);
            });
        });
    },
    // Reset collection of timing data at regular intervals, send log if pref set.
    handleTimings: function() {
        CliqzTimings.send_log("result", 1000);
        CliqzTimings.send_log("search_history", 200);
        CliqzTimings.send_log("search_cliqz", 1000);
        CliqzTimings.send_log("search_suggest", 500);
        CliqzTimings.send_log("send_log", 2000);
    },
    showUpdateMessage: function(){
        if(CLIQZ.Core._messageOFF){
            CLIQZ.Core._messageOFF = false;
            if(confirm(CliqzUtils.getLocalizedString('updateMessage'))){
                gBrowser.addTab(CliqzUtils.UPDATE_URL);
            }
            CLIQZ.Core._messageOFF = true;
        }
    },
    showUninstallMessage: function(currentVersion){
        var UNINSTALL_PREF = 'uninstallVersion',
            lastUninstallVersion = CliqzUtils.getPref(UNINSTALL_PREF, '');

        if(lastUninstallVersion != currentVersion){
            CliqzUtils.setPref(UNINSTALL_PREF, currentVersion);
            gBrowser.selectedTab = gBrowser.addTab(CliqzUtils.UNINSTALL);
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
                action.search = CliqzUtils.isSearch(item.getAttribute('url'));
            } else { //enter while on urlbar and no result selected

                // update the urlbar if a suggestion is selected
                var suggestions = popup._suggestions.childNodes,
                    SEL = ' cliqz-suggestion-default';

                for(var i in suggestions){
                    var s = suggestions[i];

                    if(s.className && s.className.indexOf('cliqz-suggestion') != -1 && s.className.indexOf(SEL) != -1){
                        CLIQZ.Core.urlbar.mInputField.setUserInput(s.suggestion);

                        ev.preventDefault();
                        return;
                    }
                }


                if(CliqzUtils.isUrl(inputValue)){
                    action.position_type = 'inbar_url';
                    action.search = CliqzUtils.isSearch(inputValue);
                }
                else action.position_type = 'inbar_query';
                action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;
                if(action.autocompleted){
                    let first = popup.richlistbox.childNodes[0],
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
            }
            CliqzUtils.track(action);
        }

        if(code == 38 || code == 40){
            clearTimeout(CLIQZ.Core.locationChangeTO);
            // postpone navigation to allow richlistbox update
            setTimeout(function(){
                CliqzUtils.navigateToItem(
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

        if(code == 9) { //tab - navigate through suggestions
            ev.preventDefault();

            var suggestions = popup._suggestions.childNodes,
                SEL = ' cliqz-suggestion-default';

            for(var i =0; i < suggestions.length; i++){
                var s = suggestions[i];
                if(s.className && s.className.indexOf('cliqz-suggestion') != -1 && s.className.indexOf(SEL) != -1){
                    s.className = s.className.replace(SEL, '');

                    if(i <= suggestions.length - 1){ //not last one
                        if(!ev.shiftKey){ // loop right
                            for(var j=i+1; j < suggestions.length; j++){
                                if(suggestions[j] && suggestions[j].className && suggestions[j].className.indexOf('cliqz-suggestion') != -1){
                                    suggestions[j].className += SEL;
                                    break;
                                }
                            }
                        } else { // loop left
                            for(var j=i-1; j >=0 ; j--){
                                if(suggestions[j] && suggestions[j].className && suggestions[j].className.indexOf('cliqz-suggestion') != -1){
                                    suggestions[j].className += SEL;
                                    break;
                                }
                            }
                        }
                    }

                    return;
                }
            }

            suggestions[ev.shiftKey ? suggestions.length-1 : 0].className += ' cliqz-suggestion-default';
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
        CliqzUtils.openOrReuseAnyTab(newUrl, oldUrl, onlyReuse);
    }
};
