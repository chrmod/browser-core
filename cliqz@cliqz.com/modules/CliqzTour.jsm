'use strict';
/*
 * This module creates the interactive offboarding
 *
 */

var EXPORTED_SYMBOLS = ['CliqzTour'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var wm = Components.classes['@mozilla.org/appshell/window-mediator;1']
             .getService(Components.interfaces.nsIWindowMediator),
    win = wm.getMostRecentWindow("navigator:browser"),
    text = CliqzUtils.getLocalizedString('whatIsCliqz'), pos = 0, urlBar, highlightPopup,
    fin = CliqzUtils.getLocalizedString('whatIsCliqzTry'),
    lang = CliqzUtils.getLanguage(win),
    results = [
        {
            title : CliqzUtils.getLocalizedString('offRes_Cliqz'),
            url   : 'https://cliqz.com/',
            type  : 'cliqz-results sources-o',
            data  : { kind: 'o' }
        },
        {
            title : CliqzUtils.getLocalizedString('offRes_AboutCliqz'),
            url   : 'https://cliqz.com/about-cliqz/',
            type  : 'cliqz-results sources-o',
            data  : { kind: 'o' }
        },
        {
            title : CliqzUtils.getLocalizedString('offRes_Privacy'),
            url   : 'https://cliqz.com/privacy/',
            type  : 'cliqz-results sources-o',
            data  : { kind: 'o' }
        },
        {
            title : CliqzUtils.getLocalizedString('offRes_Support'),
            url   : 'https://cliqz.com/support/',
            type  : 'cliqz-results sources-o',
            data  : { kind: 'o' }
        },
        {
            title : CliqzUtils.getLocalizedString('offRes_Team'),
            url   : 'https://cliqz.com/team/',
            type  : 'cliqz-results sources-o',
            data  : { kind: 'o' }
        }
    ];

var CliqzTour = {
    init: function(){
        if(win.document.getElementById('UITourHighlight')){
            //FF 29+
            CliqzTour.pageShown(true);
            return true;
        } else {
            // FF28 and older
            CliqzTour.pageShown(false);
            return false;
        }
    },
    start: function(){
        var action = {
            type: 'activity',
            action: 'offboarding_tour',
        };
        CliqzUtils.telemetry(action);
        start('wobble');
    },
    pageShown: function(active) {
        var action = {
            type: 'activity',
            action: 'offboarding_shown',
            tour_active: active
        };
        CliqzUtils.telemetry(action);
    },
    pageClosed: function(time) {
        var action = {
            time: time,
            type: 'activity',
            action: 'offboarding_closed',
        };
        CliqzUtils.telemetry(action);
    }
};

function start(effect){
    var highlighter = win.document.getElementById('UITourHighlight');

    highlightPopup = highlighter.parentElement;
    urlBar = win.document.getElementById('urlbar');
    pos = 0;

    highlighter.setAttribute("active", effect);
    highlightPopup.hidden = false;

    if (highlightPopup.state == "showing" || highlightPopup.state == "open") {
        highlightPopup.hidePopup();
    }

    highlightPopup.openPopup(urlBar, "overlap", 15, -12);
    highlightPopup.style.transition = 'all ' + parseInt(0.3 * text.length) + 's linear';
    highlightPopup.style.marginLeft = parseInt(4.6 * text.length) + 'px';

    win.CLIQZ.Core.urlbar.mInputField.focus();
    urlBar.mInputField.setUserInput(text.substr(0, ++pos));
    messageType(300);
}

function messageType(to){
    CliqzUtils.setTimeout(function(){
        urlBar.value = text.substr(0, ++pos);
        if(pos < text.length)messageType(300);
        else {
            CliqzUtils.setTimeout(function(){
                highlightPopup.hidePopup();
                highlightPopup.style.transition = '';
                highlightPopup.style.marginLeft = '';

                urlBar.popup.mInput = urlBar;
                var width = urlBar.getBoundingClientRect().width;
                urlBar.popup.setAttribute("width", width > 100 ? width : 100);
                urlBar.popup.openPopup(urlBar, "after_start", 0, 0, false, true);
                win.CLIQZ.UI.results({
                    results: results,
                    width: win.CLIQZ.Core.urlbar.clientWidth
                });
                CliqzUtils.setTimeout(function(){
                    urlBar.value = fin;
                    urlBar.setSelectionRange(0, urlBar.value.length)
                }, 2000);

            }, 1000)
        }
    }, to);
}
