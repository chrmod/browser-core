'use strict';

var CLIQZ = CLIQZ || {};
CLIQZ.Core = CLIQZ.Core || {
    ITEM_HEIGHT: 50,
    POPUP_HEIGHT: 100,
    INFO_INTERVAL: 60 * 60 * 1e3, // 1 hour
    elem: [], // elements to be removed at uninstall
    urlbarEvents: ['focus', 'blur', 'keydown'],
    UPDATE_URL: 'http://beta.cliqz.com/latest',
    TUTORIAL_URL: 'http://beta.cliqz.com/anleitung',
    INSTAL_URL: 'http://beta.cliqz.com/code-verified',
    _messageOFF: true, // no message shown
    _lastKey:0,
    init: function(){
        CLIQZ.Utils.init();

        if(CLIQZ.Utils.isPrivate(window)){
            CLIQZ.Utils.log('private window -> halt', 'CORE');
            return;
        }

        var css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/browser.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);
        css = CLIQZ.Utils.addStylesheetToDoc(document,'chrome://cliqzres/content/skin/logo.css?rand='+Math.random());
        CLIQZ.Core.elem.push(css);

        CLIQZ.Core.urlbar = document.getElementById('urlbar');
        CLIQZ.Core.popup = document.getElementById('PopupAutoCompleteRichResult');
        CLIQZ.Core.urlbarPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('browser.urlbar.');
        CLIQZ.Core.cliqzPrefs = Components.classes['@mozilla.org/preferences-service;1']
                .getService(Components.interfaces.nsIPrefService).getBranch('extensions.cliqz.');

        if (CLIQZ.Core.cliqzPrefs.getCharPref('UDID') == ''){
            CLIQZ.Core.cliqzPrefs.setCharPref('UDID', Math.random().toString().split('.')[1] + '|' + CLIQZ.Utils.getDay());
            setTimeout(function(){
                // open tutorial page and focus it
                // gBrowser.selectedTab = gBrowser.addTab(CLIQZ.Core.TUTORIAL_URL);

                // try to redirect install url to tutorial url
                CLIQZ.Core.openOrReuseTab(CLIQZ.Core.TUTORIAL_URL, CLIQZ.Core.INSTAL_URL);
            },2000);
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
        searchContainer.setAttribute('class', CLIQZ.Core._searchContainer + ' hidden');
        
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

        //check APIs 
        CLIQZ.Utils.getCachedResults();
        CLIQZ.Utils.getSuggestions();

        CLIQZ.Core.whoAmI(true); //startup
        setInterval(CLIQZ.Core.whoAmI, CLIQZ.Core.INFO_INTERVAL);

        Cu.import('chrome://cliqz/content/cliqz-results.js?r=' + Math.random());
        CLIQZResults.init();

        
        CLIQZ.Core.reloadComponent(CLIQZ.Core.urlbar);
        CLIQZ.Utils.log('Initialized', 'CORE');
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
        var start = (new Date()).getTime();
        CLIQZ.historyManager.getStats(function(history){
            CLIQZ.Utils.log((new Date()).getTime() - start,"TIMEEE1");
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
    updateCheck: function(version) {
        var pref = CLIQZ.Core.cliqzPrefs,
            now = (new Date()).getTime();
        if(now - +pref.getCharPref('messageUpdate') > pref.getIntPref('messageInterval')){
            CLIQZ.Utils.getLatestVersion(function(latest){
                if(latest.status == 200 && version != latest.response){
                    pref.setCharPref('messageUpdate', now.toString());
                    if(CLIQZ.Core._messageOFF){
                        CLIQZ.Core._messageOFF = false;
                        if(confirm(CLIQZ.Utils.getLocalizedString('updateMessage'))){
                            gBrowser.addTab(CLIQZ.Core.UPDATE_URL + '?' + Math.random());
                        }
                        CLIQZ.Core._messageOFF = true;
                    }
                }
            });
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

                    CLIQZ.Core.locationChangeTO = setTimeout(function(){
                        gBrowser.selectedBrowser.contentDocument.location = value;
                    }, 500);
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
    openOrReuseTab: function(newUrl, oldUrl) {
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
                         .getService(Components.interfaces.nsIWindowMediator);
        var browserEnumerator = wm.getEnumerator('navigator:browser');

        // Check each browser instance for our URL
        var found = false;
        if(oldUrl){ // only look for an already open tab if old url provided
            while (!found && browserEnumerator.hasMoreElements()) {
                var browserWin = browserEnumerator.getNext();
                var tabbrowser = browserWin.gBrowser;

                // Check each tab of this browser instance
                var numTabs = tabbrowser.browsers.length;
                for (var index = 0; index < numTabs; index++) {
                    var currentBrowser = tabbrowser.getBrowserAtIndex(index);
                    if (oldUrl == currentBrowser.currentURI.spec) {
                        var tab = tabbrowser.tabContainer.childNodes[index];
                        // The URL is already opened. Select this tab.
                        tabbrowser.selectedTab = tab;

                        // redirect tab to new url
                        tab.linkedBrowser.contentWindow.location.href = newUrl;
                        
                        // Focus *this* browser-window
                        browserWin.focus();

                        found = true;
                        break;
                    }
                }
            }
        }

        // Our URL isn't open. Open it now.
        if (!found) {
            var recentWindow = wm.getMostRecentWindow("navigator:browser");
            if (recentWindow) {
              // Use an existing browser window
              recentWindow.delayedOpenTab(newUrl, null, null, null, null);
            }
            else {
              // No browser windows are open, so open a new one.
              window.open(newUrl);
            }
        }
    }
};