'use strict';

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm?v=0.4.15');

XPCOMUtils.defineLazyModuleGetter(this, 'ResultProviders',
  'chrome://cliqzmodules/content/ResultProviders.jsm?v=0.4.15');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm?v=0.4.15');

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
        var height = 54,
            img = data.image;
        var ratio = 0;

        switch(data.type){
            case 'news': //fallthrough
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

const NEWS_SOURCE_WIDTH = 300;

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
    suggestionClick: function(ev){
        if(ev && ev.target){
            var suggestionVal = ev.target.suggestion || ev.target.parentNode.suggestion;
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
    },
    cliqzCreateSearchOptionsItem: function(engineContainer ,textContainer){
        var engines = ResultProviders.getSearchEngines();

        textContainer.textContent = 'noch mehr ...';

        for(var idx in engines){
            var engine = engines[idx],
                imageEl = document.createElementNS(CLIQZ.Components.XULNS, 'image');

            imageEl.className = 'cliqz-engine';
            imageEl.setAttribute('src', engine.icon);
            imageEl.tooltipText = engine.name + '  ' + engine.prefix;
            imageEl.engine = engine.name;
            imageEl.engineCode = engine.code;

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

                var url = engine.getSubmission(userInput).uri.spec,
                    action = {
                        type: 'activity',
                        action: 'visual_hash_tag',
                        engine: ev.target.engineCode || -1
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
                'n': 'News'
            };

        var mainVertical = '';

        if(type.indexOf(VERTICAL_TYPE) == 0){ // is a custom vertical result
            mainVertical
        }

            customUI = PAIRS[type] ||
        if(customUI){
            var customItem =  document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-custom');
            CLIQZ.Components['cliqzEnhancements' + PAIRS[type]](customItem, JSON.parse(item.getAttribute('cliqzData')), item, width);
        } else {
            CLIQZ.Components.cliqzEnhancementsGeneric(item);
        }
    },
    cliqzEnhancementsWorldCup: function(item, cliqzData){
        var WORLD_CUP_ICON_BASE_URL= "chrome://cliqzres/content/skin/worldcup/";

        const matchTemplateNode = item['match-template'];
        const todayMatches = item['today-matches'];
        // Clear all matches from last display
        while (todayMatches.firstChild)
            todayMatches.removeChild(todayMatches.firstChild);

        // Creates a new match from template
        function createNewMatch (matchData) {
            const newMatch = matchTemplateNode.cloneNode(true);
            // Populate template
            const homeTeam = newMatch.getElementsByAttribute('anonid', 'home-team')[0];
            homeTeam.textContent = matchData['home_team']['code'];
            const homeFlag = newMatch.getElementsByAttribute('anonid', 'home-flag')[0];
            homeFlag.setAttribute('src', WORLD_CUP_ICON_BASE_URL + matchData['home_team']['code'] + '.png');
            const homeGoals = newMatch.getElementsByAttribute('anonid', 'home-goals')[0];
            homeGoals.textContent = matchData['home_team']['goals'];

            const awayTeam = newMatch.getElementsByAttribute('anonid', 'away-team')[0];
            awayTeam.textContent = matchData['away_team']['code'];
            const awayFlag = newMatch.getElementsByAttribute('anonid', 'away-flag')[0];
            awayFlag.setAttribute('src', WORLD_CUP_ICON_BASE_URL + matchData['away_team']['code'] + '.png');
            const awayGoals = newMatch.getElementsByAttribute('anonid', 'away-goals')[0];
            awayGoals.textContent = matchData['away_team']['goals'];

            // Display time for future games, green dot for live games and grey dot for completed
            const matchStatus = matchData['status'];
            if (matchStatus == 'future') {
                const matchTime = newMatch.getElementsByAttribute('anonid', 'match-time')[0];
                const time = new Date(matchData['datetime']);
                matchTime.textContent = time.getHours() + ':00';
                matchTime.hidden = false;
            } else {
                const matchLive = newMatch.getElementsByAttribute('anonid', 'match-live')[0];
                if (matchStatus == 'in progress') {
                    matchLive.setAttribute('class', 'cliqz-worldcup-match-live cliqz-worldcup-green-dot');
                } else {
                    matchLive.setAttribute('class', 'cliqz-worldcup-match-live cliqz-worldcup-grey-dot');
                }
                matchLive.hidden = false;
            }

            newMatch.hidden = false;
            return newMatch;
        }

        const urlbar = document.getElementById('urlbar');
        const urlbarWidth = urlbar.getBoundingClientRect().width;

        let resultsWidth = 150;
        for (let matchData of cliqzData['matches']) {
            // If the list of matches gets bigger than the urlbar hide the rest
            resultsWidth = resultsWidth + 155;
            CliqzUtils.log(resultsWidth,"RESULTS: ")
            CliqzUtils.log(urlbarWidth,"URLBAR: ")
            if (resultsWidth > urlbarWidth) {
                break;
            }

            const match = createNewMatch(matchData);
            todayMatches.appendChild(match);
        }

    },
    cliqzEnhancementsWeather: function(item, cliqzData){
        var desriptionElements = [
                                  "city",
                                  "todayTemp",
                                  "todayMin",
                                  "todayMax",
                                  "todayDate",
                                  "tomorrowDay",
                                  "tomorrowDate",
                                  "tomorrowMin",
                                  "tomorrowMax",
                                  "tomorrowDesc",
                                  "aTomorrowDay",
                                  "aTomorrowDate",
                                  "aTomorrowMin",
                                  "aTomorrowMax",
                                  "aTomorrowDesc",
                                ],
            imageElements = [
                             "todayIcon",
                             "tomorrowIcon",
                             "aTomorrowIcon"
                            ];

        for(var p in desriptionElements){
            item[desriptionElements[p]].textContent = cliqzData[desriptionElements[p]];
        }

        for(var p in imageElements){
            item[imageElements[p]].setAttribute('src', cliqzData[imageElements[p]]);
        }
    },
    cliqzEnhancementsNews: function(customItem, cliqzData, item, width){
        CliqzUtils.log(JSON.stringify(cliqzData), 'AALALALA');
        var url = item.getAttribute('url'),
            sources = cliqzData.richData.additional_sources;

        var elements = ["image", "title", "source", "ago-line", "description", "logo"];

        customItem['title'].textContent = item.getAttribute('title');
        customItem['source'].textContent = cliqzData.richData.source_name || '';
        customItem['ago-line'].textContent = CliqzUtils.computeAgoLine(cliqzData.richData.discovery_timestamp);
        customItem['description'].textContent = cliqzData.description || '';
        customItem['logo'].className = 'cliqz-ac-logo-icon ' + generateLogoClass(CliqzUtils.getDetailsFromUrl(url));

        constructImageElement(cliqzData, customItem.image, undefined);

        var maxColumns = Math.min(3, parseInt((width - 50) / NEWS_SOURCE_WIDTH));
        for(let i=0; i < 6; i++){
            let sourceBox = customItem['source-' + i];
            if(sources[i] && (i%3 < maxColumns)){
                let sourceEl = sourceBox._title_logo,
                    url = sources[i].url;

                sourceBox.hidden = false;

                sourceEl.textContent = (sources[i] && sources[i].title) || '';
                let urlDetails = CliqzUtils.getDetailsFromUrl(url);
                sourceEl.className = 'cliqz-news-source-title-with-logo ' + generateLogoClass(urlDetails);
                sourceEl.sourceUrl = url;
            } else {
                sourceBox.hidden = true;
            }
        }
    },
    cliqzEnhancementsGeneric: function (item) {
        // add here all the custom UI elements for an item
        var url = item.getAttribute('url'),
            source = item.getAttribute('source'),
            urlDetails = CliqzUtils.getDetailsFromUrl(url),
            domainDefClass = '', cliqzData;


        if(item.getAttribute('cliqzData')){
            cliqzData = JSON.parse(item.getAttribute('cliqzData'));
        }

        item._cliqzUrlType = item._cliqzUrlType || document.getAnonymousElementByAttribute(item, 'anonid', 'url-type');
        item._cliqzUrlType.className = 'cliqz-left-separator';

        item._cliqzImage = item._cliqzImage || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-image');
        item._cliqzImage.setAttribute('src', '');
        item._cliqzImage.className = '';
        item._cliqzImage.style.width = '';

        item._cliqzImageDesc = item._cliqzImageDesc || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-image-desc');
        item._cliqzImageDesc.textContent = '';
        item._cliqzImageDesc.className = '';
        item._cliqzImageDesc.parentNode.className = 'hidden';

        item._logo = item._logo || document.getAnonymousElementByAttribute(item, 'anonid', 'logo');
        item._logo.className = '';

        item._cliqzDescription = item._cliqzDescription || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-description');
        item._cliqzDescriptionBox = item._cliqzDescriptionBox || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-description-box');

        if(cliqzData && cliqzData.description){
            item._cliqzDescriptionBox.className = 'cliqz-ac-description-box';
            item._setUpDescription(item._cliqzDescription, cliqzData.description);
        } else {
            item._cliqzDescription.textContent = '';
            item._cliqzDescriptionBox.className = ''
        }
        //item._source.textContent = source;

        item._cliqzUrlDetails = item._cliqzUrlDetails || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-url-details');
        item._cliqzTitleDetails = item._cliqzTitleDetails || document.getAnonymousElementByAttribute(item, 'anonid', 'cliqz-title-details');

        while (item._cliqzUrlDetails.hasChildNodes()) {
            item._cliqzUrlDetails.removeChild(item._cliqzUrlDetails.firstChild);
        }

        while (item._cliqzTitleDetails.hasChildNodes()) {
            item._cliqzTitleDetails.removeChild(item._cliqzTitleDetails.firstChild);
        }

        if (urlDetails && source !== 'cliqz-suggestions' && source.indexOf('cliqz-custom') === -1) {
            // add logo
            item._logo.className = 'cliqz-ac-logo-icon ' + generateLogoClass(urlDetails);

            // add lock
            if (urlDetails.ssl) {
                item._cliqzUrlType.className += ' cliqz-ac-site-icon-ssl';
            }

            // add video thumbnail
            constructImageElement(cliqzData, item._cliqzImage, item._cliqzImageDesc);

            // remove default
            item._url.textContent = '';
            item._urlOverflowEllipsis.value = '';

            var span;
            span = item._cliqzUrlDetails.appendChild(
                document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
            span.className = domainDefClass + ' cliqz-ac-url-host';

            item._setUpDescription(span, urlDetails.host);

            span = item._cliqzUrlDetails.appendChild(
                document.createElementNS('http://www.w3.org/1999/xhtml', 'span'));
            span.className = domainDefClass + ' cliqz-ac-url-path';
            item._setUpDescription(span, urlDetails.path);

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
