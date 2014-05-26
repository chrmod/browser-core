'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm');

var CLIQZ = CLIQZ || {};
CLIQZ.Components = CLIQZ.Components || {
    XULNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    _appendCurrentResult: function (popup) {
        var controller = popup.mInput.controller;
        var matchCount = popup._matchCount;
        var existingItemsCount = popup.richlistbox.childNodes.length;

        // CLIQZ START
        popup._suggestions = popup._suggestions || document.getAnonymousElementByAttribute(popup, "anonid", "cliqz-suggestions");
        popup._cliqzMessage = popup._cliqzMessage || document.getAnonymousElementByAttribute(popup, "anonid", "cliqz-navigation-message");

        popup._cliqzMessage.textContent = 'top ' + matchCount + ' results of 3.6B documents';
        // trim the leading/trailing whitespace
        var trimmedSearchString = controller.searchString.replace(/^\s+/, '').replace(/\s+$/, '');

        if (popup._currentIndex == 0) {
            CLIQZ.Core.autocompleteQuery(controller.getValueAt(popup._currentIndex));
            popup._suggestions.textContent = "";
            popup._suggestions.pixels = 20 /* container padding */;
        }
        // CLIQZ END

        // Process maxRows per chunk to improve performance and user experience
        for (let i = 0; i < popup.maxRows; i++) {
            if (popup._currentIndex >= matchCount)
                return;

            // CLIQZ START
            if(controller.getStyleAt(popup._currentIndex) == 'cliqz-suggestions'){
                CLIQZ.Components.addSuggestion(popup, controller.getValueAt(popup._currentIndex));
                popup._currentIndex++;
                continue;
            }
            // CLIQZ END

            var item;

            // trim the leading/trailing whitespace
            // var trimmedSearchString = controller.searchString.replace(/^\s+/, ').replace(/\s+$/, ');

            // Unescape the URI spec for showing as an entry in the popup
            let url = Components.classes['@mozilla.org/intl/texttosuburi;1'].
            getService(Components.interfaces.nsITextToSubURI).
            unEscapeURIForUI('UTF-8', controller.getValueAt(popup._currentIndex));

            if (typeof popup.input.trimValue == 'function')
                url = popup.input.trimValue(url);

            if (popup._currentIndex < existingItemsCount) {
                // re-use the existing item
                item = popup.richlistbox.childNodes[popup._currentIndex];

                // Completely re-use the existing richlistitem if it's the same
                if (item.getAttribute('text') == trimmedSearchString &&
                    item.getAttribute('url') == url) {
                    item.collapsed = false;
                    popup._currentIndex++;
                    continue;
                }
            } else {
                // need to create a new item
                item = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'richlistitem');
            }

            // set these attributes before we set the class
            // so that we can use them from the constructor
            item.setAttribute('image', controller.getImageAt(popup._currentIndex));
            item.setAttribute('url', url);
            item.setAttribute('title', controller.getCommentAt(popup._currentIndex));
            item.setAttribute('type', controller.getStyleAt(popup._currentIndex));
            item.setAttribute('text', trimmedSearchString);

            if (popup._currentIndex < existingItemsCount) {
                // re-use the existing item
                item._adjustAcItem();
                item.collapsed = false;
            } else {
                // set the class at the end so we can use the attributes
                // in the xbl constructor
                item.className = 'autocomplete-richlistitem';
                popup.richlistbox.appendChild(item);
            }

            // CLIQZ START
            item.setAttribute('source', controller.getStyleAt(popup._currentIndex).replace('favicon', 'history'));
            setTimeout(CLIQZ.Components.cliqzEnhancements, 0, item);

            // CLIQZ END

            popup._currentIndex++;
        }

        // yield after each batch of items so that typing the url bar is responsive
        setTimeout(function (popup) { CLIQZ.Components._appendCurrentResult(popup); }, 0, popup);
    },
    addSuggestion: function(popup, suggestion){
        var container = popup._suggestions,
            nameEl = document.createElementNS(CLIQZ.Components.XULNS, 'span');

        nameEl.className = 'cliqz-suggestion';
        nameEl.textContent = suggestion;
        nameEl.suggestion = suggestion;

        container.appendChild(nameEl);

        container.pixels += nameEl.clientWidth + 10 /*padding*/ ;

        //remove last child if it doesn't fit on one row
        if(container.pixels > popup.mInput.clientWidth)
            container.removeChild(container.lastChild);
    },
    suggestionClick: function(ev){
        if(ev && ev.target && ev.target.suggestion){
            CLIQZ.Core.urlbar.mInputField.focus();
            CLIQZ.Core.urlbar.mInputField.setUserInput(ev.target.suggestion);
        }
    },
    cliqzCreateSearchOptionsItem: function(engineContainer){
        var engines = ResultProviders.getSearchEngines();

        var txt = document.createElementNS(CLIQZ.Components.XULNS, 'span');
        txt.textContent = 'noch mehr ...';
        txt.className = 'cliqz-engines-text';
        engineContainer.appendChild(txt);

        for(var idx in engines){
            var engine = engines[idx],
                imageEl = document.createElementNS(CLIQZ.Components.XULNS, 'image');

            imageEl.className = 'cliqz-engine';
            imageEl.setAttribute('src', engine.icon);
            imageEl.tooltipText = engine.name + '  ' + engine.prefix;
            imageEl.engine = engine.name;

            engineContainer.appendChild(imageEl);
        }
    },
    engineClick: function(ev){
        if(ev && ev.target && ev.target.engine){
            var engine;
            if(engine = Services.search.getEngineByName(ev.target.engine)){
                var urlbar = CLIQZ.Core.urlbar,
                    userInput = urlbar.value;

                // avoid autocompleted urls
                if(urlbar.selectionStart &&
                   urlbar.selectionEnd &&
                   urlbar.selectionStart != urlbar.selectionEnd){
                    userInput = userInput.slice(0, urlbar.selectionStart);
                }

                var url = engine.getSubmission(userInput).uri.spec;

                if(ev.metaKey || ev.ctrlKey){
                    gBrowser.addTab(url);
                } else {
                    gBrowser.selectedBrowser.contentDocument.location = url;
                    CLIQZ.Core.popup.closePopup();
                }
            }
        }
    },
    cliqzEnhancements: function (item) {
        // add here all the custom UI elements for an item
        var url = item.getAttribute('url'),
            source = item.getAttribute('source'),
            urlDetails = CLIQZ.Utils.getDetailsFromUrl(url),
            domainDefClass = '';

        item._cliqzUrlType = item._cliqzUrlType || document.getAnonymousElementByAttribute(item, 'anonid', 'url-type');
        item._cliqzUrlType.className = 'cliqz-left-separator';

        item._cliqzImage = item._cliqzImage || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-image');
        item._cliqzImage.setAttribute('src', '');
        item._cliqzImage.className = '';

        item._cliqzImageDesc = item._cliqzImageDesc || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-image-desc');
        item._cliqzImageDesc.textContent = '';
        item._cliqzImageDesc.className = '';
        item._cliqzImageDesc.parentNode.className = 'hidden';

        item._logo = item._logo || document.getAnonymousElementByAttribute(item, 'anonid', 'logo');
        item._logo.className = '';

        //item._source.textContent = source;

        item._cliqzUrlDetails = item._cliqzUrlDetails || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-url-details');
        item._cliqzTitleDetails = item._cliqzTitleDetails || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-title-details');

        while (item._cliqzUrlDetails.hasChildNodes()) {
            item._cliqzUrlDetails.removeChild(item._cliqzUrlDetails.firstChild);
        }

        while (item._cliqzTitleDetails.hasChildNodes()) {
            item._cliqzTitleDetails.removeChild(item._cliqzTitleDetails.firstChild);
        }

        if (urlDetails && source !== 'cliqz-suggestions' && source !== 'cliqz-custom') {
            // add logo
            item._logo.className = 'cliqz-ac-logo-icon ';
            // lowest priority: base domain, no tld
            item._logo.className += ' logo-' + urlDetails.name;
            // domain.tld
            item._logo.className += ' logo-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
            if (urlDetails.subdomains.length > 0) {
                // subdomain.domain - to match domains like maps.google.co.uk and maps.google.de with maps-google
                item._logo.className += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name;
                // subdomain.domain.tld
                item._logo.className += ' logo-' + urlDetails.subdomains[urlDetails.subdomains.length - 1] + '-' + urlDetails.name + '-' + urlDetails.tld.replace('.', '-');
            }

            // add lock
            if (urlDetails.ssl) {
                item._cliqzUrlType.className += ' cliqz-ac-site-icon-ssl';
            }

            // add video thumbnail
            if (item.getAttribute('image') != 'null' && item.getAttribute('image') != '') {
                let img = JSON.parse(item.getAttribute('image'));

                item._cliqzImage.className = 'cliqz-ac-image';
                item._cliqzImage.setAttribute('src', img.image);

                if (img.description) {
                    item._cliqzImageDesc.textContent = CLIQZ.Utils.getLocalizedString('arrow') + img.description;
                    item._cliqzImageDesc.className = 'cliqz-image-desc';
                    item._cliqzImageDesc.parentNode.className = '';
                }
            }
            //}

            // remove default
            item._url.textContent = '';
            item._urlOverflowEllipsis.value = '';

            var span;
            span = item._cliqzUrlDetails.appendChild(
                document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
            span.className = domainDefClass + ' cliqz-ac-url-host';
            span.textContent = urlDetails.host;

            span = item._cliqzUrlDetails.appendChild(
                document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
            span.className = domainDefClass + ' cliqz-ac-url-path';
            span.textContent = urlDetails.path;

        } else { // suggestions or custom results
            var title = JSON.parse(item.getAttribute('title'));

            // remove default
            item._url.textContent = '';
            item._urlOverflowEllipsis.value = '';
            item._title.textContent = ''

            CLIQZ.Components.appendElements(item._cliqzTitleDetails, title);
        }
    },
    // appends list of elements to a target
    // elements is an array or [[content, class],...] pairs
    appendElements: function(target, elements){
        for(var el of elements){
            target.appendChild(
                CLIQZ.Components.createElement(
                    el[0],
                    el[1]
                )
            );
        }
    },
    // creates an xhtml element with content and custom style
    createElement: function(content, cssClass) {
        var span = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');

        span.className = cssClass;
        span.textContent = content;

        return span;
    }
}