'use strict';

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
        CLIQZ.Core.cliqzPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.');

        if(CLIQZ.Utils.isPrivate(window) && !CLIQZ.Core.cliqzPrefs.getBoolPref('inPrivate')){
            CLIQZ.Utils.log('private window -> halt', 'CORE');
            return;
        }

        var css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/browser.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);
        css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/logo.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);

        if(CLIQZ.Core.cliqzPrefs.getBoolPref('bwFonts')){
            css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/bw.css?rand='+Math.random());
            CLIQZ.Core.elem.push(css);
        }
        // TEMP
        /*
        var scale = CLIQZ.Core.cliqzPrefs.getIntPref('scale');
        css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/scale' + scale + '.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);

        var logoPosition = CLIQZ.Core.cliqzPrefs.getIntPref('logoPosition');
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

        if (CLIQZ.Core.cliqzPrefs.getCharPref('UDID') == ''){
            CLIQZ.Core.cliqzPrefs.setCharPref('UDID', Math.random().toString().split('.')[1] + '|' + CLIQZ.Utils.getDay());
            CLIQZ.Core.showTutorial(true);
        } else {
            CLIQZ.Core.showTutorial(false);
        }

        CLIQZ.Core._autocompletesearch = CLIQZ.Core.urlbar.getAttribute('autocompletesearch');
        CLIQZ.Core.urlbar.setAttribute('autocompletesearch', /*'urlinline */'cliqz-results');// + urlbar.getAttribute('autocompletesearch')); /* urlinline history'*/

        CLIQZ.Core._autocompletepopup = CLIQZ.Core.urlbar.getAttribute('autocompletepopup');
        CLIQZ.Core.urlbar.setAttribute('autocompletepopup', /*'PopupAutoComplete'*/ 'PopupAutoCompleteRichResult');
        

        CLIQZ.Core._onpopuphiding = CLIQZ.Core.urlbar.getAttribute('onpopuphiding');
        CLIQZ.Core.popup.setAttribute('onpopuphiding', 
            'CLIQZ.Core.popupEvent(false) ' + CLIQZ.Core.popup.getAttribute('onpopuphiding'));
        // document.getElementById('PopupAutoCompleteRichResult').onscroll =
        //    function(el){
        //        CLIQZ.Core.updateProgress(el.originalTarget);
        //    };
        var searchContainer = document.getElementById('search-container');
        CLIQZ.Core._searchContainer = searchContainer.getAttribute('class');
        if (CLIQZ.Core.cliqzPrefs.getBoolPref('hideQuickSearch')){
            searchContainer.setAttribute('class', CLIQZ.Core._searchContainer + ' hidden');
        }
        
        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.addEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        // add cliqz message button
        var cliqzMessage = document.createElement('hbox');
        //cliqzMessage.className = 'cliqz-urlbar-message'; //-> added on focus 
        var sibling = document.getElementById('urlbar-icons');
        sibling.parentNode.insertBefore(cliqzMessage, sibling);
        CLIQZ.Core.urlbarCliqzMessageContainer = cliqzMessage;
        CLIQZ.Core.elem.push(cliqzMessage);

        // preferences
        CLIQZ.Core._popupMaxHeight = CLIQZ.Core.popup.style.maxHeight;
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Core.cliqzPrefs.getIntPref('popupHeight') + 'px';

        //check APIs 
        CLIQZ.Utils.getCachedResults();
        CLIQZ.Utils.getSuggestions();

        Cu.import('chrome://cliqz/content/cliqz-results.js?r=' + Math.random());
        CLIQZResults.init();

        
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
        
        CLIQZ.historyManager.init();
        CLIQZ.Core.whoAmI(true); //startup
        CLIQZ.Utils.log('Initialized', 'CORE');
    },
    //opens tutorial page on first install or at reinstall if reinstall is done through onboarding
    showTutorial: function(onInstall){
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
        CLIQZ.Core.urlbar.setAttribute('onpopuphiding', CLIQZ.Core._onpopuphiding);

        for(var i in CLIQZ.Core.urlbarEvents){
            var ev = CLIQZ.Core.urlbarEvents[i];
            CLIQZ.Core.urlbar.removeEventListener(ev, CLIQZ.Core['urlbar' + ev]);
        }

        var searchContainer = document.getElementById('search-container');
        searchContainer.setAttribute('class', CLIQZ.Core._searchContainer);

        // restore preferences
        CLIQZ.Core.popup.style.maxHeight = CLIQZ.Core._popupMaxHeight;

        CLIQZResults.destroy();
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
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
            current_position: pos,
            position_type: source.replace('-', '_')
        };

        CLIQZ.Utils.track(action);
    },
    urlbarfocus: function() {
        setTimeout(CLIQZ.Core.urlbarMessage, 20);
        CLIQZ.Core.urlbarEvent('focus');
    },
    urlbarblur: function() {
        setTimeout(function(){
            CLIQZ.Core.urlbarCliqzMessageContainer.className = 'hidden';
        }, 25);
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
        setTimeout(CLIQZ.Core.whoAmI, CLIQZ.Core.INFO_INTERVAL);

        var start = (new Date()).getTime();
        CLIQZ.historyManager.getStats(function(history){
            CLIQZ.Utils.log((new Date()).getTime() - start,"HISTORY CHECK TIME");
            Application.getExtensions(function(extensions) {
                var beVersion = extensions.get('cliqz@cliqz.com').version;
                var info = {
                    type: 'environment',
                    agent: navigator.userAgent,
                    version: beVersion,
                    history_days: history.days,
                    history_urls: history.size,
                    startup: startup? true: false
                };

                CLIQZ.Utils.track(info);

                CLIQZ.Core.updateCheck(beVersion);
            });
        });
    },
    updateCheck: function(currentVersion, withFeedback) {
        var pref = CLIQZ.Core.cliqzPrefs,
            now = (new Date()).getTime();

        CLIQZ.Core._updateAvailable = false;
        if(withFeedback || now - +pref.getCharPref('messageUpdate') > pref.getIntPref('messageInterval')){
            CLIQZ.Core.cliqzPrefs.setCharPref('messageUpdate', now.toString());
            CLIQZ.Utils.getLatestVersion(function(latestVersion){
                if(currentVersion != latestVersion){
                    if(!CLIQZ.Core.cliqzPrefs.getBoolPref('betaGroup')){
                        // production users get only major updates
                        if(currentVersion.split('.').slice(0, -1).join('') ==
                           latestVersion.split('.').slice(0, -1).join('')) {
                            return;
                        }
                    }
                    CLIQZ.Core._updateAvailable = true;
                    CLIQZ.Core.showUpdateMessage();
                } else {
                    //if no newer version
                    withFeedback && alert(CLIQZ.Utils.getLocalizedString('noUpdateMessage'));
                }
            }, function(){
                //on error
                withFeedback && alert(CLIQZ.Utils.getLocalizedString('noUpdateMessage'));
            });
        }
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
    urlbarMessage: function() {
        if(CLIQZ.Core.urlbar.value.length > 0){
            if(CLIQZ.Core.popup.selectedIndex !== -1 ||
                CLIQZ.Utils.isUrl(CLIQZ.Core.urlbar.value)){
                CLIQZ.Core.urlbarCliqzMessageContainer.textContent = CLIQZ.Utils.getLocalizedString('urlbarNavigate');
                CLIQZ.Core.urlbarCliqzMessageContainer.className = 'cliqz-urlbar-message-navigate';
            } else {
                CLIQZ.Core.urlbarCliqzMessageContainer.textContent = CLIQZ.Utils.getLocalizedString('urlbarSearch');
                CLIQZ.Core.urlbarCliqzMessageContainer.className = 'cliqz-urlbar-message-search';
            }
        } else {
            CLIQZ.Core.urlbarCliqzMessageContainer.className = 'hidden';
        }
    },
    urlbarkeydown: function(ev){
        var code = ev.keyCode,
            popup = CLIQZ.Core.popup;

        CLIQZ.Core._lastKey = ev.keyCode;
        setTimeout(CLIQZ.Core.urlbarMessage, 20); //allow index to change

        if(code == 13){
            var index = popup.selectedIndex;
            var action = {
                    type: 'activity',
                    action: 'result_enter',
                    current_position: index
                };
            if(index != -1){
                let item = popup.richlistbox._currentItem

                var source = item.getAttribute('source');
                if(source.indexOf('action') > -1){
                    source = 'tab_result';
                }
                action.position_type = source.replace('-', '_');
            } else { //enter while on urlbar and no result selected
                action.position_type = CLIQZ.Utils.isUrl(CLIQZ.Core.urlbar.value) ? 'inbar_url' : 'inbar_query';
                action.autocompleted = CLIQZ.Core.urlbar.selectionEnd !== CLIQZ.Core.urlbar.selectionStart;

                // TEMP
                /*
                if(CLIQZ.Core.cliqzPrefs.getBoolPref('enterLoadsFirst')){
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
                var index = popup.selectedIndex,
                    action = {
                        type: 'activity',
                        action: 'arrow_key',
                        current_position: index
                    };
                if(index != -1){
                    let item = popup.richlistbox._currentItem,
                        value = item.getAttribute('url');

                    var source = item.getAttribute('source');
                    if(source.indexOf('action') > -1){
                        source = 'tab_result';
                    }
                    action.position_type = source.replace('-', '_');
                    if(item.getAttribute('type') === 'cliqz-suggestions'){
                        value = Services.search.defaultEngine.getSubmission(value).uri.spec;
                    }
                    else if(value.indexOf('http') !== 0) value = 'http://' + value;

                    // TEMP
                    //if(CLIQZ.Core.cliqzPrefs.getBoolPref('pagePreload')){
                    // ENDTEMP
                    CLIQZ.Core.locationChangeTO = setTimeout(function(){
                        gBrowser.selectedBrowser.contentDocument.location = value;
                    }, 500);

                    //}
                }
                CLIQZ.Utils.track(action);
            },0);

            // avoid looping through results
            if((code == 40 && popup.selectedIndex === CLIQZ.Core.urlbar.popup._currentIndex - 1) ||
               (code == 38 && popup.selectedIndex === - 1)) {
                ev.preventDefault();
            }
        //ev.preventDefault();
        }
    },
    // autocomplete query inline
    autocompleteQuery: function(firstResult){   
        setTimeout(CLIQZ.Core.urlbarMessage, 20); //allow index to change
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
    // 
    openOrReuseTab: function(newUrl, oldUrl, onlyReuse) {
        var found = false;

        // optimistic search
        if(gBrowser.selectedTab.linkedBrowser.contentWindow.location.href == oldUrl){
            gBrowser.selectedTab.linkedBrowser.contentWindow.location.href = newUrl;
            return;
        }

        // heavy hearch
        if(!found){
            CLIQZ.Utils.openOrReuseAnyTab(newUrl, oldUrl, onlyReuse);
        }
    }
};