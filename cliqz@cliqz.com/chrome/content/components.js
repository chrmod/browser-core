'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.16');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.4.16');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm?v=0.4.16');

var IMAGE_HEIGHT = 54;

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

function constructImageElement(data, imageEl, imageDesc){
    imageEl.setAttribute('src', '');
    imageEl.className = '';
    imageEl.style.width = '';
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

        CliqzUtils.log('ratio=' + ratio + " src=" + img.src, "cliqzEnhancements");

        // only show the image if the ratio is between 0.4 and 2.5
        if(ratio == 0 || ratio > 0.4 && ratio < 2.5){
            imageEl.className = 'cliqz-ac-image';
            imageEl.style.backgroundImage = "url(" + img.src + ")";
            if(ratio > 0) {
                imageEl.style.backgroundSize = height * ratio + 'px';
                imageEl.style.width = height * ratio + 'px';
                imageEl.style.height = height + 'px';
            }
            if (imageDesc && img.duration) {
                imageDesc.textContent = CliqzUtils.getLocalizedString('arrow') + img.duration;
                imageDesc.className = 'cliqz-image-desc';
                imageDesc.parentNode.className = '';
            }
        }
    }
}

var NEWS_SOURCE_WIDTH = 300;

var CLIQZ = CLIQZ || {};
CLIQZ.Components = CLIQZ.Components || {
    XULNS: "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
    computeDocNo: function(q){
        var hash = CLIQZ.Components.getHashFromKey(q)
        return (parseInt(2453465474 / Math.pow(q.length, 2) + hash % 100000)).toLocaleString();
    },
    getHashFromKey: function(q) {
        var t = 0;
        for(var k = 0; k<q.length; k++) t += q.charCodeAt(0);

        return t;
    },
    _appendCurrentResult: function (popup) {
        var controller = popup.mInput.controller;
        var matchCount = popup._matchCount;
        var existingItemsCount = popup.richlistbox.childNodes.length;

        // CLIQZ START

        // trim the leading/trailing whitespace
        var trimmedSearchString = controller.searchString.replace(/^\s+/, '').replace(/\s+$/, '');

        popup._suggestions = popup._suggestions || document.getAnonymousElementByAttribute(popup, "anonid", "cliqz-suggestions");
        popup._cliqzMessage = popup._cliqzMessage || document.getAnonymousElementByAttribute(popup, "anonid", "cliqz-navigation-message");

        popup._cliqzMessage.textContent = trimmedSearchString ? 'Top ' + matchCount + ' Ergebnisse' : '';


        if (popup._currentIndex == 0) {
            CLIQZ.Core.autocompleteQuery(controller.getValueAt(popup._currentIndex));
            popup._suggestions.textContent = "";
            popup._suggestions.pixels = 20 /* container padding */;

            var successfullyAdded = 0;
            for(var i in CliqzAutocomplete.lastSuggestions){
                var suggessfullyAdded = CLIQZ.Components.addSuggestion(
                                            popup,
                                            CliqzAutocomplete.lastSuggestions[i],
                                            trimmedSearchString,
                                            successfullyAdded //real position
                                        );
                if(suggessfullyAdded){
                    successfullyAdded++
                }
            }

            if(successfullyAdded > 0){
                var action = {
                    type: 'activity',
                    action: 'suggestions',
                    count: successfullyAdded
                };

                CliqzUtils.track(action);
            }

            var cliqzResultUrl;
            if(cliqzResultUrl = CliqzUtils.getPref('cliqzResult', false)){
                var sBox = popup.richlistbox._scrollbox,
                    iframe;
                if(sBox.childNodes.length > 1){
                    iframe = sBox.childNodes[0];
                } else {
                    iframe = document.createElementNS('http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul', 'iframe')
                }

                iframe.setAttribute('src', cliqzResultUrl + encodeURIComponent(trimmedSearchString));
                sBox.insertBefore(iframe, sBox.childNodes[0]);
            }
        }
        // CLIQZ END

        // Process maxRows per chunk to improve performance and user experience
        for (let i = 0; i < popup.maxRows; i++) {
            if (popup._currentIndex >= matchCount)
                return;

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
            if(CliqzAutocomplete.lastResult && CliqzAutocomplete.lastResult.getDataAt(popup._currentIndex)){
                // can we avoid JSON stringify here?
                var data = JSON.stringify(CliqzAutocomplete.lastResult.getDataAt(popup._currentIndex));
                item.setAttribute('cliqzData', data);
            } else {
                item.setAttribute('cliqzData','');
            }

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
            setTimeout(CLIQZ.Components.cliqzEnhancements, 0, item, CLIQZ.Core.popup.width);
            // CLIQZ END

            popup._currentIndex++;
        }

        // yield after each batch of items so that typing the url bar is responsive
        setTimeout(function (popup) { CLIQZ.Components._appendCurrentResult(popup); }, 0, popup);
    },
    addSuggestion: function(popup, suggestion, q, position){
        var container = popup._suggestions,
            suggestionWrapper = document.createElementNS(CLIQZ.Components.XULNS, 'description'),
            sugestionText = document.createElementNS(CLIQZ.Components.XULNS, 'description'),
            extra = document.createElementNS(CLIQZ.Components.XULNS, 'description');

        suggestionWrapper.className = 'cliqz-suggestion';
        extra.className = 'cliqz-suggestion-extra';
        sugestionText.className = 'cliqz-no-margin-padding';

        if(q && suggestion.indexOf(q) == 0){
            sugestionText.textContent = q;
            var extraText = suggestion.slice(q.length);
            //FIXME : this is not nice
            if(extraText.indexOf(' ') == 0)extra.className += ' cliqz-one-space';
            extra.textContent = extraText;
        } else {
            sugestionText.textContent = suggestion;
        }

        suggestionWrapper.appendChild(sugestionText);
        suggestionWrapper.appendChild(extra);

        suggestionWrapper.suggestion = suggestion; // original suggestion used at selection
        suggestionWrapper.position = position;

        container.appendChild(suggestionWrapper);

        container.pixels += suggestionWrapper.clientWidth + 10 /*padding*/ ;

        //remove last child if it doesn't fit on one row
        if(container.pixels > popup.mInput.clientWidth){
            container.removeChild(container.lastChild);
            return false;
        }

        return true;
    },
    cliqzEnhancements: function (item, width) {
        var VERTICAL_TYPE = 'cliqz-results sources-',
            type = item.getAttribute('source'),
            PAIRS = {
                'cliqz-weather'          : 'Weather',
                'cliqz-cluster'          : 'Cluster',
                'cliqz-worldcup'         : 'WorldCup'
            },
            VERTICALS = {
                'n': 'News',
                's': 'Shopping',
                'p': 'People'
            },
            mainVertical = '';

        item._customUI = item._customUI || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-custom');
        item._genericUI = item._genericUI || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-generic');


        if(type.indexOf(VERTICAL_TYPE) == 0){ // is a custom vertical result
            mainVertical = type[VERTICAL_TYPE.length]; // get the first vertical
        }

        var customUI = (mainVertical && VERTICALS[mainVertical]) || PAIRS[type];
        if(customUI){
            CLIQZ.Components['cliqzEnhancements' + customUI](item, JSON.parse(item.getAttribute('cliqzData')), width);
        } else {
            CLIQZ.Components.cliqzEnhancementsGeneric(item);
        }
    },
    cliqzEnhancementsShopping: function(item, cliqzData, width){
        var url = item.getAttribute('url'),
            rd = cliqzData.richData || {},
            img = cliqzData.image || {},
            customItem = item._customUI,
            imageEl = customItem.image;

        customItem['title'].textContent = item.getAttribute('title');
        customItem['source'].textContent = rd.source || CliqzUtils.getDetailsFromUrl(url).host;
        //customItem['description'].textContent = cliqzData.description || '';
        customItem['logo'].className = 'cliqz-ac-logo-icon ' + generateLogoClass(CliqzUtils.getDetailsFromUrl(url));

        if(img && img.src){
            imageEl.style.backgroundImage = "url(" + img.src + ")";
            imageEl.className = 'cliqz-shopping-image';
        } else {
            imageEl.className = '';
        }

        customItem['price'].textContent = (rd.price_currency || '') + ' ' + (rd.price?+rd.price.toFixed(2):'');
        customItem['stars'].setValue(rd.rating, rd.reviews);
    },
    cliqzEnhancementsPeople: function(item, cliqzData, width){
        var url = item.getAttribute('url'),
            rd = cliqzData.richData || {},
            img = cliqzData.image || {},
            customItem = item._customUI,
            imageEl = customItem.image,
            genericItem = item._genericUI;

        if(rd.full_name){ // custom snippet
            customItem.name.textContent = rd.full_name;
            customItem.jobtitle.textContent = rd.current_job_title || '-';
            customItem.company.textContent = rd.current_company || '-';
            customItem.titlecompany.textContent = 'bei';
            customItem.agoline.textContent = rd.since ? ' seit ' + rd.since : '';
            customItem.branch.textContent = rd.current_branch || '';

            //customItem.source.textContent = rd.source || CliqzUtils.getDetailsFromUrl(url).host;
            //customItem.description.textContent = cliqzData.description || '';
            customItem.logo.className = 'cliqz-ac-logo-icon ' + generateLogoClass(CliqzUtils.getDetailsFromUrl(url));

            if(img && img.src){
                imageEl.style.backgroundImage = "url(" + img.src + ")";
                imageEl.className = 'cliqz-people-image';
                customItem.source.className = 'cliqz-people-source' + generateLogoClass(CliqzUtils.getDetailsFromUrl(url))
            } else {
                imageEl.className = '';
            }
        } else {
            customItem.name.textContent = item.getAttribute('title');
            customItem.jobtitle.textContent = CliqzUtils.getDetailsFromUrl(url).host;
        }
    },
}
